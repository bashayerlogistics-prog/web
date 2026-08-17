export const ADMIN_SESSION_KEY = 'bashayer_admin_session';

export function hasAdminSessionFlag() {
  try {
    return localStorage.getItem(ADMIN_SESSION_KEY) === 'true';
  } catch {
    return false;
  }
}
