import { auth } from './auth';
import { ADMIN_SESSION_KEY } from '../constants/adminSession';

export const ADMIN_EMAIL = (import.meta.env.VITE_SUPERADMIN_EMAIL || 'sulemanmr551@gmail.com').trim().toLowerCase();

const ADMIN_SESSION_CLEARED_EVENT = 'bashayer-admin-session-cleared';

/** Same check as firestore.rules isAdmin() — email only. Env UID drift must not block writes. */
export function isFirebaseAdminUser(user) {
  return Boolean(user?.email) && user.email.toLowerCase() === ADMIN_EMAIL;
}

export function clearAdminSessionFlag() {
  try {
    localStorage.removeItem(ADMIN_SESSION_KEY);
  } catch {
    // ignore
  }
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(ADMIN_SESSION_CLEARED_EVENT));
  }
}

export function subscribeAdminSessionCleared(onClear) {
  if (typeof window === 'undefined') return () => {};
  window.addEventListener(ADMIN_SESSION_CLEARED_EVENT, onClear);
  return () => window.removeEventListener(ADMIN_SESSION_CLEARED_EVENT, onClear);
}

/** Wait until Firebase Auth is restored, then require a live Super Admin token. */
export async function waitForAdminAuth() {
  if (typeof auth.authStateReady === 'function') {
    await auth.authStateReady();
  }
  const user = auth.currentUser;
  if (!isFirebaseAdminUser(user)) {
    clearAdminSessionFlag();
    const err = new Error('unauthenticated');
    err.code = 'unauthenticated';
    throw err;
  }
  await user.getIdToken();
  return user;
}
