import {
  collection,
  getDocs,
  addDoc,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  limit,
  where,
  serverTimestamp,
  getDoc,
  writeBatch,
  onSnapshot,
  startAfter,
  getCountFromServer,
} from 'firebase/firestore';
import { db } from './db';
import { getHomeSections as fetchHomeSections } from './content';
import { mergeHomeSections } from '../data/homeSections';
import { getDefaultProducts, getDefaultServices, getDefaultBlogs } from '../data/contentSeeds';
import { getDefaultCarCatalog, isPlaceholderSocialUrl, BOOKING_CAR_TYPES } from '../data/staticData';

export async function upsertUserDocument(userId, data) {
  await setDoc(doc(db, 'users', userId), { ...data, updatedAt: serverTimestamp() }, { merge: true });
}

function sortByDate(items) {
  return items.sort((a, b) => {
    const aTime = a.createdAt?.toMillis?.() ?? a.createdAt?.seconds * 1000 ?? 0;
    const bTime = b.createdAt?.toMillis?.() ?? b.createdAt?.seconds * 1000 ?? 0;
    return bTime - aTime;
  });
}

function buildBookingsQuery({
  status,
  paymentStatus,
  pageSize = 20,
  cursor = null,
} = {}) {
  const constraints = [];
  if (status && status !== 'all') constraints.push(where('status', '==', status));
  if (paymentStatus && paymentStatus !== 'all') {
    constraints.push(where('paymentStatus', '==', paymentStatus));
  }
  constraints.push(orderBy('createdAt', 'desc'));
  if (cursor) constraints.push(startAfter(cursor));
  constraints.push(limit(Math.max(1, Math.min(100, Number(pageSize) || 20))));
  return query(collection(db, 'bookings'), ...constraints);
}

/** Full export / rare admin tools only — hard-capped to avoid quota spikes. */
export async function getAllBookings(maxItems = 300) {
  const size = Math.max(1, Math.min(500, Number(maxItems) || 300));
  try {
    const q = query(collection(db, 'bookings'), orderBy('createdAt', 'desc'), limit(size));
    const snapshot = await getDocs(q);
    return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
  } catch (err) {
    console.warn('getAllBookings ordered query failed:', err.code || err.message);
    throw err;
  }
}

/** One page of bookings (Firestore-side). Returns cursor for next page. */
export async function getBookingsPage(opts = {}) {
  const snap = await getDocs(buildBookingsQuery(opts));
  const items = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  const lastDoc = snap.docs[snap.docs.length - 1] || null;
  return { items, lastDoc, hasMore: snap.docs.length >= (opts.pageSize || 20) };
}

/**
 * Live newest bookings — keeps Orders/Overview updating without reading the
 * entire collection. First page only.
 */
export function subscribeToBookingsPage(opts = {}, onData, onError) {
  const pageSize = Math.max(1, Math.min(100, Number(opts.pageSize) || 20));
  try {
    const q = buildBookingsQuery({ ...opts, pageSize, cursor: null });
    return onSnapshot(
      q,
      (snap) => {
        const items = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        const lastDoc = snap.docs[snap.docs.length - 1] || null;
        onData({
          items,
          lastDoc,
          hasMore: snap.docs.length >= pageSize,
        });
      },
      (err) => onError?.(err),
    );
  } catch (err) {
    onError?.(err);
    return () => {};
  }
}

async function countWithBackoff(countFn, retries = 2) {
  let delayMs = 500;
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      return await countFn();
    } catch (err) {
      const code = err?.code || '';
      const exhausted = code === 'resource-exhausted' || /429|resource-exhausted/i.test(String(err?.message || ''));
      if (!exhausted || attempt === retries) return 0;
      await new Promise((r) => setTimeout(r, delayMs));
      delayMs = Math.min(delayMs * 2, 4000);
    }
  }
  return 0;
}

/**
 * Chip / overview counts via aggregation queries.
 * Billing: ~1 read per 1000 matched index entries — far cheaper than scanning docs.
 * Status counts run in parallel; payment counts parallel when requested.
 * @param {{ includePayment?: boolean }} opts
 */
export async function getBookingStatsCounts({ includePayment = true } = {}) {
  const base = collection(db, 'bookings');
  const countOf = (constraints = []) =>
    countWithBackoff(async () => {
      const snap = await getCountFromServer(
        constraints.length ? query(base, ...constraints) : base,
      );
      return snap.data().count;
    });

  const [all, pending, confirmed, completed, cancelled] = await Promise.all([
    countOf(),
    countOf([where('status', '==', 'pending')]),
    countOf([where('status', '==', 'confirmed')]),
    countOf([where('status', '==', 'completed')]),
    countOf([where('status', '==', 'cancelled')]),
  ]);

  let payPending = 0;
  let proofSubmitted = 0;
  let paid = 0;
  let rejected = 0;
  let refunded = 0;
  if (includePayment) {
    [payPending, proofSubmitted, paid, rejected, refunded] = await Promise.all([
      countOf([where('paymentStatus', '==', 'pending')]),
      countOf([where('paymentStatus', '==', 'proof_submitted')]),
      countOf([where('paymentStatus', '==', 'paid')]),
      countOf([where('paymentStatus', '==', 'rejected')]),
      countOf([where('paymentStatus', '==', 'refunded')]),
    ]);
  }

  return {
    all,
    pending,
    confirmed,
    completed,
    cancelled,
    payment: {
      all,
      pending: payPending,
      proof_submitted: proofSubmitted,
      paid,
      rejected,
      refunded,
    },
  };
}

