import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { app } from './app';

export const auth = getAuth(app);

export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });
googleProvider.addScope('profile');
googleProvider.addScope('email');
