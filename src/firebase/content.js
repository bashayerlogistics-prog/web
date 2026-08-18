import {
  collection,
  getDocs,
  query,
  orderBy,
  where,
  doc,
  getDoc,
  setDoc,
  increment,
  serverTimestamp,
  onSnapshot,
  limit,
} from 'firebase/firestore';
import { db } from './db';
import {
  FLEET_ROUTES,
  ROUND_TRIP_FLEET_ROUTES,
  SERVICES,
  SERVICE_CATEGORIES,
  BLOG_POSTS,
  ROUTE_CARDS,
  SERVICE_CATALOG,
  SERVICE_CATALOG_FILTERS,
  SERVICE_IMAGES,
  ROUTE_IMAGE_FALLBACK,
  FAQ_ITEMS,
  SOCIAL_LINKS,
  mergeSocialLinks,
  DEFAULT_GALLERY_ITEMS,
  DEFAULT_GALLERY_HERO,
  GALLERY_IMAGES,
} from '../data/staticData';
import { HOURLY_FLEET_ROUTES } from '../data/hourlyPricing';
import { mergeHomeSections } from '../data/homeSections';
import { emptyFleetShowcase, normalizeFleetShowcase } from '../data/adminFleetServices';
import {
  DEFAULT_RELIGIOUS_TOURS,
  buildReligiousToursFromFirestore,
} from '../data/religiousTours';
import {
  DEFAULT_BOOKING_TRIP_TYPES,
  buildBookingTripTypesFromFirestore,
} from '../data/bookingTripTypes';
import {
  DEFAULT_BOOKING_LOCATIONS,
  buildBookingLocationsFromFirestore,
} from '../data/bookingLocations';
import {
  DEFAULT_TRAVEL_RESERVATIONS,
  buildTravelReservationsFromFirestore,
} from '../data/travelReservations';
import { dedupeFleetProducts } from '../utils/productDedupe';

export { buildTravelReservationsFromFirestore, DEFAULT_TRAVEL_RESERVATIONS };

async function fetchActive(collectionName, maxItems = 100) {
  const size = Math.max(1, Math.min(300, Number(maxItems) || 100));
  try {
    const q = query(
      collection(db, collectionName),
      where('active', '==', true),
      orderBy('sortOrder', 'asc'),
      limit(size),
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
  } catch {
    try {
      const q = query(collection(db, collectionName), where('active', '==', true), limit(size));
      const snapshot = await getDocs(q);
      return snapshot.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
    } catch {
      return [];
    }
  }
}

export async function getActiveProducts() {
  // Fleet packages can exceed the default CMS page size; keep a hard cap.
  return fetchActive('packages', 300);
}

export async function getActiveServices() {
  return fetchActive('services');
}

export async function getActiveBlogs() {
  return fetchActive('blogs');
}

/** Bounded one-shot CMS reads for the public site; avoids realtime listeners. */
export async function getActiveContentCollection(collectionName, maxItems = 100) {
  const size = Math.max(1, Math.min(100, Number(maxItems) || 100));
  try {
    const q = query(
      collection(db, collectionName),
      where('active', '==', true),
      orderBy('sortOrder', 'asc'),
      limit(size),
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
  } catch {
    const q = query(
      collection(db, collectionName),
      where('active', '==', true),
      limit(size),
    );
    const snapshot = await getDocs(q);
    return sortByOrder(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })));
  }
}

export async function getCarCatalog(maxItems = 20) {
  const size = Math.max(1, Math.min(50, Number(maxItems) || 20));
  try {
    const snapshot = await getDocs(
      query(collection(db, 'vehicles'), orderBy('sortOrder', 'asc'), limit(size)),
    );
    return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
  } catch {
    const snapshot = await getDocs(query(collection(db, 'vehicles'), limit(size)));
    return sortByOrder(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })));
  }
}

function carTypeOfVehicleId(vehicleId) {
  return String(vehicleId || '').split('-')[0]?.trim() || '';
}

export function buildFleetRoutesFromProducts(activeProducts, extraRoutes = []) {
  const staticRoutes = [...FLEET_ROUTES, ...ROUND_TRIP_FLEET_ROUTES, ...HOURLY_FLEET_ROUTES];
  const staticById = new Map(staticRoutes.map((r) => [r.id, r]));
  (Array.isArray(extraRoutes) ? extraRoutes : []).forEach((route) => {
    if (route?.id && !staticById.has(route.id)) staticById.set(route.id, route);
  });

  // No SuperAdmin packages → empty live catalog (do not resurrect static seed when all inactive)
  if (!Array.isArray(activeProducts)) {
    return staticRoutes;
  }
  if (!activeProducts.length) {
    return [];
  }

  // Real products only: drop fake static fill + collapse route+car duplicates
  const { unique: products } = dedupeFleetProducts(activeProducts);

  const routeMap = {};

  for (const p of products) {
    const routeId = String(p.routeId || '').trim();
    if (!routeId) continue;

    const staticRoute = staticById.get(routeId);
    // Skip legacy/orphan route ids that are not in the fleet catalog
    if (!staticRoute) continue;

    if (!routeMap[routeId]) {
      routeMap[routeId] = {
        id: routeId,
        title: staticRoute.title || { ar: routeId, en: routeId },
        pickupLabel: staticRoute.pickupLabel,
        dropoffLabel: staticRoute.dropoffLabel,
        tripType: staticRoute.tripType || p.tripType || 'one_way',
        category: staticRoute.category || p.category || undefined,
        hours: staticRoute.hours,
        baseCityId: staticRoute.baseCityId,
        destinationKey: staticRoute.destinationKey,
        vehicles: [],
        _cars: new Set(),
      };
    }

    const vehicleId = p.vehicleKey || p.id;
    const car = carTypeOfVehicleId(vehicleId);
    const serviceTag = String(p.fleetServiceId || '').trim();
    const formTag = String(p.bookingFormId || '').trim();
    const uniq = [car, serviceTag, formTag].filter(Boolean).join('::') || car;
    if (!car || routeMap[routeId]._cars.has(uniq)) continue;
    routeMap[routeId]._cars.add(uniq);

    routeMap[routeId].vehicles.push({
      id: vehicleId,
      name: { ar: p.nameAr, en: p.nameEn },
      image: p.imageUrl,
      passengers: p.passengers || 4,
      badge: { ar: p.badgeAr || '', en: p.badgeEn || '' },
      brandTag: { ar: 'بشاير العطاء', en: 'Bashayer Logistics' },
      price: p.price,
      originalPrice: p.originalPrice ?? p.price,
      pickupPrice: p.pickupPrice,
      dropoffPrice: p.dropoffPrice,
      hourlyRate: p.hourlyRate,
      hours: p.hours,
      hidePrice: p.hidePrice ?? false,
      tripType: p.tripType || staticRoute.tripType || 'one_way',
      fleetServiceId: p.fleetServiceId || '',
      bookingFormId: p.bookingFormId || '',
      vip: p.vip || false,
      description: { ar: p.descriptionAr || '', en: p.descriptionEn || '' },
    });
  }

  return Object.values(routeMap)
    .map(({ _cars, ...route }) => route)
    .filter((r) => r.vehicles.length > 0);
}

