import { createContext, useContext, useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { useLocation } from 'react-router-dom';

import {

  getActiveBlogs,

  getActiveProducts,

  getActiveServices,

  getActiveContentCollection,

  getCarCatalog,

  getHomepageSettings,

  getHeroContent,

  getInstantPriceContent,

  getGalleryHeroContent,

  getReligiousToursContent,

  getBookingTripTypesContent,

  getBookingLocationsContent,

  getFooterCreditContent,

  subscribeContentRevision,

  readStoredContentRevision,

  writeStoredContentRevision,

  getContentRevisionOnce,

  buildFleetRoutesFromProducts,

  buildServicesFromFirestore,

  buildBlogsFromFirestore,

  buildHeroFromFirestore,

  buildInstantPriceFromFirestore,

  buildReligiousToursFromFirestore,

  buildGalleryHeroFromFirestore,

  buildFooterCreditFromFirestore,

  buildGalleryItemsFromFirestore,

  buildRouteCardsFromFirestore,

  buildFaqFromFirestore,

  buildSocialLinksFromFirestore,

  buildServiceCatalogFromServices,

  buildBookingTripTypesFromFirestore,

  buildBookingLocationsFromFirestore,

  buildTravelReservationsFromFirestore,

  subscribeToActiveCollection,

  subscribeToCarCatalog,

  SERVICE_CATALOG_FILTERS,

} from '../firebase/content';
import { runWithServerReads } from '../firebase/reads';

import { FLEET_ROUTES, ROUND_TRIP_FLEET_ROUTES, SERVICES, BLOG_POSTS, ROUTE_CARDS, FAQ_ITEMS, SOCIAL_LINKS, DEFAULT_GALLERY_ITEMS, setLiveCarCatalog, getDefaultCarCatalog, getLiveCarCatalog, getCarImage } from '../data/staticData';

import { HOURLY_FLEET_ROUTES, setExtraHourlyCities } from '../data/hourlyPricing';
import { DEFAULT_BOOKING_LOCATIONS, syntheticFleetRoutesFromLocations } from '../data/bookingLocations';

import { DEFAULT_RELIGIOUS_TOURS } from '../data/religiousTours';

import { DEFAULT_TRAVEL_RESERVATIONS } from '../data/travelReservations';

import { DEFAULT_HOME_SECTIONS, isSectionActive } from '../data/homeSections';
import { emptyFleetShowcase, normalizeFleetShowcase } from '../data/adminFleetServices';

import { readLocalCache, createThrottledCacheWriter } from '../utils/localCache';

import {

  getVehiclesForRoute,

  findVehicleById,

  findVehicleBySlug,

  getRouteLabel,

  buildVehicleRoutePrices,

} from '../utils/fleetHelpers';

import {

  SITE_CONTENT_CACHE_KEY,

  SYNC_CHANNEL,

  sanitizeSiteContentCache,

  defaultSiteContentSnapshot,

} from '../utils/siteContentRefresh';



const CACHE_KEY = SITE_CONTENT_CACHE_KEY;
// Realtime CMS listeners multiply document reads on reconnect. Public pages use
// a cached one-shot load; enable only for an intentional preview environment.
const USE_PUBLIC_REALTIME = import.meta.env.VITE_ENABLE_PUBLIC_REALTIME === 'true';

// Reuse browser CMS snapshot on revisits; publish bump invalidates via contentRevision.
const SITE_CONTENT_CACHE_MS = 12 * 60 * 60 * 1000;

const STATIC_FLEET = [...FLEET_ROUTES, ...ROUND_TRIP_FLEET_ROUTES, ...HOURLY_FLEET_ROUTES];



function loadCachedContent() {

  if (typeof window === 'undefined') {
    return { snapshot: defaultSiteContentSnapshot(), isFresh: false };
  }

  // Only paint TTL-fresh cache. Expired/persistent snapshots cause "old then new" flash.
  const fresh = readLocalCache(CACHE_KEY, SITE_CONTENT_CACHE_MS);
  if (fresh) {
    return {
      snapshot: sanitizeSiteContentCache(fresh) || defaultSiteContentSnapshot(),
      // Dev: reuse cache for 2 minutes to cut local Firestore burn while editing.
      isFresh: import.meta.env.DEV
        ? Boolean(readLocalCache(CACHE_KEY, 2 * 60 * 1000))
        : true,
    };
  }

  return {
    snapshot: defaultSiteContentSnapshot(),
    isFresh: false,
  };

}



const SiteContentContext = createContext(null);

function pathNeedsPublicCms(pathname) {
  if (!pathname || pathname.startsWith('/admin')) return false;
  if (pathname === '/' || pathname === '/gallery') return true;
  if (pathname.startsWith('/booking')) return true;
  if (pathname.startsWith('/vehicles')) return true;
  if (pathname.startsWith('/cars/')) return true;
  if (pathname.startsWith('/checkout')) return true;
  return false;
}

export function SiteContentProvider({ children }) {

  const { pathname } = useLocation();
  // Price-facing public routes load CMS once (cached). Auth/admin skip Firestore.
  const needsLivePublicContent = pathNeedsPublicCms(pathname);
  const initialCache = useMemo(() => loadCachedContent(), []);
  const initialSnapshot = initialCache.snapshot;
  const hasFreshCacheRef = useRef(initialCache.isFresh);
  // Only advanced after a successful CMS refresh — prevents "rev matched, cache stale".
  const syncedRevRef = useRef(readStoredContentRevision());

  const cacheRef = useRef(initialSnapshot);



  const [fleetRoutes, setFleetRoutes] = useState(initialSnapshot.fleetRoutes);

  const [services, setServices] = useState(initialSnapshot.services);

  const [blogs, setBlogs] = useState(initialSnapshot.blogs);

  const [routeCards, setRouteCards] = useState(initialSnapshot.routeCards);

  const [faqItems, setFaqItems] = useState(initialSnapshot.faqItems);

  const [socialLinks, setSocialLinks] = useState(initialSnapshot.socialLinks);

  const [sections, setSections] = useState(initialSnapshot.sections);

  const [fleetShowcase, setFleetShowcase] = useState(
    () => normalizeFleetShowcase(initialSnapshot.fleetShowcase),
  );

  const [hero, setHero] = useState(initialSnapshot.hero);

  const [instantPrice, setInstantPrice] = useState(initialSnapshot.instantPrice);

  const [religiousTours, setReligiousTours] = useState(initialSnapshot.religiousTours);

  const [galleryHero, setGalleryHero] = useState(initialSnapshot.galleryHero);

  const [bookingTripTypes, setBookingTripTypes] = useState(
    () => initialSnapshot.bookingTripTypes || buildBookingTripTypesFromFirestore(null),
  );

  const [bookingLocations, setBookingLocations] = useState(
    () => initialSnapshot.bookingLocations || buildBookingLocationsFromFirestore(null),
  );

  const [footerCredit, setFooterCredit] = useState(
    () => initialSnapshot.footerCredit || buildFooterCreditFromFirestore(null),
  );

  const [galleryItems, setGalleryItems] = useState(initialSnapshot.galleryItems);

  const [travelReservations, setTravelReservations] = useState(
    initialSnapshot.travelReservations || DEFAULT_TRAVEL_RESERVATIONS,
  );

  const [carCatalog, setCarCatalog] = useState(() => {
    const cached = initialSnapshot.carCatalog;
    const cars = Array.isArray(cached) && cached.length ? cached : getDefaultCarCatalog();
    setLiveCarCatalog(cars);
    return cars;
  });

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const hourlyCities = (bookingLocations?.cities || DEFAULT_BOOKING_LOCATIONS.cities)
      .filter((city) => city.active !== false && city.forms?.hourly !== false);
    setExtraHourlyCities(hourlyCities);
  }, [bookingLocations]);

  const writeCacheThrottled = useMemo(() => createThrottledCacheWriter(CACHE_KEY, 900), []);



  const persistCache = useCallback((partial) => {

    cacheRef.current = sanitizeSiteContentCache({ ...cacheRef.current, ...partial })

      || defaultSiteContentSnapshot();

    writeCacheThrottled(cacheRef.current);

  }, [writeCacheThrottled]);

  const refreshInFlightRef = useRef(null);
  const scheduleRefreshTimerRef = useRef(null);

  const refresh = useCallback(async () => {
    if (refreshInFlightRef.current) return refreshInFlightRef.current;

    setLoading(true);

    const run = runWithServerReads(async () => {
    try {
      // Phase 1 — price/booking critical path (paint ASAP)
      const [
        activeProducts,
        cars,
        activeServices,
        homeSettings,
        heroData,
        instantPriceData,
        bookingLocationsData,
      ] = await Promise.all([
        getActiveProducts(),
        getCarCatalog(),
        getActiveServices(),
        getHomepageSettings(),
        getHeroContent(),
        getInstantPriceContent(),
        getBookingLocationsContent(),
      ]);

      const nextBookingLocations = buildBookingLocationsFromFirestore(bookingLocationsData);
      const extraRoutes = syntheticFleetRoutesFromLocations(nextBookingLocations);
      const nextFleetRoutes = buildFleetRoutesFromProducts(activeProducts, extraRoutes);
      const nextCars = Array.isArray(cars) && cars.length ? cars : getDefaultCarCatalog();
      const nextServices = buildServicesFromFirestore(activeServices);
      const nextSections = homeSettings.sections;
      const nextFleetShowcase = normalizeFleetShowcase(homeSettings.fleetShowcase);
      const nextHero = buildHeroFromFirestore(heroData);
      const nextInstantPrice = buildInstantPriceFromFirestore(instantPriceData);

      setFleetRoutes(nextFleetRoutes.length ? nextFleetRoutes : cacheRef.current.fleetRoutes);
      setLiveCarCatalog(nextCars);
      setCarCatalog(getLiveCarCatalog());
      setServices(nextServices.length ? nextServices : cacheRef.current.services);
      setSections(nextSections);
      setFleetShowcase(nextFleetShowcase);
      setHero(nextHero);
      setInstantPrice(nextInstantPrice);
      setBookingLocations(nextBookingLocations);

      persistCache({
        fleetRoutes: nextFleetRoutes.length ? nextFleetRoutes : cacheRef.current.fleetRoutes,
        carCatalog: nextCars,
        services: nextServices.length ? nextServices : cacheRef.current.services,
        sections: nextSections,
        fleetShowcase: nextFleetShowcase,
        hero: nextHero,
        instantPrice: nextInstantPrice,
        bookingLocations: nextBookingLocations,
      });

      // Phase 2 — secondary CMS (gallery, FAQ, footer…)
      const [
        activeRoutes,
        activeFaqs,
        activeSocialLinks,
        activeBlogs,
        activeGallery,
        religiousToursData,
        galleryHeroData,
        bookingTripTypesData,
        footerCreditData,
        activeTravelReservations,
      ] = await Promise.all([
        getActiveContentCollection('routeCards'),
        getActiveContentCollection('faqs'),
        getActiveContentCollection('socialLinks'),
        getActiveBlogs(),
        getActiveContentCollection('gallery'),
        getReligiousToursContent(),
        getGalleryHeroContent(),
        getBookingTripTypesContent(),
        getFooterCreditContent(),
        getActiveContentCollection('travelReservations'),
      ]);

      const nextRoutes = buildRouteCardsFromFirestore(activeRoutes);
      const nextFaqs = buildFaqFromFirestore(activeFaqs);
      const nextSocialLinks = buildSocialLinksFromFirestore(activeSocialLinks);
      const nextBlogs = buildBlogsFromFirestore(activeBlogs);
      const nextGalleryItems = buildGalleryItemsFromFirestore(activeGallery);
      const nextTravelReservations = buildTravelReservationsFromFirestore(activeTravelReservations);
      const nextReligiousTours = buildReligiousToursFromFirestore(religiousToursData);
      const nextGalleryHero = buildGalleryHeroFromFirestore(galleryHeroData);
      const nextBookingTripTypes = buildBookingTripTypesFromFirestore(bookingTripTypesData);
      const nextFooterCredit = buildFooterCreditFromFirestore(footerCreditData);

      setRouteCards(nextRoutes.length ? nextRoutes : cacheRef.current.routeCards);
      setFaqItems(nextFaqs.length ? nextFaqs : cacheRef.current.faqItems);
      setSocialLinks(nextSocialLinks.length ? nextSocialLinks : cacheRef.current.socialLinks);
      setBlogs(nextBlogs.length ? nextBlogs : cacheRef.current.blogs);
      setGalleryItems(nextGalleryItems.length ? nextGalleryItems : cacheRef.current.galleryItems);
      setTravelReservations(
        nextTravelReservations.length
          ? nextTravelReservations
          : (cacheRef.current.travelReservations || DEFAULT_TRAVEL_RESERVATIONS),
      );
      setReligiousTours(nextReligiousTours);
      setGalleryHero(nextGalleryHero);
      setBookingTripTypes(nextBookingTripTypes);
      setFooterCredit(nextFooterCredit);

      persistCache({
        routeCards: nextRoutes.length ? nextRoutes : cacheRef.current.routeCards,
        faqItems: nextFaqs.length ? nextFaqs : cacheRef.current.faqItems,
        socialLinks: nextSocialLinks.length ? nextSocialLinks : cacheRef.current.socialLinks,
        blogs: nextBlogs.length ? nextBlogs : cacheRef.current.blogs,
        galleryItems: nextGalleryItems.length ? nextGalleryItems : cacheRef.current.galleryItems,
        travelReservations: nextTravelReservations.length
          ? nextTravelReservations
          : (cacheRef.current.travelReservations || DEFAULT_TRAVEL_RESERVATIONS),
        religiousTours: nextReligiousTours,
        galleryHero: nextGalleryHero,
        bookingTripTypes: nextBookingTripTypes,
        footerCredit: nextFooterCredit,
      });

      const rev = await getContentRevisionOnce();
      if (rev) {
        writeStoredContentRevision(rev);
        syncedRevRef.current = rev;
      }
      hasFreshCacheRef.current = true;

    } catch (err) {

      // Keep lifetime cache / live listener data — never blank the page on network errors

      console.warn('Site content refresh failed, keeping cached data:', err);

    } finally {

      setLoading(false);

    }
    });

    refreshInFlightRef.current = run.finally(() => {
      refreshInFlightRef.current = null;
    });
    return refreshInFlightRef.current;

  }, [persistCache]);

  const schedulePublicRefresh = useCallback(() => {
    hasFreshCacheRef.current = false;
    if (scheduleRefreshTimerRef.current) window.clearTimeout(scheduleRefreshTimerRef.current);
    scheduleRefreshTimerRef.current = window.setTimeout(() => {
      scheduleRefreshTimerRef.current = null;
      refresh();
    }, import.meta.env.DEV ? 80 : 200);
  }, [refresh]);



  useEffect(() => {

    // Do not open full-collection listeners for visitors that already have a
    // recent persisted snapshot. This is the main Firestore read safeguard.
    if (!USE_PUBLIC_REALTIME || !needsLivePublicContent || hasFreshCacheRef.current) return undefined;

    let cancelled = false;

    const unsubs = [];

    let idleId;



    // Critical for home first paint / booking — start immediately
    unsubs.push(

      subscribeToActiveCollection(

        'packages',

        (products) => {

          const extraRoutes = syntheticFleetRoutesFromLocations(cacheRef.current.bookingLocations);
          const nextFleetRoutes = buildFleetRoutesFromProducts(products, extraRoutes);

          // Live SuperAdmin truth: empty active packages stay empty (no static revive)
          const routes = Array.isArray(products)
            ? nextFleetRoutes
            : (nextFleetRoutes.length ? nextFleetRoutes : STATIC_FLEET);

          setFleetRoutes(routes);

          persistCache({ fleetRoutes: routes });

        },

        (err) => console.warn('Products listener failed:', err),

        300,

      ),

      subscribeToCarCatalog(

        (cars) => {
          const next = Array.isArray(cars) && cars.length ? cars : getDefaultCarCatalog();
          setLiveCarCatalog(next);
          setCarCatalog(getLiveCarCatalog());
          persistCache({ carCatalog: next });
        },

        (err) => console.warn('Cars catalog listener failed:', err),

      ),

    );



    const startDeferredListeners = () => {

      if (cancelled) return;

      unsubs.push(

        subscribeToActiveCollection(

          'services',

          (activeServices) => {

            const nextServices = buildServicesFromFirestore(activeServices);

            const items = nextServices.length ? nextServices : SERVICES;

            setServices(items);

            persistCache({ services: items });

          },

          (err) => console.warn('Services listener failed:', err),

        ),

        subscribeToActiveCollection(

          'routeCards',

          (activeRoutes) => {

            const next = buildRouteCardsFromFirestore(activeRoutes);

            const items = next.length ? next : ROUTE_CARDS;

            setRouteCards(items);

            persistCache({ routeCards: items });

          },

          (err) => console.warn('Route cards listener failed:', err),

        ),

        subscribeToActiveCollection(

          'faqs',

          (activeFaqs) => {

            const next = buildFaqFromFirestore(activeFaqs);

            const items = next.length ? next : FAQ_ITEMS;

            setFaqItems(items);

            persistCache({ faqItems: items });

          },

          (err) => console.warn('FAQs listener failed:', err),

        ),

        subscribeToActiveCollection(

          'socialLinks',

          (activeLinks) => {

            const next = buildSocialLinksFromFirestore(activeLinks);

            const items = next.length ? next : SOCIAL_LINKS;

            setSocialLinks(items);

            persistCache({ socialLinks: items });

          },

          (err) => console.warn('Social links listener failed:', err),

        ),

        subscribeToActiveCollection(

          'gallery',

          (activeItems) => {

            const next = buildGalleryItemsFromFirestore(activeItems);

            const items = next.length ? next : DEFAULT_GALLERY_ITEMS;

            setGalleryItems(items);

            persistCache({ galleryItems: items });

          },

          (err) => console.warn('Gallery listener failed:', err),

        ),

        subscribeToActiveCollection(

          'travelReservations',

          (activeItems) => {

            const next = buildTravelReservationsFromFirestore(activeItems);

            const items = next.length ? next : DEFAULT_TRAVEL_RESERVATIONS;

            setTravelReservations(items);

            persistCache({ travelReservations: items });

          },

          (err) => console.warn('Travel reservations listener failed:', err),

        ),

      );

    };



    if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {

      idleId = window.requestIdleCallback(startDeferredListeners, { timeout: 2200 });

    } else {

      idleId = window.setTimeout(startDeferredListeners, 400);

    }



    return () => {

      cancelled = true;

      if (typeof window !== 'undefined' && 'cancelIdleCallback' in window && typeof idleId === 'number') {

        window.cancelIdleCallback(idleId);

      } else {

        window.clearTimeout(idleId);

      }

      unsubs.forEach((unsub) => unsub && unsub());

    };

  }, [needsLivePublicContent, persistCache]);



  useEffect(() => {
    if (!needsLivePublicContent) return undefined;

    let cancelled = false;

    // Cheap 1-doc server check: laptop / KSA / UAE must share the same CMS revision.
    // If local cache is behind (or never synced), pull fresh content from Firestore.
    const verify = async () => {
      try {
        const serverRev = await runWithServerReads(() => getContentRevisionOnce());
        if (cancelled) return;

        const localRev = syncedRevRef.current || readStoredContentRevision();
        const cacheLooksFresh = hasFreshCacheRef.current;

        if (!serverRev) {
          if (!cacheLooksFresh) await refresh();
          return;
        }

        if (serverRev !== localRev || !cacheLooksFresh) {
          hasFreshCacheRef.current = false;
          await refresh();
        }
      } catch (err) {
        console.warn('Content revision verify failed:', err?.code || err?.message || err);
        if (!cancelled && !hasFreshCacheRef.current) await refresh();
      }
    };

    const timeout = window.setTimeout(verify, 0);
    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
    };
  }, [needsLivePublicContent, refresh]);

  useEffect(() => {

    if (!needsLivePublicContent || typeof BroadcastChannel === 'undefined') return undefined;



    const channel = new BroadcastChannel(SYNC_CHANNEL);

    channel.onmessage = (event) => {

      const type = event?.data?.type;

      // soft + invalidate both mean SuperAdmin published — refresh once (coalesced)
      if (type !== 'soft' && type !== 'invalidate') return;

      schedulePublicRefresh();

    };

    return () => channel.close();

  }, [needsLivePublicContent, schedulePublicRefresh]);

  // Live publish signal for open tabs (all countries / networks).
  useEffect(() => {
    if (!needsLivePublicContent) return undefined;

    let cancelled = false;

    const unsub = subscribeContentRevision(
      (rev) => {
        if (cancelled || !rev) return;
        // Only skip when this browser already refreshed to this exact revision.
        if (rev === syncedRevRef.current && hasFreshCacheRef.current) return;
        schedulePublicRefresh();
      },
      (err) => console.warn('Content revision listener failed:', err?.code || err?.message),
    );

    return () => {
      cancelled = true;
      if (scheduleRefreshTimerRef.current) window.clearTimeout(scheduleRefreshTimerRef.current);
      unsub?.();
    };
  }, [needsLivePublicContent, schedulePublicRefresh]);



  const serviceCatalog = useMemo(

    () => buildServiceCatalogFromServices(services, fleetRoutes),

    [services, fleetRoutes],

  );



  const displayFleetRoutes = useMemo(() => {

    if (!carCatalog?.length) return fleetRoutes;

    const byId = Object.fromEntries(carCatalog.map((c) => [c.id, c]));

    return fleetRoutes.map((route) => ({

      ...route,

      vehicles: (route.vehicles || []).map((v) => {

        const key = String(v.id || '').split('-')[0];

        const car = byId[key];

        const resolved = getCarImage(key) || car?.imageUrl;
        if (!resolved) return v;

        return { ...v, image: resolved };

      }),

    }));

  }, [fleetRoutes, carCatalog]);



  const fleet = useMemo(() => ({

    getVehiclesForRoute: (routeId) => getVehiclesForRoute(displayFleetRoutes, routeId),

    findVehicleById: (vehicleId) => findVehicleById(displayFleetRoutes, vehicleId),

    findVehicleBySlug: (slug) => findVehicleBySlug(displayFleetRoutes, slug),

    getRouteLabel: (routeId, lang) => getRouteLabel(displayFleetRoutes, routeId, lang),

    buildRoutePrices: (routeId, price) => buildVehicleRoutePrices(displayFleetRoutes, routeId, price),

  }), [displayFleetRoutes]);



  const checkSection = useCallback(

    (sectionId) => isSectionActive(sections, sectionId),

    [sections],

  );



  const value = useMemo(() => ({

    fleetRoutes: displayFleetRoutes,

    services,

    serviceCatalog,

    serviceCatalogFilters: SERVICE_CATALOG_FILTERS,

    routeCards,

    faqItems,

    socialLinks,

    blogs,

    sections,

    fleetShowcase,

    hero,

    instantPrice,

    religiousTours,

    galleryHero,

    galleryItems,

    travelReservations,

    bookingTripTypes,

    bookingLocations,

    footerCredit,

    carCatalog,

    getCarImage,

    fleet,

    isSectionActive: checkSection,

    loading,

    refresh,

  }), [

    displayFleetRoutes,

    services,

    serviceCatalog,

    routeCards,

    faqItems,

    socialLinks,

    blogs,

    sections,

    fleetShowcase,

    hero,

    instantPrice,

    religiousTours,

    galleryHero,

    galleryItems,

    travelReservations,

    bookingTripTypes,

    bookingLocations,

    footerCredit,

    carCatalog,

    fleet,

    checkSection,

    loading,

    refresh,

  ]);



  return (

    <SiteContentContext.Provider value={value}>

      {children}

    </SiteContentContext.Provider>

  );

}



