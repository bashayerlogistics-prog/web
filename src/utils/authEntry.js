const HAS_ACCOUNT_KEY = 'bashayer_has_account';
const AUTH_REDIRECT_KEY = 'bashayer_auth_redirect';

const AUTH_SCREENS = ['/login', '/register', '/sso-callback', '/forgot-password'];

export function hasReturningAccount() {
  try {
    return localStorage.getItem(HAS_ACCOUNT_KEY) === '1';
  } catch {
    return false;
  }
}

export function markHasAccount() {
  try {
    localStorage.setItem(HAS_ACCOUNT_KEY, '1');
  } catch {
    /* ignore quota / private mode */
  }
}

/** First-time visitors land on register; returning users on login. */
export function getAccountEntryPath() {
  return hasReturningAccount() ? '/login' : '/register';
}

function isAuthScreenPath(path) {
  const pathname = String(path || '').split('?')[0];
  return AUTH_SCREENS.some((screen) => pathname === screen || pathname.startsWith(`${screen}/`));
}

/**
 * Never send users to home `/` after auth — use cart (if items) or dashboard.
 */
export function normalizePostAuthPath(path, { cartCount = 0 } = {}) {
  const raw = String(path || '').trim();
  const pathname = raw.split('?')[0] || '';
  if (!pathname || pathname === '/' || isAuthScreenPath(pathname)) {
    return cartCount > 0 ? '/cart' : '/dashboard';
  }
  return raw.startsWith('/') ? raw : `/${raw}`;
}

export function setAuthRedirect(path) {
  try {
    sessionStorage.setItem(AUTH_REDIRECT_KEY, normalizePostAuthPath(path));
  } catch {
    /* ignore */
  }
}

export function peekAuthRedirect() {
  try {
    return sessionStorage.getItem(AUTH_REDIRECT_KEY) || '';
  } catch {
    return '';
  }
}

export function consumeAuthRedirect(fallback = '/dashboard', opts = {}) {
  let stored = '';
  try {
    stored = sessionStorage.getItem(AUTH_REDIRECT_KEY) || '';
    sessionStorage.removeItem(AUTH_REDIRECT_KEY);
  } catch {
    stored = '';
  }
  return normalizePostAuthPath(stored || fallback, opts);
}

/** Resolve post-login destination from router state, session, or cart. */
export function resolveRedirectTarget(redirectFrom, opts = {}) {
  if (redirectFrom?.pathname) {
    const path = `${redirectFrom.pathname}${redirectFrom.search || ''}`;
    return normalizePostAuthPath(path, opts);
  }
  const stored = peekAuthRedirect();
  if (stored) return normalizePostAuthPath(stored, opts);
  return normalizePostAuthPath('', opts);
}

export function isSessionExistsError(error) {
  const code = String(error?.errors?.[0]?.code || error?.code || '').toLowerCase();
  const message = String(
    error?.errors?.[0]?.longMessage
    || error?.errors?.[0]?.message
    || error?.message
    || '',
  ).toLowerCase();
  return (
    code.includes('session_exists')
    || message.includes('already signed in')
    || message.includes('session already exists')
  );
}
