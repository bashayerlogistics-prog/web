import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import {
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  browserLocalPersistence,
  setPersistence,
  EmailAuthProvider,
  reauthenticateWithCredential,
  updatePassword,
} from 'firebase/auth';
import { auth } from '../firebase/auth';
import { logActivity } from '../firebase/admin';
import { ADMIN_SESSION_KEY } from '../constants/adminSession';
const DEFAULT_USERNAME = 'superadmin';
const ADMIN_EMAIL = (import.meta.env.VITE_SUPERADMIN_EMAIL || 'sulemanmr551@gmail.com').trim().toLowerCase();
const ADMIN_UID = import.meta.env.VITE_SUPERADMIN_UID || '';

function readSessionHint() {
  try {
    return localStorage.getItem(ADMIN_SESSION_KEY) === 'true';
  } catch {
    return false;
  }
}

const AdminAuthContext = createContext(null);

function isAdminEmail(input) {
  return input.trim().toLowerCase() === ADMIN_EMAIL;
}

function isValidAdminUsername(input) {
  const trimmed = input.trim();
  const trimmedLower = trimmed.toLowerCase();
  if (trimmedLower === DEFAULT_USERNAME) return true;
  if (isAdminEmail(trimmed)) return true;
  if (ADMIN_UID && trimmed === ADMIN_UID) return true;
  return false;
}

function resolveAdminEmail(username) {
  return isAdminEmail(username) ? username.trim().toLowerCase() : ADMIN_EMAIL;
}

function isFirebaseAdmin(user) {
  if (!user?.email) return false;
  if (user.email.toLowerCase() !== ADMIN_EMAIL) return false;
  if (ADMIN_UID && user.uid !== ADMIN_UID) return false;
  return true;
}

export function AdminAuthProvider({ children }) {
  const sessionHint = readSessionHint();
  const [adminUser, setAdminUser] = useState(() => (
    sessionHint
      ? { username: DEFAULT_USERNAME, email: ADMIN_EMAIL, uid: ADMIN_UID || '' }
      : null
  ));
  const [loading, setLoading] = useState(!sessionHint);

  useEffect(() => {
    let settled = false;
    const finish = (firebaseUser) => {
      if (settled) return;
      settled = true;
      if (isFirebaseAdmin(firebaseUser)) {
        localStorage.setItem(ADMIN_SESSION_KEY, 'true');
        setAdminUser({
          username: DEFAULT_USERNAME,
          email: firebaseUser.email,
          uid: firebaseUser.uid,
        });
      } else if (!sessionHint) {
        localStorage.removeItem(ADMIN_SESSION_KEY);
        setAdminUser(null);
      }
      setLoading(false);
    };

    const unsubscribe = onAuthStateChanged(
      auth,
      (firebaseUser) => finish(firebaseUser),
      (err) => {
        console.warn('Admin auth listener failed:', err?.message || err);
        finish(auth.currentUser);
      },
    );

    const timeoutId = window.setTimeout(() => finish(auth.currentUser), 4000);

    return () => {
      settled = true;
      window.clearTimeout(timeoutId);
      unsubscribe();
    };
  }, [sessionHint]);

  const login = useCallback(async (username, password) => {
    const trimmed = username.trim();

    if (!isValidAdminUsername(trimmed)) {
      throw new Error('invalid-credentials');
    }

    const email = resolveAdminEmail(trimmed);

    try {
      // Keep the Firebase admin credential through browser restarts; only the
      // explicit logout action below may remove it.
      try {
        await setPersistence(auth, browserLocalPersistence);
      } catch (persistErr) {
        console.warn('Admin auth persistence fallback:', persistErr?.message || persistErr);
      }
      const cred = await signInWithEmailAndPassword(auth, email, password);

      if (!isFirebaseAdmin(cred.user)) {
        await signOut(auth);
        throw new Error('invalid-credentials');
      }

      localStorage.setItem(ADMIN_SESSION_KEY, 'true');
      setAdminUser({
        username: DEFAULT_USERNAME,
        email: cred.user.email,
        uid: cred.user.uid,
      });

      try {
        logActivity('admin_login', { username: isAdminEmail(trimmed) ? email : DEFAULT_USERNAME }).catch(() => {});
      } catch {
        // Activity log is optional if rules are not published yet
      }

      return true;
    } catch (err) {
      if (err.message === 'invalid-credentials') throw err;
      throw new Error('invalid-credentials');
    }
  }, []);

  const logout = useCallback(async () => {
    localStorage.removeItem(ADMIN_SESSION_KEY);
    setAdminUser(null);
    try {
      await signOut(auth);
    } catch {
      // ignore
    }
  }, []);

  const changePassword = useCallback(async (currentPassword, newPassword) => {
    const user = auth.currentUser;

    if (!isFirebaseAdmin(user)) {
      throw new Error('not-authenticated');
    }

    if (newPassword.length < 6) {
      throw new Error('weak-password');
    }

    const credential = EmailAuthProvider.credential(user.email, currentPassword);

    try {
      await reauthenticateWithCredential(user, credential);
      await updatePassword(user, newPassword);

      try {
        await logActivity('admin_password_changed', {});
      } catch {
        // optional
      }

      return true;
    } catch (err) {
      const code = err?.code || '';
      if (code === 'auth/wrong-password' || code === 'auth/invalid-credential') {
        throw new Error('wrong-current-password');
      }
      if (code === 'auth/weak-password') {
        throw new Error('weak-password');
      }
      throw err;
    }
  }, []);

  const isAdmin = !!adminUser && localStorage.getItem(ADMIN_SESSION_KEY) === 'true';

  return (
    <AdminAuthContext.Provider
      value={{
        adminUser,
        loading,
        isAdmin,
        login,
        logout,
        changePassword,
        adminEmail: ADMIN_EMAIL,
      }}
    >
      {children}
    </AdminAuthContext.Provider>
  );
}

export function useAdminAuth() {
  const ctx = useContext(AdminAuthContext);
  if (!ctx) throw new Error('useAdminAuth must be used within AdminAuthProvider');
  return ctx;
}
