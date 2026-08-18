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

import { FLEET_ROUTES, ROUND_TRIP_FLEET_ROUTES, SERVICES, BLOG_POSTS, ROUTE_CARDS, FAQ_ITEMS, SOCIAL_LINKS, DEFAULT_GALLERY_ITEMS, setLiveCarCatalog, getDefaultCarCatalog, getLiveCarCatalog, getCarImage } from '../data/staticData';

import { HOURLY_FLEET_ROUTES, setExtraHourlyCities } from '../data/hourlyPricing';
import { DEFAULT_BOOKING_LOCATIONS, syntheticFleetRoutesFromLocations } from '../data/bookingLocations';

import { DEFAULT_RELIGIOUS_TOURS } from '../data/religiousTours';

import { DEFAULT_TRAVEL_RESERVATIONS } from '../data/travelReservations';

import { DEFAULT_HOME_SECTIONS, isSectionActive } from '../data/homeSections';
import { emptyFleetShowcase, normalizeFleetShowcase } from '../data/adminFleetServices';

import { readLocalCache, readPersistentCache, createThrottledCacheWriter } from '../utils/localCache';

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

// A cold package snapshot can contain hundreds of documents. Reuse verified
// browser data on normal revisits; CMS publishing explicitly invalidates it.
const SITE_CONTENT_CACHE_MS = 6 * 60 * 60 * 1000;

const STATIC_FLEET = [...FLEET_ROUTES, ...ROUND_TRIP_FLEET_ROUTES, ...HOURLY_FLEET_ROUTES];



