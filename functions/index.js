const crypto = require('node:crypto');
const os = require('node:os');
const path = require('node:path');
const { finished, pipeline } = require('node:stream/promises');
const fs = require('node:fs/promises');
const archiver = require('archiver');
const unzipper = require('unzipper');
const nodemailer = require('nodemailer');
const { initializeApp } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');
const { FieldValue, getFirestore } = require('firebase-admin/firestore');
const { getStorage } = require('firebase-admin/storage');
const { defineSecret, defineString } = require('firebase-functions/params');
const { HttpsError, onCall } = require('firebase-functions/v2/https');
const { onDocumentCreated } = require('firebase-functions/v2/firestore');

initializeApp();

const db = getFirestore();
const OTP_PEPPER = defineSecret('OTP_PEPPER');
const SMTP_USER = defineSecret('SMTP_USER');
const SMTP_PASSWORD = defineSecret('SMTP_PASSWORD');
const SMTP_HOST = defineString('SMTP_HOST', { default: 'smtp.gmail.com' });
const SMTP_PORT = defineString('SMTP_PORT', { default: '465' });
const SMTP_FROM = defineString('SMTP_FROM', { default: '' });
const SMTP_NAME = defineString('SMTP_NAME', { default: 'Bashayer Al-Ataa' });
const SMTP_REPLY_TO = defineString('SMTP_REPLY_TO', { default: '' });

const ADMIN_EMAIL = 'sulemanmr551@gmail.com';
const ADMIN_UID = '3BKWyktwaNOvhmDKoJf6yRye9FP2';
const OTP_TTL_MS = 5 * 60 * 1000;
const RESEND_COOLDOWN_MS = 60 * 1000;
const REQUEST_WINDOW_MS = 60 * 60 * 1000;
const MAX_EMAIL_REQUESTS = 5;
const MAX_IP_REQUESTS = 20;
const MAX_VERIFY_ATTEMPTS = 5;

function normalizeEmail(value) {
  const email = String(value || '').trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) {
    throw new HttpsError('invalid-argument', 'Enter a valid email address.');
  }
  if (email === ADMIN_EMAIL) {
    throw new HttpsError('permission-denied', 'Use the admin login for this account.');
  }
  return email;
}

function docId(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function otpHash(email, code, nonce) {
  return crypto
    .createHmac('sha256', OTP_PEPPER.value())
    .update(`${email}:${code}:${nonce}`)
    .digest('hex');
}

function safeEqual(left, right) {
  const a = Buffer.from(String(left));
  const b = Buffer.from(String(right));
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

function getIp(request) {
  const forwarded = request.rawRequest?.headers?.['x-forwarded-for'];
  return String(Array.isArray(forwarded) ? forwarded[0] : forwarded || request.rawRequest?.ip || 'unknown')
    .split(',')[0]
    .trim();
}

function parseClientDevice(meta = {}) {
  const ua = String(meta.userAgent || '').slice(0, 400);
  const platform = String(meta.platform || '').slice(0, 80);
  const timezone = String(meta.timezone || '').slice(0, 80);
  const language = String(meta.language || '').slice(0, 40);
  const lower = ua.toLowerCase();

  let browser = 'Browser';
  if (lower.includes('edg/')) browser = 'Edge';
  else if (lower.includes('chrome/') && !lower.includes('edg/')) browser = 'Chrome';
  else if (lower.includes('firefox/')) browser = 'Firefox';
  else if (lower.includes('safari/') && !lower.includes('chrome/')) browser = 'Safari';
  else if (lower.includes('opera') || lower.includes('opr/')) browser = 'Opera';

  let deviceType = 'desktop';
  if (/ipad|tablet|kindle|silk/.test(lower)) deviceType = 'tablet';
  else if (/mobi|iphone|android.*mobile|windows phone/.test(lower)) deviceType = 'mobile';

  return {
    userAgent: ua,
    platform,
    timezone,
    language,
    browser,
    deviceType,
    isMobile: deviceType === 'mobile',
  };
}

async function lookupIpLocation(ip) {
  if (!ip || ip === 'unknown' || ip === '127.0.0.1' || ip.startsWith('::')) {
    return { city: '', country: '' };
  }
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 2500);
    const res = await fetch(`https://ipwho.is/${encodeURIComponent(ip)}`, {
      signal: controller.signal,
    });
    clearTimeout(timer);
    if (!res.ok) return { city: '', country: '' };
    const data = await res.json();
    if (!data?.success) return { city: '', country: '' };
    return {
      city: String(data.city || '').slice(0, 80),
      country: String(data.country || '').slice(0, 80),
    };
  } catch {
    return { city: '', country: '' };
  }
}

async function recordLoginActivity(userId, request, clientMeta = {}) {
  try {
    const ipAddress = getIp(request);
    const device = parseClientDevice(clientMeta);
    const recentSnap = await db
      .collection('users')
      .doc(userId)
      .collection('loginActivity')
      .orderBy('createdAt', 'desc')
      .limit(1)
      .get();

    if (!recentSnap.empty) {
      const last = recentSnap.docs[0].data() || {};
      const lastAt = last.createdAt?.toMillis?.() || 0;
      const sameDevice = last.ipAddress === ipAddress
        && last.userAgent === device.userAgent
        && last.deviceType === device.deviceType;
      // Avoid logging every page refresh as a new login (4h window).
      if (sameDevice && lastAt && Date.now() - lastAt < 4 * 60 * 60 * 1000) {
        return;
      }
    }

    const geo = await lookupIpLocation(ipAddress);
    await db.collection('users').doc(userId).collection('loginActivity').add({
      type: 'login',
      ipAddress,
      city: geo.city,
      country: geo.country,
      browser: device.browser,
      deviceType: device.deviceType,
      isMobile: device.isMobile,
      platform: device.platform,
      timezone: device.timezone,
      language: device.language,
      userAgent: device.userAgent,
      createdAt: FieldValue.serverTimestamp(),
    });
  } catch (error) {
    console.warn('loginActivity write skipped', error?.message || error);
  }
}