export function useSiteContent() {

  const ctx = useContext(SiteContentContext);

  if (!ctx) {

    const fallback = defaultSiteContentSnapshot();

    return {

      fleetRoutes: fallback.fleetRoutes,

      services: fallback.services,

      serviceCatalog: buildServiceCatalogFromServices(fallback.services, fallback.fleetRoutes),

      serviceCatalogFilters: SERVICE_CATALOG_FILTERS,

      routeCards: fallback.routeCards,

      faqItems: fallback.faqItems,

      socialLinks: fallback.socialLinks,

      blogs: fallback.blogs,

      sections: fallback.sections,

      fleetShowcase: fallback.fleetShowcase || emptyFleetShowcase(),

      hero: fallback.hero,

      instantPrice: fallback.instantPrice,

      religiousTours: fallback.religiousTours,

      galleryHero: fallback.galleryHero,

      galleryItems: fallback.galleryItems,

      travelReservations: fallback.travelReservations || DEFAULT_TRAVEL_RESERVATIONS,

      bookingTripTypes: fallback.bookingTripTypes || buildBookingTripTypesFromFirestore(null),

      bookingLocations: fallback.bookingLocations || buildBookingLocationsFromFirestore(null),

      footerCredit: fallback.footerCredit || buildFooterCreditFromFirestore(null),

      carCatalog: fallback.carCatalog || getDefaultCarCatalog(),

      getCarImage,

      fleet: {

        getVehiclesForRoute: (routeId) => getVehiclesForRoute(fallback.fleetRoutes, routeId),

        findVehicleById: (id) => findVehicleById(fallback.fleetRoutes, id),

        findVehicleBySlug: (slug) => findVehicleBySlug(fallback.fleetRoutes, slug),

        getRouteLabel: (routeId, lang) => getRouteLabel(fallback.fleetRoutes, routeId, lang),

        buildRoutePrices: (routeId, price) => buildVehicleRoutePrices(fallback.fleetRoutes, routeId, price),

      },

      isSectionActive: (id) => isSectionActive(fallback.sections, id),

      loading: false,

      refresh: () => {},

    };

  }

  return ctx;

}

