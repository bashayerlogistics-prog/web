import {
  FLEET_ROUTES,
  ROUND_TRIP_TRAIN_ONLY,
  BOOKING_CAR_TYPES,
  SHORT_NAMES,
  getCarDisplayName,
  resolveCarThumb,
} from './staticData';
import { AIRPORT_TRANSFER_ROUTES } from './airportPricing';
import {
  HOURLY_FLEET_ROUTES,
  HOURLY_DURATIONS,
  HOURLY_BASE_CITIES,
} from './hourlyPricing';
import {
  getDefaultProducts,
  getDefaultRoundTripProducts,
  getDefaultHourlyProducts,
} from './contentSeeds';

export const FLEET_CARS = BOOKING_CAR_TYPES; // taurus, camry, staria, yukon, hiace
export const DEFAULT_FLEET_CAR = 'taurus';

export function carKeyOf(product) {
  return String(product?.vehicleKey || '').split('-')[0] || '';
}

function labelMap(routes, prefixEn = '', prefixAr = '') {
  return routes.map((r) => ({
    id: r.id,
    label: {
      en: `${prefixEn}${r.title?.en || r.id}`,
      ar: `${prefixAr}${r.title?.ar || r.id}`,
    },
    category: r.category || null,
  }));
}

const AIRPORT_IDS = new Set(AIRPORT_TRANSFER_ROUTES.map((r) => r.id));
const TRAIN_IDS = new Set(ROUND_TRIP_TRAIN_ONLY.map((r) => r.id));

function isAirportProduct(p) {
  if (p.tripType && p.tripType !== 'round_trip') return false;
  const rid = String(p.routeId || '');
  if (!rid.startsWith('rt-')) return false;
  if (AIRPORT_IDS.has(rid) || rid.includes('airport')) return true;
  if (p.category === 'airport') return true;
  return false;
}

function isTrainProduct(p) {
  if (p.tripType && p.tripType !== 'round_trip') return false;
  const rid = String(p.routeId || '');
  if (!rid.startsWith('rt-')) return false;
  if (isAirportProduct(p)) return false;
  if (TRAIN_IDS.has(rid) || p.category === 'train') return true;
  return rid.startsWith('rt-');
}

function isHourlyProduct(p) {
  return p.tripType === 'hourly' || String(p.routeId || '').startsWith('hr-');
}

function isInternalRoute(routeId) {
  return String(routeId || '').includes('-internal');
}

function isZiyaratRoute(routeId) {
  const rid = String(routeId || '');
  return rid.includes('-mecca-internal') || rid.includes('-medina-internal');
}

function isOneWayProduct(p) {
  if (p.tripType === 'round_trip' || p.tripType === 'hourly') return false;
  const rid = String(p.routeId || '');
  if (rid.startsWith('rt-') || rid.startsWith('hr-')) return false;
  return rid.startsWith('ow-') || p.tripType === 'one_way';
}

/** Tag packages to the correct SuperAdmin page (6 services, shared route ids). */
function matchesFleetService(p, serviceId, legacyMatch) {
  const tag = String(p?.fleetServiceId || '').trim();
  if (tag) return tag === serviceId;
  return legacyMatch(p);
}

function withFleetServiceId(products, serviceId) {
  return (products || []).map((p) => ({ ...p, fleetServiceId: serviceId }));
}

/**
 * Six SuperAdmin fleet pricing services — real packages only, 5 cars.
 */