/** Cap used for Users page booking tallies (avoids full collection scan). */
export async function getRecentBookingsForCounts(maxItems = 300) {
  try {
    const snap = await getDocs(
      query(collection(db, 'bookings'), orderBy('createdAt', 'desc'), limit(maxItems)),
    );
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  } catch {
    return [];
  }
}

export async function getBookingById(bookingId) {
  const snap = await getDoc(doc(db, 'bookings', bookingId));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() };
}

export async function getAllUsers(maxItems = 100) {
  const size = Math.max(1, Math.min(300, Number(maxItems) || 100));
  try {
    const q = query(collection(db, 'users'), orderBy('createdAt', 'desc'), limit(size));
    const snapshot = await getDocs(q);
    return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
  } catch (err) {
    console.warn('getAllUsers ordered query failed:', err.code || err.message);
    try {
      const snapshot = await getDocs(query(collection(db, 'users'), limit(size)));
      return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
    } catch (fallbackErr) {
      console.error('getAllUsers failed:', fallbackErr.code || fallbackErr.message);
      throw fallbackErr;
    }
  }
}

export async function getAllPriceRequests(maxItems = 50) {
  const size = Math.max(1, Math.min(200, Number(maxItems) || 50));
  try {
    const q = query(collection(db, 'priceRequests'), orderBy('createdAt', 'desc'), limit(size));
    const snapshot = await getDocs(q);
    return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
  } catch {
    const snapshot = await getDocs(query(collection(db, 'priceRequests'), limit(size)));
    return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
  }
}

export async function updateBookingStatus(bookingId, status, options = {}) {
  const { notifyUserId, ...rest } = options;
  await updateDoc(doc(db, 'bookings', bookingId), {
    status,
    ...rest,
    updatedAt: serverTimestamp(),
  });
  await addBookingTimelineEntry(bookingId, { status, label: `Status: ${status}` });
  await logActivity('booking_status_updated', { bookingId, status });
  if (notifyUserId) {
    await sendNotification(notifyUserId, {
      type: 'order_update',
      title: 'Booking Update',
      titleAr: 'تحديث الحجز',
      message: `Your booking status is now: ${status}`,
      messageAr: `حالة حجزك الآن: ${status}`,
      bookingId,
    });
  }
}

export async function updateBookingPayment(bookingId, paymentStatus, paymentData = {}) {
  await updateDoc(doc(db, 'bookings', bookingId), {
    paymentStatus,
    ...paymentData,
    updatedAt: serverTimestamp(),
  });
  await logActivity('booking_payment_updated', { bookingId, paymentStatus, status: paymentStatus });
}

export async function addBookingTimelineEntry(bookingId, entry) {
  const snap = await getDoc(doc(db, 'bookings', bookingId));
  const existing = snap.data()?.trackingTimeline || [];
  await updateDoc(doc(db, 'bookings', bookingId), {
    trackingTimeline: [...existing, { ...entry, at: new Date().toISOString() }],
    updatedAt: serverTimestamp(),
  });
}

/** In-memory cache — fleet tabs share reads within a short TTL */
const PRODUCTS_CACHE_TTL_MS = 5 * 60_000;
const productsByTripTypeCache = new Map();

function readProductsCache(tripType) {
  const key = tripType || '__all__';
  const hit = productsByTripTypeCache.get(key);
  if (hit && Date.now() - hit.at < PRODUCTS_CACHE_TTL_MS) return hit.data;
  return null;
}

function writeProductsCache(tripType, data) {
  productsByTripTypeCache.set(tripType || '__all__', { at: Date.now(), data });
}

export function invalidateProductsCache(tripType) {
  if (tripType) {
    productsByTripTypeCache.delete(tripType);
    return;
  }
  productsByTripTypeCache.clear();
}

// Products / Packages
export async function getAllProducts(maxItems = 300) {
  const size = Math.max(1, Math.min(500, Number(maxItems) || 300));
  try {
    const q = query(collection(db, 'packages'), orderBy('sortOrder', 'asc'), limit(size));
    const snapshot = await getDocs(q);
    return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
  } catch {
    const snapshot = await getDocs(query(collection(db, 'packages'), limit(size)));
    return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
  }
}

/** Faster admin loads — filter by tripType at query time when possible */
export async function getProductsByTripType(tripType) {
  const cached = readProductsCache(tripType);
  if (cached) return cached;

  let result;
  if (!tripType) {
    result = await getAllProducts();
  } else {
    try {
      const q = query(
        collection(db, 'packages'),
        where('tripType', '==', tripType),
        orderBy('sortOrder', 'asc'),
        limit(300),
      );
      const snapshot = await getDocs(q);
      result = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
    } catch {
      const all = await getAllProducts(300);
      result = all.filter((p) => {
        if (p.tripType === tripType) return true;
        const rid = String(p.routeId || '');
        if (tripType === 'round_trip') return rid.startsWith('rt-');
        if (tripType === 'hourly') return rid.startsWith('hr-');
        // one_way: only ow-* routes (avoid legacy ids like "jeddah-makkah")
        if (tripType === 'one_way') return rid.startsWith('ow-');
        return false;
      });
    }
  }

  writeProductsCache(tripType, result);
  return result;
}

