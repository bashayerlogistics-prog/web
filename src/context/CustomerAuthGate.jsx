import { lazy, Suspense, useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { AuthContext } from './AuthContext';

const AUTH_PATHS = [
  '/login',
  '/register',
  '/forgot-password',
  '/sso-callback',
  '/dashboard',
  '/checkout',
  '/cart',
  '/track',
  '/payment',
];

const ClerkAuthTree = lazy(() => import('./ClerkAuthTree'));

const GUEST_AUTH = {
  user: null,
  loading: false,
  clerkUser: null,
  isClerkSignedIn: false,
  syncFirebaseSession: async () => null,
  completeProfile: async () => null,
  logout: async () => {},
};

const LOADING_AUTH = {
  ...GUEST_AUTH,
  loading: true,
};

function pathNeedsCustomerAuth(pathname) {
  return AUTH_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`));
}

function hasClerkSessionHint() {
  try {
    return document.cookie.split(';').some((part) => {
      const name = part.trim();
      return (
        name.startsWith('__session')
        || name.startsWith('__client_uat')
        || name.startsWith('__clerk')
      );
    });
  } catch {
    return false;
  }
}

function LoadingAuthProvider({ children }) {
  return <AuthContext.Provider value={LOADING_AUTH}>{children}</AuthContext.Provider>;
}

function GuestAuthProvider({ children }) {
  return <AuthContext.Provider value={GUEST_AUTH}>{children}</AuthContext.Provider>;
}

/**
 * Home/gallery visitors never download Clerk. Auth JS loads only on login
 * routes, checkout, or when a Clerk session cookie already exists.
 */
export default function CustomerAuthGate({ children }) {
  const { pathname } = useLocation();
  const required = pathNeedsCustomerAuth(pathname) || hasClerkSessionHint();
  const [loadClerk, setLoadClerk] = useState(required);

  useEffect(() => {
    if (loadClerk) return;
    if (pathNeedsCustomerAuth(pathname) || hasClerkSessionHint()) {
      setLoadClerk(true);
    }
  }, [pathname, loadClerk]);

  if (!loadClerk) {
    return <GuestAuthProvider>{children}</GuestAuthProvider>;
  }

  return (
    <Suspense fallback={<LoadingAuthProvider>{children}</LoadingAuthProvider>}>
      <ClerkAuthTree>{children}</ClerkAuthTree>
    </Suspense>
  );
}
