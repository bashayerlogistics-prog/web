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

export async function exchangeClerkSession(clerkToken, profile = {}) {
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