function nextWindow(data, now, limit) {
  const windowStart = Number(data?.windowStart || 0);
  const count = Number(data?.count || 0);
  if (!windowStart || now - windowStart >= REQUEST_WINDOW_MS) {
    return { windowStart: now, count: 1 };
  }
  if (count >= limit) {
    throw new HttpsError('resource-exhausted', 'Too many OTP requests. Try again later.');
  }
  return { windowStart, count: count + 1 };
}

function esc(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

async function loadBrandSettings(language) {
  try {
    const snap = await db.doc('siteSettings/payment').get();
    const emailCfg = snap.exists ? (snap.data()?.email || {}) : {};
    const brand = emailCfg.brandName || {};
    const fromName = emailCfg.fromName || {};
    const shortName = language === 'ar'
      ? (brand.ar || fromName.ar || 'بشاير العطاء')
      : (brand.en || fromName.en || 'Bashayer Al-Ataa');
    const company = language === 'ar'
      ? 'شركة بشاير العطاء للنقل البري'
      : 'Bashayer Al-Ataa Land Transport Company';
    return {
      shortName,
      company,
      fromEmail: emailCfg.fromEmail || SMTP_FROM.value() || SMTP_USER.value(),
      replyTo: emailCfg.replyTo || SMTP_REPLY_TO.value() || emailCfg.fromEmail || SMTP_FROM.value() || SMTP_USER.value(),
      primary: '#0B5345',
      gold: '#C9A227',
    };
  } catch {
    return {
      shortName: language === 'ar' ? 'بشاير العطاء' : (SMTP_NAME.value() || 'Bashayer Al-Ataa'),
      company: language === 'ar'
        ? 'شركة بشاير العطاء للنقل البري'
        : 'Bashayer Al-Ataa Land Transport Company',
      fromEmail: SMTP_FROM.value() || SMTP_USER.value(),
      replyTo: SMTP_REPLY_TO.value() || SMTP_FROM.value() || SMTP_USER.value(),
      primary: '#0B5345',
      gold: '#C9A227',
    };
  }
}

function buildOtpEmail({ email, code, language, purpose, brand, expiresMinutes }) {
  const isArabic = language === 'ar';
  const dir = isArabic ? 'rtl' : 'ltr';
  const align = isArabic ? 'right' : 'left';
  const isRegister = purpose === 'register';
  const subject = isArabic
    ? (isRegister
      ? `${brand.shortName} — رمز التحقق لإنشاء الحساب`
      : `${brand.shortName} — رمز تسجيل الدخول`)
    : (isRegister
      ? `${brand.shortName} — Account verification code`
      : `${brand.shortName} — Sign-in verification code`);

  const greeting = isArabic ? 'مرحباً،' : 'Hello,';
  const intro = isArabic
    ? (isRegister
      ? 'استخدم رمز التحقق التالي لإكمال إنشاء حسابك لدى بشاير العطاء.'
      : 'استخدم رمز التحقق التالي لتسجيل الدخول إلى حسابك لدى بشاير العطاء.')
    : (isRegister
      ? 'Use the verification code below to finish creating your Bashayer Al-Ataa account.'
      : 'Use the verification code below to sign in to your Bashayer Al-Ataa account.');
  const expiresLabel = isArabic
    ? `ينتهي هذا الرمز خلال ${expiresMinutes} دقائق`
    : `This code expires in ${expiresMinutes} minutes`;
  const security = isArabic
    ? 'إذا لم تطلب هذا الرمز، تجاهل هذه الرسالة. لا تشارك الرمز مع أي شخص.'
    : 'If you did not request this code, ignore this email. Never share the code with anyone.';
  const footer = isArabic
    ? 'هذه رسالة تحقق حسابية — وليست رسالة ترويجية.'
    : 'This is an account verification message — not a promotional email.';

  const text = [
    `${brand.shortName}`,
    '',
    greeting,
    intro,
    '',
    `${isArabic ? 'رمز التحقق' : 'Verification code'}: ${code}`,
    expiresLabel,
    '',
    security,
    '',
    brand.company,
    brand.replyTo || brand.fromEmail,
  ].join('\n');

  const html = `<!DOCTYPE html>
<html lang="${isArabic ? 'ar' : 'en'}" dir="${dir}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="color-scheme" content="light">
  <title>${esc(subject)}</title>
</head>
<body style="margin:0;padding:0;background:#f3f6f5;font-family:Tahoma,Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f3f6f5;padding:24px 12px;">
    <tr><td align="center">
      <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;background:#ffffff;border-radius:14px;overflow:hidden;border:1px solid #e5ece9;">
        <tr>
          <td style="background:${brand.primary};padding:22px 28px;text-align:${align};">
            <div style="color:#ffffff;font-size:20px;font-weight:700;letter-spacing:0.2px;">${esc(brand.shortName)}</div>
            <div style="color:rgba(255,255,255,0.88);font-size:12px;margin-top:6px;">${esc(brand.company)}</div>
          </td>
        </tr>
        <tr>
          <td style="padding:28px;text-align:${align};color:#24312d;line-height:1.7;font-size:15px;">
            <p style="margin:0 0 12px;">${esc(greeting)}</p>
            <p style="margin:0 0 22px;">${esc(intro)}</p>
            <div style="text-align:center;margin:8px 0 18px;">
              <div style="display:inline-block;padding:16px 28px;border:1px dashed ${brand.gold};border-radius:12px;background:#fffdf5;">
                <div style="font-size:12px;color:#7a6a2e;margin-bottom:8px;">${isArabic ? 'رمز التحقق' : 'Verification code'}</div>
                <div style="font-size:34px;font-weight:700;letter-spacing:10px;color:${brand.primary};font-family:Consolas,monospace;" dir="ltr">${esc(code)}</div>
              </div>
            </div>
            <p style="margin:0 0 10px;font-weight:700;color:${brand.primary};">${esc(expiresLabel)}</p>
            <p style="margin:0;color:#5b6a65;font-size:13px;">${esc(security)}</p>
            <p style="margin:18px 0 0;color:#8a9591;font-size:12px;" dir="ltr">${esc(email)}</p>
          </td>
        </tr>
        <tr>
          <td style="padding:16px 28px;background:#f8faf9;text-align:center;font-size:11px;color:#889390;">
            ${esc(footer)}<br>
            © ${new Date().getFullYear()} ${esc(brand.company)}
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  return { subject, text, html };
}

function createMailTransport() {
  const port = Number(SMTP_PORT.value()) || 465;
  const user = SMTP_USER.value();
  return {
    transporter: nodemailer.createTransport({
      host: SMTP_HOST.value(),
      port,
      secure: port === 465,
      auth: { user, pass: SMTP_PASSWORD.value() },
    }),
    fromUser: user,
  };
}

async function sendBrandedMail({ to, subject, text, html, replyTo, fromEmail, fromName }) {
  const { transporter, fromUser } = createMailTransport();
  const address = fromEmail || SMTP_FROM.value() || fromUser;
  const name = String(fromName || SMTP_NAME.value() || 'Bashayer Al-Ataa').replace(/"/g, '');
  await transporter.sendMail({
    from: `"${name}" <${address}>`,
    replyTo: replyTo || SMTP_REPLY_TO.value() || address,
    to,
    subject,
    text: text || subject,
    html,
    headers: {
      'Auto-Submitted': 'auto-generated',
      Precedence: 'transactional',
      'X-Mailer': 'Bashayer Al-Ataa Orders',
    },
  });
}

async function sendOtpEmail({ email, code, language, purpose }) {
  const brand = await loadBrandSettings(language);
  const expiresMinutes = Math.round(OTP_TTL_MS / 60000);
  const content = buildOtpEmail({
    email,
    code,
    language,
    purpose,
    brand,
    expiresMinutes,
  });
  const fromName = (language === 'ar' ? brand.shortName : (SMTP_NAME.value() || brand.shortName));
  await sendBrandedMail({
    to: email,
    subject: content.subject,
    text: content.text,
    html: content.html,
    fromEmail: brand.fromEmail,
    fromName,
    replyTo: brand.replyTo,
  });
}

exports.requestEmailOtp = onCall(
  { region: 'us-central1', secrets: [OTP_PEPPER, SMTP_USER, SMTP_PASSWORD] },
  async (request) => {
    const email = normalizeEmail(request.data?.email);
    const purpose = request.data?.purpose === 'register' ? 'register' : 'login';
    const language = request.data?.language === 'ar' ? 'ar' : 'en';
    if (purpose === 'login' || purpose === 'register') {
      try {
        const existing = await getAuth().getUserByEmail(email);
        if (existing.disabled) throw new HttpsError('permission-denied', 'This account is disabled.');
        if (purpose === 'register') {
          throw new HttpsError('already-exists', 'This email is already registered.');
        }
      } catch (error) {
        if (error instanceof HttpsError) throw error;
        if (error?.code === 'auth/user-not-found') {
          if (purpose === 'login') {
            throw new HttpsError('not-found', 'Account not found. Please register first.');
          }
        } else {
          throw error;
        }
      }
    }

    const now = Date.now();
    const code = crypto.randomInt(0, 1000000).toString().padStart(6, '0');
    const nonce = crypto.randomBytes(16).toString('hex');
    const challengeRef = db.collection('otpChallenges').doc(docId(email));
    const ipRef = db.collection('otpRateLimits').doc(docId(getIp(request)));

    await db.runTransaction(async (transaction) => {
      const [challengeSnap, ipSnap] = await Promise.all([
        transaction.get(challengeRef),
        transaction.get(ipRef),
      ]);
      const current = challengeSnap.data();
      if (current?.lastSentAt && now - current.lastSentAt < RESEND_COOLDOWN_MS) {
        const retryAfter = Math.ceil((RESEND_COOLDOWN_MS - (now - current.lastSentAt)) / 1000);
        throw new HttpsError('failed-precondition', `Wait ${retryAfter} seconds before requesting another code.`);
      }
      const emailWindow = nextWindow(
        { windowStart: current?.windowStart, count: current?.requestCount },
        now,
        MAX_EMAIL_REQUESTS,
      );
      const ipWindow = nextWindow(ipSnap.data(), now, MAX_IP_REQUESTS);

      transaction.set(challengeRef, {
        email,
        purpose,
        language,
        nonce,
        codeHash: otpHash(email, code, nonce),
        expiresAt: now + OTP_TTL_MS,
        lastSentAt: now,
        attempts: 0,
        consumed: false,
        windowStart: emailWindow.windowStart,
        requestCount: emailWindow.count,
        updatedAt: FieldValue.serverTimestamp(),
      });
      transaction.set(ipRef, {
        ...ipWindow,
        updatedAt: FieldValue.serverTimestamp(),
      });
    });

    try {
      await sendOtpEmail({ email, code, language, purpose });
    } catch (error) {
      const latest = await challengeRef.get();
      if (latest.data()?.nonce === nonce) await challengeRef.delete();
      console.error('OTP email delivery failed', error);
      throw new HttpsError('unavailable', 'Could not send the verification email. Try again.');
    }

    return { expiresIn: OTP_TTL_MS / 1000, resendAfter: RESEND_COOLDOWN_MS / 1000 };
  },
);

exports.verifyEmailOtp = onCall(
  { region: 'us-central1', secrets: [OTP_PEPPER] },
  async (request) => {
    const email = normalizeEmail(request.data?.email);
    const code = String(request.data?.code || '').trim();
    if (!/^\d{6}$/.test(code)) {
      throw new HttpsError('invalid-argument', 'Enter the 6-digit verification code.');
    }

    const challengeRef = db.collection('otpChallenges').doc(docId(email));
    let challenge;
    await db.runTransaction(async (transaction) => {
      const snap = await transaction.get(challengeRef);
      challenge = snap.data();
      if (!challenge || challenge.consumed) {
        throw new HttpsError('failed-precondition', 'Request a new verification code.');
      }
      if (Date.now() > challenge.expiresAt) {
        transaction.delete(challengeRef);
        throw new HttpsError('deadline-exceeded', 'The verification code has expired.');
      }
      if (challenge.attempts >= MAX_VERIFY_ATTEMPTS) {
        transaction.delete(challengeRef);
        throw new HttpsError('resource-exhausted', 'Too many incorrect attempts. Request a new code.');
      }
      const valid = safeEqual(challenge.codeHash, otpHash(email, code, challenge.nonce));
      if (!valid) {
        transaction.update(challengeRef, {
          attempts: FieldValue.increment(1),
          updatedAt: FieldValue.serverTimestamp(),
        });
        throw new HttpsError('permission-denied', 'The verification code is incorrect.');
      }
      transaction.update(challengeRef, {
        consumed: true,
        consumedAt: FieldValue.serverTimestamp(),
      });
    });

    let user;
    let isNew = false;
    try {
      user = await getAuth().getUserByEmail(email);
      if (user.disabled) throw new HttpsError('permission-denied', 'This account is disabled.');
      if (!user.emailVerified) {
        user = await getAuth().updateUser(user.uid, { emailVerified: true });
      }
    } catch (error) {
      if (error instanceof HttpsError) throw error;
      if (error?.code !== 'auth/user-not-found') throw error;
      if (challenge.purpose !== 'register') {
        throw new HttpsError('not-found', 'Account not found. Please register first.');
      }
      user = await getAuth().createUser({
        email,
        emailVerified: true,
      });
      isNew = true;
    }

    const token = await getAuth().createCustomToken(user.uid, { authProvider: 'email_otp' });
    return { token, isNew };
  },
);

const CLERK_SECRET_KEY = defineSecret('CLERK_SECRET_KEY');
const MOYASAR_SECRET_KEY = defineSecret('MOYASAR_SECRET_KEY');

const PAID_MOYASAR_STATUSES = new Set(['paid', 'captured']);
const FAILED_MOYASAR_STATUSES = new Set(['failed', 'voided']);

function sarToHalalas(amountSar) {
  const n = Number(amountSar);
  if (!Number.isFinite(n) || n <= 0) return 0;
  return Math.round(n * 100);
}

async function fetchMoyasarPayment(paymentId) {
  const secret = MOYASAR_SECRET_KEY.value();
  if (!secret || !String(secret).startsWith('sk_')) {
    throw new HttpsError('failed-precondition', 'Moyasar secret key is not configured on the server.');
  }
  const auth = Buffer.from(`${secret}:`).toString('base64');
  const res = await fetch(`https://api.moyasar.com/v1/payments/${encodeURIComponent(paymentId)}`, {
    headers: { Authorization: `Basic ${auth}`, Accept: 'application/json' },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    console.error('Moyasar fetch failed', res.status, body.slice(0, 300));
    throw new HttpsError('not-found', 'Payment could not be verified with Moyasar.');
  }
  return res.json();
}

