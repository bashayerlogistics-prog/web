import { useCallback, useEffect, useRef, useState } from 'react';
import {
  browserLocalPersistence,
  onAuthStateChanged,
  setPersistence,
  signInWithCustomToken,
  signOut,
} from 'firebase/auth';
import { useAuth as useClerkAuth, useClerk, useUser } from '@clerk/clerk-react';
import { auth } from '../firebase/auth';
import { exchangeClerkSession } from '../firebase/clerkBridge';
import { upsertUserDocument } from '../firebase/bookings';
import { hasAdminSessionFlag } from '../constants/adminSession';
import { isFirebaseAdminUser } from '../firebase/adminIdentity';
import { AuthContext } from './AuthContext';

async function waitForClerkToken(getToken, attempts = 8) {
  for (let i = 0; i < attempts; i += 1) {
    try {
      const token = await getToken({ skipCache: i > 0 });
      if (token) return token;
    } catch {
      /* session may still be activating after setActive */
    }
    await new Promise((resolve) => window.setTimeout(resolve, 150 + i * 50));
  }
  return null;
}

export default function CustomerAuthProvider({ children }) {
  const { isLoaded: clerkLoaded, isSignedIn, getToken, sessionId } = useClerkAuth();
  const { user: clerkUser } = useUser();
  const clerk = useClerk();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authReady, setAuthReady] = useState(false);
  const syncingRef = useRef(false);
  const lastClerkIdRef = useRef('');
  const getTokenRef = useRef(getToken);
  getTokenRef.current = getToken;
  const hasClerkSession = Boolean(isSignedIn || sessionId);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setAuthReady(true);
      if (isFirebaseAdminUser(firebaseUser)) {
        setUser(null);
      } else {
        setUser(firebaseUser);
      }
      if (firebaseUser && !isFirebaseAdminUser(firebaseUser)) {
        setLoading(false);
      } else if (clerkLoaded && !isSignedIn && !sessionId) {
        setLoading(false);
      }
    });
    return () => unsubscribe();
  }, [clerkLoaded, isSignedIn, sessionId]);

  useEffect(() => {
    if (!loading && clerkLoaded) return undefined;
    const timeoutId = window.setTimeout(() => {
      console.warn('Auth loading timed out — releasing UI');
      syncingRef.current = false;
      setLoading(false);
    }, 12000);
    return () => window.clearTimeout(timeoutId);
  }, [loading, clerkLoaded]);

  const syncFirebaseSession = useCallback(async (profile = {}) => {
    /* Stale admin Firebase session must not block customer Clerk linking. */
    if (isFirebaseAdminUser(auth.currentUser)) {
      await signOut(auth).catch(() => {});
    }

    /* Do NOT gate on React isSignedIn — after setActive it is often still false for 1–2 renders (mobile worse). */
    const clerkToken = await waitForClerkToken(() => getTokenRef.current());
    if (!clerkToken) {
      const err = new Error('Missing Clerk token');
      err.code = 'auth/missing-clerk-token';
      throw err;
    }

    const exchanged = await exchangeClerkSession(clerkToken, {
      displayName: profile.displayName || '',
      phone: profile.phone || '',
      authProvider: profile.authProvider || 'clerk_email',
      language: profile.language || localStorage.getItem('language') || 'ar',
    });
    const token = exchanged?.token;
    if (!token) {
      const err = new Error('Clerk bridge returned no Firebase token');
      err.code = 'auth/bridge-failed';
      throw err;
    }

    await setPersistence(auth, browserLocalPersistence);
    const credential = await signInWithCustomToken(auth, token);
    if (isFirebaseAdminUser(credential.user)) {
      await signOut(auth);
      await clerk.signOut();
      const err = new Error('Admin account cannot use customer login');
      err.code = 'auth/admin-account';
      throw err;
    }

    /* Set immediately so ProtectedRoute sees user before onAuthStateChanged fires */
    setUser(credential.user);
    setLoading(false);
    if (clerkUser?.id) lastClerkIdRef.current = clerkUser.id;

    return { user: credential.user, isNew: Boolean(exchanged?.isNew) };
  }, [clerk, clerkUser?.id]);

  useEffect(() => {
    if (!clerkLoaded || !authReady) return undefined;

    /* Admin panel session: skip customer sync unless a Clerk customer session needs linking. */
    if (isFirebaseAdminUser(auth.currentUser) && !hasClerkSession) {
      setLoading(false);
      return undefined;
    }

    if (!hasClerkSession) {
      lastClerkIdRef.current = '';
      if (isFirebaseAdminUser(auth.currentUser) || hasAdminSessionFlag()) {
        setLoading(false);
        return undefined;
      }
      /* Debounce: setActive on mobile can lag React isSignedIn by a few hundred ms.
         Signing out Firebase immediately would wipe a just-linked session. */
      const signOutTimer = window.setTimeout(() => {
        signOut(auth).catch(() => {}).finally(() => setLoading(false));
      }, 800);
      return () => window.clearTimeout(signOutTimer);
    }

    const clerkId = clerkUser?.id || '';
    if (!clerkId) {
      /* Session id may exist before user object hydrates — keep loading briefly */
      if (sessionId) {
        setLoading(true);
        return undefined;
      }
      setLoading(false);
      return undefined;
    }

    if (syncingRef.current) {
      return undefined;
    }

    const hasFirebaseUser = Boolean(auth.currentUser);

    if (lastClerkIdRef.current === clerkId && hasFirebaseUser) {
      setLoading(false);
      return undefined;
    }

    if (lastClerkIdRef.current === clerkId && !hasFirebaseUser) {
      lastClerkIdRef.current = '';
    }

    let cancelled = false;
    syncingRef.current = true;
    setLoading(true);

    (async () => {
      try {
        const provider = clerkUser?.externalAccounts?.some((item) => item.provider === 'google')
          ? 'google'
          : 'clerk_email';
        for (let attempt = 1; attempt <= 3; attempt += 1) {
          if (cancelled) return;
          try {
            const result = await syncFirebaseSession({ authProvider: provider });
            if (!result?.user) {
              const err = new Error('Clerk → Firebase sync returned no user');
              err.code = 'auth/bridge-failed';
              throw err;
            }
            if (!cancelled) lastClerkIdRef.current = clerkId;
            return;
          } catch (error) {
            console.error(`Clerk → Firebase sync failed (attempt ${attempt}/3):`, error);
            if (attempt === 3) {
              if (!cancelled) lastClerkIdRef.current = '';
              return;
            }
            await new Promise((resolve) => window.setTimeout(resolve, 500 * attempt));
          }
        }
      } finally {
        syncingRef.current = false;
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [authReady, clerkLoaded, clerkUser, hasClerkSession, sessionId, syncFirebaseSession]);

  const completeProfile = async ({ name, phone }) => {
    const displayName = String(name || '').trim();
    const mobile = String(phone || '').trim();
    if (clerkUser) {
      try {
        await clerkUser.update({
          firstName: displayName.split(/\s+/)[0] || displayName,
          lastName: displayName.split(/\s+/).slice(1).join(' ') || undefined,
          unsafeMetadata: {
            ...(clerkUser.unsafeMetadata || {}),
            phone: mobile,
            fullName: displayName,
          },
        });
      } catch (error) {
        console.warn('Clerk profile update deferred:', error);
      }
    }

    const result = await syncFirebaseSession({
      displayName,
      phone: mobile,
      authProvider: 'clerk_email',
    });

    if (result?.user) {
      await upsertUserDocument(result.user.uid, {
        email: result.user.email,
        displayName,
        phone: mobile,
        language: localStorage.getItem('language') || 'ar',
        authProvider: 'clerk_email',
      });
    }
    return result;
  };

  const logout = async () => {
    lastClerkIdRef.current = '';
    const tasks = [clerk.signOut()];
    if (!isFirebaseAdminUser(auth.currentUser) && !hasAdminSessionFlag()) {
      tasks.unshift(signOut(auth));
    }
    await Promise.allSettled(tasks);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading: loading || !clerkLoaded,
        clerkUser,
        isClerkSignedIn: Boolean(hasClerkSession),
        syncFirebaseSession,
        completeProfile,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
