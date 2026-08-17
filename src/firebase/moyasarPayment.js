import { getFunctions, httpsCallable } from 'firebase/functions';
import { app } from './app';

const functions = getFunctions(app, 'us-central1');
const verifyCallable = httpsCallable(functions, 'verifyMoyasarPayment');

/**
 * Server-side Moyasar verification — never mark orders paid from the client alone.
 * @returns {{ status: 'paid'|'pending'|'failed', bookingId: string, paymentId?: string }}
 */
export async function verifyMoyasarPayment({ bookingId, paymentId }) {
  const result = await verifyCallable({ bookingId, paymentId });
  return result.data;
}
