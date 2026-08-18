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
  DEFAULT_HERO,
  DEFAULT_INSTANT_PRICE,
  DEFAULT_GALLERY_HERO,
  DEFAULT_FOOTER_CREDIT,
} from '../firebase/content';

export const SITE_CONTENT_CACHE_KEY = 'bashayer-site-content-v26';

const LEGACY_CACHE_KEYS = [
  SITE_CONTENT_CACHE_KEY,
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

export const SYNC_CHANNEL = 'bashayer-site-content';

const STATIC_FLEET = [...FLEET_ROUTES, ...ROUND_TRIP_FLEET_ROUTES, ...HOURLY_FLEET_ROUTES];

function pickNonEmptyArray(value, fallback) {
  return Array.isArray(value) && value.length > 0 ? value : fallback;
}

/** Keep service-guide blog card images in sync with static defaults. */
function mergeBlogImagesFromDefaults(blogs) {
  const byService = new Map(BLOG_POSTS.map((post) => [post.serviceId, post]));
  return (Array.isArray(blogs) ? blogs : []).map((blog) => {
    const def = blog?.serviceId ? byService.get(blog.serviceId) : null;
    if (!def?.image) return blog;
    if (blog.image === def.image) return blog;
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

/** Clear all known site-content localStorage keys (current + legacy). */
export function clearSiteContentCacheKeys() {
  try {
    LEGACY_CACHE_KEYS.forEach((key) => localStorage.removeItem(key));
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
  broadcastSiteContentInvalidate('invalidate');
}

/**
 * Soft clear for fleet/package CRUD — live onSnapshot already updated routes.
 * Drops stale localStorage so next cold load is fresh; no heavy refresh.
 */
export function softInvalidateSiteContentCache() {
  clearSiteContentCacheKeys();
  broadcastSiteContentInvalidate('soft');
}