/** Infer Six Ways category from titles when Firestore docs lack `category`. */
export function inferServiceCategory(titleEn = '', titleAr = '', existing = '') {
  if (SERVICE_CATEGORIES.includes(existing)) return existing;
  // Legacy catalog aliases
  if (existing === 'cities') return 'intercity';

  const text = `${titleEn} ${titleAr}`;
  if (/train|قطار|haramain|حرمين/i.test(text)) return 'train';
  if (/airport|مطار/i.test(text)) return 'airport';
  if (/between cities|moving between|التنقل بين المدن/i.test(text)) return 'intercity';
  if (/within-city|within city|داخل المدينة/i.test(text)) return 'withinCity';
  if (/hourly rental|استئجار بالساعة|بالساعة مع سائق/i.test(text)) return 'hourly';
  if (/ziyarat|مزارات|religious|دينية/i.test(text)) return 'tours';
  return '';
}

/**
 * Homepage services from SuperAdmin.
 * When Firestore has any active services, show only those (no static refill for deactivated categories).
 * Empty DB → static seed so the site never goes blank offline.
 */
export function buildServicesFromFirestore(activeServices) {
  if (!activeServices?.length) return SERVICES;

  const mapped = activeServices
    .map((s) => {
      const category = inferServiceCategory(s.titleEn, s.titleAr, s.category || '');
      const categoryImage = CATALOG_CATEGORY_IMAGES[category];
      return {
        id: s.id,
        title: { ar: s.titleAr, en: s.titleEn },
        description: { ar: s.descriptionAr, en: s.descriptionEn },
        image: s.imageUrl || categoryImage || '',
        icon: s.icon || 'star',
        badge: s.badge || 'primary',
        category,
        features: Array.isArray(s.features) ? s.features : [],
        sortOrder: s.sortOrder ?? 0,
      };
    })
    .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));

  const byCategory = new Map();
  for (const service of mapped) {
    if (!service.category || byCategory.has(service.category)) continue;
    byCategory.set(service.category, service);
  }

  // Prefer one card per known category from live data only (do not resurrect deactivated).
  const fromLive = SERVICE_CATEGORIES
    .map((category) => byCategory.get(category))
    .filter(Boolean);

  const extras = mapped.filter(
    (s) => s.category && !SERVICE_CATEGORIES.includes(s.category),
  );

  const six = fromLive.length ? [...fromLive, ...extras] : mapped;

  // If CMS gave two categories the same imageUrl, force the category default.
  const seen = new Set();
  return six.map((service) => {
    const categoryImage = CATALOG_CATEGORY_IMAGES[service.category];
    let image = service.image || categoryImage || '';
    if (image && seen.has(image) && categoryImage && categoryImage !== image) {
      image = categoryImage;
    }
    if (image) seen.add(image);
    // Always prefer distinct category art for withinCity vs hourly (common CMS duplicate).
    if (
      (service.category === 'withinCity' || service.category === 'hourly') &&
      categoryImage
    ) {
      image = categoryImage;
    }
    return { ...service, image };
  });
}

export function buildRouteCardsFromFirestore(activeRouteCards) {
  if (!activeRouteCards?.length) return ROUTE_CARDS;

  return activeRouteCards.map((r) => ({
    id: r.slug || r.id,
    title: { ar: r.titleAr, en: r.titleEn },
    description: { ar: r.descriptionAr || '', en: r.descriptionEn || '' },
    image: r.imageUrl || ROUTE_IMAGE_FALLBACK,
    imageFallback: ROUTE_IMAGE_FALLBACK,
    popular: r.popular ?? false,
  }));
}

export function buildFaqFromFirestore(activeFaqs) {
  if (!activeFaqs?.length) return FAQ_ITEMS;

  return activeFaqs.map((f, index) => ({
    id: f.numericId ?? index + 1,
    category: f.category || 'general',
    featured: f.featured ?? false,
    icon: f.icon || 'info',
    color: f.color || 'primary',
    image: f.imageUrl || undefined,
    question: { ar: f.questionAr, en: f.questionEn },
    answer: { ar: f.answerAr, en: f.answerEn },
  }));
}

export function buildSocialLinksFromFirestore(activeLinks) {
  if (!activeLinks?.length) return SOCIAL_LINKS;

  const mapped = activeLinks.map((s, index) => ({
    id: s.id || s.platform || `social-${index}`,
    name: { ar: s.nameAr || s.platform || '', en: s.nameEn || s.platform || '' },
    platform: s.platform || 'custom',
    url: s.url || '',
    iconUrl: s.iconUrl || '',
    icon: s.platform || 'custom',
  }));

  return mergeSocialLinks(mapped);
}

