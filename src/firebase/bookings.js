import {
  collection,
  addDoc,
  getDocs,
  getDocsFromCache,
  getDoc,
  doc,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
  updateDoc,
  setDoc,
  runTransaction,
} from 'firebase/firestore';
import { db } from './db';
import { logActivity } from './admin';
import { getPendingOrders } from '../utils/offlineOrderQueue';

async function getNextOrderNumber() {
  const counterRef = doc(db, 'counters', 'bookings');
  return runTransaction(db, async (transaction) => {
    const snap = await transaction.get(counterRef);
    const last = snap.exists() ? (snap.data().last || 0) : 0;
    const next = last + 1;
    transaction.set(counterRef, { last: next }, { merge: true });
    return next;
  });
}

/** Write a new transport booking to Firestore `bookings` collection */
export async function createBooking(bookingData, userId = null) {
  const orderNumber = await getNextOrderNumber();
  const ref = await addDoc(collection(db, 'bookings'), {
    ...bookingData,
    userId,
    orderNumber,
    status: 'pending',
    paymentStatus: 'pending',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  await logActivity('booking_created', { bookingId: ref.id, orderNumber, userId });
  return ref.id;
}

/** Write a custom price request */
export async function createPriceRequest(data) {
  const ref = await addDoc(collection(db, 'priceRequests'), {
    ...data,
    status: 'new',
    createdAt: serverTimestamp(),
  });
  await logActivity('price_request_created', { requestId: ref.id, name: data.name });
  return ref.id;
}

/** Fetch user booking history from Firestore */
export async function getUserBookings(userId, maxItems = 100) {
  const size = Math.max(1, Math.min(100, Number(maxItems) || 100));
  const dateMillis = (value) => {
    if (!value) return 0;
    if (value.toMillis) return value.toMillis();
    if (value.seconds) return value.seconds * 1000;
    const parsed = new Date(value).getTime();
    return Number.isFinite(parsed) ? parsed : 0;
  };
  const sortByDate = (items) =>
    items.sort((a, b) => {
      const aTime = dateMillis(a.createdAt);
      const bTime = dateMillis(b.createdAt);
      return bTime - aTime;
    });

  const mergePending = async (remoteItems) => {
    const pending = (await getPendingOrders())
      .filter((item) => item.userId === userId)
      .map((item) => ({
        id: item.bookingId,
        ...item.orderData,
        userId: item.userId,
        orderNumber: item.orderNumber,
        status: 'pending',
        paymentStatus: item.orderData.paymentStatus || 'pending',
        createdAt: item.queuedAt,
        _offlinePending: true,
      }));
    const remoteIds = new Set(remoteItems.map((item) => item.id));
    return sortByDate([...pending.filter((item) => !remoteIds.has(item.id)), ...remoteItems]);
  };

  const orderedQuery = query(
    collection(db, 'bookings'),
    where('userId', '==', userId),
    orderBy('createdAt', 'desc'),
    limit(size),
  );

  try {
    const snapshot = await getDocs(orderedQuery);
    return mergePending(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })));
  } catch (err) {
    // Composite index may not exist yet — fallback without orderBy
    console.warn('getUserBookings fallback query:', err.code || err.message);
    const q = query(collection(db, 'bookings'), where('userId', '==', userId), limit(size));
    try {
      const snapshot = await getDocs(q);
      return mergePending(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })));
    } catch {
      try {
        const cached = await getDocsFromCache(orderedQuery);
        return mergePending(cached.docs.map((d) => ({ id: d.id, ...d.data() })));
      } catch {
        return mergePending([]);
      }
    }
  }
}

/** Fetch packages from Firestore — hard-capped; prefer getActiveProducts for CMS. */
export async function getPackages(maxItems = 100) {
  const size = Math.max(1, Math.min(300, Number(maxItems) || 100));
  const snapshot = await getDocs(
    query(collection(db, 'packages'), orderBy('sortOrder', 'asc'), limit(size)),
  );
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
}

/** Fetch single package by ID */
export async function getPackageById(packageId) {
  const snap = await getDoc(doc(db, 'packages', packageId));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() };
}

/** Update user profile in Firestore `users` collection */
export async function updateUserProfile(userId, data) {
  await updateDoc(doc(db, 'users', userId), {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

/** Load signed-in user's Firestore profile */
export async function getUserProfile(userId) {
  if (!userId) return null;
  const snap = await getDoc(doc(db, 'users', userId));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() };
}

/** Recent account login events (device / location / time). */
export async function getUserLoginActivity(userId, size = 20) {
  if (!userId) return [];
  const q = query(
    collection(db, 'users', userId, 'loginActivity'),
    orderBy('createdAt', 'desc'),
    limit(Math.min(Math.max(size, 1), 50)),
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

/** Create or merge user document on signup / Google sign-in */
export async function upsertUserDocument(userId, data) {
  const ref = doc(db, 'users', userId);
  const existing = await getDoc(ref);
  const isNew = !existing.exists();
  const payload = {
    ...data,
    updatedAt: serverTimestamp(),
  };
  // Avoid wiping phone when callers omit or pass empty on Google re-login.
  if (!String(payload.phone || '').trim()) {
    delete payload.phone;
  }
  if (isNew) {
    payload.createdAt = serverTimestamp();
    if (!payload.phone) payload.phone = '';
  }
  await setDoc(ref, payload, { merge: true });
  return { isNew };
}

/** Update only phone on the user profile (Google users after signup). */
export async function updateUserPhone(userId, phone) {
  const trimmed = String(phone || '').trim();
  if (!userId || !trimmed) {
    const err = new Error('Phone required');
    err.code = 'invalid-phone';
    throw err;
  }
  await setDoc(
    doc(db, 'users', userId),
    { phone: trimmed, updatedAt: serverTimestamp() },
    { merge: true },
  );
  return trimmed;
}

/** Track booking — owner or SuperAdmin only (enforced by Firestore rules) */
export async function getBookingForTracking(bookingId) {
  const snap = await getDoc(doc(db, 'bookings', bookingId));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() };
}