async function markMoyasarBookingPaid(bookingRef, booking, payment, paymentId) {
  const amountHalalas = Number(payment.amount);
  const currency = String(payment.currency || 'SAR').toUpperCase();
  const paidAt = payment.updated_at || payment.created_at || new Date().toISOString();

  const duplicateSnap = await db.collection('bookings')
    .where('paymentId', '==', paymentId)
    .limit(1)
    .get();
  if (!duplicateSnap.empty && duplicateSnap.docs[0].id !== bookingRef.id) {
    throw new HttpsError('failed-precondition', 'This payment was already used for another order.');
  }

  await db.runTransaction(async (transaction) => {
    const snap = await transaction.get(bookingRef);
    if (!snap.exists()) throw new HttpsError('not-found', 'Booking not found.');
    const current = snap.data();

    if (current.paymentStatus === 'paid') {
      if (current.paymentId === paymentId) return;
      throw new HttpsError('failed-precondition', 'This booking is already paid.');
    }

    const expectedHalalas = sarToHalalas(current.totalPrice ?? current.price ?? 0);
    if (expectedHalalas < 100) {
      throw new HttpsError('failed-precondition', 'Invalid booking amount.');
    }
    if (amountHalalas !== expectedHalalas) {
      throw new HttpsError('failed-precondition', 'Payment amount does not match the order total.');
    }
    if (currency !== 'SAR') {
      throw new HttpsError('failed-precondition', 'Payment currency must be SAR.');
    }

    const timeline = Array.isArray(current.trackingTimeline) ? [...current.trackingTimeline] : [];
    timeline.push({
      status: 'paid',
      label: 'Moyasar payment verified',
      at: new Date().toISOString(),
    });

    transaction.update(bookingRef, {
      paymentStatus: 'paid',
      status: current.status === 'cancelled' ? current.status : 'confirmed',
      paymentMethod: 'moyasar',
      paymentProvider: 'moyasar',
      paymentId,
      transactionReference: payment.source?.reference_number || payment.id || paymentId,
      amount: Number(current.totalPrice ?? current.price ?? 0),
      currency: 'SAR',
      paidAt,
      updatedAt: FieldValue.serverTimestamp(),
      trackingTimeline: timeline,
    });
  });

  try {
    const settingsSnap = await db.doc('siteSettings/payment').get();
    const settings = settingsSnap.exists ? settingsSnap.data() : {};
    const orderNumber = booking.orderNumber;
    const email = String(booking.customerEmail || '').trim().toLowerCase();
    if (email) {
      await db.collection('emailQueue').add({
        to: email,
        subject: `Payment confirmed #${orderNumber}`,
        html: `<p>Your payment for order #${orderNumber} has been confirmed.</p>`,
        type: 'payment_confirmed',
        bookingId: bookingRef.id,
        orderNumber,
        status: 'queued',
        createdAt: FieldValue.serverTimestamp(),
        from: settings?.email?.fromEmail || '',
        fromName: settings?.email?.fromName?.en || settings?.email?.brandName?.en || '',
        replyTo: settings?.email?.replyTo || '',
      });
    }
    if (booking.userId) {
      await db.collection('notifications').add({
        userId: booking.userId,
        type: 'payment_update',
        title: 'Payment Confirmed',
        titleAr: 'تم تأكيد الدفع',
        message: `Your payment for order #${orderNumber} is confirmed.`,
        messageAr: `تم تأكيد دفعتك للطلب #${orderNumber}.`,
        bookingId: bookingRef.id,
        read: false,
        createdAt: FieldValue.serverTimestamp(),
      });
    }
    await db.collection('activityLog').add({
      type: 'payment_confirmed',
      bookingId: bookingRef.id,
      paymentId,
      provider: 'moyasar',
      createdAt: FieldValue.serverTimestamp(),
    });
  } catch (err) {
    console.warn('Post-payment notifications skipped:', err?.message || err);
  }
}