export const FLEET_SERVICES = {
  cityToCity: {
    id: 'cityToCity',
    path: 'city-to-city',
    tripType: 'one_way',
    loadTripType: 'one_way',
    layout: 'one_way',
    navKey: 'admin.nav.cityToCity',
    titleKey: 'admin.nav.cityToCity',
    subtitleKey: 'admin.fleet.cityToCity.subtitle',
    searchKey: 'admin.fleet.cityToCity.searchPlaceholder',
    docsHintKey: 'admin.oneWay.docsHint',
    docsFiles: [
      { en: 'docs/between-cities-prices-en.md', ar: 'docs/between-cities-prices-ar.md', labelEn: 'Between cities', labelAr: 'التنقل بين المدن' },
    ],
    cars: FLEET_CARS,
    defaultCar: DEFAULT_FLEET_CAR,
    badgeEn: 'Between Cities',
    badgeAr: 'التنقل بين المدن',
    getRoutes: () => labelMap(FLEET_ROUTES),
    matchProduct: (p) => matchesFleetService(p, 'cityToCity', isOneWayProduct),
    getDefaults: () => withFleetServiceId(getDefaultProducts(), 'cityToCity'),
    defaultRouteId: 'ow-2-1',
  },
  airport: {
    id: 'airport',
    path: 'airport',
    tripType: 'round_trip',
    loadTripType: 'round_trip',
    layout: 'round_trip',
    navKey: 'admin.nav.airport',
    titleKey: 'admin.nav.airport',
    subtitleKey: 'admin.fleet.airport.subtitle',
    searchKey: 'admin.fleet.airport.searchPlaceholder',
    docsHintKey: 'admin.roundTrip.docsHint',
    docsFiles: [
      { en: 'docs/airport-pickup-dropoff-prices-en.md', ar: 'docs/airport-pickup-dropoff-prices-ar.md', labelEn: 'Airports', labelAr: 'المطارات' },
    ],
    cars: FLEET_CARS,
    defaultCar: DEFAULT_FLEET_CAR,
    badgeEn: 'Airport',
    badgeAr: 'مطار',
    getRoutes: () => labelMap(AIRPORT_TRANSFER_ROUTES, 'Airport · ', 'مطار · '),
    matchProduct: (p) => matchesFleetService(p, 'airport', isAirportProduct),
    getDefaults: () => withFleetServiceId(getDefaultRoundTripProducts().filter(isAirportProduct), 'airport'),
    defaultRouteId: 'rt-airport-jeddah-hotels',
  },
  train: {
    id: 'train',
    path: 'train',
    tripType: 'round_trip',
    loadTripType: 'round_trip',
    layout: 'round_trip',
    navKey: 'admin.nav.train',
    titleKey: 'admin.nav.train',
    subtitleKey: 'admin.fleet.train.subtitle',
    searchKey: 'admin.fleet.train.searchPlaceholder',
    docsHintKey: 'admin.roundTrip.docsHint',
    docsFiles: [
      { en: 'docs/round-trip-train-station-prices-en.md', ar: 'docs/round-trip-train-station-prices-ar.md', labelEn: 'Train', labelAr: 'القطار' },
    ],
    cars: FLEET_CARS,
    defaultCar: DEFAULT_FLEET_CAR,
    badgeEn: 'Train Station',
    badgeAr: 'محطة قطار',
    getRoutes: () => labelMap(ROUND_TRIP_TRAIN_ONLY, 'Train · ', 'محطة · '),
    matchProduct: (p) => matchesFleetService(p, 'train', isTrainProduct),
    getDefaults: () => withFleetServiceId(getDefaultRoundTripProducts().filter(isTrainProduct), 'train'),
    defaultRouteId: 'rt-train-makkah',
  },
  withinCity: {
    id: 'withinCity',
    path: 'within-city',
    tripType: 'hourly',
    loadTripType: 'hourly',
    layout: 'hourly',
    navKey: 'admin.nav.withinCity',
    titleKey: 'admin.nav.withinCity',
    subtitleKey: 'admin.fleet.withinCity.subtitle',
    searchKey: 'admin.fleet.withinCity.searchPlaceholder',
    docsHintKey: 'admin.hourly.docsHint',
    docsFiles: [
      { en: 'docs/within-city-trips-prices-en.md', ar: 'docs/within-city-trips-prices-ar.md', labelEn: 'Within city', labelAr: 'داخل المدينة' },
    ],
    cars: FLEET_CARS,
    defaultCar: DEFAULT_FLEET_CAR,
    badgeEn: 'Within City',
    badgeAr: 'داخل المدينة',
    hoursOptions: HOURLY_DURATIONS,
    cities: HOURLY_BASE_CITIES,
    getRoutes: () => labelMap(HOURLY_FLEET_ROUTES.filter((r) => isInternalRoute(r.id))),
    matchProduct: (p) => matchesFleetService(
      p,
      'withinCity',
      (x) => isHourlyProduct(x) && isInternalRoute(x.routeId) && !isZiyaratRoute(x.routeId),
    ),
    getDefaults: () => withFleetServiceId(
      getDefaultHourlyProducts().filter((p) => isInternalRoute(p.routeId) && !isZiyaratRoute(p.routeId)),
      'withinCity',
    ),
    defaultRouteId: 'hr-4-taif-internal',
  },
  hourly: {
    id: 'hourly',
    path: 'hourly',
    tripType: 'hourly',
    loadTripType: 'hourly',
    layout: 'hourly',
    navKey: 'admin.nav.hourly',
    titleKey: 'admin.nav.hourly',
    subtitleKey: 'admin.fleet.hourly.subtitle',
    searchKey: 'admin.fleet.hourly.searchPlaceholder',
    docsHintKey: 'admin.hourly.docsHint',
    docsFiles: [
      { en: 'docs/hourly-rental-prices-en.md', ar: 'docs/hourly-rental-prices-ar.md', labelEn: 'Hourly', labelAr: 'بالساعة' },
    ],
    cars: FLEET_CARS,
    defaultCar: DEFAULT_FLEET_CAR,
    badgeEn: 'Hourly',
    badgeAr: 'بالساعة',
    hoursOptions: HOURLY_DURATIONS,
    cities: HOURLY_BASE_CITIES,
    getRoutes: () => labelMap(HOURLY_FLEET_ROUTES.filter((r) => !isInternalRoute(r.id))),
    matchProduct: (p) => matchesFleetService(
      p,
      'hourly',
      (x) => isHourlyProduct(x) && !isInternalRoute(x.routeId),
    ),
    getDefaults: () => withFleetServiceId(
      getDefaultHourlyProducts().filter((p) => !isInternalRoute(p.routeId)),
      'hourly',
    ),
    defaultRouteId: 'hr-4-jeddah-mecca',
  },
  ziyarat: {
    id: 'ziyarat',
    path: 'ziyarat',
    tripType: 'hourly',
    loadTripType: 'hourly',
    layout: 'hourly',
    navKey: 'admin.nav.ziyarat',
    titleKey: 'admin.nav.ziyarat',
    subtitleKey: 'admin.fleet.ziyarat.subtitle',
    searchKey: 'admin.fleet.ziyarat.searchPlaceholder',
    docsHintKey: 'admin.fleet.ziyarat.docsHint',
    docsFiles: [
      { en: 'docs/religious-sites-tours-prices-en.md', ar: 'docs/religious-sites-tours-prices-ar.md', labelEn: 'Ziyarat', labelAr: 'الزيارات' },
    ],
    cars: FLEET_CARS,
    defaultCar: DEFAULT_FLEET_CAR,
    badgeEn: 'Ziyarat',
    badgeAr: 'زيارات',
    hoursOptions: HOURLY_DURATIONS,
    cities: HOURLY_BASE_CITIES,
    getRoutes: () => labelMap(HOURLY_FLEET_ROUTES.filter((r) => isZiyaratRoute(r.id))),
    matchProduct: (p) => matchesFleetService(
      p,
      'ziyarat',
      (x) => isHourlyProduct(x) && isZiyaratRoute(x.routeId),
    ),
    getDefaults: () => withFleetServiceId(
      getDefaultHourlyProducts().filter((p) => isZiyaratRoute(p.routeId)),
      'ziyarat',
    ),
    defaultRouteId: 'hr-4-mecca-internal',
    cmsLink: '/admin/ziyarat',
  },
};

