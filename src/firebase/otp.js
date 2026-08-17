import { getFunctions, httpsCallable } from 'firebase/functions';
import { app } from './app';

const functions = getFunctions(app, 'us-central1');
const requestOtpCallable = httpsCallable(functions, 'requestEmailOtp');
const verifyOtpCallable = httpsCallable(functions, 'verifyEmailOtp');

export async function requestEmailOtp(payload) {
  const result = await requestOtpCallable(payload);
  return result.data;
}

export async function verifyEmailOtp(email, code) {
  const result = await verifyOtpCallable({ email, code });
  return result.data;
}
