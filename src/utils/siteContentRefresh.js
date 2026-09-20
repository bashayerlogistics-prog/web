import {
  FLEET_ROUTES,
  ROUND_TRIP_FLEET_ROUTES,
  SERVICES,
  BLOG_POSTS,
  ROUTE_CARDS,
  FAQ_ITEMS,
  SOCIAL_LINKS,
  mergeSocialLinks,
  DEFAULT_GALLERY_ITEMS,
  getDefaultCarCatalog,
} from '../data/staticData';
import { HOURLY_FLEET_ROUTES } from '../data/hourlyPricing';
import { DEFAULT_RELIGIOUS_TOURS } from '../data/religiousTours';
import { DEFAULT_HOME_SECTIONS, mergeHomeSections } from '../data/homeSections';
import { emptyFleetShowcase, normalizeFleetShowcase } from '../data/adminFleetServices';
import { DEFAULT_BOOKING_TRIP_TYPES, buildBookingTripTypesFromFirestore } from '../data/bookingTripTypes';
import { DEFAULT_BOOKING_LOCATIONS, buildBookingLocationsFromFirestore } from '../data/bookingLocations';
import {
  DEFAULT_TRAVEL_RESERVATIONS,
  buildTravelReservationsFromFirestore,
} from '../data/travelReservations';
import {
  buildHeroFromFirestore,
  buildInstantPriceFromFirestore,
  buildReligiousToursFromFirestore,
  buildGalleryHeroFromFirestore,
  buildFooterCreditFromFirestore,
  CONTENT_REVISION_STORAGE_KEY,
  DEFAULT_HERO,
  DEFAULT_INSTANT_PRICE,
  DEFAULT_GALLERY_HERO,
  DEFAULT_FOOTER_CREDIT,
} from '../firebase/content';
import { clearAdminDataCache } from './adminDataCache';

/** Bump on every Hostinger deploy so visitors drop stale CMS snapshots once. */
export const SITE_CONTENT_CACHE_KEY = 'bashayer-site-content-v34';
export const APP_CACHE_BUILD = '20260920f';
const APP_CACHE_BUILD_KEY = 'bashayer-app-build';
/** Set when SuperAdmin publishes — next public load must revalidate vs contentRevision. */
export const SITE_CONTENT_DIRTY_KEY = 'bashayer-site-content-dirty';

const LEGACY_CACHE_KEYS = [
  SITE_CONTENT_CACHE_KEY,
  'bashayer-site-content-v33',
  'bashayer-site-content-v32',
  'bashayer-site-content-v31',
  'bashayer-site-content-v30',
  'bashayer-site-content-v29',
  'bashayer-site-content-v28',
  'bashayer-site-content-v27',
  'bashayer-site-content-v26',
  'bashayer-site-content-v25',
  'bashayer-site-content-v24',
  'bashayer-site-content-v23',
  'bashayer-site-content-v22',
  'bashayer-site-content-v21',
  'bashayer-site-content-v20',
  'bashayer-site-content-v19',
  'bashayer-site-content-v18',
  'bashayer-site-content-v17',
  'bashayer-site-content-v16',
  'bashayer-site-content-v15',
  'bashayer-site-content-v14',
  'bashayer-site-content-v13',
  'bashayer-site-content-v12',
  'bashayer-site-content-v11',
  'bashayer-site-content-v10',
  'bashayer-site-content-v9',
  'bashayer-site-content-v7',
  'bashayer-site-content-v6',
  'bashayer-site-content-v2',
];

/** Extra keys that can hold stale CMS / admin UI data. */
const EXTRA_CACHE_KEYS = [
  CONTENT_REVISION_STORAGE_KEY,
  SITE_CONTENT_DIRTY_KEY,
  'rafiq_branding',
  'rafiq_branding_at',
  'bashayer-admin-booking-stats-v2',
  'bashayer-admin-booking-stats-v1',
  'bashayer-seed-once',
];

export const SYNC_CHANNEL = 'bashayer-site-content';

const STATIC_FLEET = [...FLEET_ROUTES, ...ROUND_TRIP_FLEET_ROUTES, ...HOURLY_FLEET_ROUTES];