export function getFleetService(serviceId) {
  return FLEET_SERVICES[serviceId] || FLEET_SERVICES.cityToCity;
}

export function carOptionList(cars = FLEET_CARS) {
  return cars.map((c) => ({
    id: c,
    label: SHORT_NAMES[c] || { en: c, ar: c },
    name: (lang) => getCarDisplayName(c, lang),
  }));
}

export function passengersForCar(car) {
  if (car === 'hiace') return 10;
  if (car === 'staria' || car === 'yukon') return 7;
  return 4;
}

export function hoursFromRouteId(routeId, fallback = 4) {
  const match = String(routeId || '').match(/^hr-(\d+)/);
  return match ? Number(match[1]) : fallback;
}

export function resolveVehicleKey(service, car, routeId) {
  if (!car || !routeId) return '';
  const defaults = service?.getDefaults?.() || [];
  const hit = defaults.find(
    (d) => d.routeId === routeId && String(d.vehicleKey || '').split('-')[0] === car,
  );
  if (hit?.vehicleKey) return hit.vehicleKey;
  return `${car}-${routeId}`;
}

/**
 * Homepage fleet layout (final):
 * Row 1 — Train 2 + Airport 2
 * Row 2 — City to City 2 + Hourly 2
 * Row 3 — Ziyarat 2 + Within City 2
 */