export function buildBlogsFromFirestore(activeBlogs) {
  if (!activeBlogs?.length) return BLOG_POSTS;

  // Legacy posts without serviceId → show the 6 SuperAdmin service guides
  const hasServiceBlogs = activeBlogs.some((b) => b.serviceId);
  if (!hasServiceBlogs) return BLOG_POSTS;

  const byService = new Map(
    activeBlogs.filter((b) => b.serviceId).map((b) => [b.serviceId, b]),
  );
  const defaultByService = new Map(BLOG_POSTS.map((def) => [def.serviceId, def]));
  const hasAllGuides = BLOG_POSTS.every((def) => byService.has(def.serviceId));

  // Canonical 6 service-guide headings (same order as SuperAdmin)
  if (hasAllGuides) {
    return BLOG_POSTS.map((def) => {
      const b = byService.get(def.serviceId);
      return {
        id: b.id || def.id,
        serviceId: def.serviceId,
        badge: def.badge,
        date: {
          ar: b.dateAr || def.date.ar,
          en: b.dateEn || def.date.en,
        },
        title: def.title,
        excerpt: {
          ar: b.excerptAr || def.excerpt.ar,
          en: b.excerptEn || def.excerpt.en,
        },
        image: def.image || b.imageUrl || '',
        content: {
          ar: b.contentAr || def.content.ar,
          en: b.contentEn || def.content.en,
        },
      };
    });
  }

  return activeBlogs.map((b) => {
    const def = b.serviceId ? defaultByService.get(b.serviceId) : null;
    return {
      id: b.id,
      serviceId: b.serviceId || '',
      badge: {
        ar: b.badgeAr || def?.badge?.ar || '',
        en: b.badgeEn || def?.badge?.en || '',
      },
      date: { ar: b.dateAr || def?.date?.ar || '', en: b.dateEn || def?.date?.en || '' },
      title: { ar: b.titleAr || def?.title?.ar || '', en: b.titleEn || def?.title?.en || '' },
      excerpt: {
        ar: b.excerptAr || b.contentAr || def?.excerpt?.ar || '',
        en: b.excerptEn || b.contentEn || def?.excerpt?.en || '',
      },
      image: def?.image || b.imageUrl || '',
      content: {
        ar: b.contentAr || def?.content?.ar || '',
        en: b.contentEn || def?.content?.en || '',
      },
    };
  });
}

import {
  HERO_GRADIENT,
  HERO_IMAGE,
  HERO_IMAGE_MOBILE,
} from '../data/staticData';

export const DEFAULT_HERO = {
  titleEn: 'Airport, Train & City Transfers Across the Holy Cities',
  titleAr: 'نقل المطارات والقطارات والمدن إلى المشاعر المقدسة',
  subtitleEn: 'Private chauffeur in 5 modern cars — airport pickup, Haramain train stations, city-to-city trips, within-city rides, hourly packages, and Ziyarat tours with clear SAR prices.',
  subtitleAr: 'سائق خاص بـ 5 سيارات حديثة — استقبال المطارات، محطات قطار الحرمين، التنقل بين المدن، مشاوير داخل المدينة، باقات بالساعة، وجولات المزارات بأسعار ريال واضحة.',
  badgeLicensedEn: 'Licensed & Certified Drivers',
  badgeLicensedAr: 'سائقون معتمدون ومرخصون',
  badgeCitiesEn: 'Makkah · Madinah · Jeddah · Taif',
  badgeCitiesAr: 'مكة · المدينة · جدة · الطائف',
  imageUrl: HERO_IMAGE,
  imageMobileUrl: HERO_IMAGE_MOBILE,
  videoUrl: '',
  gradientUrl: HERO_GRADIENT,
  showVideo: false,
};

/** Footer copyright + “Design by” credit (logo + clickable URL). */
export const DEFAULT_FOOTER_CREDIT = {
  copyrightEn: '© 2026 Bashayer Al-Ataa Land Transport Company. All rights reserved',
  copyrightAr: '© 2026 شركة بشاير العطاء للنقل البري. جميع الحقوق محفوظة',
  designedByEn: 'Design by',
  designedByAr: 'تصميم بواسطة',
  designerNameEn: 'Suleman',
  designerNameAr: 'متجر ترند للخدمات الرقمية',
  designerUrl: 'https://wa.me/966577469103',
  designerLogoUrl: '/images/designer-trend-logo.png',
  showCredit: true,
};

export function buildFooterCreditFromFirestore(data) {
  if (!data || typeof data !== 'object') return { ...DEFAULT_FOOTER_CREDIT };
  const designerUrl = typeof data.designerUrl === 'string' ? data.designerUrl.trim() : '';
  const designerLogoUrl = typeof data.designerLogoUrl === 'string' ? data.designerLogoUrl.trim() : '';
  const nameEn = typeof data.designerNameEn === 'string' ? data.designerNameEn.trim() : '';
  const nameAr = typeof data.designerNameAr === 'string' ? data.designerNameAr.trim() : '';
  // Migrate legacy default credit (Fahad) to current designer defaults.
  const isLegacyFahad = /^fahad$/i.test(nameEn) && /^fahad$/i.test(nameAr || nameEn);
  return {
    ...DEFAULT_FOOTER_CREDIT,
    ...data,
    showCredit: data.showCredit !== false,
    designerNameEn: isLegacyFahad ? DEFAULT_FOOTER_CREDIT.designerNameEn : (nameEn || DEFAULT_FOOTER_CREDIT.designerNameEn),
    designerNameAr: isLegacyFahad ? DEFAULT_FOOTER_CREDIT.designerNameAr : (nameAr || DEFAULT_FOOTER_CREDIT.designerNameAr),
    designerUrl: isLegacyFahad
      ? DEFAULT_FOOTER_CREDIT.designerUrl
      : (designerUrl || DEFAULT_FOOTER_CREDIT.designerUrl),
    designerLogoUrl: designerLogoUrl || DEFAULT_FOOTER_CREDIT.designerLogoUrl,
  };
}