function pickNonEmptyArray(value, fallback) {
  return Array.isArray(value) && value.length > 0 ? value : fallback;
}

/** Fill missing blog card images from static defaults; never overwrite CMS uploads. */
function mergeBlogImagesFromDefaults(blogs) {
  const byService = new Map(BLOG_POSTS.map((post) => [post.serviceId, post]));
  return (Array.isArray(blogs) ? blogs : []).map((blog) => {
    if (blog?.image) return blog;
    const def = blog?.serviceId ? byService.get(blog.serviceId) : null;
    if (!def?.image) return blog;
    return { ...blog, image: def.image };
  });
}

/**
 * Repair cached snapshots so empty arrays / partial sections never blank the homepage.
 */
export function sanitizeSiteContentCache(data) {
  if (!data || typeof data !== 'object') return null;

  return {
    fleetRoutes: pickNonEmptyArray(data.fleetRoutes, STATIC_FLEET),
    services: pickNonEmptyArray(data.services, SERVICES),
    blogs: mergeBlogImagesFromDefaults(pickNonEmptyArray(data.blogs, BLOG_POSTS)),
    routeCards: pickNonEmptyArray(data.routeCards, ROUTE_CARDS),
    faqItems: pickNonEmptyArray(data.faqItems, FAQ_ITEMS),
    socialLinks: mergeSocialLinks(pickNonEmptyArray(data.socialLinks, SOCIAL_LINKS)),
    galleryItems: pickNonEmptyArray(data.galleryItems, DEFAULT_GALLERY_ITEMS),
    travelReservations: buildTravelReservationsFromFirestore(
      pickNonEmptyArray(data.travelReservations, DEFAULT_TRAVEL_RESERVATIONS),
    ),
    carCatalog: pickNonEmptyArray(data.carCatalog, getDefaultCarCatalog()),
    sections: mergeHomeSections(data.sections || {}),
    fleetShowcase: normalizeFleetShowcase(data.fleetShowcase),
    hero: buildHeroFromFirestore(data.hero ?? null),
    instantPrice: buildInstantPriceFromFirestore(data.instantPrice ?? null),
    religiousTours: buildReligiousToursFromFirestore(data.religiousTours ?? null),
    galleryHero: buildGalleryHeroFromFirestore(data.galleryHero ?? null),
    bookingTripTypes: buildBookingTripTypesFromFirestore(data.bookingTripTypes ?? null),
    bookingLocations: buildBookingLocationsFromFirestore(data.bookingLocations ?? null),
    footerCredit: buildFooterCreditFromFirestore(data.footerCredit ?? null),
  };
}

/** Defaults when no cache exists at all. */
export function defaultSiteContentSnapshot() {
  return sanitizeSiteContentCache({
    fleetRoutes: STATIC_FLEET,
    services: SERVICES,
    blogs: BLOG_POSTS,
    routeCards: ROUTE_CARDS,
    faqItems: FAQ_ITEMS,
    socialLinks: SOCIAL_LINKS,
    galleryItems: DEFAULT_GALLERY_ITEMS,
    travelReservations: DEFAULT_TRAVEL_RESERVATIONS,
    carCatalog: getDefaultCarCatalog(),
    sections: DEFAULT_HOME_SECTIONS,
    fleetShowcase: emptyFleetShowcase(),
    hero: DEFAULT_HERO,
    instantPrice: DEFAULT_INSTANT_PRICE,
    religiousTours: DEFAULT_RELIGIOUS_TOURS,
    galleryHero: DEFAULT_GALLERY_HERO,
    bookingTripTypes: DEFAULT_BOOKING_TRIP_TYPES,
    bookingLocations: DEFAULT_BOOKING_LOCATIONS,
    footerCredit: DEFAULT_FOOTER_CREDIT,
  });
}

function removeStorageKeys(store, keys) {
  if (!store) return;
  keys.forEach((key) => {
    try {
      store.removeItem(key);
    } catch {
      // ignore
    }
  });
}

/** Clear all known site-content localStorage keys (current + legacy). */
export function clearSiteContentCacheKeys() {
  try {
    removeStorageKeys(localStorage, LEGACY_CACHE_KEYS);
    localStorage.removeItem(SITE_CONTENT_DIRTY_KEY);
  } catch {
    // ignore
  }
}

