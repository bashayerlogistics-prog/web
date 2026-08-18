import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  addDoc,
  collection,
  serverTimestamp,
  runTransaction,
} from 'firebase/firestore';
import { db } from './db';
import { uploadImage } from './storage';
import { logActivity, sendNotification, addBookingTimelineEntry } from './admin';
import {
  getPendingOrders,
  isRetryableFirebaseError,
  queuePendingOrder,
  removePendingOrder,
} from '../utils/offlineOrderQueue';
import { DEFAULT_PAYMENT_SETTINGS, createEmptySaudiBank } from '../data/paymentDefaults';
import {
  buildOrderPlacedEmail,
  buildPaymentPendingEmail,
  buildPaymentConfirmedEmail,
} from '../utils/emailTemplates';
import { formatOrderNumber } from '../utils/orderHelpers';
import { sendOrderEmailWithResend } from '../utils/resendEmail';

const PAYMENT_DOC = doc(db, 'siteSettings', 'payment');

function normalizePaymentSettings(data = {}) {
  const legacyBank = {
    ...createEmptySaudiBank(),
    id: 'legacy-default',
    bankName: data.bankName || DEFAULT_PAYMENT_SETTINGS.bankName,
    accountHolder: data.accountHolder || DEFAULT_PAYMENT_SETTINGS.accountHolder,
    iban: data.iban || '',
    accountNumber: data.accountNumber || '',
    isDefault: true,
    active: true,
  };
  const banks = Array.isArray(data.banks) && data.banks.length
    ? data.banks.map((bank, index) => ({
      ...createEmptySaudiBank(),
      ...bank,
      bankName: { ...legacyBank.bankName, ...bank.bankName },
      accountHolder: { ...legacyBank.accountHolder, ...bank.accountHolder },
      isDefault: Boolean(bank.isDefault),
      active: bank.active !== false,
      id: bank.id || `bank-${index + 1}`,
    }))
    : [legacyBank];
  const defaultBank = banks.find((bank) => bank.isDefault) || banks[0];

  return {
    ...DEFAULT_PAYMENT_SETTINGS,
    ...data,
    banks: banks.map((bank) => ({ ...bank, isDefault: bank.id === defaultBank.id })),
    bankName: defaultBank.bankName,
    accountHolder: defaultBank.accountHolder,
    iban: defaultBank.iban,
    accountNumber: defaultBank.accountNumber,
    moyasar: {
      ...DEFAULT_PAYMENT_SETTINGS.moyasar,
      ...(data.moyasar || {}),
      enabled: data.methods?.onlineGateway ?? DEFAULT_PAYMENT_SETTINGS.methods.onlineGateway,
    },
  };
}

export async function getPaymentSettings() {
  try {
    const snap = await getDoc(PAYMENT_DOC);
    if (!snap.exists()) return { ...DEFAULT_PAYMENT_SETTINGS };
    return normalizePaymentSettings(snap.data());
  } catch {
    return { ...DEFAULT_PAYMENT_SETTINGS };
  }
}

export async function updatePaymentSettings(data) {
  const normalized = normalizePaymentSettings(data);
  await setDoc(PAYMENT_DOC, { ...normalized, updatedAt: serverTimestamp() }, { merge: true });
  await logActivity('payment_settings_updated', {});
}

async function getNextOrderNumber() {
  const counterRef = doc(db, 'counters', 'bookings');
  return runTransaction(db, async (transaction) => {
    const snap = await transaction.get(counterRef);
    const last = snap.exists() ? (snap.data().last || 0) : 0;
    const next = last + 1;
    transaction.set(counterRef, { last: next }, { merge: true });
    return next;
  });
}

async function queueEmail({ to, subject, html, type, bookingId, orderNumber }, settings) {
  const email = settings?.email || {};
  const fromName = email.fromName?.ar || email.fromName?.en || email.brandName?.ar || email.brandName?.en || '';
  await addDoc(collection(db, 'emailQueue'), {
    to,
    subject,
    html,
    from: email.fromEmail || '',
    fromName,
    replyTo: email.replyTo || email.fromEmail || '',
    type,
    bookingId,
    orderNumber,
    status: 'queued',
    createdAt: serverTimestamp(),
  });
}