export async function createProduct(data) {
  const ref = await addDoc(collection(db, 'packages'), {
    ...data,
    active: data.active ?? true,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  invalidateProductsCache();
  await logActivity('product_created', { productId: ref.id });
  return ref.id;
}

export async function updateProduct(productId, data) {
  await updateDoc(doc(db, 'packages', productId), { ...data, updatedAt: serverTimestamp() });
  invalidateProductsCache();
  await logActivity('product_updated', { productId });
}

export async function deleteProduct(productId) {
  await deleteDoc(doc(db, 'packages', productId));
  invalidateProductsCache();
  await logActivity('product_deleted', { productId });
}

// Banners
export async function getAllBanners(maxItems = 50) {
  const size = Math.max(1, Math.min(100, Number(maxItems) || 50));
  try {
    const q = query(collection(db, 'banners'), orderBy('sortOrder', 'asc'), limit(size));
    const snapshot = await getDocs(q);
    return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
  } catch {
    const snapshot = await getDocs(query(collection(db, 'banners'), limit(size)));
    return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
  }
}

export async function createBanner(data) {
  const ref = await addDoc(collection(db, 'banners'), {
    ...data,
    active: true,
    createdAt: serverTimestamp(),
  });
  await logActivity('banner_created', { bannerId: ref.id });
  return ref.id;
}

export async function updateBanner(bannerId, data) {
  await updateDoc(doc(db, 'banners', bannerId), { ...data, updatedAt: serverTimestamp() });
}

export async function deleteBanner(bannerId) {
  await deleteDoc(doc(db, 'banners', bannerId));
}

// Gallery items
export async function getAllGalleryItems(maxItems = 100) {
  const size = Math.max(1, Math.min(200, Number(maxItems) || 100));
  try {
    const q = query(collection(db, 'gallery'), orderBy('sortOrder', 'asc'), limit(size));
    const snapshot = await getDocs(q);
    return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
  } catch {
    const snapshot = await getDocs(query(collection(db, 'gallery'), limit(size)));
    return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
  }
}

export async function createGalleryItem(data) {
  const {
    id: _id,
    createdAt: _createdAt,
    updatedAt: _updatedAt,
    ...rest
  } = data || {};
  const ref = await addDoc(collection(db, 'gallery'), {
    ...rest,
    active: rest.active ?? true,
    mediaType: rest.mediaType || (rest.videoUrl ? 'video' : 'image'),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  await logActivity('gallery_item_created', { galleryId: ref.id });
  return ref.id;
}

export async function updateGalleryItem(itemId, data) {
  const {
    id: _id,
    createdAt: _createdAt,
    updatedAt: _updatedAt,
    ...rest
  } = data || {};
  await updateDoc(doc(db, 'gallery', itemId), { ...rest, updatedAt: serverTimestamp() });
  await logActivity('gallery_item_updated', { galleryId: itemId });
}

export async function deleteGalleryItem(itemId) {
  await deleteDoc(doc(db, 'gallery', itemId));
  await logActivity('gallery_item_deleted', { galleryId: itemId });
}

export async function seedDefaultGalleryItems(items) {
  return seedCollection('gallery', items, (data) => createGalleryItem(data));
}

/** Replace entire gallery collection with the provided items (superadmin sync). */
export async function replaceGalleryItems(items) {
  const existing = await getAllGalleryItems();
  await Promise.all(existing.map((item) => deleteGalleryItem(item.id)));
  let created = 0;
  for (const item of items) {
    const { id: _omit, ...data } = item;
    await createGalleryItem(data);
    created += 1;
  }
  await logActivity('gallery_items_replaced', { count: created });
  return created;
}

export async function getGalleryHeroSettings() {
  try {
    const snap = await getDoc(doc(db, 'siteSettings', 'galleryHero'));
    if (!snap.exists()) return null;
    return snap.data();
  } catch {
    return null;
  }
}

export async function updateGalleryHeroSettings(data) {
  await setDoc(doc(db, 'siteSettings', 'galleryHero'), {
    ...data,
    updatedAt: serverTimestamp(),
  }, { merge: true });
  await logActivity('gallery_hero_updated', {});
}

// Services
export async function getAllServices(maxItems = 50) {
  const size = Math.max(1, Math.min(100, Number(maxItems) || 50));
  try {
    const q = query(collection(db, 'services'), orderBy('sortOrder', 'asc'), limit(size));
    const snapshot = await getDocs(q);
    return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
  } catch {
    const snapshot = await getDocs(query(collection(db, 'services'), limit(size)));
    return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
  }
}

export async function createService(data) {
  const ref = await addDoc(collection(db, 'services'), {
    ...data,
    active: data.active ?? true,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  await logActivity('service_created', { serviceId: ref.id });
  return ref.id;
}

export async function updateService(serviceId, data) {
  await updateDoc(doc(db, 'services', serviceId), { ...data, updatedAt: serverTimestamp() });
  await logActivity('service_updated', { serviceId });
}

export async function deleteService(serviceId) {
  await deleteDoc(doc(db, 'services', serviceId));
  await logActivity('service_deleted', { serviceId });
}

// Blogs
export async function getAllBlogs(maxItems = 50) {
  const size = Math.max(1, Math.min(100, Number(maxItems) || 50));
  try {
    const q = query(collection(db, 'blogs'), orderBy('sortOrder', 'asc'), limit(size));
    const snapshot = await getDocs(q);
    return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
  } catch {
    const snapshot = await getDocs(query(collection(db, 'blogs'), limit(size)));
    return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
  }
}

export async function createBlog(data) {
  const ref = await addDoc(collection(db, 'blogs'), {
    ...data,
    active: data.active ?? true,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  await logActivity('blog_created', { blogId: ref.id });
  return ref.id;
}

export async function updateBlog(blogId, data) {
  await updateDoc(doc(db, 'blogs', blogId), { ...data, updatedAt: serverTimestamp() });
  await logActivity('blog_updated', { blogId });
}

export async function deleteBlog(blogId) {
  await deleteDoc(doc(db, 'blogs', blogId));
  await logActivity('blog_deleted', { blogId });
}

// Seed defaults from static site data
export async function seedCollection(collectionName, items, createFn) {
  const existing = await getDocs(collection(db, collectionName));
  if (existing.size > 0) return { imported: 0, alreadyExists: true };
  await Promise.all(items.map((item) => createFn(item)));
  return { imported: items.length, alreadyExists: false };
}

export async function seedDefaultProducts(items) {
  return seedCollection('packages', items, (data) => createProduct(data));
}

export async function seedDefaultServices(items) {
  const existing = await getDocs(collection(db, 'services'));
  const canonical = (items || []).slice(0, 6);
  const byTitleEn = new Map(
    canonical.map((item) => [String(item.titleEn || '').trim().toLowerCase(), item]),
  );
  const byCategory = new Map(
    canonical.filter((item) => item.category).map((item) => [item.category, item]),
  );

  const legacyMergedTitles = new Set([
    'within-city trips & hourly rental',
    'مشاوير داخل المدينة واستئجار بالساعة',
  ]);

  // Empty collection → seed all 6
  if (existing.size === 0) {
    await Promise.all(canonical.map((item) => createService(item)));
    return { imported: canonical.length, updated: 0, removed: 0, alreadyExists: false };
  }

  let removed = 0;
  let imported = 0;
  let updated = 0;
  const claimed = new Set();

  const inferCategory = (titleEn, titleAr, category) => {
    if (byCategory.has(category)) return category;
    if (category === 'cities') return 'intercity';
    const text = `${titleEn || ''} ${titleAr || ''}`;
    if (/train|قطار|haramain|حرمين/i.test(text)) return 'train';
    if (/airport|مطار/i.test(text)) return 'airport';
    if (/between cities|moving between|التنقل بين المدن/i.test(text)) return 'intercity';
    if (/within-city|within city|داخل المدينة/i.test(text)) return 'withinCity';
    if (/hourly rental|استئجار بالساعة|بالساعة مع سائق/i.test(text)) return 'hourly';
    if (/ziyarat|مزارات|religious|دينية/i.test(text)) return 'tours';
    return '';
  };

  for (const docSnap of existing.docs) {
    const data = docSnap.data();
    const titleEn = String(data.titleEn || '').trim();
    const titleKey = titleEn.toLowerCase();

    // Drop legacy merged fake/dummy card
    if (legacyMergedTitles.has(titleKey) || legacyMergedTitles.has(data.titleAr)) {
      await deleteDoc(docSnap.ref);
      removed += 1;
      continue;
    }

    let match = byTitleEn.get(titleKey);
    if (!match) {
      const cat = inferCategory(data.titleEn, data.titleAr, data.category || '');
      if (cat && !claimed.has(cat)) match = byCategory.get(cat);
    }

    if (!match) {
      await deleteDoc(docSnap.ref);
      removed += 1;
      continue;
    }

    const claimKey = match.category || match.titleEn;
    if (claimed.has(claimKey)) {
      await deleteDoc(docSnap.ref);
      removed += 1;
      continue;
    }

    claimed.add(claimKey);
    await updateDoc(docSnap.ref, {
      ...match,
      active: data.active ?? true,
      updatedAt: serverTimestamp(),
    });
    updated += 1;
  }

  for (const item of canonical) {
    const claimKey = item.category || item.titleEn;
    if (claimed.has(claimKey)) continue;
    await createService(item);
    claimed.add(claimKey);
    imported += 1;
  }

  if (imported === 0 && removed === 0 && updated === 0) {
    return { imported: 0, updated: 0, removed: 0, alreadyExists: true };
  }

  await logActivity('services_seeded', { imported, updated, removed, total: claimed.size });
  return { imported, updated, removed, alreadyExists: false };
}

// Route destination cards (Our Main Destinations)
export async function getAllRouteCards(maxItems = 50) {
  const size = Math.max(1, Math.min(100, Number(maxItems) || 50));
  try {
    const q = query(collection(db, 'routeCards'), orderBy('sortOrder', 'asc'), limit(size));
    const snapshot = await getDocs(q);
    return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
  } catch {
    const snapshot = await getDocs(query(collection(db, 'routeCards'), limit(size)));
    return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
  }
}

export async function createRouteCard(data) {
  const ref = await addDoc(collection(db, 'routeCards'), {
    ...data,
    active: data.active ?? true,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  await logActivity('route_card_created', { routeCardId: ref.id });
  return ref.id;
}

export async function updateRouteCard(id, data) {
  await updateDoc(doc(db, 'routeCards', id), { ...data, updatedAt: serverTimestamp() });
  await logActivity('route_card_updated', { routeCardId: id });
}

export async function deleteRouteCard(id) {
  await deleteDoc(doc(db, 'routeCards', id));
  await logActivity('route_card_deleted', { routeCardId: id });
}

export async function seedDefaultRouteCards(items) {
  return seedCollection('routeCards', items, (data) => createRouteCard(data));
}

// FAQ items
export async function getAllFaqs(maxItems = 50) {
  const size = Math.max(1, Math.min(100, Number(maxItems) || 50));
  try {
    const q = query(collection(db, 'faqs'), orderBy('sortOrder', 'asc'), limit(size));
    const snapshot = await getDocs(q);
    return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
  } catch {
    const snapshot = await getDocs(query(collection(db, 'faqs'), limit(size)));
    return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
  }
}

export async function createFaq(data) {
  const ref = await addDoc(collection(db, 'faqs'), {
    ...data,
    active: data.active ?? true,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  await logActivity('faq_created', { faqId: ref.id });
  return ref.id;
}

export async function updateFaq(id, data) {
  await updateDoc(doc(db, 'faqs', id), { ...data, updatedAt: serverTimestamp() });
  await logActivity('faq_updated', { faqId: id });
}

export async function deleteFaq(id) {
  await deleteDoc(doc(db, 'faqs', id));
  await logActivity('faq_deleted', { faqId: id });
}

export async function seedDefaultFaqs(items) {
  return seedCollection('faqs', items, (data) => createFaq(data));
}

// Social media links (footer / top bar)
export async function getAllSocialLinks(maxItems = 30) {
  const size = Math.max(1, Math.min(50, Number(maxItems) || 30));
  try {
    const q = query(collection(db, 'socialLinks'), orderBy('sortOrder', 'asc'), limit(size));
    const snapshot = await getDocs(q);
    return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
  } catch {
    const snapshot = await getDocs(query(collection(db, 'socialLinks'), limit(size)));
    return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
  }
}

export async function createSocialLink(data) {
  const ref = await addDoc(collection(db, 'socialLinks'), {
    ...data,
    active: data.active ?? true,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  await logActivity('social_link_created', { socialLinkId: ref.id });
  return ref.id;
}

export async function updateSocialLink(id, data) {
  await updateDoc(doc(db, 'socialLinks', id), { ...data, updatedAt: serverTimestamp() });
  await logActivity('social_link_updated', { socialLinkId: id });
}

export async function deleteSocialLink(id) {
  await deleteDoc(doc(db, 'socialLinks', id));
  await logActivity('social_link_deleted', { socialLinkId: id });
}

export async function seedDefaultSocialLinks(items) {
  const existing = await getDocs(collection(db, 'socialLinks'));
  let removed = 0;

  for (const snap of existing.docs) {
    const data = snap.data();
    const platform = String(data.platform || '').toLowerCase();
    if (isPlaceholderSocialUrl(platform, data.url)) {
      await deleteDoc(snap.ref);
      removed += 1;
    }
  }

  const remaining = removed ? await getDocs(collection(db, 'socialLinks')) : existing;
  if (remaining.size === 0) {
    await Promise.all(items.map((item) => createSocialLink(item)));
    return { imported: items.length, alreadyExists: false };
  }

  const seen = new Set(
    remaining.docs.map((d) => String(d.data().platform || '').toLowerCase()).filter(Boolean),
  );
  const missing = (items || []).filter((item) => {
    const key = String(item.platform || '').toLowerCase();
    return key && !seen.has(key);
  });

  if (missing.length === 0 && removed === 0) return { imported: 0, alreadyExists: true };

  await Promise.all(missing.map((item) => createSocialLink(item)));
  await logActivity('social_links_seeded', { imported: missing.length, removed });
  return { imported: missing.length, alreadyExists: false };
}

export async function seedDefaultBlogs(items) {
  return seedCollection('blogs', items, (data) => createBlog(data));
}

// Homepage “Plan Your Journey” WhatsApp reservation cards
export async function getAllTravelReservations(maxItems = 40) {
  const size = Math.max(1, Math.min(50, Number(maxItems) || 40));
  try {
    const q = query(collection(db, 'travelReservations'), orderBy('sortOrder', 'asc'), limit(size));
    const snapshot = await getDocs(q);
    return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
  } catch {
    const snapshot = await getDocs(query(collection(db, 'travelReservations'), limit(size)));
    return snapshot.docs
      .map((d) => ({ id: d.id, ...d.data() }))
      .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
  }
}

export async function createTravelReservation(data) {
  const ref = await addDoc(collection(db, 'travelReservations'), {
    ...data,
    active: data.active ?? true,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  await logActivity('travel_reservation_created', { travelReservationId: ref.id });
  return ref.id;
}

export async function updateTravelReservation(id, data) {
  await updateDoc(doc(db, 'travelReservations', id), { ...data, updatedAt: serverTimestamp() });
  await logActivity('travel_reservation_updated', { travelReservationId: id });
}

export async function deleteTravelReservation(id) {
  await deleteDoc(doc(db, 'travelReservations', id));
  await logActivity('travel_reservation_deleted', { travelReservationId: id });
}

export async function seedDefaultTravelReservations(items) {
  const existing = await getDocs(collection(db, 'travelReservations'));
  const canonical = items || [];

  if (existing.size === 0) {
    await Promise.all(canonical.map((item) => createTravelReservation(item)));
    return { imported: canonical.length, alreadyExists: false };
  }

  const byTitle = new Map(
    existing.docs.map((d) => [String(d.data().titleEn || '').trim().toLowerCase(), d]),
  );

  let imported = 0;
  let updated = 0;

  for (const item of canonical) {
    const key = String(item.titleEn || '').trim().toLowerCase();
    if (!key) continue;
    const snap = byTitle.get(key);
    if (!snap) {
      await createTravelReservation(item);
      imported += 1;
      continue;
    }
    const data = snap.data();
    const nextOrder = Number(item.sortOrder) || 0;
    const nextImage = item.imageUrl || '';
    const patch = {};
    if ((data.sortOrder ?? 0) !== nextOrder) patch.sortOrder = nextOrder;
    if (nextImage && data.imageUrl !== nextImage) patch.imageUrl = nextImage;
    if (Object.keys(patch).length) {
      await updateTravelReservation(snap.id, patch);
      updated += 1;
    }
  }

  if (imported === 0 && updated === 0) return { imported: 0, alreadyExists: true };

  await logActivity('travel_reservations_seeded', { imported, updated });
  return { imported: imported + updated, alreadyExists: false };
}

/** Replace entire blogs collection with SuperAdmin service defaults (6 posts). */
export async function replaceDefaultBlogs(items) {
  const existing = await getAllBlogs();
  await Promise.all(existing.map((blog) => deleteBlog(blog.id)));
  let created = 0;
  for (const item of items) {
    const { id: _omit, ...data } = item;
    await createBlog(data);
    created += 1;
  }
  await logActivity('blogs_replaced', { count: created });
  return created;
}

const BROKEN_IMAGE_PATTERNS = ['picsum.photos', 'placeholder'];

function isBrokenImageUrl(url) {
  if (!url) return true;
  return BROKEN_IMAGE_PATTERNS.some((pattern) => url.includes(pattern));
}

function findDefaultProduct(defaults, product) {
  return defaults.find(
    (item) =>
      (product.vehicleKey && item.vehicleKey === product.vehicleKey) ||
      (product.nameEn && item.nameEn === product.nameEn),
  );
}

function findDefaultBySortOrTitle(defaults, item, titleKey = 'titleEn') {
  return defaults.find(
    (entry) =>
      entry.sortOrder === item.sortOrder ||
      (item[titleKey] && entry[titleKey] === item[titleKey]),
  );
}

/** Update only imageUrl fields in Firestore from static site defaults */
export async function syncContentImagesFromDefaults() {
  const [defaultProducts, defaultServices, defaultBlogs, products, services, blogs] =
    await Promise.all([
      Promise.resolve(getDefaultProducts()),
      Promise.resolve(getDefaultServices()),
      Promise.resolve(getDefaultBlogs()),
      getAllProducts(),
      getAllServices(),
      getAllBlogs(),
    ]);

  const result = { products: 0, services: 0, blogs: 0 };

  await Promise.all(
    products.map(async (product) => {
      const defaults = findDefaultProduct(defaultProducts, product);
      if (!defaults?.imageUrl) return;
      if (!isBrokenImageUrl(product.imageUrl) && product.imageUrl === defaults.imageUrl) return;
      if (!isBrokenImageUrl(product.imageUrl) && product.imageUrl) return;
      await updateProduct(product.id, { imageUrl: defaults.imageUrl });
      result.products += 1;
    }),
  );

  await Promise.all(
    services.map(async (service) => {
      const defaults = findDefaultBySortOrTitle(defaultServices, service);
      if (!defaults?.imageUrl) return;
      const shouldUpdate =
        !service.imageUrl ||
        isBrokenImageUrl(service.imageUrl) ||
        service.imageUrl !== defaults.imageUrl;
      if (!shouldUpdate) return;
      await updateService(service.id, { imageUrl: defaults.imageUrl });
      result.services += 1;
    }),
  );

  await Promise.all(
    blogs.map(async (blog) => {
      const defaults =
        defaultBlogs.find((entry) => entry.serviceId && entry.serviceId === blog.serviceId) ||
        findDefaultBySortOrTitle(defaultBlogs, blog);
      if (!defaults?.imageUrl) return;
      if (!blog.imageUrl || blog.imageUrl !== defaults.imageUrl) {
        await updateBlog(blog.id, { imageUrl: defaults.imageUrl });
        result.blogs += 1;
      }
    }),
  );

  await logActivity('content_images_synced', result);
  return result;
}

// Hero section CMS
export async function getHeroSettings() {
  try {
    const snap = await getDoc(doc(db, 'siteSettings', 'hero'));
    if (!snap.exists()) return null;
    return snap.data();
  } catch {
    return null;
  }
}

export async function updateHeroSettings(data) {
  await setDoc(doc(db, 'siteSettings', 'hero'), {
    ...data,
    updatedAt: serverTimestamp(),
  }, { merge: true });
  await logActivity('hero_updated', {});
}

export async function getFooterCreditSettings() {
  try {
    const snap = await getDoc(doc(db, 'siteSettings', 'footerCredit'));
    if (!snap.exists()) return null;
    return snap.data();
  } catch {
    return null;
  }
}

export async function updateFooterCreditSettings(data) {
  await setDoc(doc(db, 'siteSettings', 'footerCredit'), {
    ...data,
    updatedAt: serverTimestamp(),
  }, { merge: true });
  await logActivity('footer_credit_updated', {});
}

// Instant price section CMS
export async function getInstantPriceSettings() {
  try {
    const snap = await getDoc(doc(db, 'siteSettings', 'instantPrice'));
    if (!snap.exists()) return null;
    return snap.data();
  } catch {
    return null;
  }
}

export async function updateInstantPriceSettings(data) {
  await setDoc(doc(db, 'siteSettings', 'instantPrice'), {
    ...data,
    updatedAt: serverTimestamp(),
  }, { merge: true });
  await logActivity('instant_price_updated', {});
}

export async function getBookingTripTypesSettings() {
  try {
    const snap = await getDoc(doc(db, 'siteSettings', 'bookingTripTypes'));
    if (!snap.exists()) return null;
    return snap.data();
  } catch {
    return null;
  }
}

export async function updateBookingTripTypesSettings(data) {
  const options = Array.isArray(data?.options) ? data.options : [];
  const formFields = data?.formFields && typeof data.formFields === 'object'
    ? data.formFields
    : undefined;
  await setDoc(doc(db, 'siteSettings', 'bookingTripTypes'), {
    options,
    ...(formFields ? { formFields } : {}),
    updatedAt: serverTimestamp(),
  }, { merge: false });
  await logActivity('booking_trip_types_updated', { count: options.length });
}

export async function getBookingLocationsSettings() {
  try {
    const snap = await getDoc(doc(db, 'siteSettings', 'bookingLocations'));
    if (!snap.exists()) return null;
    return snap.data();
  } catch {
    return null;
  }
}

export async function updateBookingLocationsSettings(data) {
  const cities = Array.isArray(data?.cities) ? data.cities : [];
  const routes = Array.isArray(data?.routes) ? data.routes : [];
  await setDoc(doc(db, 'siteSettings', 'bookingLocations'), {
    cities,
    routes,
    updatedAt: serverTimestamp(),
  }, { merge: false });
  await logActivity('booking_locations_updated', { cities: cities.length, routes: routes.length });
}

export async function getReligiousToursSettings() {
  try {
    const snap = await getDoc(doc(db, 'siteSettings', 'religiousTours'));
    if (!snap.exists()) return null;
    return snap.data();
  } catch {
    return null;
  }
}

export async function updateReligiousToursSettings(data) {
  await setDoc(doc(db, 'siteSettings', 'religiousTours'), {
    ...data,
    updatedAt: serverTimestamp(),
  }, { merge: true });
  await logActivity('religious_tours_updated', {});
}

// Homepage sections visibility
export async function getAdminHomeSections() {
  return fetchHomeSections();
}

export async function updateHomeSection(sectionId, active) {
  const current = await fetchHomeSections();
  const sections = { ...current, [sectionId]: { ...current[sectionId], active } };
  await setDoc(doc(db, 'siteSettings', 'homepage'), {
    sections,
    updatedAt: serverTimestamp(),
  }, { merge: true });
  await logActivity('home_section_updated', { sectionId, active });
  return sections;
}

export async function updateAllHomeSections(sections) {
  const merged = mergeHomeSections(sections);
  await setDoc(doc(db, 'siteSettings', 'homepage'), {
    sections: merged,
    updatedAt: serverTimestamp(),
  }, { merge: true });
  await logActivity('home_sections_bulk_updated', {});
  return merged;
}

// Notifications
export async function sendNotification(userId, { type = 'general', title, titleAr, message, messageAr, bookingId = null }) {
  await addDoc(collection(db, 'notifications'), {
    userId,
    type,
    title,
    titleAr,
    message,
    messageAr,
    bookingId,
    read: false,
    createdAt: serverTimestamp(),
  });
  await logActivity('notification_sent', { userId, type });
}

export async function sendNotificationToAll(users, payload) {
  await Promise.all(users.map((u) => sendNotification(u.id, payload)));
}

export async function getAllNotifications() {
  try {
    const q = query(collection(db, 'notifications'), orderBy('createdAt', 'desc'), limit(100));
    const snapshot = await getDocs(q);
    return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
  } catch {
    return [];
  }
}

export async function getUserNotifications(userId) {
  try {
    const q = query(
      collection(db, 'notifications'),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc'),
      limit(30)
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
  } catch {
    const q = query(
      collection(db, 'notifications'),
      where('userId', '==', userId),
      limit(50),
    );
    const snapshot = await getDocs(q);
    return sortByDate(snapshot.docs.map((d) => ({ id: d.id, ...d.data() }))).slice(0, 30);
  }
}

export async function markNotificationRead(notifId) {
  await updateDoc(doc(db, 'notifications', notifId), { read: true });
}

export async function logActivity(type, data = {}) {
  try {
    await addDoc(collection(db, 'activityLog'), { type, data, createdAt: serverTimestamp() });
  } catch (err) {
    console.warn('Activity log failed:', err.code);
  }
}

export async function getActivityLog(maxItems = 50) {
  const size = Math.max(1, Math.min(100, Number(maxItems) || 50));
  const isHardFail = (err) => {
    const code = err?.code || '';
    return code === 'permission-denied' || code === 'resource-exhausted' || code === 'unauthenticated';
  };

  try {
    const q = query(collection(db, 'activityLog'), orderBy('createdAt', 'desc'), limit(size));
    const snapshot = await getDocs(q);
    return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
  } catch (err) {
    if (isHardFail(err)) throw err;
    console.warn('getActivityLog ordered query failed:', err.code || err.message);
    try {
      const snapshot = await getDocs(query(collection(db, 'activityLog'), limit(size)));
      return sortByDate(snapshot.docs.map((d) => ({ id: d.id, ...d.data() }))).slice(0, size);
    } catch (fallbackErr) {
      if (isHardFail(fallbackErr)) throw fallbackErr;
      throw err;
    }
  }
}

// ─── Shared car catalog (5 cars) ─────────────────────────────────────────────

function replaceCarNamePrefix(fullName, oldName, newName) {
  const full = String(fullName || '');
  const prev = String(oldName || '').trim();
  const next = String(newName || '').trim();
  if (!full || !prev || !next || prev === next) return full;
  if (full.startsWith(prev)) return `${next}${full.slice(prev.length)}`;
  return full.split(prev).join(next);
}

export async function getAllCars(maxItems = 50) {
  const size = Math.max(1, Math.min(100, Number(maxItems) || 50));
  try {
    const q = query(collection(db, 'vehicles'), orderBy('sortOrder', 'asc'), limit(size));
    const snapshot = await getDocs(q);
    return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
  } catch {
    const snapshot = await getDocs(query(collection(db, 'vehicles'), limit(size)));
    return snapshot.docs
      .map((d) => ({ id: d.id, ...d.data() }))
      .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
  }
}

export async function upsertCar(carId, data) {
  const id = String(carId || '').trim();
  if (!id) throw new Error('carId required');
  await setDoc(
    doc(db, 'vehicles', id),
    {
      ...data,
      id,
      active: data.active !== false,
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );
  await logActivity('car_updated', { carId: id });
  return id;
}

/**
 * Update car catalog + push name/image to every package for that car key.
 * Returns how many packages were updated.
 */
export async function updateCarAndSyncPackages(carId, data, previous = {}) {
  const id = String(carId || '').trim();
  const nameEn = String(data.nameEn || '').trim();
  const nameAr = String(data.nameAr || '').trim();
  const imageUrl = String(data.imageUrl || '').trim();

  await upsertCar(id, {
    nameEn,
    nameAr,
    modelEn: data.modelEn || nameEn,
    modelAr: data.modelAr || nameAr,
    imageUrl,
    passengers: Number(data.passengers) || 4,
    vip: Boolean(data.vip),
    sortOrder: Number(data.sortOrder) || 0,
    active: data.active !== false,
    forms: data.forms || { booking: true, instantPrice: true, religiousTours: true },
  });

  const products = await getAllProducts();
  const matching = products.filter(
    (p) => String(p.vehicleKey || '').split('-')[0] === id,
  );

  const prevEn = previous.nameEn || previous.modelEn || '';
  const prevAr = previous.nameAr || previous.modelAr || '';
  const BATCH_SIZE = 400;

  for (let i = 0; i < matching.length; i += BATCH_SIZE) {
    const slice = matching.slice(i, i + BATCH_SIZE);
    const batch = writeBatch(db);
    slice.forEach((p) => {
      const payload = {
        carModelEn: nameEn,
        carModelAr: nameAr,
        imageUrl,
        updatedAt: serverTimestamp(),
      };
      if (nameEn) {
        payload.nameEn = replaceCarNamePrefix(p.nameEn, prevEn, nameEn) || p.nameEn;
      }
      if (nameAr) {
        payload.nameAr = replaceCarNamePrefix(p.nameAr, prevAr, nameAr) || p.nameAr;
      }
      batch.update(doc(db, 'packages', p.id), payload);
    });
    await batch.commit();
  }

  await logActivity('car_synced_packages', { carId: id, count: matching.length });
  return matching.length;
}

/**
 * Create a new car + clone all route packages from a reference car (same SAR prices).
 */
export async function createCarWithPackages(data) {
  const id = String(data.carId || '').trim().toLowerCase();
  if (!id || !/^[a-z0-9-]+$/.test(id)) {
    throw new Error('Car ID must be lowercase letters, numbers, and hyphens only.');
  }

  const existing = await getDoc(doc(db, 'vehicles', id));
  if (existing.exists()) {
    throw new Error('A car with this ID already exists.');
  }

  const nameEn = String(data.nameEn || '').trim();
  const nameAr = String(data.nameAr || '').trim();
  const imageUrl = String(data.imageUrl || '').trim();
  if (!nameEn || !nameAr) throw new Error('English and Arabic names are required.');
  if (!imageUrl) throw new Error('Car image is required.');

  const priceFromCarId = String(data.priceFromCarId || 'camry').trim();
  const refEn = String(data.refNameEn || '').trim();
  const refAr = String(data.refNameAr || '').trim();
  const allProducts = await getAllProducts(600);
  const templates = allProducts.filter(
    (p) => String(p.vehicleKey || '').split('-')[0] === priceFromCarId,
  );
  if (!templates.length) {
    throw new Error(`No route prices found for "${priceFromCarId}". Import default cars first.`);
  }

  const forms = data.forms || { booking: true, instantPrice: true, religiousTours: true };
  const maxSort = allProducts.length
    ? Math.max(...(await getAllCars()).map((c) => Number(c.sortOrder) || 0), 0)
    : BOOKING_CAR_TYPES.length;

  await upsertCar(id, {
    nameEn,
    nameAr,
    modelEn: data.modelEn || nameEn,
    modelAr: data.modelAr || nameAr,
    imageUrl,
    passengers: Number(data.passengers) || 4,
    vip: Boolean(data.vip),
    sortOrder: Number(data.sortOrder) ?? maxSort + 1,
    active: true,
    forms,
    custom: true,
  });

  let created = 0;
  const existingKeys = new Set(
    allProducts.map((p) => `${p.routeId}::${p.vehicleKey}`),
  );

  for (const p of templates) {
    const oldKey = String(p.vehicleKey || priceFromCarId);
    const dash = oldKey.indexOf('-');
    const suffix = dash >= 0 ? oldKey.slice(dash) : '';
    const newVehicleKey = `${id}${suffix}`;
    const dedupeKey = `${p.routeId}::${newVehicleKey}`;
    if (existingKeys.has(dedupeKey)) continue;

    const { id: _drop, createdAt, updatedAt, ...rest } = p;
    await createProduct({
      ...rest,
      vehicleKey: newVehicleKey,
      carModelEn: nameEn,
      carModelAr: nameAr,
      imageUrl,
      passengers: Number(data.passengers) || p.passengers || 4,
      vip: Boolean(data.vip),
      nameEn: refEn
        ? replaceCarNamePrefix(p.nameEn, refEn, nameEn)
        : (p.nameEn || nameEn),
      nameAr: refAr
        ? replaceCarNamePrefix(p.nameAr, refAr, nameAr)
        : (p.nameAr || nameAr),
      active: p.active !== false,
    });
    existingKeys.add(dedupeKey);
    created += 1;
  }

  await logActivity('car_created', { carId: id, packages: created, priceFrom: priceFromCarId });
  return { id, packagesCreated: created };
}

export async function seedDefaultCars(defaults = getDefaultCarCatalog()) {
  const existing = await getAllCars();
  if (existing.length > 0) {
    return { imported: 0, alreadyExists: true };
  }
  await Promise.all(
    defaults.map((car) =>
      setDoc(doc(db, 'vehicles', car.id), {
        ...car,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      }),
    ),
  );
  await logActivity('cars_seeded', { count: defaults.length });
  return { imported: defaults.length, alreadyExists: false };
}