exports.verifyMoyasarPayment = onCall(
  { region: 'us-central1', secrets: [MOYASAR_SECRET_KEY] },
  async (request) => {
    if (!request.auth?.uid) {
      throw new HttpsError('unauthenticated', 'Sign in to verify payment.');
    }

    const bookingId = String(request.data?.bookingId || '').trim();
    const paymentId = String(request.data?.paymentId || '').trim();
    if (!bookingId || !paymentId) {
      throw new HttpsError('invalid-argument', 'Missing booking or payment ID.');
    }

    const bookingRef = db.collection('bookings').doc(bookingId);
    const bookingSnap = await bookingRef.get();
    if (!bookingSnap.exists()) {
      throw new HttpsError('not-found', 'Booking not found.');
    }
    const booking = { id: bookingSnap.id, ...bookingSnap.data() };

    if (booking.userId && booking.userId !== request.auth.uid) {
      throw new HttpsError('permission-denied', 'You can only verify your own bookings.');
    }

    if (booking.paymentStatus === 'paid') {
      return {
        status: 'paid',
        bookingId,
        orderNumber: booking.orderNumber,
        paymentId: booking.paymentId || paymentId,
      };
    }

    const payment = await fetchMoyasarPayment(paymentId);
    const status = String(payment.status || '').toLowerCase();

    const metaBookingId = payment.metadata?.bookingId || payment.metadata?.booking_id;
    if (metaBookingId && metaBookingId !== bookingId) {
      throw new HttpsError('failed-precondition', 'Payment does not belong to this booking.');
    }

    if (PAID_MOYASAR_STATUSES.has(status)) {
      await markMoyasarBookingPaid(bookingRef, booking, payment, paymentId);
      return { status: 'paid', bookingId, orderNumber: booking.orderNumber, paymentId };
    }

    if (FAILED_MOYASAR_STATUSES.has(status)) {
      await bookingRef.set({
        paymentStatus: 'failed',
        paymentProvider: 'moyasar',
        paymentId,
        updatedAt: FieldValue.serverTimestamp(),
      }, { merge: true });
      return { status: 'failed', bookingId, paymentId };
    }

    await bookingRef.set({
      paymentId,
      paymentProvider: 'moyasar',
      paymentMethod: 'moyasar',
      updatedAt: FieldValue.serverTimestamp(),
    }, { merge: true });

    return { status: 'pending', bookingId, paymentId };
  },
);

