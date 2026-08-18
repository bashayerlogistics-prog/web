import { BOOKING_CAR_TYPES, getDefaultCarCatalog } from '../data/staticData';
import {
  fleetServiceIdsForBookingSection,
  HOME_FLEET_SERVICE_COUNTS,
  normalizeFleetShowcase,
  FLEET_SERVICES,
} from '../data/adminFleetServices';

export const CAR_FORM_IDS = ['booking', 'instantPrice', 'religiousTours'];

/** Visible cars on the SAR grid / booking forms. */
export const MIN_FLEET_CARS = 1;
export const MAX_FLEET_CARS = 12;

export function liveFleetCarCount(carCatalog = []) {
  return (Array.isArray(carCatalog) ? carCatalog : [])
    .filter((car) => car?.id && car.active !== false).length;
}

export const DEFAULT_CAR_FORMS = {
  booking: true,
  instantPrice: true,
  religiousTours: true,
};

export function normalizeCarForms(forms) {
  return {
    booking: forms?.booking !== false,
    instantPrice: forms?.instantPrice !== false,
    religiousTours: forms?.religiousTours !== false,
  };
}

export function isCarOnForm(car, formId) {
  if (!car?.id || car.active === false) return false;
  return normalizeCarForms(car.forms)[formId] !== false;
}

/** Merge Firestore vehicles with the 5 default cars; extras (6th+) stay at the end. */
export function mergeCarCatalog(dbCars = []) {
  const byId = new Map();
  getDefaultCarCatalog().forEach((fallback) => {
    const live = (dbCars || []).find((c) => c.id === fallback.id);
    byId.set(fallback.id, live ? {
      ...fallback,
      ...live,
      id: fallback.id,
      forms: live.forms || fallback.forms || DEFAULT_CAR_FORMS,
    } : { ...fallback });
  });
  (dbCars || []).forEach((live) => {
    if (!live?.id || byId.has(live.id)) return;
    byId.set(live.id, {
      ...live,
      forms: live.forms || DEFAULT_CAR_FORMS,
      active: live.active !== false,
    });
  });
  return [...byId.values()].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
}

export function carCatalogLabel(car, lang = 'en') {
  if (!car) return '';
  if (typeof car === 'string') return car;
  if (lang === 'ar') return car.nameAr || car.nameEn || car.id;
  return car.nameEn || car.nameAr || car.id;
}

/** Active car ids for the SAR price grid (add/hide cars here). */
export function getPriceGridCarIds(carCatalog, fallbackTypes = BOOKING_CAR_TYPES) {
  const catalog = Array.isArray(carCatalog) ? carCatalog : [];
  const live = catalog
    .filter((c) => c?.id && c.active !== false)
    .map((c) => String(c.id));
  if (!live.length) return [...fallbackTypes];
  const ordered = fallbackTypes.filter((id) => live.includes(id));
  const extras = live.filter((id) => !fallbackTypes.includes(id));
  return [...ordered, ...extras];
}

/** Active car type ids for a booking form (booking | instantPrice | religiousTours). */
export function getCarTypesForForm(carCatalog, formId, fallbackTypes = BOOKING_CAR_TYPES) {
  const catalog = Array.isArray(carCatalog) ? carCatalog : [];
  const live = catalog
    .filter((c) => isCarOnForm(c, formId))
    .map((c) => String(c.id));
  if (!live.length) return [...fallbackTypes];
  const ordered = fallbackTypes.filter((id) => live.includes(id));
  const extras = live.filter((id) => !fallbackTypes.includes(id));
  return ordered.length ? [...ordered, ...extras] : live;
}

/**
 * Same 2 cars SuperAdmin pins on Fleet Prices for this trip tab.
 * Between Cities / One Way / Round Trip / Hourly each use their own pair — not a second catalog.
 */
export function getCarTypesForTripSection({
  carCatalog,
  formId = 'booking',
  tripType,
  fleetShowcase,
  hourlyDest,
  routeCategory,
  fallbackTypes = BOOKING_CAR_TYPES,
} = {}) {
  const live = getCarTypesForForm(carCatalog, formId, fallbackTypes);
  let serviceIds = fleetServiceIdsForBookingSection(formId, tripType);
  if ((tripType === 'round_trip' || tripType === 'one_way')
    && (routeCategory === 'train' || routeCategory === 'airport')) {
    serviceIds = [routeCategory];
  }
  if (tripType === 'hourly' && formId !== 'religiousTours') {
    serviceIds = [(!hourlyDest || hourlyDest === 'internal') ? 'withinCity' : 'hourly'];
  }
  if (!serviceIds.length) return live;

  const pins = normalizeFleetShowcase(fleetShowcase);
  const pinnedFrom = (id) => {
    const limit = HOME_FLEET_SERVICE_COUNTS[id] || 2;
    return (pins[id]?.carIds || []).slice(0, limit).filter((car) => car && live.includes(car));
  };

  if (serviceIds.length > 1 && !routeCategory) {
    const firstPins = pinnedFrom(serviceIds[0]);
    if (firstPins.length) return firstPins;
  }

  const pinned = [];
  const seen = new Set();
  serviceIds.forEach((id) => {
    pinnedFrom(id).forEach((car) => {
      if (!seen.has(car)) {
        seen.add(car);
        pinned.push(car);
      }
    });
  });
  if (pinned.length) return pinned;
  const fallbackIds = serviceIds.length > 1 && !routeCategory ? [serviceIds[0]] : serviceIds;
  const fallback = [];
  fallbackIds.forEach((id) => {
    (FLEET_SERVICES[id]?.cars || []).forEach((car) => {
      if (car && live.includes(car) && !fallback.includes(car) && fallback.length < 2) {
        fallback.push(car);
      }
    });
  });
  return fallback.length ? fallback : live.slice(0, 2);
}

export function slugifyCarId(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
}
