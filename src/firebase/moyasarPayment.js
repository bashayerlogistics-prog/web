/**
 * Mark Moyasar payments paid via Hostinger PHP (Spark-safe, no Cloud Functions).
 * Secret key never leaves the PHP file on Hostinger.
 */

function env(name) {
  return String(import.meta.env[name] || '').trim();
}

export function getMoyasarVerifyUrl() {
  const fromEnv = env('VITE_MOYASAR_VERIFY_URL');
  if (fromEnv) return fromEnv;
  if (typeof window !== 'undefined') {
    const host = window.location.hostname;
    if (host && host !== 'localhost' && host !== '127.0.0.1') {
      return `${window.location.origin}/moyasar-verify.php`;
    }
  }
  return 'https://bashayer-logistics.com/moyasar-verify.php';
}

/**
 * Server-side Moyasar verification — never mark orders paid from the client alone.
 * @returns {{ status: 'paid'|'pending'|'failed', bookingId: string, paymentId?: string, orderNumber?: number }}
 */
export async function verifyMoyasarPayment({ bookingId, paymentId }) {
  const url = getMoyasarVerifyUrl();
  const secret = env('VITE_EMAIL_WEBHOOK_SECRET');
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(secret ? { 'X-Webhook-Secret': secret } : {}),
    },
    body: JSON.stringify({ bookingId, paymentId }),
  });

  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { error: text };
  }

  if (!res.ok) {
    const err = new Error(data?.error || `Payment verify failed (${res.status})`);
    err.code = data?.code ? `functions/${data.code}` : 'functions/internal';
    throw err;
  }

  return data;
}