export const DEFAULT_INSTANT_PRICE = {
  formTitleEn: 'Your instant price',
  formTitleAr: 'سعرك الفوري',
  formSubtitleEn: 'Choose Moving Between Cities, Round Trip (airport & train), Hourly, or Your Price — see live SAR rates for 5 cars.',
  formSubtitleAr: 'اختر التنقل بين المدن، ذهاب وعودة (مطار وقطار)، بالساعة، أو رحلتك بسعرك — وشاهد أسعار 5 سيارات مباشرة.',
  eyebrowEn: 'AIRPORT · TRAIN · CITIES · HOURLY',
  eyebrowAr: 'مطار · قطار · مدن · بالساعة',
  headingEn: 'Pick your service — get a clear price in seconds.',
  headingAr: 'اختر خدمتك — واحصل على سعر واضح خلال ثوانٍ.',
  bodyEn: 'Airport pickup, Haramain train stations, city-to-city, within-city and Ziyarat hourly packages. Final confirmation on WhatsApp at {{whatsapp}} — available 24/7.',
  bodyAr: 'استقبال المطارات، محطات قطار الحرمين، التنقل بين المدن، مشاوير داخل المدينة وباقات المزارات بالساعة. التأكيد النهائي عبر واتساب على {{whatsapp}} — متاحون 24/7.',
  whatsappDisplay: '+966 57 746 9103',
  phoneDisplay: '+966 57 746 9103',
  whatsappUrl: 'https://wa.me/+966577469103',
  phoneTel: '+966577469103',
  ctaLabelEn: 'SHOW PRICE',
  ctaLabelAr: 'اعرض السعر',
  fromLabelEn: 'FROM / PICKUP',
  fromLabelAr: 'من / الاستقبال',
  fromPlaceholderEn: 'City, airport, or train station',
  fromPlaceholderAr: 'مدينة، مطار، أو محطة قطار',
  toLabelEn: 'TO / DROP-OFF',
  toLabelAr: 'إلى / التوديع',
  toPlaceholderEn: 'To where?',
  toPlaceholderAr: 'إلى أين؟',
  timeLabelEn: 'THE TIME',
  timeLabelAr: 'الوقت',
  dateLabelEn: 'LAUNCH DATE',
  dateLabelAr: 'تاريخ الانطلاق',
  passengersLabelEn: 'NUMBER OF PASSENGERS',
  passengersLabelAr: 'عدد الركاب',
  carLabelEn: 'CAR',
  carLabelAr: 'السيارة',
  carOptionEn: 'Any car — best price',
  carOptionAr: 'أي سيارة — أفضل سعر',
  currencyLabelEn: 'CURRENCY',
  currencyLabelAr: 'العملة',
  currencyOptionEn: 'Saudi Riyal (SAR)',
  currencyOptionAr: 'ريال سعودي (SAR)',
  backgroundImageUrl: '/images/instant-price-bg.webp',
};

export { DEFAULT_BOOKING_TRIP_TYPES, buildBookingTripTypesFromFirestore };
export { DEFAULT_BOOKING_LOCATIONS, buildBookingLocationsFromFirestore };

export async function getBookingTripTypesContent() {
  try {
    const snap = await getDoc(doc(db, 'siteSettings', 'bookingTripTypes'));
    if (!snap.exists()) return buildBookingTripTypesFromFirestore(null);
    return buildBookingTripTypesFromFirestore(snap.data());
  } catch {
    return buildBookingTripTypesFromFirestore(null);
  }
}

export function subscribeBookingTripTypesContent(onData, onError) {
  return subscribeSiteSettingDoc(
    'bookingTripTypes',
    DEFAULT_BOOKING_TRIP_TYPES,
    (data) => onData(buildBookingTripTypesFromFirestore(data)),
    onError,
  );
}

export async function getBookingLocationsContent() {
  try {
    const snap = await getDoc(doc(db, 'siteSettings', 'bookingLocations'));
    if (!snap.exists()) return buildBookingLocationsFromFirestore(null);
    return buildBookingLocationsFromFirestore(snap.data());
  } catch {
    return buildBookingLocationsFromFirestore(null);
  }
}

export function subscribeBookingLocationsContent(onData, onError) {
  return subscribeSiteSettingDoc(
    'bookingLocations',
    DEFAULT_BOOKING_LOCATIONS,
    (data) => onData(buildBookingLocationsFromFirestore(data)),
    onError,
  );
}

export async function getHeroContent() {
  try {
    const snap = await getDoc(doc(db, 'siteSettings', 'hero'));
    if (!snap.exists()) return { ...DEFAULT_HERO };
    return { ...DEFAULT_HERO, ...snap.data() };
  } catch {
    return { ...DEFAULT_HERO };
  }
}

export async function getInstantPriceContent() {
  try {
    const snap = await getDoc(doc(db, 'siteSettings', 'instantPrice'));
    if (!snap.exists()) return { ...DEFAULT_INSTANT_PRICE };
    return { ...DEFAULT_INSTANT_PRICE, ...snap.data() };
  } catch {
    return { ...DEFAULT_INSTANT_PRICE };
  }
}

export { DEFAULT_RELIGIOUS_TOURS, buildReligiousToursFromFirestore };

export async function getReligiousToursContent() {
  try {
    const snap = await getDoc(doc(db, 'siteSettings', 'religiousTours'));
    if (!snap.exists()) return { ...DEFAULT_RELIGIOUS_TOURS, packages: [...DEFAULT_RELIGIOUS_TOURS.packages] };
    return buildReligiousToursFromFirestore(snap.data());
  } catch {
    return { ...DEFAULT_RELIGIOUS_TOURS, packages: [...DEFAULT_RELIGIOUS_TOURS.packages] };
  }
}

export { DEFAULT_GALLERY_HERO };