async function dispatchEmail(payload, settings) {
  await queueEmail(payload, settings);
  try {
    const result = await sendOrderEmailWithResend(payload, settings);
    if (!result.ok) {
      console.warn('Order email not sent:', result.reason);
    }
  } catch (err) {
    console.warn('Resend email failed:', err.message);
  }
}

async function notifyOrderEmails(type, booking, orderNumber, settings) {
  const orderDisplayId = formatOrderNumber(orderNumber);
  const email = String(booking.customerEmail || '').trim().toLowerCase();
  if (!email) {
    console.warn('Order email skipped — missing customerEmail', { type, bookingId: booking.id, orderNumber });
    return;
  }

  const preferred = booking.language === 'en' ? 'en' : 'ar';
  const langs = preferred === 'en' ? ['en', 'ar'] : ['ar', 'en'];
  for (const lang of langs) {
    let template;
    if (type === 'order_placed') {
      template = buildOrderPlacedEmail({ booking, orderDisplayId, settings, lang });
    } else if (type === 'payment_pending') {
      template = buildPaymentPendingEmail({ booking, orderDisplayId, settings, lang });
    } else if (type === 'payment_confirmed') {
      template = buildPaymentConfirmedEmail({ booking, orderDisplayId, settings, lang });
    } else {
      continue;
    }
    await dispatchEmail({
      to: email,
      subject: template.subject,
      html: template.html,
      type,
      bookingId: booking.id,
      orderNumber,
    }, settings);
  }
}

async function sendInAppPaymentNotification(userId, type, bookingId, orderNumber) {
  if (!userId) return;
  const templates = {
    order_placed: {
      title: 'Order Received',
      titleAr: 'تم استلام الطلب',
      message: `Your order #${formatOrderNumber(orderNumber)} has been placed.`,
      messageAr: `تم استلام طلبك #${formatOrderNumber(orderNumber)}.`,
    },
    payment_pending: {
      title: 'Payment Pending',
      titleAr: 'الدفع معلق',
      message: 'Please complete payment or upload your transfer receipt.',
      messageAr: 'يرجى إتمام الدفع أو رفع إيصال التحويل.',
    },
    payment_confirmed: {
      title: 'Payment Confirmed',
      titleAr: 'تم تأكيد الدفع',
      message: 'Your payment is confirmed and your booking is active.',
      messageAr: 'تم تأكيد دفعتك وحجزك نشط الآن.',
    },
    payment_rejected: {
      title: 'Payment Rejected',
      titleAr: 'تم رفض الدفع',
      message: 'Your payment proof was rejected. Please contact support or resubmit.',
      messageAr: 'تم رفض إيصال الدفع. يرجى التواصل معنا أو إعادة الإرسال.',
    },
  };
  const t = templates[type];
  if (!t) return;
  await sendNotification(userId, { ...t, type: 'payment_update', bookingId });
}

function buildOrderPayload(orderData, userId, orderNumber) {
  const hasProof = Boolean(orderData.paymentProofUrl);
  const nowIso = new Date().toISOString();
  const trackingTimeline = [
    { status: 'pending', label: `Order placed via ${orderData.paymentMethod || 'website'}`, at: nowIso },
  ];
  if (hasProof) {
    trackingTimeline.push({ status: 'proof_submitted', label: 'Payment proof uploaded', at: nowIso });
  }
  const payload = {
    ...orderData,
    userId: userId || null,
    isGuest: Boolean(orderData.isGuest ?? !userId),
    orderNumber,
    status: 'pending',
    paymentStatus: orderData.paymentStatus || (hasProof ? 'proof_submitted' : 'pending'),
    trackingTimeline,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
  if (hasProof) payload.paymentProofUploadedAt = serverTimestamp();
  return payload;
}

function createProvisionalOrderNumber() {
  const time = Date.now().toString().slice(-8);
  const random = Math.floor(Math.random() * 100).toString().padStart(2, '0');
  return Number(`${time}${random}`);
}

function withTimeout(promise, timeoutMs = 12_000) {
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      const error = new Error('Firebase request timed out');
      error.code = 'deadline-exceeded';
      setTimeout(() => reject(error), timeoutMs);
    }),
  ]);
}

