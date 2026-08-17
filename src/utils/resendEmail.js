/**
 * Order emails via Resend.
 * Free path (no Firebase Blaze): Hostinger PHP webhook calls Resend with the secret API key.
 * Optional direct browser call exists only for local experiments (API key would be exposed).
 */

const RESEND_API = 'https://api.resend.com/emails';

function env(name) {
  return String(import.meta.env[name] || '').trim();
}

export function getResendWebhookUrl(settings) {
  return (
    settings?.email?.webhookUrl?.trim()
    || env('VITE_RESEND_WEBHOOK_URL')
    || ''
  );
}

export function getResendFrom(settings) {
  const email = settings?.email || {};
  return {
    fromEmail: email.fromEmail || env('VITE_RESEND_FROM_EMAIL') || 'onboarding@resend.dev',
    fromName:
      email.fromName?.en
      || email.fromName?.ar
      || email.brandName?.en
      || email.brandName?.ar
      || 'Bashayer Al-Ataa',
    replyTo: email.replyTo || email.fromEmail || env('VITE_RESEND_FROM_EMAIL') || undefined,
  };
}

async function postJson(url, body, headers = {}) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { raw: text };
  }
  if (!res.ok) {
    const msg = data?.message || data?.error || text || `HTTP ${res.status}`;
    throw new Error(msg);
  }
  return data;
}

/** Preferred: Hostinger (or any) webhook that holds the Resend API key server-side. */
async function sendViaWebhook(webhookUrl, payload, settings) {
  const { fromEmail, fromName, replyTo } = getResendFrom(settings);
  const secret = env('VITE_EMAIL_WEBHOOK_SECRET');
  await postJson(
    webhookUrl,
    {
      to: payload.to,
      subject: payload.subject,
      html: payload.html,
      from: fromEmail,
      fromName,
      replyTo,
      type: payload.type,
      bookingId: payload.bookingId,
      orderNumber: payload.orderNumber,
    },
    secret ? { 'X-Webhook-Secret': secret } : {},
  );
}

/**
 * Direct Resend API from the browser. Requires VITE_RESEND_API_KEY.
 * Not recommended for production (key is visible in the built JS).
 */
async function sendViaResendApi(payload, settings) {
  const apiKey = env('VITE_RESEND_API_KEY');
  if (!apiKey) throw new Error('Missing VITE_RESEND_API_KEY');

  const { fromEmail, fromName, replyTo } = getResendFrom(settings);
  const from = fromName ? `${fromName} <${fromEmail}>` : fromEmail;

  await postJson(
    RESEND_API,
    {
      from,
      to: [payload.to],
      subject: payload.subject,
      html: payload.html,
      reply_to: replyTo || undefined,
    },
    { Authorization: `Bearer ${apiKey}` },
  );
}

/**
 * Send one order/payment email. Returns { ok, via } or throws.
 */
export async function sendOrderEmailWithResend(payload, settings) {
  const webhook = getResendWebhookUrl(settings);
  if (webhook) {
    await sendViaWebhook(webhook, payload, settings);
    return { ok: true, via: 'webhook' };
  }
  if (env('VITE_RESEND_API_KEY')) {
    await sendViaResendApi(payload, settings);
    return { ok: true, via: 'resend-api' };
  }
  return { ok: false, via: 'skipped', reason: 'No Resend webhook or API key configured' };
}
