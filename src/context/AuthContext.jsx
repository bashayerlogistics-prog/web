import { createContext, useContext, useEffect, useState } from 'react';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signOut,
  sendPasswordResetEmail,
  updateProfile,
  fetchSignInMethodsForEmail,
} from 'firebase/auth';
import { auth, googleProvider } from '../firebase/auth';
import { upsertUserDocument } from '../firebase/bookings';
import { logActivity } from '../firebase/admin';

const ADMIN_EMAIL = (import.meta.env.VITE_SUPERADMIN_EMAIL || 'sulemanmr551@gmail.com').trim().toLowerCase();

const AuthContext = createContext(null);

function isAdminAccount(firebaseUser) {
  return firebaseUser?.email?.toLowerCase() === ADMIN_EMAIL;
}

async function syncGoogleUser(firebaseUser) {
  // Google OAuth does not return mobile for normal apps — never write phone: ''
  // or it wipes a number the user saved later.
  const data = {
    email: firebaseUser.email,
    displayName: firebaseUser.displayName || '',
    photoURL: firebaseUser.photoURL || '',
    language: localStorage.getItem('language') || 'ar',
    authProvider: 'google',
  };
  if (firebaseUser.phoneNumber) {
    data.phone = firebaseUser.phoneNumber;
  }
  return upsertUserDocument(firebaseUser.uid, data);
}

function shouldFallbackToRedirect(err) {
  const code = err?.code || '';
  return code === 'auth/popup-blocked' || code === 'auth/cancelled-popup-request';
}

/** Persist profile; never block Google login if Firestore write fails. */
async function persistGoogleProfile(firebaseUser) {
  try {
    const { isNew } = await syncGoogleUser(firebaseUser);
    if (isNew) {
      try {
        await logActivity('user_registered', {
          userId: firebaseUser.uid,
          email: firebaseUser.email,
          authProvider: 'google',
        });
      } catch {
        // activity log optional
      }
    }
    return { isNew };
  } catch (firestoreErr) {
    console.warn('Google profile sync deferred:', firestoreErr?.code || firestoreErr?.message);
    return { isNew: false, profileSyncFailed: true };
  }
}

async function rejectAdminAsCustomer(firebaseUser) {
  if (!isAdminAccount(firebaseUser)) return false;
  await signOut(auth);
  const err = new Error('Admin account cannot use customer login');
  err.code = 'auth/admin-account';
  throw err;
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubscribe = () => {};

    getRedirectResult(auth)
      .then(async (result) => {
        if (!result?.user) return;
        try {
          await rejectAdminAsCustomer(result.user);
          await persistGoogleProfile(result.user);
        } catch (err) {
          console.error('Google redirect result error:', err);
        }
      })
      .catch((err) => console.error('Google redirect result error:', err));

    unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (isAdminAccount(firebaseUser)) {
        setUser(null);
      } else {
        setUser(firebaseUser);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const login = (email, password) =>
    signInWithEmailAndPassword(auth, email, password);

  const register = async (email, password, displayName, phone) => {
    const trimmedEmail = email.trim().toLowerCase();

    if (trimmedEmail === ADMIN_EMAIL) {
      const err = new Error('Admin account cannot use customer signup');
      err.code = 'auth/admin-account';
      throw err;
    }

    const cred = await createUserWithEmailAndPassword(auth, trimmedEmail, password);

    // Account already exists in Auth from here on — profile writes must never fail signup,
    // otherwise a retry only yields auth/email-already-in-use.
    try {
      await updateProfile(cred.user, { displayName });
    } catch (profileErr) {
      console.warn('Display name not set:', profileErr?.code || profileErr?.message);
    }

    try {
      await upsertUserDocument(cred.user.uid, {
        email: trimmedEmail,
        displayName,
        phone,
        language: localStorage.getItem('language') || 'ar',
        authProvider: 'password',
      });
    } catch (firestoreErr) {
      console.warn('Profile sync deferred:', firestoreErr?.code || firestoreErr?.message);
    }

    try {
      await logActivity('user_registered', {
        userId: cred.user.uid,
        email: trimmedEmail,
        authProvider: 'password',
      });
    } catch {
      // activity log optional
    }

    return cred;
  };

  /**
   * Google = signup + login in one step (Firebase creates account if new).
   * Returns { user, isNew } or null when redirect fallback is used.
   */
  const loginWithGoogle = async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      await rejectAdminAsCustomer(result.user);
      const { isNew } = await persistGoogleProfile(result.user);
      return { user: result.user, isNew };
    } catch (err) {
      if (shouldFallbackToRedirect(err)) {
        await signInWithRedirect(auth, googleProvider);
        return null;
      }
      throw err;
    }
  };

  const logout = () => signOut(auth);

  const resetPassword = async (email) => {
    const trimmed = email.trim().toLowerCase();
    try {
      const methods = await fetchSignInMethodsForEmail(auth, trimmed);
      if (methods.includes('google.com') && !methods.includes('password')) {
        const err = new Error('Google-only account');
        err.code = 'auth/google-only-account';
        throw err;
      }
    } catch (err) {
      if (err?.code === 'auth/google-only-account') throw err;
      console.warn('Could not detect sign-in methods:', err?.code || err?.message);
    }
    return sendPasswordResetEmail(auth, trimmed);
  };

  return (
    <AuthContext.Provider
      value={{ user, loading, login, register, loginWithGoogle, logout, resetPassword }}
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