export const HOME_FLEET_SERVICE_COUNTS = {
  train: 2,
  airport: 2,
  cityToCity: 2,
  hourly: 2,
  ziyarat: 2,
  withinCity: 2,
};

export const HOME_FLEET_SERVICE_IDS = Object.keys(HOME_FLEET_SERVICE_COUNTS);

export const HOME_FLEET_PAIRS = [
  ['train', 'airport'],
  ['cityToCity', 'hourly'],
  ['ziyarat', 'withinCity'],
];

export function normalizeFleetShowcase(raw = {}) {
  const out = {};
  for (const id of HOME_FLEET_SERVICE_IDS) {
    const item = raw?.[id] && typeof raw[id] === 'object' ? raw[id] : {};
    const routeId = String(item.routeId || '').trim();
    const seen = new Set();
    const carIds = (Array.isArray(item.carIds) ? item.carIds : [])
      .map((c) => String(c || '').split('-')[0].trim())
      .filter((c) => c && !seen.has(c) && seen.add(c))
      .slice(0, HOME_FLEET_SERVICE_COUNTS[id] || 2);
    out[id] = { routeId, carIds, active: item.active !== false };
  }
  return out;
}

export function emptyFleetShowcase() {
  return normalizeFleetShowcase({});
}

/** Build a new SuperAdmin package for one car on one route. */
export function buildNewFleetProduct(service, { car, routeId, price, originalPrice, hours } = {}) {
  const carKey = String(car || service.defaultCar || DEFAULT_FLEET_CAR).split('-')[0];
  const rid = String(routeId || service.defaultRouteId || '').trim();
  const defaults = service.getDefaults?.() || [];
  const hit = defaults.find(
    (d) => d.routeId === rid && carKeyOf(d) === carKey,
  );
  const route = (service.getRoutes?.() || []).find((r) => r.id === rid);
  const nameEn = hit?.nameEn || `${getCarDisplayName(carKey, 'en')} · ${route?.label?.en || rid}`;
  const nameAr = hit?.nameAr || `${getCarDisplayName(carKey, 'ar')} · ${route?.label?.ar || rid}`;
  const vehicleKey = hit?.vehicleKey || resolveVehicleKey(service, carKey, rid);
  const numericPrice = Number(price) || Number(hit?.price) || 0;
  const payload = {
    nameEn,
    nameAr,
    carModelEn: getCarDisplayName(carKey, 'en'),
    carModelAr: getCarDisplayName(carKey, 'ar'),
    price: numericPrice,
    originalPrice: Number(originalPrice) || Number(hit?.originalPrice) || numericPrice,
    imageUrl: hit?.imageUrl || resolveCarThumb(carKey, ''),
    descriptionEn: hit?.descriptionEn || '',
    descriptionAr: hit?.descriptionAr || '',
    routeId: rid,
    vehicleKey,
    passengers: hit?.passengers || passengersForCar(carKey),
    badgeEn: hit?.badgeEn || service.badgeEn || '',
    badgeAr: hit?.badgeAr || service.badgeAr || '',
    sortOrder: Number(hit?.sortOrder) || 0,
    active: true,
    hidePrice: false,
    tripType: service.tripType,
    type: 'fleet',
    fleetServiceId: service.id,
  };
  if (service.layout === 'round_trip') {
    payload.pickupPrice = Number(hit?.pickupPrice) || numericPrice;
    payload.dropoffPrice = Number(hit?.dropoffPrice) || 0;
    if (!price && (payload.pickupPrice || payload.dropoffPrice)) {
      payload.price = payload.pickupPrice + payload.dropoffPrice;
      payload.originalPrice = payload.price;
    }
  }
  if (service.layout === 'hourly') {
    payload.hours = Number(hours) || hoursFromRouteId(rid, service.hoursOptions?.[0] || 4);
    payload.hourlyRate = Number(hit?.hourlyRate) || (payload.hours ? Math.round(numericPrice / payload.hours) : 0);
  }
  return payload;
}

function routeAsProduct(route) {
  return {
    tripType: route.tripType,
    routeId: route.id,
    category: route.category,
  };
}

function uniqueCarsOnRoute(route, cars) {
  const byCar = new Map();
  for (const vehicle of route.vehicles || []) {
    const key = carKeyOf({ vehicleKey: vehicle.id });
    if (!key || byCar.has(key)) continue;
    byCar.set(key, vehicle);
  }
  const ordered = (cars || []).map((car) => byCar.get(car)).filter(Boolean);
  const extra = [...byCar.values()].filter((vehicle) => !ordered.includes(vehicle));
  return [...ordered, ...extra];
}