export async function getGalleryHeroContent() {
  try {
    const snap = await getDoc(doc(db, 'siteSettings', 'galleryHero'));
    if (!snap.exists()) return { ...DEFAULT_GALLERY_HERO };
    return { ...DEFAULT_GALLERY_HERO, ...snap.data() };
  } catch {
    return { ...DEFAULT_GALLERY_HERO };
  }
}

export async function getFooterCreditContent() {
  try {
    const snap = await getDoc(doc(db, 'siteSettings', 'footerCredit'));
    if (!snap.exists()) return { ...DEFAULT_FOOTER_CREDIT };
    return buildFooterCreditFromFirestore(snap.data());
  } catch {
    return { ...DEFAULT_FOOTER_CREDIT };
  }
}

/** Single-doc listeners for hero/background settings — cheap instant sync on public pages. */
function subscribeSiteSettingDoc(docId, defaults, onData, onError) {
  try {
    return onSnapshot(
      doc(db, 'siteSettings', docId),
      (snap) => {
        onData(snap.exists() ? { ...defaults, ...snap.data() } : { ...defaults });
      },
      (err) => {
        onError?.(err);
        onData({ ...defaults });
      },
    );
  } catch {
    onData({ ...defaults });
    return () => {};
  }
}

export function subscribeHeroContent(onData, onError) {
  return subscribeSiteSettingDoc('hero', DEFAULT_HERO, onData, onError);
}

export function subscribeInstantPriceContent(onData, onError) {
  return subscribeSiteSettingDoc('instantPrice', DEFAULT_INSTANT_PRICE, onData, onError);
}

export function subscribeFooterCreditContent(onData, onError) {
  return subscribeSiteSettingDoc(
    'footerCredit',
    DEFAULT_FOOTER_CREDIT,
    (data) => onData(buildFooterCreditFromFirestore(data)),
    onError,
  );
}

export function subscribeGalleryHeroContent(onData, onError) {
  return subscribeSiteSettingDoc('galleryHero', DEFAULT_GALLERY_HERO, onData, onError);
}

/** Single cheap sync signal: public clients refresh only when this doc changes. */
export const CONTENT_REVISION_DOC_ID = 'contentRevision';
export const CONTENT_REVISION_STORAGE_KEY = 'bashayer-content-rev';

export function readStoredContentRevision() {
  try {
    if (typeof localStorage === 'undefined') return 0;
    const n = Number(localStorage.getItem(CONTENT_REVISION_STORAGE_KEY));
    return Number.isFinite(n) && n > 0 ? n : 0;
  } catch {
    return 0;
  }
}

export function writeStoredContentRevision(rev) {
  try {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(CONTENT_REVISION_STORAGE_KEY, String(rev || 0));
  } catch {
    // ignore
  }
}

/**
 * Admin publish bump — 1 write. Live + local browsers listening to this doc
 * then run a one-shot content refresh (not continuous collection listeners).
 */
export async function bumpContentRevision() {
  await setDoc(
    doc(db, 'siteSettings', CONTENT_REVISION_DOC_ID),
    { rev: increment(1), updatedAt: serverTimestamp() },
    { merge: true },
  );
}

/** Listen for CMS publish signal (~1 read on attach + 1 per publish). */
export function subscribeContentRevision(onRev, onError) {
  try {
    return onSnapshot(
      doc(db, 'siteSettings', CONTENT_REVISION_DOC_ID),
      (snap) => {
        const rev = snap.exists() ? Number(snap.data()?.rev) || 0 : 0;
        onRev(rev);
      },
      (err) => {
        onError?.(err);
      },
    );
  } catch (err) {
    onError?.(err);
    return () => {};
  }
}

export function buildGalleryHeroFromFirestore(data) {
  if (!data) return { ...DEFAULT_GALLERY_HERO };
  return {
    ...DEFAULT_GALLERY_HERO,
    ...data,
    // Only play video when admin explicitly enables it (image-first for speed).
    showVideo: data.showVideo === true,
  };
}

/** Known-bad CDN IDs / dead paths previously shipped as Makkah/Jeddah/etc. */
const BAD_GALLERY_URL_SNIPPETS = [
  'photo-1564760055775', // elephants labeled as Makkah
  'photo-1578894381160', // 404 Jeddah
  'photo-1580418827634', // 404 Riyadh
  'photo-1507525428034', // tropical beach as Dammam
  'photo-1555881400', // Porto as market
  'photo-1469854523086', // yellow van highway
  'photo-1436491865332', // generic wing
  'photo-1542296332', // broken airport still
  '/images/gallery/jeddah.jpg', // was empty / missing
  '/images/gallery/riyadh.jpg', // was empty / missing
  '/images/gallery/dammam', // missing variants
  'pexels-city.jpg', // European canal mislabeled as Jeddah
];

const LEGACY_TITLE_ALIASES = {
  'jeddah corniche & city': 'jeddah',
  'jeddah corniche': 'jeddah',
  'riyadh capital': 'riyadh',
  'saudi cities network': 'riyadh',
};

function isBadGalleryUrl(url) {
  if (!url || typeof url !== 'string') return true;
  const trimmed = url.trim();
  if (!trimmed || trimmed === '#' || trimmed === 'about:blank') return true;
  return BAD_GALLERY_URL_SNIPPETS.some((snippet) => trimmed.includes(snippet));
}

function fallbackGalleryMedia(item, index) {
  const titleKey = String(item.titleEn || '').trim().toLowerCase();
  const alias = LEGACY_TITLE_ALIASES[titleKey];
  if (alias && GALLERY_IMAGES[alias]) {
    const byAlias = DEFAULT_GALLERY_ITEMS.find((d) =>
      String(d.locationEn || '').toLowerCase().includes(alias)
      || String(d.titleEn || '').toLowerCase().includes(alias),
    );
    if (byAlias) return byAlias;
  }

  const byTitle = DEFAULT_GALLERY_ITEMS.find(
    (d) =>
      (item.titleEn && d.titleEn === item.titleEn)
      || (item.titleAr && d.titleAr === item.titleAr)
      || (item.locationEn && d.locationEn === item.locationEn),
  );
  const byOrder = DEFAULT_GALLERY_ITEMS[index];
  return byTitle || byOrder || DEFAULT_GALLERY_ITEMS[0];
}

