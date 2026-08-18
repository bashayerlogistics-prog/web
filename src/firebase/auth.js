import {
  getAuth,
  initializeAuth,
  browserLocalPersistence,
  browserSessionPersistence,
  inMemoryPersistence,
  GoogleAuthProvider,
} from 'firebase/auth';
import { app } from './app';

function createAuth() {
  try {
    // localStorage first — IndexedDB persistence throws "Database is closing/hidden"
    // when the admin tab is in the background (other GitHub/Hostinger tabs).
    return initializeAuth(app, {
      persistence: [
        browserLocalPersistence,
        browserSessionPersistence,
        inMemoryPersistence,
      ],
    });
  } catch {
    return getAuth(app);
  }
}

export const auth = createAuth();

export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });
googleProvider.addScope('profile');
googleProvider.addScope('email');

if (typeof window !== 'undefined') {
  window.addEventListener('unhandledrejection', (event) => {
    const message = String(event.reason?.message || event.reason || '');
    if (message.includes('Database is closing') || message.includes('closing/hidden')) {
      event.preventDefault();
    }
  });
}
