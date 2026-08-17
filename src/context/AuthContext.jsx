import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
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

const ADMIN_EMAIL = (import.meta.env.VITE_SUPERADMIN_EMAIL || 'sulemanmr551@gmail.com').trim().toLowerCase();
const AuthContext = createContext(null);

function isAdminAccount(firebaseUser) {
  return firebaseUser?.email?.toLowerCase() === ADMIN_EMAIL;
}

export function AuthProvider({ children }) {
  const { isLoaded: clerkLoaded, isSignedIn, getToken } = useClerkAuth();
  const { user: clerkUser } = useUser();
  const clerk = useClerk();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authReady, setAuthReady] = useState(false);
  const syncingRef = useRef(false);
  const lastClerkIdRef = useRef('');

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setAuthReady(true);
      if (isAdminAccount(firebaseUser)) {
        setUser(null);
      } else {
        setUser(firebaseUser);
      }
      if (clerkLoaded && !isSignedIn) setLoading(false);
    });
    return () => unsubscribe();
  }, [clerkLoaded, isSignedIn]);

  const syncFirebaseSession = useCallback(async (profile = {}) => {
    if (!isSignedIn) return null;
    const clerkToken = await getToken();
    if (!clerkToken) {
      const err = new Error('Missing Clerk token');
      err.code = 'auth/missing-clerk-token';
      throw err;
    }

    const { token, isNew } = await exchangeClerkSession(clerkToken, {
      displayName: profile.displayName || '',
      phone: profile.phone || '',
      authProvider: profile.authProvider || 'clerk_email',
      language: profile.language || localStorage.getItem('language') || 'ar',
    });

    await setPersistence(auth, browserLocalPersistence);
    const credential = await signInWithCustomToken(auth, token);
    if (isAdminAccount(credential.user)) {
      await signOut(auth);
      await clerk.signOut();
      const err = new Error('Admin account cannot use customer login');
      err.code = 'auth/admin-account';
      throw err;
    }
    return { user: credential.user, isNew };
  }, [clerk, getToken, isSignedIn]);

  useEffect(() => {
    if (!clerkLoaded || !authReady) return undefined;

    if (!isSignedIn) {
      lastClerkIdRef.current = '';
      // Admin uses Firebase email/password; Clerk being unsigned must not
      // sign out a restoring or active superadmin session.
      if (isAdminAccount(auth.currentUser) || hasAdminSessionFlag()) {
        setLoading(false);
        return undefined;
      }
      signOut(auth).finally(() => setLoading(false));
      return undefined;
    }

    const clerkId = clerkUser?.id || '';
    if (!clerkId || lastClerkIdRef.current === clerkId || syncingRef.current) {
      if (auth.currentUser) setLoading(false);
      return undefined;
    }

    let cancelled = false;
    syncingRef.current = true;
    setLoading(true);

    (async () => {
      try {
        const provider = clerkUser?.externalAccounts?.some((item) => item.provider === 'google')
          ? 'google'
          : 'clerk_email';
        await syncFirebaseSession({ authProvider: provider });
        if (!cancelled) lastClerkIdRef.current = clerkId;
      } catch (error) {
        console.error('Clerk → Firebase sync failed:', error);
        if (!cancelled) lastClerkIdRef.current = '';
      } finally {
        syncingRef.current = false;
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [authReady, clerkLoaded, clerkUser, isSignedIn, syncFirebaseSession]);

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
    if (!isAdminAccount(auth.currentUser) && !hasAdminSessionFlag()) {
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
        isClerkSignedIn: Boolean(isSignedIn),
        syncFirebaseSession,
        completeProfile,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