export function buildGalleryItemsFromFirestore(items) {
  if (!items?.length) return DEFAULT_GALLERY_ITEMS;
  return items.map((item, index) => {
    const fallback = fallbackGalleryMedia(item, index);
    const rawImage = item.imageUrl || item.posterUrl || '';
    const rawPoster = item.posterUrl || item.imageUrl || '';
    const preferLocal =
      isBadGalleryUrl(rawImage)
      || /images\.unsplash\.com/i.test(rawImage)
      || /images\.unsplash\.com/i.test(rawPoster);
    const imageUrl = preferLocal ? (fallback.imageUrl || rawImage) : rawImage;
    const posterUrl = preferLocal ? (fallback.posterUrl || rawPoster) : rawPoster;

    return {
      id: item.id || `gallery-${index}`,
      titleEn: item.titleEn || fallback.titleEn || '',
      titleAr: item.titleAr || fallback.titleAr || '',
      subtitleEn: item.subtitleEn || fallback.subtitleEn || '',
      subtitleAr: item.subtitleAr || fallback.subtitleAr || '',
      locationEn: item.locationEn || fallback.locationEn || '',
      locationAr: item.locationAr || fallback.locationAr || '',
      category: item.category || fallback.category || 'city',
      mediaType: item.mediaType || (item.videoUrl ? 'video' : 'image'),
      imageUrl,
      videoUrl: item.videoUrl || '',
      posterUrl,
      metaEn: item.metaEn || fallback.metaEn || '',
      metaAr: item.metaAr || fallback.metaAr || '',
      sortOrder: item.sortOrder ?? index,
      active: item.active !== false,
    };
  });
}

export function buildInstantPriceFromFirestore(data) {
  if (!data) return { ...DEFAULT_INSTANT_PRICE };
  const next = { ...DEFAULT_INSTANT_PRICE, ...data };
  // Migrate older copy that repeated the same number twice (whatsapp + phone).
  if (
    typeof next.bodyEn === 'string' &&
    next.bodyEn.includes('{{whatsapp}}') &&
    next.bodyEn.includes('{{phone}}')
  ) {
    next.bodyEn = DEFAULT_INSTANT_PRICE.bodyEn;
  }
  if (
    typeof next.bodyAr === 'string' &&
    next.bodyAr.includes('{{whatsapp}}') &&
    next.bodyAr.includes('{{phone}}')
  ) {
    next.bodyAr = DEFAULT_INSTANT_PRICE.bodyAr;
  }
  if (next.headingEn === 'Choose your route and see the price in seconds.') {
    next.headingEn = DEFAULT_INSTANT_PRICE.headingEn;
  }
  if (next.headingAr === 'اختر مسارك واطلع على السعر خلال ثوانٍ.') {
    next.headingAr = DEFAULT_INSTANT_PRICE.headingAr;
  }
  if (
    !next.backgroundImageUrl ||
    next.backgroundImageUrl === '/images/instant-price-bg.png'
  ) {
    next.backgroundImageUrl = DEFAULT_INSTANT_PRICE.backgroundImageUrl;
  }
  return next;
}

const LEGACY_HERO_IMAGES = [
  'https://images.unsplash.com/photo-1449965408869-eaa3f722e40d',
  'https://images.unsplash.com/photo-1502877338535-766e1452684a',
  'https://images.unsplash.com/photo-1617531653332-bd46c24f2068',
  'https://images.unsplash.com/photo-1618843479313-40f8afb4b4d8',
  'https://images.unsplash.com/photo-1564769121220-6e039903ace6',
  'https://images.unsplash.com/photo-1700878354382-46816bf47ffc',
  'https://images.unsplash.com/photo-1768001863885-fd5bad96ebfc',
  'https://images.unsplash.com/photo-1591604121049-f87267a2c7a',
];

function resolveHeroImageUrl(url, fallback) {
  if (!url || LEGACY_HERO_IMAGES.some((legacy) => url.startsWith(legacy))) {
    return fallback;
  }
  return url;
}

export function buildHeroFromFirestore(heroData) {
  if (!heroData) return { ...DEFAULT_HERO };
  const imageUrl = resolveHeroImageUrl(heroData.imageUrl, DEFAULT_HERO.imageUrl);
  const imageMobileUrl = resolveHeroImageUrl(
    heroData.imageMobileUrl || heroData.imageUrl,
    DEFAULT_HERO.imageMobileUrl,
  );
  return {
    ...DEFAULT_HERO,
    ...heroData,
    showVideo: false,
    imageUrl,
    imageMobileUrl,
  };
}

export async function getHomepageSettings() {
  try {
    const snap = await getDoc(doc(db, 'siteSettings', 'homepage'));
    const data = snap.exists() ? snap.data() : {};
    return {
      sections: mergeHomeSections(data.sections || {}),
      fleetShowcase: normalizeFleetShowcase(data.fleetShowcase),
    };
  } catch {
    return {
      sections: mergeHomeSections({}),
      fleetShowcase: emptyFleetShowcase(),
    };
  }
}

export async function getHomeSections() {
  const { sections } = await getHomepageSettings();
  return sections;
}

export async function getHomeFleetShowcase() {
  const { fleetShowcase } = await getHomepageSettings();
  return fleetShowcase;
}

function mapSnapshotDocs(snapshot) {
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
}

function sortByOrder(items) {
  return [...items].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
}