async function createOrderOnline(orderData, userId, bookingId, fixedOrderNumber = null) {
  const settings = await getPaymentSettings();
  const orderNumber = fixedOrderNumber || await getNextOrderNumber();
  const payload = buildOrderPayload(orderData, userId, orderNumber);
  const bookingRef = doc(db, 'bookings', bookingId);
  await setDoc(bookingRef, payload);

  const booking = { id: bookingId, ...orderData, orderNumber, userId: userId || null };
  // The booking is the critical write. Notifications/email are best effort and
  // must not turn a saved order into a checkout failure.
  await Promise.allSettled([
    logActivity('booking_created', {
      bookingId,
      orderNumber,
      userId: userId || null,
      paymentMethod: orderData.paymentMethod,
    }),
    notifyOrderEmails('order_placed', booking, orderNumber, settings),
    payload.paymentStatus === 'pending' || payload.paymentStatus === 'proof_submitted'
      ? notifyOrderEmails('payment_pending', booking, orderNumber, settings)
      : Promise.resolve(),
    sendInAppPaymentNotification(userId, 'order_placed', bookingId, orderNumber),
  ]);

  return { id: bookingId, orderNumber, queued: false };
}

/** Create booking/order with payment fields — works for guests (userId null) */
export async function createOrderWithPayment(orderData, userId = null, { proofFile = null } = {}) {
  const bookingId = doc(collection(db, 'bookings')).id;
  let preparedOrderData = orderData;
  if (navigator.onLine && proofFile && !orderData.paymentProofUrl) {
    try {
      const paymentProofUrl = await uploadImage(proofFile, 'payment-proofs');
      preparedOrderData = { ...orderData, paymentProofUrl, paymentStatus: 'proof_submitted' };
    } catch (err) {
      console.warn('Payment proof deferred to offline sync:', err?.message);
    }
  }
  if (navigator.onLine) {
    try {
      return await withTimeout(createOrderOnline(preparedOrderData, userId, bookingId));
    } catch (err) {
      if (!isRetryableFirebaseError(err)) throw err;
      console.warn('Order saved to offline outbox:', err?.code || err?.message);
    }
  }

  const orderNumber = createProvisionalOrderNumber();
  await queuePendingOrder({
    bookingId,
    orderNumber,
    userId: userId || null,
    orderData: preparedOrderData,
    proofFile,
    queuedAt: new Date().toISOString(),
  });
  startPendingOrderSync();
  return { id: bookingId, orderNumber, queued: true };
}

let syncPromise = null;

export async function syncPendingOrders() {
  if (!navigator.onLine) return { synced: 0, pending: (await getPendingOrders()).length };
  if (syncPromise) return syncPromise;

  syncPromise = (async () => {
    let synced = 0;
    const queuedOrders = await getPendingOrders();
    for (const queued of queuedOrders) {
      try {
        const existing = await getDoc(doc(db, 'bookings', queued.bookingId));
        if (!existing.exists()) {
          let orderData = queued.orderData;
          if (queued.proofFile && !orderData.paymentProofUrl) {
            const paymentProofUrl = await uploadImage(queued.proofFile, 'payment-proofs');
            orderData = {
              ...orderData,
              paymentProofUrl,
              paymentStatus: 'proof_submitted',
            };
            await queuePendingOrder({ ...queued, orderData, proofFile: null });
          }
          await withTimeout(
            createOrderOnline(
              orderData,
              queued.userId,
              queued.bookingId,
              queued.orderNumber,
            ),
            15_000,
          );
        }
        await removePendingOrder(queued.bookingId);
        synced += 1;
      } catch (err) {
        if (!isRetryableFirebaseError(err)) {
          console.warn('Pending order needs the original signed-in account:', err?.code || err?.message);
        }
        break;
      }
    }
    return { synced, pending: (await getPendingOrders()).length };
  })().finally(() => {
    syncPromise = null;
  });

  return syncPromise;
}

let syncStarted = false;