/**
 * Drop every bashayer-* / rafiq_branding* key except auth/session/language preferences.
 * Keeps: language, theme, admin session, cart, remembered email.
 */
function sweepAppPrefixedCaches() {
  try {
    const keepExact = new Set([
      'language',
      'rafiq_theme',
      APP_CACHE_BUILD_KEY,
      'bashayer_admin_session',
      'bashayer_cart',
      'bashayer_remember_email',
      'bashayer_chat_guest_id',
    ]);
    const keepPrefix = ['clerk', '__clerk', 'chat_guest'];

    for (let i = localStorage.length - 1; i >= 0; i -= 1) {
      const key = localStorage.key(i);
      if (!key || keepExact.has(key)) continue;
      if (keepPrefix.some((p) => key.startsWith(p) || key.toLowerCase().includes(p))) continue;
      if (
        key.startsWith('bashayer-')
        || key.startsWith('rafiq_branding')
      ) {
        localStorage.removeItem(key);
      }
    }
  } catch {
    // ignore
  }
}

async function clearHttpCaches() {
  try {
    if (typeof caches === 'undefined') return;
    const keys = await caches.keys();
    await Promise.all(keys.map((key) => caches.delete(key)));
  } catch {
    // ignore
  }
}

export function markSiteContentDirty() {
  try {
    localStorage.setItem(SITE_CONTENT_DIRTY_KEY, String(Date.now()));
  } catch {
    // ignore
  }
}

export function clearSiteContentDirty() {
  try {
    localStorage.removeItem(SITE_CONTENT_DIRTY_KEY);
  } catch {
    // ignore
  }
}

export function isSiteContentDirty() {
  try {
    return Boolean(localStorage.getItem(SITE_CONTENT_DIRTY_KEY));
  } catch {
    return false;
  }
}

/**
 * Drop public + SuperAdmin browser caches so the next load is live Firestore.
 * Safe for Settings → Clear cache and deploy purge.
 */
export function clearAllAppCaches() {
  clearSiteContentCacheKeys();
  clearAdminDataCache();
  try {
    removeStorageKeys(localStorage, EXTRA_CACHE_KEYS);
    removeStorageKeys(sessionStorage, ['bashayer-seed-once']);
    sweepAppPrefixedCaches();
  } catch {
    // ignore
  }
  void clearHttpCaches();
}

/**
 * One-shot per deploy: visitors and SuperAdmin drop old localStorage so new
 * Hostinger JS + Firestore data paint immediately (hashed assets stay cached).
 */
export function purgeStaleBrowserCaches() {
  if (typeof localStorage === 'undefined') return;
  try {
    if (localStorage.getItem(APP_CACHE_BUILD_KEY) === APP_CACHE_BUILD) return;
    clearAllAppCaches();
    // Force first public paint to revalidate against Firestore contentRevision.
    markSiteContentDirty();
    localStorage.setItem(APP_CACHE_BUILD_KEY, APP_CACHE_BUILD);
  } catch {
    // ignore
  }
}

/** Notify other tabs to refresh CMS docs (hero, sections, etc.). */
export function broadcastSiteContentInvalidate(type = 'invalidate') {
  try {
    if (typeof BroadcastChannel !== 'undefined') {
      const channel = new BroadcastChannel(SYNC_CHANNEL);
      channel.postMessage({ type });
      channel.close();
    }
  } catch {
    // ignore
  }
}

/**
 * Full clear + notify other tabs (used after hero / sections / CMS doc saves).
 */
export function clearSiteContentCache() {
  clearSiteContentCacheKeys();
  try {
    localStorage.removeItem(CONTENT_REVISION_STORAGE_KEY);
  } catch {
    // ignore
  }
  markSiteContentDirty();
  broadcastSiteContentInvalidate('invalidate');
}

/**
 * Soft invalidate — keep last snapshot for paint, but force revalidation so
 * SuperAdmin image/CMS changes never stick as “fresh” old cache.
 */
export function softInvalidateSiteContentCache() {
  markSiteContentDirty();
  broadcastSiteContentInvalidate('soft');
}
