import {
  updateBookingStatus,
  updateBookingPayment,
} from './admin';
import {
  confirmPayment,
  rejectPayment,
  createManualOrder,
} from './payment';
import {
  getPendingAdminWrites,
  queueAdminWrite,
  removePendingAdminWrite,
} from '../utils/offlineAdminQueue';
import { isRetryableFirebaseError } from '../utils/offlineOrderQueue';

async function executeAdminWrite(entry) {
  const { type, payload } = entry;
  switch (type) {
    case 'updateBookingStatus':
      await updateBookingStatus(payload.bookingId, payload.status, payload.options || {});
      return null;
    case 'updateBookingPayment':
      await updateBookingPayment(payload.bookingId, payload.paymentStatus, payload.paymentData || {});
      return null;
    case 'confirmPayment':
      await confirmPayment(payload.bookingId, payload.adminEmail);
      return null;
    case 'rejectPayment':
      await rejectPayment(payload.bookingId, payload.reason, payload.adminEmail);
      return null;
    case 'createManualOrder':
      return createManualOrder(payload.data);
    default:
      throw new Error(`Unknown admin write type: ${type}`);
  }
}

export async function queueOrRunAdminWrite(type, payload) {
  if (!navigator.onLine) {
    await queueAdminWrite({ type, payload });
    return { queued: true, result: null };
  }

  try {
    const result = await executeAdminWrite({ type, payload });
    return { queued: false, result };
  } catch (err) {
    if (!isRetryableFirebaseError(err)) throw err;
    await queueAdminWrite({ type, payload });
    return { queued: true, result: null };
  }
}

let syncPromise = null;

export async function syncPendingAdminWrites() {
  if (!navigator.onLine) {
    return { synced: 0, pending: (await getPendingAdminWrites()).length };
  }
  if (syncPromise) return syncPromise;

  syncPromise = (async () => {
    let synced = 0;
    const pending = await getPendingAdminWrites();
    for (const entry of pending) {
      try {
        await executeAdminWrite(entry);
        await removePendingAdminWrite(entry.id);
        synced += 1;
      } catch (err) {
        if (!isRetryableFirebaseError(err)) {
          console.warn('Pending admin write blocked:', err?.code || err?.message, entry.type);
        }
        break;
      }
    }
    return { synced, pending: (await getPendingAdminWrites()).length };
  })().finally(() => {
    syncPromise = null;
  });

  return syncPromise;
}

let syncStarted = false;

export function startPendingAdminSync() {
  if (syncStarted || typeof window === 'undefined') return;
  syncStarted = true;

  const sync = () => syncPendingAdminWrites().catch((err) => {
    console.warn('Pending admin sync failed:', err?.code || err?.message);
  });

  window.addEventListener('online', sync);
  window.addEventListener('focus', sync);
  setTimeout(sync, 3_000);
  setInterval(sync, 60_000);
}
