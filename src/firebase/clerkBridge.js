import { getFunctions, httpsCallable } from 'firebase/functions';
import { app } from './app';

const functions = getFunctions(app, 'us-central1');
const exchangeCallable = httpsCallable(functions, 'exchangeClerkSession');

function getClientMeta() {
  if (typeof navigator === 'undefined') return {};
  let timezone = '';
  try {
    timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
  } catch {
    timezone = '';
  }
  return {
    userAgent: navigator.userAgent || '',
    platform: navigator.platform || navigator.userAgentData?.platform || '',
    language: navigator.language || '',
    timezone,
  };
}

function resolveExchangeUrl() {
  const fromEnv = String(import.meta.env.VITE_CLERK_EXCHANGE_URL || '').trim();
  if (fromEnv) return fromEnv;
  if (typeof window !== 'undefined' && window.location?.origin) {
    return `${window.location.origin}/clerk-exchange.php`;
  }
  return '/clerk-exchange.php';
}

async function exchangeViaHostinger(clerkToken, profile = {}) {
  const url = resolveExchangeUrl();
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      clerkToken,
      displayName: profile.displayName || '',
      phone: profile.phone || '',
      authProvider: profile.authProvider || 'clerk',
      language: profile.language || localStorage.getItem('language') || 'ar',
      clientMeta: getClientMeta(),
    }),
  });

  let data = null;
  try {
    data = await response.json();
  } catch {
    data = null;
  }

  if (response.ok && data?.token) {
    return data;
  }

  const err = new Error(data?.error || `Clerk bridge HTTP ${response.status}`);
  err.code = data?.code || `http/${response.status}`;
  err.status = response.status;
  err.details = data;
  throw err;
}

async function exchangeViaFirebaseCallable(clerkToken, profile = {}) {
  const result = await exchangeCallable({
    clerkToken,
    displayName: profile.displayName || '',
    phone: profile.phone || '',
    authProvider: profile.authProvider || 'clerk',
    language: profile.language || localStorage.getItem('language') || 'ar',
    clientMeta: getClientMeta(),
  });
  return result.data;
}

/**
 * Prefer Hostinger PHP bridge (works on Spark / no Blaze).
 * Fall back to Firebase callable if PHP is not configured yet.
 */
export async function exchangeClerkSession(clerkToken, profile = {}) {
  try {
    return await exchangeViaHostinger(clerkToken, profile);
  } catch (hostingerError) {
    const code = String(hostingerError?.code || '');
    const status = Number(hostingerError?.status || 0);
    const canFallback = code === 'failed-precondition'
      || status === 404
      || status === 405
      || status === 503;

    if (!canFallback) {
      throw hostingerError;
    }

    try {
      return await exchangeViaFirebaseCallable(clerkToken, profile);
    } catch (callableError) {
      console.error('Firebase callable exchangeClerkSession failed:', callableError);
      const err = new Error(
        hostingerError?.message
        || callableError?.message
        || 'Could not link Clerk session to Firebase.',
      );
      err.code = hostingerError?.code || callableError?.code || 'auth/bridge-failed';
      err.cause = callableError;
      throw err;
    }
  }
}