export function startPendingOrderSync() {
  if (syncStarted || typeof window === 'undefined') return;
  syncStarted = true;
  const sync = () => syncPendingOrders().catch((err) => {
    console.warn('Pending order sync failed:', err?.code || err?.message);
  });
  window.addEventListener('online', sync);
  window.addEventListener('focus', sync);
  setTimeout(sync, 2_000);
  setInterval(sync, 60_000);
}

/** Upload payment proof screenshot (signed-in owner only — Firestore rules enforce) */
export async function submitPaymentProof(bookingId, proofUrl) {
  await updateDoc(doc(db, 'bookings', bookingId), {
    paymentProofUrl: proofUrl,
    paymentProofUploadedAt: serverTimestamp(),
    paymentStatus: 'proof_submitted',
    updatedAt: serverTimestamp(),
  });
  await addBookingTimelineEntry(bookingId, { status: 'proof_submitted', label: 'Payment proof uploaded' });
  await logActivity('payment_proof_submitted', { bookingId });

  const snap = await getDoc(doc(db, 'bookings', bookingId));
  if (snap.exists()) {
    const booking = { id: snap.id, ...snap.data() };
    const settings = await getPaymentSettings();
    await notifyOrderEmails('payment_pending', booking, booking.orderNumber, settings);
    await sendInAppPaymentNotification(booking.userId, 'payment_pending', bookingId, booking.orderNumber);
  }
}

/** Super admin confirms payment */
export async function confirmPayment(bookingId, adminEmail) {
  const snap = await getDoc(doc(db, 'bookings', bookingId));
  if (!snap.exists()) throw new Error('Booking not found');
  const booking = { id: snap.id, ...snap.data() };
  const settings = await getPaymentSettings();

  await updateDoc(doc(db, 'bookings', bookingId), {
    paymentStatus: 'paid',
    status: 'confirmed',
    confirmedBy: adminEmail || 'admin',
    confirmedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  await addBookingTimelineEntry(bookingId, { status: 'paid', label: 'Payment confirmed by admin' });
  await logActivity('payment_confirmed', { bookingId, adminEmail });

  await notifyOrderEmails('payment_confirmed', { ...booking, status: 'confirmed', paymentStatus: 'paid' }, booking.orderNumber, settings);
  await sendInAppPaymentNotification(booking.userId, 'payment_confirmed', bookingId, booking.orderNumber);
  if (booking.userId) {
    await sendNotification(booking.userId, {
      type: 'order_update',
      title: 'Booking Confirmed',
      titleAr: 'تم تأكيد الحجز',
      message: 'Your booking has been confirmed! Our driver will contact you shortly.',
      messageAr: 'تم تأكيد حجزك! سيتواصل معك السائق قريباً.',
      bookingId,
    });
  }
}

/** Super admin rejects payment proof */
export async function rejectPayment(bookingId, reason, adminEmail) {
  const snap = await getDoc(doc(db, 'bookings', bookingId));
  if (!snap.exists()) throw new Error('Booking not found');
  const booking = { id: snap.id, ...snap.data() };

  await updateDoc(doc(db, 'bookings', bookingId), {
    paymentStatus: 'rejected',
    rejectedReason: reason || '',
    confirmedBy: adminEmail || 'admin',
    confirmedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  await addBookingTimelineEntry(bookingId, { status: 'rejected', label: reason || 'Payment rejected' });
  await logActivity('payment_rejected', { bookingId, reason, adminEmail });
  await sendInAppPaymentNotification(booking.userId, 'payment_rejected', bookingId, booking.orderNumber);
}

/** Manual order entry for WhatsApp / phone orders */
export async function createManualOrder(data) {
  const orderNumber = await getNextOrderNumber();
  const ref = await addDoc(collection(db, 'bookings'), {
    ...data,
    orderNumber,
    orderSource: 'manual',
    status: data.status || 'pending',
    paymentStatus: data.paymentStatus || 'pending',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  await addBookingTimelineEntry(ref.id, { status: 'pending', label: 'Manual order created by admin' });
  await logActivity('manual_order_created', { bookingId: ref.id, orderNumber });
  return { id: ref.id, orderNumber };
}