function loadCachedContent() {

  if (typeof window === 'undefined') {
    return { snapshot: defaultSiteContentSnapshot(), isFresh: false };
  }

  const fresh = readLocalCache(CACHE_KEY, SITE_CONTENT_CACHE_MS);
  const raw = fresh || readPersistentCache(CACHE_KEY);

  return {
    snapshot: sanitizeSiteContentCache(raw) || defaultSiteContentSnapshot(),
    // Dev must always re-read Firestore, otherwise CMS edits made on the live
    // site stay invisible locally until the cache window expires.
    isFresh: import.meta.env.DEV ? false : Boolean(fresh),
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



  const refresh = useCallback(async () => {

    setLoading(true);

    try {

      const [
        activeProducts,
        cars,
        activeServices,
        activeRoutes,
        activeFaqs,
        activeSocialLinks,
        activeBlogs,
        activeGallery,
        homeSettings,
        heroData,
        instantPriceData,
        religiousToursData,
        galleryHeroData,
        bookingTripTypesData,
        bookingLocationsData,
        footerCreditData,
        activeTravelReservations,
      ] = await Promise.all([
        getActiveProducts(),
        getCarCatalog(),
        getActiveServices(),
        getActiveContentCollection('routeCards'),
        getActiveContentCollection('faqs'),
        getActiveContentCollection('socialLinks'),
        getActiveBlogs(),
        getActiveContentCollection('gallery'),
        getHomepageSettings(),
        getHeroContent(),
        getInstantPriceContent(),
        getReligiousToursContent(),
        getGalleryHeroContent(),
        getBookingTripTypesContent(),
        getBookingLocationsContent(),
        getFooterCreditContent(),
        getActiveContentCollection('travelReservations'),
      ]);

      const nextBookingLocations = buildBookingLocationsFromFirestore(bookingLocationsData);
      const extraRoutes = syntheticFleetRoutesFromLocations(nextBookingLocations);
      const nextFleetRoutes = buildFleetRoutesFromProducts(activeProducts, extraRoutes);
      const nextCars = Array.isArray(cars) && cars.length ? cars : getDefaultCarCatalog();
      const nextServices = buildServicesFromFirestore(activeServices);
      const nextRoutes = buildRouteCardsFromFirestore(activeRoutes);
      const nextFaqs = buildFaqFromFirestore(activeFaqs);
      const nextSocialLinks = buildSocialLinksFromFirestore(activeSocialLinks);
      const nextBlogs = buildBlogsFromFirestore(activeBlogs);
      const nextGalleryItems = buildGalleryItemsFromFirestore(activeGallery);
      const nextTravelReservations = buildTravelReservationsFromFirestore(activeTravelReservations);

      const nextSections = homeSettings.sections;
      const nextFleetShowcase = normalizeFleetShowcase(homeSettings.fleetShowcase);

      const nextHero = buildHeroFromFirestore(heroData);

      const nextInstantPrice = buildInstantPriceFromFirestore(instantPriceData);

      const nextReligiousTours = buildReligiousToursFromFirestore(religiousToursData);

      const nextGalleryHero = buildGalleryHeroFromFirestore(galleryHeroData);

      const nextBookingTripTypes = buildBookingTripTypesFromFirestore(bookingTripTypesData);

      const nextFooterCredit = buildFooterCreditFromFirestore(footerCreditData);



      setFleetRoutes(nextFleetRoutes.length ? nextFleetRoutes : cacheRef.current.fleetRoutes);
      setLiveCarCatalog(nextCars);
      setCarCatalog(getLiveCarCatalog());
      setServices(nextServices.length ? nextServices : cacheRef.current.services);
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

      setSections(nextSections);
      setFleetShowcase(nextFleetShowcase);

      setHero(nextHero);

      setInstantPrice(nextInstantPrice);

      setReligiousTours(nextReligiousTours);

      setGalleryHero(nextGalleryHero);

      setBookingTripTypes(nextBookingTripTypes);

      setBookingLocations(nextBookingLocations);

      setFooterCredit(nextFooterCredit);



      persistCache({

        fleetRoutes: nextFleetRoutes.length ? nextFleetRoutes : cacheRef.current.fleetRoutes,

        carCatalog: nextCars,

        services: nextServices.length ? nextServices : cacheRef.current.services,

        routeCards: nextRoutes.length ? nextRoutes : cacheRef.current.routeCards,

        faqItems: nextFaqs.length ? nextFaqs : cacheRef.current.faqItems,

        socialLinks: nextSocialLinks.length ? nextSocialLinks : cacheRef.current.socialLinks,

        blogs: nextBlogs.length ? nextBlogs : cacheRef.current.blogs,

        galleryItems: nextGalleryItems.length ? nextGalleryItems : cacheRef.current.galleryItems,

        travelReservations: nextTravelReservations.length
          ? nextTravelReservations
          : (cacheRef.current.travelReservations || DEFAULT_TRAVEL_RESERVATIONS),

        sections: nextSections,

        fleetShowcase: nextFleetShowcase,

        hero: nextHero,

        instantPrice: nextInstantPrice,

        religiousTours: nextReligiousTours,

        galleryHero: nextGalleryHero,

        bookingTripTypes: nextBookingTripTypes,

        bookingLocations: nextBookingLocations,

        footerCredit: nextFooterCredit,

      });

    } catch (err) {

      // Keep lifetime cache / live listener data — never blank the page on network errors

      console.warn('Site content refresh failed, keeping cached data:', err);

    } finally {

      setLoading(false);

    }

  }, [persistCache]);



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

    if (!needsLivePublicContent || hasFreshCacheRef.current) return undefined;

    const isMobile = window.matchMedia('(max-width: 767px)').matches;

    const run = () => refresh();



    if (isMobile && 'requestIdleCallback' in window) {

      const id = window.requestIdleCallback(run, { timeout: 2500 });

      return () => window.cancelIdleCallback(id);

    }



    const timeout = window.setTimeout(run, isMobile ? 200 : 50);

    return () => window.clearTimeout(timeout);

  }, [needsLivePublicContent, refresh]);

  useEffect(() => {

    if (!needsLivePublicContent || typeof BroadcastChannel === 'undefined') return undefined;



    const channel = new BroadcastChannel(SYNC_CHANNEL);

    channel.onmessage = (event) => {

      const type = event?.data?.type;

      if (type === 'soft') return;

      hasFreshCacheRef.current = false;
      refresh();

    };

    return () => channel.close();

  }, [needsLivePublicContent, refresh]);

  // One-doc publish signal: when SuperAdmin saves on live (or any browser),
  // local / other tabs refresh once. Avoids continuous multi-collection listeners.
  useEffect(() => {
    if (!needsLivePublicContent) return undefined;

    const lastRevRef = { current: readStoredContentRevision() };
    let refreshTimer = null;
    let cancelled = false;

    const unsub = subscribeContentRevision(
      (rev) => {
        if (cancelled || !rev) return;
        if (rev === lastRevRef.current) return;

        lastRevRef.current = rev;
        writeStoredContentRevision(rev);
        hasFreshCacheRef.current = false;

        if (refreshTimer) window.clearTimeout(refreshTimer);
        refreshTimer = window.setTimeout(() => {
          if (!cancelled) refresh();
        }, import.meta.env.DEV ? 150 : 400);
      },
      (err) => console.warn('Content revision listener failed:', err?.code || err?.message),
    );

    return () => {
      cancelled = true;
      if (refreshTimer) window.clearTimeout(refreshTimer);
      unsub?.();
    };
  }, [needsLivePublicContent, refresh]);



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