function scoreRouteForHome(route, service) {
  const cars = uniqueCarsOnRoute(route, service.cars);
  let score = cars.length * 10;
  if (route.id === service.defaultRouteId) score += 50;
  // Keep Within City distinct from Ziyarat on the homepage
  if (service.id === 'withinCity') {
    if (isZiyaratRoute(route.id)) score -= 80;
    else score += 40;
  }
  if (service.id === 'ziyarat' && isZiyaratRoute(route.id)) score += 40;
  return { route, cars, score };
}

/**
 * Build homepage fleet groups from live SuperAdmin packages.
 * Per-service car counts — one real route each, no dummy / no duplicates.
 * Optional showcase pins which route + 2 cars appear on the homepage.
 */
export function buildHomeFleetSections(fleetRoutes = [], showcase = {}) {
  if (!fleetRoutes.length) return [];
  const pins = normalizeFleetShowcase(showcase);

  return HOME_FLEET_SERVICE_IDS.map((serviceId) => {
    const service = FLEET_SERVICES[serviceId];
    if (!service) return null;
    const limit = HOME_FLEET_SERVICE_COUNTS[serviceId] || 2;
    const pin = pins[serviceId] || { routeId: '', carIds: [], active: true };
    if (pin.active === false) return null;

    const matching = fleetRoutes.filter((route) =>
      service.matchProduct(routeAsProduct(route)),
    );
    if (!matching.length) return null;

    const ranked = matching
      .map((route) => scoreRouteForHome(route, service))
      .filter((entry) => entry.cars.length > 0)
      .sort((a, b) => b.score - a.score);

    const pinned = pin.routeId
      ? ranked.find((entry) => entry.route.id === pin.routeId)
      : null;
    const best = pinned || ranked[0];
    if (!best) return null;

    // One real route only — never mix cars from other routes (avoids fake/dummy cards)
    const byCar = new Map(
      best.cars.map((vehicle) => [carKeyOf({ vehicleKey: vehicle.id }), vehicle]),
    );

    const preferredCars = [
      ...pin.carIds,
      ...service.cars,
      ...best.cars.map((vehicle) => carKeyOf({ vehicleKey: vehicle.id })),
    ];
    const seen = new Set();
    const vehicles = [];
    for (const car of preferredCars) {
      if (seen.has(car)) continue;
      const vehicle = byCar.get(car);
      if (!vehicle) continue;
      seen.add(car);
      vehicles.push(vehicle);
      if (vehicles.length >= limit) break;
    }

    if (!vehicles.length) return null;

    return {
      id: service.id,
      title: { ar: service.badgeAr, en: service.badgeEn },
      routeId: best.route.id,
      routeTitle: best.route.title,
      tripType: best.route.tripType || service.tripType,
      vehicles,
    };
  }).filter(Boolean);
}

/**
 * All live packages for one car, grouped by the 6 SuperAdmin services.
 * Used on public `/cars/:carId` pages.
 */
export function buildCarCategorySections(fleetRoutes = [], carId) {
  const key = String(carId || '').split('-')[0];
  if (!key || !fleetRoutes.length) return [];

  return HOME_FLEET_SERVICE_IDS.map((serviceId) => {
    const service = FLEET_SERVICES[serviceId];
    if (!service || !service.cars.includes(key)) return null;

    const items = [];
    const seen = new Set();

    for (const route of fleetRoutes) {
      if (!service.matchProduct(routeAsProduct(route))) continue;
      const vehicle = (route.vehicles || []).find(
        (v) => carKeyOf({ vehicleKey: v.id }) === key,
      );
      if (!vehicle) continue;

      const dedupe = `${route.id}|${vehicle.id}|${vehicle.price}|${vehicle.durationHours || ''}`;
      if (seen.has(dedupe)) continue;
      seen.add(dedupe);

      items.push({
        vehicle,
        routeId: route.id,
        routeTitle: route.title,
        tripType: route.tripType || service.tripType,
        durationHours: vehicle.durationHours || route.durationHours || null,
        category: route.category || null,
      });
    }

    if (!items.length) return null;

    return {
      id: service.id,
      title: { ar: service.badgeAr, en: service.badgeEn },
      path: service.path,
      items,
    };
  }).filter(Boolean);
}