export function subscribeToActiveCollection(collectionName, onData, onError, maxItems = 100) {
  let unsubscribe = () => {};
  const size = Math.max(1, Math.min(300, Number(maxItems) || 100));

  const runQuery = (withOrder) => {
    unsubscribe();
    const q = withOrder
      ? query(
          collection(db, collectionName),
          where('active', '==', true),
          orderBy('sortOrder', 'asc'),
          limit(size),
        )
      : query(
          collection(db, collectionName),
          where('active', '==', true),
          limit(size),
        );

    unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const items = mapSnapshotDocs(snapshot);
        onData(withOrder ? items : sortByOrder(items));
      },
      (err) => {
        if (withOrder) {
          runQuery(false);
          return;
        }
        onError?.(err);
      },
    );
  };

  runQuery(true);
  return () => unsubscribe();
}

/** Shared 5-car catalog — no active filter (always show seeded defaults overlay). */
export function subscribeToCarCatalog(onData, onError, maxItems = 50) {
  let unsubscribe = () => {};
  const size = Math.max(1, Math.min(50, Number(maxItems) || 50));

  const runQuery = (withOrder) => {
    unsubscribe();
    const q = withOrder
      ? query(collection(db, 'vehicles'), orderBy('sortOrder', 'asc'), limit(size))
      : query(collection(db, 'vehicles'), limit(size));

    unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const items = mapSnapshotDocs(snapshot);
        onData(withOrder ? items : sortByOrder(items));
      },
      (err) => {
        if (withOrder) {
          runQuery(false);
          return;
        }
        onError?.(err);
      },
    );
  };

  runQuery(true);
  return () => unsubscribe();
}

const ROUTE_CATEGORIES = SERVICE_CATALOG.reduce((acc, item) => {
  acc[item.id] = item.category;
  return acc;
}, {});

/** Homepage catalog: keep first preferred card per category (Six Ways = 6). */
const CATALOG_CARDS_PER_CATEGORY = 1;

function isZiyaratRouteId(routeId) {
  const rid = String(routeId || '');
  return rid.includes('-mecca-internal') || rid.includes('-medina-internal');
}

function isWithinCityRouteId(routeId) {
  const rid = String(routeId || '');
  return rid.includes('-internal') && !isZiyaratRouteId(rid);
}

function isTrainRouteId(routeId) {
  const rid = String(routeId || '');
  return /train|sulaimaniyah|rusaifah|haramain/i.test(rid);
}

/** Map a live fleet route → Six Ways filter category (1:1 with homepage filters). */
export function resolveCatalogCategory(route) {
  const rid = String(route?.id || '');
  const staticCategory = ROUTE_CATEGORIES[rid];
  if (staticCategory) return staticCategory;

  const cat = route?.category;
  if (SERVICE_CATEGORIES.includes(cat)) return cat;
  if (cat === 'cities') return 'intercity';

  if (rid.startsWith('hr-') || route?.tripType === 'hourly') {
    if (isZiyaratRouteId(rid)) return 'tours';
    if (isWithinCityRouteId(rid)) return 'withinCity';
    return 'hourly';
  }

  if (rid.startsWith('rt-') || route?.tripType === 'round_trip') {
    return isTrainRouteId(rid) || cat === 'train' ? 'train' : 'airport';
  }

  if (rid.startsWith('ow-') || route?.tripType === 'one_way') return 'intercity';

  return 'intercity';
}

const CATALOG_CATEGORY_IMAGES = {
  airport: SERVICE_IMAGES.jeddahMakkah,
  train: SERVICE_IMAGES.trainMakkah || SERVICE_IMAGES.jeddahMakkah,
  intercity: SERVICE_IMAGES.makkahMadinah,
  withinCity: SERVICE_IMAGES.taifMakkah,
  hourly: SERVICE_IMAGES.hourly,
  tours: SERVICE_IMAGES.taifMadinah,
};

function catalogItemFromRoute(route) {
  const card = ROUTE_CARDS.find((c) => c.id === route.id);
  const staticItem = SERVICE_CATALOG.find((c) => c.id === route.id);
  const category = resolveCatalogCategory(route);
  const prices = (route.vehicles || [])
    .map((v) => v.price)
    .filter((p) => typeof p === 'number');
  const minPrice = prices.length ? Math.min(...prices) : null;

  return {
    id: route.id,
    category,
    title: route.title,
    description: card?.description || staticItem?.description || { ar: '', en: '' },
    image: card?.image || staticItem?.image || CATALOG_CATEGORY_IMAGES[category] || ROUTE_IMAGE_FALLBACK,
    imageFallback: card?.imageFallback || staticItem?.imageFallback || ROUTE_IMAGE_FALLBACK,
    priceFrom: minPrice ?? staticItem?.priceFrom ?? null,
  };
}

/** Collapse hour variants / same-title clones into one catalog card. */
function catalogDedupeKey(item) {
  const rid = String(item.id || '');
  const hourly = rid.match(/^hr-(\d+)-([a-z]+)-([a-z]+)$/i);
  if (hourly) {
    return `${item.category}:hr:${hourly[2]}-${hourly[3]}`;
  }

  const ow = rid.match(/^ow-(\d+)-(\d+)$/);
  if (ow) {
    const a = Number(ow[1]);
    const b = Number(ow[2]);
    const pair = a < b ? `${a}-${b}` : `${b}-${a}`;
    return `${item.category}:ow:${pair}`;
  }

  const title = String(item.title?.en || item.title?.ar || rid)
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/[→↔⇄]/g, '-')
    .trim();
  return `${item.category}:title:${title}`;
}

function catalogPreferenceScore(item) {
  let score = 0;
  if (SERVICE_CATALOG.some((c) => c.id === item.id)) score += 100;

  const hourly = String(item.id || '').match(/^hr-(\d+)-/);
  if (hourly) {
    const hours = Number(hourly[1]);
    if (hours === 4) score += 40;
    else if (hours === 8) score += 20;
  }

  if (item.priceFrom != null) score += Math.max(0, 30 - Math.min(item.priceFrom / 50, 30));
  return score;
}

function dedupeCatalogItems(items) {
  const bestByKey = new Map();

  for (const item of items) {
    const key = catalogDedupeKey(item);
    const existing = bestByKey.get(key);
    if (!existing || catalogPreferenceScore(item) > catalogPreferenceScore(existing)) {
      bestByKey.set(key, item);
    }
  }

  return Array.from(bestByKey.values());
}