exports.exchangeClerkSession = onCall(
  { region: 'us-central1', secrets: [CLERK_SECRET_KEY] },
  async (request) => {
    const clerkToken = String(request.data?.clerkToken || '').trim();
    if (!clerkToken) {
      throw new HttpsError('unauthenticated', 'Missing Clerk session token.');
    }

    const { createClerkClient, verifyToken } = require('@clerk/backend');
    let payload;
    try {
      payload = await verifyToken(clerkToken, { secretKey: CLERK_SECRET_KEY.value() });
    } catch (error) {
      console.error('Clerk token verify failed', error);
      throw new HttpsError('unauthenticated', 'Invalid Clerk session.');
    }

    const clerk = createClerkClient({ secretKey: CLERK_SECRET_KEY.value() });
    const clerkUser = await clerk.users.getUser(payload.sub);
    const email = String(
      clerkUser.primaryEmailAddress?.emailAddress
      || clerkUser.emailAddresses?.[0]?.emailAddress
      || '',
    ).trim().toLowerCase();

    if (!email) {
      throw new HttpsError('failed-precondition', 'Clerk account has no email.');
    }
    if (email === ADMIN_EMAIL) {
      throw new HttpsError('permission-denied', 'Use the admin login for this account.');
    }

    const displayName = String(request.data?.displayName || '').trim()
      || [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(' ').trim()
      || clerkUser.username
      || '';
    const phone = String(request.data?.phone || clerkUser.unsafeMetadata?.phone || '').trim();
    const authProvider = String(request.data?.authProvider || 'clerk').trim() || 'clerk';
    const language = request.data?.language === 'en' ? 'en' : 'ar';

    let user;
    let isNew = false;
    try {
      user = await getAuth().getUserByEmail(email);
      if (user.disabled) throw new HttpsError('permission-denied', 'This account is disabled.');
      if (!user.emailVerified) {
        user = await getAuth().updateUser(user.uid, { emailVerified: true, displayName: displayName || user.displayName });
      } else if (displayName && user.displayName !== displayName) {
        user = await getAuth().updateUser(user.uid, { displayName });
      }
    } catch (error) {
      if (error instanceof HttpsError) throw error;
      if (error?.code !== 'auth/user-not-found') throw error;
      user = await getAuth().createUser({
        email,
        emailVerified: true,
        displayName: displayName || undefined,
      });
      isNew = true;
    }

    const userRef = db.collection('users').doc(user.uid);
    const existing = await userRef.get();
    const payloadDoc = {
      email,
      clerkUserId: clerkUser.id,
      authProvider,
      language,
      updatedAt: FieldValue.serverTimestamp(),
    };
    if (displayName) payloadDoc.displayName = displayName;
    if (phone) payloadDoc.phone = phone;
    if (clerkUser.imageUrl) payloadDoc.photoURL = clerkUser.imageUrl;
    if (!existing.exists) {
      payloadDoc.createdAt = FieldValue.serverTimestamp();
      if (!payloadDoc.phone) payloadDoc.phone = '';
      if (!payloadDoc.displayName) payloadDoc.displayName = '';
    }
    await userRef.set(payloadDoc, { merge: true });

    if (isNew || !existing.exists) {
      try {
        await db.collection('activityLog').add({
          type: 'user_registered',
          userId: user.uid,
          email,
          authProvider,
          createdAt: FieldValue.serverTimestamp(),
        });
      } catch {
        // optional
      }
    }

    await recordLoginActivity(user.uid, request, request.data?.clientMeta || {});

    const token = await getAuth().createCustomToken(user.uid, {
      authProvider,
      clerkUserId: clerkUser.id,
    });
    return { token, isNew: isNew || !existing.exists, uid: user.uid };
  },
);

/** Deliver order / payment emails queued by the web app (not Clerk). */
exports.deliverEmailQueue = onDocumentCreated(
  {
    document: 'emailQueue/{emailId}',
    region: 'us-central1',
    secrets: [SMTP_USER, SMTP_PASSWORD],
  },
  async (event) => {
    const snap = event.data;
    if (!snap) return;
    const data = snap.data() || {};
    if (!data.to || !data.subject || !data.html) {
      await snap.ref.set({
        status: 'failed',
        error: 'Missing to/subject/html',
        updatedAt: FieldValue.serverTimestamp(),
      }, { merge: true });
      return;
    }
    if (data.status === 'sent') return;

    await snap.ref.set({ status: 'sending', updatedAt: FieldValue.serverTimestamp() }, { merge: true });
    try {
      await sendBrandedMail({
        to: data.to,
        subject: data.subject,
        html: data.html,
        text: data.text || data.subject,
        fromEmail: data.from,
        fromName: data.fromName,
        replyTo: data.replyTo,
      });
      await snap.ref.set({
        status: 'sent',
        sentAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
        error: FieldValue.delete(),
      }, { merge: true });
    } catch (error) {
      console.error('emailQueue delivery failed', event.params.emailId, error);
      await snap.ref.set({
        status: 'failed',
        error: String(error?.message || error).slice(0, 500),
        updatedAt: FieldValue.serverTimestamp(),
      }, { merge: true });
    }
  },
);

const BACKUP_APP_ID = 'bashayer-saudia';
const FULL_BACKUP_VERSION = 2;
const BACKUP_PREFIX = 'system-backups/';
const BACKUP_EXCLUDED_COLLECTIONS = new Set([
  'otpChallenges',
  'otpRateLimits',
  'emailQueue',
]);
const MAX_BACKUP_BYTES = 1024 * 1024 * 1024;

function requireSuperAdmin(request) {
  const email = String(request.auth?.token?.email || '').trim().toLowerCase();
  if (!request.auth || email !== ADMIN_EMAIL || request.auth.uid !== ADMIN_UID) {
    throw new HttpsError('permission-denied', 'SuperAdmin access is required.');
  }
  return request.auth.uid;
}

function serializeFirestoreValue(value) {
  if (value == null) return value;
  if (Buffer.isBuffer(value) || value instanceof Uint8Array) {
    return { __type: 'bytes', value: Buffer.from(value).toString('base64') };
  }
  if (value instanceof Date) {
    return { __type: 'date', value: value.toISOString() };
  }
  if (typeof value?.toDate === 'function' && typeof value?.seconds === 'number') {
    return { __type: 'timestamp', value: value.toDate().toISOString() };
  }
  if (
    typeof value?.latitude === 'number'
    && typeof value?.longitude === 'number'
    && value.constructor?.name === 'GeoPoint'
  ) {
    return { __type: 'geopoint', latitude: value.latitude, longitude: value.longitude };
  }
  if (typeof value?.path === 'string' && value.constructor?.name === 'DocumentReference') {
    return { __type: 'reference', path: value.path };
  }
  if (Array.isArray(value)) return value.map(serializeFirestoreValue);
  if (typeof value === 'object') {
    const output = {};
    for (const [key, nested] of Object.entries(value)) {
      output[key] = serializeFirestoreValue(nested);
    }
    return output;
  }
  return value;
}

function deserializeFirestoreValue(value) {
  if (value == null) return value;
  if (Array.isArray(value)) return value.map(deserializeFirestoreValue);
  if (typeof value !== 'object') return value;
  if (value.__type === 'timestamp') {
    return require('firebase-admin/firestore').Timestamp.fromDate(new Date(value.value));
  }
  if (value.__type === 'date') return new Date(value.value);
  if (value.__type === 'bytes') return Buffer.from(value.value, 'base64');
  if (value.__type === 'geopoint') {
    return new (require('firebase-admin/firestore').GeoPoint)(value.latitude, value.longitude);
  }
  if (value.__type === 'reference') return db.doc(value.path);
  const output = {};
  for (const [key, nested] of Object.entries(value)) {
    output[key] = deserializeFirestoreValue(nested);
  }
  return output;
}

async function collectCollectionTree(collectionRef, documents, collectionPaths) {
  collectionPaths.add(collectionRef.path);
  const snapshot = await collectionRef.get();
  for (const documentSnapshot of snapshot.docs) {
    documents.push({
      path: documentSnapshot.ref.path,
      data: serializeFirestoreValue(documentSnapshot.data()),
    });
    const childCollections = await documentSnapshot.ref.listCollections();
    for (const child of childCollections) {
      await collectCollectionTree(child, documents, collectionPaths);
    }
  }
}

async function collectFirestoreBackup() {
  const documents = [];
  const collectionPaths = new Set();
  const roots = await db.listCollections();
  for (const root of roots) {
    if (!BACKUP_EXCLUDED_COLLECTIONS.has(root.id)) {
      await collectCollectionTree(root, documents, collectionPaths);
    }
  }
  return {
    documents,
    collectionPaths: [...collectionPaths].sort(),
    rootCollections: roots
      .map((item) => item.id)
      .filter((id) => !BACKUP_EXCLUDED_COLLECTIONS.has(id))
      .sort(),
  };
}

function archiveStoragePath(index, name) {
  const extension = path.posix.extname(name).slice(0, 16);
  return `storage/files/${String(index).padStart(8, '0')}${extension}`;
}

async function listStorageBackupFiles(bucket) {
  const [files] = await bucket.getFiles();
  const result = [];
  for (const file of files) {
    if (file.name.startsWith(BACKUP_PREFIX)) continue;
    const [metadata] = await file.getMetadata();
    const size = Number(metadata.size || 0);
    result.push({
      name: file.name,
      size,
      contentType: metadata.contentType || 'application/octet-stream',
      cacheControl: metadata.cacheControl || '',
      contentDisposition: metadata.contentDisposition || '',
      metadata: metadata.metadata || {},
      archivePath: archiveStoragePath(result.length, file.name),
    });
  }
  return result;
}

async function deleteFilesInChunks(files) {
  for (let index = 0; index < files.length; index += 25) {
    await Promise.all(files.slice(index, index + 25).map((file) => file.delete({ ignoreNotFound: true })));
  }
}

exports.createFullBackup = onCall(
  {
    region: 'us-central1',
    timeoutSeconds: 540,
    memory: '2GiB',
  },
  async (request) => {
    const uid = requireSuperAdmin(request);
    const bucket = getStorage().bucket();
    const [firestoreData, storageFiles] = await Promise.all([
      collectFirestoreBackup(),
      listStorageBackupFiles(bucket),
    ]);
    const storageBytes = storageFiles.reduce((sum, file) => sum + file.size, 0);
    if (storageBytes > MAX_BACKUP_BYTES) {
      throw new HttpsError('resource-exhausted', 'Storage backup is larger than 1 GB.');
    }

    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupName = `bashayer-full-backup-${stamp}.zip`;
    const objectPath = `${BACKUP_PREFIX}${uid}/${backupName}`;
    const output = bucket.file(objectPath).createWriteStream({
      resumable: false,
      contentType: 'application/zip',
      metadata: {
        cacheControl: 'private, no-store, max-age=0',
        metadata: { backupVersion: String(FULL_BACKUP_VERSION), ownerUid: uid },
      },
    });
    const archive = archiver('zip', { zlib: { level: 6 } });
    archive.on('warning', (error) => console.warn('Backup archive warning', error));
    archive.on('error', (error) => output.destroy(error));
    archive.pipe(output);
    const completed = finished(output);

    const manifest = {
      app: BACKUP_APP_ID,
      version: FULL_BACKUP_VERSION,
      kind: 'all-in-one-migration',
      exportedAt: new Date().toISOString(),
      projectId: process.env.GCLOUD_PROJECT || '',
      includes: {
        database: true,
        content: true,
        settings: true,
        imageUrls: true,
        firebaseStorageFiles: true,
      },
      firestore: {
        documentCount: firestoreData.documents.length,
        rootCollections: firestoreData.rootCollections,
        collectionPaths: firestoreData.collectionPaths,
      },
      storage: {
        fileCount: storageFiles.length,
        totalBytes: storageBytes,
        files: storageFiles,
      },
      exclusions: {
        firestoreCollections: [...BACKUP_EXCLUDED_COLLECTIONS],
        firebaseAuthCredentials: true,
        cloudFunctionSecrets: true,
        deployedApplicationCode: true,
        imgbbBinaryFiles: true,
      },
    };

    archive.append(JSON.stringify(manifest, null, 2), { name: 'manifest.json' });
    archive.append(JSON.stringify(firestoreData.documents), { name: 'firestore/documents.json' });
    for (const item of storageFiles) {
      archive.append(bucket.file(item.name).createReadStream(), { name: item.archivePath });
    }
    await archive.finalize();
    await completed;

    const [metadata] = await bucket.file(objectPath).getMetadata();
    return {
      path: objectPath,
      name: backupName,
      size: Number(metadata.size || 0),
      summary: {
        documents: firestoreData.documents.length,
        files: storageFiles.length,
        storageBytes,
      },
    };
  },
);

function validateBackupObjectPath(objectPath, uid) {
  const expectedPrefix = `${BACKUP_PREFIX}${uid}/`;
  if (
    !objectPath.startsWith(expectedPrefix)
    || objectPath.includes('..')
    || !objectPath.toLowerCase().endsWith('.zip')
  ) {
    throw new HttpsError('invalid-argument', 'Invalid backup file path.');
  }
}

async function clearFirestoreCollections(collectionNames) {
  const currentRoots = await db.listCollections();
  const names = new Set([
    ...collectionNames,
    ...currentRoots.map((collectionRef) => collectionRef.id),
  ]);
  for (const name of names) {
    if (BACKUP_EXCLUDED_COLLECTIONS.has(name)) continue;
    await db.recursiveDelete(db.collection(name));
  }
}

async function restoreFirestoreDocuments(documents, merge) {
  const sorted = [...documents].sort(
    (left, right) => left.path.split('/').length - right.path.split('/').length,
  );
  let written = 0;
  for (let index = 0; index < sorted.length; index += 400) {
    const batch = db.batch();
    for (const item of sorted.slice(index, index + 400)) {
      if (!item?.path || item.path.split('/').length % 2 !== 0 || !item.data) continue;
      batch.set(db.doc(item.path), deserializeFirestoreValue(item.data), { merge });
      written += 1;
    }
    await batch.commit();
  }
  return written;
}

exports.restoreFullBackup = onCall(
  {
    region: 'us-central1',
    timeoutSeconds: 540,
    memory: '2GiB',
  },
  async (request) => {
    const uid = requireSuperAdmin(request);
    const objectPath = String(request.data?.path || '');
    const mode = request.data?.mode === 'replace' ? 'replace' : 'merge';
    if (mode === 'replace' && request.data?.confirmation !== 'RESTORE') {
      throw new HttpsError('failed-precondition', 'Type RESTORE to confirm replacement.');
    }
    validateBackupObjectPath(objectPath, uid);

    const bucket = getStorage().bucket();
    const sourceFile = bucket.file(objectPath);
    const [sourceMetadata] = await sourceFile.getMetadata();
    if (Number(sourceMetadata.size || 0) > MAX_BACKUP_BYTES) {
      throw new HttpsError('resource-exhausted', 'Backup file is larger than 1 GB.');
    }

    const localPath = path.join(os.tmpdir(), `backup-${crypto.randomUUID()}.zip`);
    try {
      await sourceFile.download({ destination: localPath });
      const zip = await unzipper.Open.file(localPath);
      const manifestEntry = zip.files.find((entry) => entry.path === 'manifest.json');
      const firestoreEntry = zip.files.find((entry) => entry.path === 'firestore/documents.json');
      if (!manifestEntry || !firestoreEntry) {
        throw new HttpsError('invalid-argument', 'Backup archive is incomplete.');
      }

      const manifest = JSON.parse((await manifestEntry.buffer()).toString('utf8'));
      if (manifest.app !== BACKUP_APP_ID || manifest.version !== FULL_BACKUP_VERSION) {
        throw new HttpsError('failed-precondition', 'This backup is not compatible with this app.');
      }
      const documents = JSON.parse((await firestoreEntry.buffer()).toString('utf8'));
      if (!Array.isArray(documents)) {
        throw new HttpsError('invalid-argument', 'Firestore backup data is invalid.');
      }

      if (mode === 'replace') {
        await clearFirestoreCollections(manifest.firestore?.rootCollections || []);
        const [currentFiles] = await bucket.getFiles();
        await deleteFilesInChunks(currentFiles.filter((file) => !file.name.startsWith(BACKUP_PREFIX)));
      }

      const writtenDocuments = await restoreFirestoreDocuments(documents, mode === 'merge');
      let writtenFiles = 0;
      for (const item of manifest.storage?.files || []) {
        if (
          !item?.name
          || item.name.startsWith(BACKUP_PREFIX)
          || item.name.includes('..')
          || !item.archivePath?.startsWith('storage/files/')
        ) {
          continue;
        }
        const entry = zip.files.find((candidate) => candidate.path === item.archivePath);
        if (!entry || entry.type !== 'File') continue;
        const destination = bucket.file(item.name);
        const writeStream = destination.createWriteStream({
          resumable: false,
          contentType: item.contentType || 'application/octet-stream',
          metadata: {
            cacheControl: item.cacheControl || undefined,
            contentDisposition: item.contentDisposition || undefined,
            metadata: item.metadata || {},
          },
        });
        await pipeline(entry.stream(), writeStream);
        writtenFiles += 1;
      }

      await db.collection('activityLog').add({
        type: 'full_backup_restored',
        mode,
        documents: writtenDocuments,
        files: writtenFiles,
        backupExportedAt: manifest.exportedAt || null,
        createdAt: FieldValue.serverTimestamp(),
      });

      return {
        mode,
        documents: writtenDocuments,
        files: writtenFiles,
        exportedAt: manifest.exportedAt || null,
      };
    } catch (error) {
      if (error instanceof HttpsError) throw error;
      console.error('Full backup restore failed', error);
      throw new HttpsError('internal', 'The backup could not be restored.');
    } finally {
      await fs.rm(localPath, { force: true }).catch(() => {});
      if (path.posix.basename(objectPath).startsWith('import-')) {
        await sourceFile.delete({ ignoreNotFound: true }).catch(() => {});
      }
    }
  },
);