function normalizeCatalogTitle(title) {
  return String(title || '')
    .toLowerCase()
    .replace(/[→↔⇄|/,_-]+/g, ' ')
    .replace(/\b(to|from|or|the|and|airport|train|station|hotel|hotels|hours?|hour)\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function titlesLooselyMatch(a, b) {
  const left = normalizeCatalogTitle(a);
  const right = normalizeCatalogTitle(b);
  if (!left || !right) return false;
  return left === right || left.includes(right) || right.includes(left);
}

function liveMinPrice(route) {
  const prices = (route?.vehicles || [])
    .map((v) => v.price)
    .filter((p) => typeof p === 'number' && p > 0);
  return prices.length ? Math.min(...prices) : null;
}

/** Attach SuperAdmin live prices onto curated catalog cards (never invent dummy routes). */
function enrichCatalogItemFromFleet(item, fleetRoutes) {
  if (!fleetRoutes?.length) return item;

  const exact = fleetRoutes.find((route) => route.id === item.id);
  if (exact) {
    const price = liveMinPrice(exact);
    return {
      ...item,
      title: exact.title || item.title,
      priceFrom: price ?? item.priceFrom,
    };
  }

  const sameCategory = fleetRoutes.filter((route) => resolveCatalogCategory(route) === item.category);
  const byTitle = sameCategory.find((route) =>
    titlesLooselyMatch(route.title?.en, item.title?.en)
    || titlesLooselyMatch(route.title?.ar, item.title?.ar),
  );

  if (byTitle) {
    const price = liveMinPrice(byTitle);
    return {
      ...item,
      priceFrom: price ?? item.priceFrom,
    };
  }

  return item;
}

function pickCatalogItems(items, limit = CATALOG_CARDS_PER_CATEGORY) {
  const staticRank = new Map(SERVICE_CATALOG.map((item, index) => [item.id, index]));

  return dedupeCatalogItems(items)
    .sort((a, b) => {
      const aStatic = staticRank.has(a.id);
      const bStatic = staticRank.has(b.id);
      if (aStatic && !bStatic) return -1;
      if (bStatic && !aStatic) return 1;
      if (aStatic && bStatic) return staticRank.get(a.id) - staticRank.get(b.id);

      const scoreDiff = catalogPreferenceScore(b) - catalogPreferenceScore(a);
      if (scoreDiff) return scoreDiff;

      const aPrice = a.priceFrom == null ? Number.POSITIVE_INFINITY : a.priceFrom;
      const bPrice = b.priceFrom == null ? Number.POSITIVE_INFINITY : b.priceFrom;
      return aPrice - bPrice;
    })
    .slice(0, limit);
}

const CATALOG_SERVICE_LIMIT = 6;

const SERVICE_CATEGORY_TO_CATALOG = {
  airport: { catalogCategory: 'airport', routeId: 'airport' },
  train: { catalogCategory: 'train', routeId: 'train' },
  intercity: { catalogCategory: 'intercity', routeId: 'city-to-city' },
  withinCity: { catalogCategory: 'withinCity', routeId: 'within-city' },
  hourly: { catalogCategory: 'hourly', routeId: 'hourly' },
  tours: { catalogCategory: 'tours', routeId: 'ziyarat' },
};

function resolveServiceCatalogMeta(service, index) {
  if (service.category && SERVICE_CATEGORY_TO_CATALOG[service.category]) {
    return SERVICE_CATEGORY_TO_CATALOG[service.category];
  }

  const routeCard = ROUTE_CARDS[index];
  if (routeCard) {
    const staticItem = SERVICE_CATALOG.find((item) => item.id === routeCard.id);
    return {
      catalogCategory: staticItem?.category || 'intercity',
      routeId: routeCard.id,
    };
  }

  return { catalogCategory: 'intercity', routeId: `service-${index}` };
}

function serviceToCatalogItem(service, index) {
  const meta = resolveServiceCatalogMeta(service, index);
  const staticItem = SERVICE_CATALOG.find((item) => item.id === meta.routeId)
    || SERVICE_CATALOG[index]
    || {};

  return {
    id: meta.routeId,
    category: meta.catalogCategory,
    title: service.title || staticItem.title,
    description: service.description || staticItem.description,
    image: service.image || staticItem.image,
    imageFallback: staticItem.imageFallback || ROUTE_IMAGE_FALLBACK,
    priceFrom: staticItem.priceFrom ?? null,
  };
}

/**
 * Homepage Full Service Catalog: exactly 6 cards from SuperAdmin `services`
 * (same Firestore source as Featured Routes / Services Showcase), with live fleet prices.
 */
export function buildServiceCatalogFromServices(services, fleetRoutes) {
  const source = services?.length ? services : SERVICES;
  const seenRouteIds = new Set();

  const items = source
    .slice(0, CATALOG_SERVICE_LIMIT)
    .map((service, index) => serviceToCatalogItem(service, index))
    .filter((item) => {
      if (seenRouteIds.has(item.id)) return false;
      seenRouteIds.add(item.id);
      return true;
    });

  if (items.length < CATALOG_SERVICE_LIMIT) {
    for (const staticItem of SERVICE_CATALOG) {
      if (items.length >= CATALOG_SERVICE_LIMIT) break;
      if (seenRouteIds.has(staticItem.id)) continue;
      seenRouteIds.add(staticItem.id);
      items.push({ ...staticItem });
    }
  }

  return items
    .slice(0, CATALOG_SERVICE_LIMIT)
    .map((item) => enrichCatalogItemFromFleet(item, fleetRoutes));
}

/** @deprecated Prefer buildServiceCatalogFromServices — kept for existing imports. */
export function buildServiceCatalogFromFleetRoutes(fleetRoutes, services = SERVICES) {
  return buildServiceCatalogFromServices(services, fleetRoutes);
}

export { SERVICE_CATALOG_FILTERS };
