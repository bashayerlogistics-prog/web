import { AIRPORT_TRANSFER_ROUTES } from './airportPricing';
import { HOURLY_BASE_CITIES, HOURLY_DESTINATIONS_BY_CITY, HOURLY_DURATIONS } from './hourlyPricing';
import { ROUND_TRIP_TRAIN_ONLY } from './staticData';
import { buildBetweenCitiesRouteId } from './betweenCitiesPricing';

export const CITY_FORM_KEYS = ['betweenCities', 'hourly', 'ziyarat'];
export const ROUTE_FORM_KEYS = ['oneWay', 'roundTrip'];
export const SITE_FORM_KEYS = ['booking', 'instantPrice', 'religiousTours'];

const HOURLY_IDS = new Set(HOURLY_BASE_CITIES.map((c) => String(c.id)));
const ZIYARAT_IDS = new Set(['1', '5', '2', '4']);
const BETWEEN_IDS = new Set(['1', '2', '3', '5']);

const IMAGE_KEY_BY_ID = {
  1: 'makkah',
  2: 'jeddah',
  3: 'taif',
  4: 'riyadh',
  5: 'madinah',
};

const KEY_BY_ID = {
  1: 'mecca',
  2: 'jeddah',
  3: 'taif',
  4: 'riyadh',
  5: 'medina',
};

function cityFormsForId(id) {
  const sid = String(id);
  return {
    betweenCities: BETWEEN_IDS.has(sid),
    hourly: HOURLY_IDS.has(sid),
    ziyarat: ZIYARAT_IDS.has(sid),
  };
}

function slugify(value) {
  const slug = String(value || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 32);
  return slug || `loc-${Date.now().toString(36)}`;
}

function routeFromStatic(station, index) {
  return {
    id: station.id,
    category: station.category === 'airport' ? 'airport' : 'train',
    titleEn: station.title?.en || station.id,
    titleAr: station.title?.ar || station.id,
    pickupLabelEn: station.pickupLabel?.en || station.title?.en || station.id,
    pickupLabelAr: station.pickupLabel?.ar || station.title?.ar || station.id,
    dropoffLabelEn: station.dropoffLabel?.en || station.title?.en || station.id,
    dropoffLabelAr: station.dropoffLabel?.ar || station.title?.ar || station.id,
    cityFrom: String(station.cityFrom || ''),
    cityTo: String(station.cityTo || ''),
    sortOrder: index,
    active: true,
    builtin: true,
    forms: { oneWay: true, roundTrip: true },
  };
}

export function getDefaultBookingCities() {
  return [
    { id: '1', ar: 'مكة', en: 'Makkah' },
    { id: '2', ar: 'جدة', en: 'Jeddah' },
    { id: '3', ar: 'الطائف', en: 'Taif' },
    { id: '4', ar: 'الرياض', en: 'Riyadh' },
    { id: '5', ar: 'المدينة المنورة', en: 'Madinah' },
  ].map((city, index) => ({
    ...city,
    key: KEY_BY_ID[city.id],
    imageKey: IMAGE_KEY_BY_ID[city.id],
    sortOrder: index,
    active: true,
    builtin: true,
    forms: cityFormsForId(city.id),
  }));
}

export function getDefaultPickupRoutes() {
  return [...AIRPORT_TRANSFER_ROUTES, ...ROUND_TRIP_TRAIN_ONLY].map(routeFromStatic);
}

export const DEFAULT_BOOKING_LOCATIONS = {
  cities: getDefaultBookingCities(),
  routes: getDefaultPickupRoutes(),
};

function sanitizeForms(forms, keys, fallback) {
  const next = {};
  keys.forEach((key) => {
    const value = forms?.[key];
    next[key] = typeof value === 'boolean' ? value : fallback?.[key] !== false;
  });
  return next;
}

export function sanitizeBookingCity(raw, index = 0) {
  if (!raw || typeof raw !== 'object') return null;
  const id = String(raw.id || '').trim();
  const en = String(raw.en || raw.labelEn || raw.nameEn || '').trim();
  const ar = String(raw.ar || raw.labelAr || raw.nameAr || '').trim();
  if (!id || (!en && !ar)) return null;
  const key = slugify(raw.key || en || ar || id).replace(/-/g, '') || id;
  return {
    id,
    key,
    imageKey: String(raw.imageKey || key || id).trim() || key,
    en: en || ar,
    ar: ar || en,
    sortOrder: Number.isFinite(Number(raw.sortOrder)) ? Number(raw.sortOrder) : index,
    active: raw.active !== false,
    builtin: Boolean(raw.builtin),
    forms: sanitizeForms(raw.forms, CITY_FORM_KEYS, cityFormsForId(id)),
    siteForms: sanitizeForms(raw.siteForms, SITE_FORM_KEYS, {
      booking: true,
      instantPrice: true,
      religiousTours: true,
    }),
  };
}

export function sanitizePickupRoute(raw, index = 0) {
  if (!raw || typeof raw !== 'object') return null;
  const id = String(raw.id || '').trim();
  const pickupLabelEn = String(raw.pickupLabelEn || raw.pickupLabel?.en || raw.titleEn || '').trim();
  const pickupLabelAr = String(raw.pickupLabelAr || raw.pickupLabel?.ar || raw.titleAr || '').trim();
  if (!id || (!pickupLabelEn && !pickupLabelAr)) return null;
  const dropoffLabelEn = String(raw.dropoffLabelEn || raw.dropoffLabel?.en || pickupLabelEn).trim();
  const dropoffLabelAr = String(raw.dropoffLabelAr || raw.dropoffLabel?.ar || pickupLabelAr).trim();
  const titleEn = String(raw.titleEn || raw.title?.en || pickupLabelEn).trim();
  const titleAr = String(raw.titleAr || raw.title?.ar || pickupLabelAr).trim();
  return {
    id,
    category: raw.category === 'airport' ? 'airport' : 'train',
    titleEn: titleEn || pickupLabelEn,
    titleAr: titleAr || pickupLabelAr,
    pickupLabelEn: pickupLabelEn || dropoffLabelEn,
    pickupLabelAr: pickupLabelAr || dropoffLabelAr,
    dropoffLabelEn: dropoffLabelEn || pickupLabelEn,
    dropoffLabelAr: dropoffLabelAr || pickupLabelAr,
    cityFrom: String(raw.cityFrom || ''),
    cityTo: String(raw.cityTo || ''),
    sortOrder: Number.isFinite(Number(raw.sortOrder)) ? Number(raw.sortOrder) : index,
    active: raw.active !== false,
    builtin: Boolean(raw.builtin),
    forms: sanitizeForms(raw.forms, ROUTE_FORM_KEYS, { oneWay: true, roundTrip: true }),
    siteForms: sanitizeForms(raw.siteForms, SITE_FORM_KEYS, {
      booking: true,
      instantPrice: true,
      religiousTours: true,
    }),
  };
}

function sortByOrder(list) {
  return [...list].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
}

export function buildBookingLocationsFromFirestore(data) {
  if (!data || typeof data !== 'object') {
    return {
      cities: getDefaultBookingCities(),
      routes: getDefaultPickupRoutes(),
    };
  }
  const cities = Array.isArray(data.cities) && data.cities.length
    ? sortByOrder(data.cities.map(sanitizeBookingCity).filter(Boolean))
    : getDefaultBookingCities();
  const routes = Array.isArray(data.routes) && data.routes.length
    ? sortByOrder(data.routes.map(sanitizePickupRoute).filter(Boolean))
    : getDefaultPickupRoutes();
  return { cities, routes };
}

export function cloneBookingLocations(data) {
  const built = buildBookingLocationsFromFirestore(data);
  return {
    cities: built.cities.map((city) => ({
      ...city,
      forms: { ...city.forms },
      siteForms: { ...city.siteForms },
    })),
    routes: built.routes.map((route) => ({
      ...route,
      forms: { ...route.forms },
      siteForms: { ...route.siteForms },
    })),
  };
}

export function getActiveCities(locations, formKey, siteFormId) {
  const cities = locations?.cities || DEFAULT_BOOKING_LOCATIONS.cities;
  return cities.filter((city) => {
    if (city.active === false) return false;
    if (formKey && city.forms?.[formKey] === false) return false;
    if (siteFormId && city.siteForms?.[siteFormId] === false) return false;
    return true;
  });
}

export function cityOption(city) {
  return { id: String(city.id), ar: city.ar, en: city.en, key: city.key };
}

export function getCityLabel(locations, id, lang = 'en') {
  const sid = String(id || '');
  const cities = locations?.cities || DEFAULT_BOOKING_LOCATIONS.cities;
  const city = cities.find((item) => String(item.id) === sid);
  if (!city) return sid;
  return lang === 'ar' ? (city.ar || city.en) : (city.en || city.ar);
}

function prefixForCategory(category, lang) {
  if (category === 'airport') return lang === 'ar' ? 'مطار · ' : 'Airport · ';
  return lang === 'ar' ? 'محطة · ' : 'Train · ';
}

export function getActivePickupRoutes(locations, formKey, siteFormId) {
  const routes = locations?.routes || DEFAULT_BOOKING_LOCATIONS.routes;
  return routes.filter((route) => {
    if (route.active === false) return false;
    if (formKey && route.forms?.[formKey] === false) return false;
    if (siteFormId && route.siteForms?.[siteFormId] === false) return false;
    return true;
  });
}

export function getPickupSelectOptions(locations, lang = 'en', formKey = 'oneWay', siteFormId) {
  return getActivePickupRoutes(locations, formKey, siteFormId).map((route) => ({
    id: route.id,
    category: route.category,
    label: `${prefixForCategory(route.category, lang)}${
      lang === 'ar' ? (route.pickupLabelAr || route.pickupLabelEn) : (route.pickupLabelEn || route.pickupLabelAr)
    }`,
  }));
}

export function getDropoffSelectOptions(locations, lang = 'en', formKey = 'roundTrip', siteFormId) {
  return getActivePickupRoutes(locations, formKey, siteFormId).map((route) => ({
    id: route.id,
    category: route.category,
    label: `${prefixForCategory(route.category, lang)}${
      lang === 'ar' ? (route.dropoffLabelAr || route.dropoffLabelEn) : (route.dropoffLabelEn || route.dropoffLabelAr)
    }`,
  }));
}

export function findPickupRoute(locations, routeId) {
  const routes = locations?.routes || DEFAULT_BOOKING_LOCATIONS.routes;
  const hit = routes.find((route) => route.id === routeId);
  if (!hit) return null;
  return {
    id: hit.id,
    title: { ar: hit.titleAr, en: hit.titleEn },
    pickupLabel: { ar: hit.pickupLabelAr, en: hit.pickupLabelEn },
    dropoffLabel: { ar: hit.dropoffLabelAr, en: hit.dropoffLabelEn },
    cityFrom: hit.cityFrom,
    cityTo: hit.cityTo,
    category: hit.category,
  };
}

export function nextCityId(cities) {
  const nums = (cities || []).map((city) => Number(city.id)).filter((n) => Number.isFinite(n) && n > 0);
  return String((nums.length ? Math.max(...nums) : 5) + 1);
}

export function createBookingCity(partial = {}, cities = []) {
  const en = String(partial.en || '').trim();
  const ar = String(partial.ar || '').trim();
  const id = String(partial.id || nextCityId(cities)).trim();
  const key = slugify(partial.key || en || ar || id).replace(/-/g, '') || `city${id}`;
  return sanitizeBookingCity({
    id,
    key,
    imageKey: partial.imageKey || key,
    en: en || ar || key,
    ar: ar || en || key,
    sortOrder: cities.length,
    active: true,
    builtin: false,
    forms: {
      betweenCities: true,
      hourly: true,
      ziyarat: true,
      ...partial.forms,
    },
    siteForms: {
      booking: true,
      instantPrice: true,
      religiousTours: true,
      ...partial.siteForms,
    },
  }, cities.length);
}

export function createPickupRoute(partial = {}, routes = []) {
  const pickupLabelEn = String(partial.pickupLabelEn || '').trim();
  const pickupLabelAr = String(partial.pickupLabelAr || '').trim();
  const category = partial.category === 'airport' ? 'airport' : 'train';
  const prefix = category === 'airport' ? 'rt-airport' : 'rt-train';
  let id = String(partial.id || `${prefix}-${slugify(pickupLabelEn || pickupLabelAr)}`).trim();
  let n = 2;
  const existing = new Set((routes || []).map((route) => route.id));
  while (existing.has(id)) {
    id = `${prefix}-${slugify(pickupLabelEn || pickupLabelAr)}-${n++}`;
  }
  return sanitizePickupRoute({
    ...partial,
    id,
    category,
    pickupLabelEn,
    pickupLabelAr,
    dropoffLabelEn: partial.dropoffLabelEn || pickupLabelEn,
    dropoffLabelAr: partial.dropoffLabelAr || pickupLabelAr,
    titleEn: partial.titleEn || pickupLabelEn,
    titleAr: partial.titleAr || pickupLabelAr,
    sortOrder: routes.length,
    active: true,
    builtin: false,
    forms: {
      oneWay: true,
      roundTrip: true,
      ...partial.forms,
    },
    siteForms: {
      booking: true,
      instantPrice: true,
      religiousTours: true,
      ...partial.siteForms,
    },
  }, routes.length);
}

export function extraFleetRoutesForService(serviceId, locations) {
  const loc = buildBookingLocationsFromFirestore(locations);
  if (serviceId === 'cityToCity') {
    const cities = getActiveCities(loc, 'betweenCities');
    const extra = [];
    cities.forEach((from) => {
      cities.forEach((to) => {
        if (from.id === to.id) return;
        extra.push({
          id: `ow-${from.id}-${to.id}`,
          label: {
            en: `From ${from.en} to ${to.en}`,
            ar: `من ${from.ar} إلى ${to.ar}`,
          },
        });
      });
    });
    return extra;
  }

  if (serviceId === 'airport' || serviceId === 'train') {
    const category = serviceId === 'airport' ? 'airport' : 'train';
    return getActivePickupRoutes(loc).filter((route) => route.category === category).map((route) => ({
      id: route.id,
      label: {
        en: `${category === 'airport' ? 'Airport · ' : 'Train · '}${route.pickupLabelEn}`,
        ar: `${category === 'airport' ? 'مطار · ' : 'محطة · '}${route.pickupLabelAr}`,
      },
    }));
  }

  if (serviceId === 'hourly' || serviceId === 'withinCity' || serviceId === 'ziyarat') {
    const formKey = serviceId === 'ziyarat' ? 'ziyarat' : 'hourly';
    const cities = getActiveCities(loc, formKey);
    const known = new Set(HOURLY_BASE_CITIES.map((city) => city.key));
    const extra = [];
    const push = (route) => {
      if (!route?.id || extra.some((row) => row.id === route.id)) return;
      extra.push(route);
    };
    cities.forEach((city) => {
      if (!city.key) return;
      if (serviceId !== 'hourly' && known.has(city.key) && serviceId === 'withinCity') return;
      HOURLY_DURATIONS.forEach((hours) => {
        if (serviceId === 'withinCity' || serviceId === 'ziyarat') {
          if (serviceId === 'withinCity' && known.has(city.key)) return;
          push({
            id: `hr-${hours}-${city.key}-internal`,
            label: {
              en: `${hours}h · ${city.en} · within city`,
              ar: `${hours} ساعة · ${city.ar} · داخل المدينة`,
            },
          });
        }
        if (serviceId === 'hourly' && !known.has(city.key)) {
          const dests = (HOURLY_DESTINATIONS_BY_CITY[city.key] || [])
            .filter((dest) => dest !== 'internal');
          const fallbackDests = cities.map((item) => item.key).filter((key) => key && key !== city.key);
          (dests.length ? dests : fallbackDests).forEach((dest) => {
            push({
              id: `hr-${hours}-${city.key}-${dest}`,
              label: {
                en: `${hours}h · ${city.en} → ${dest}`,
                ar: `${hours} ساعة · ${city.ar} → ${dest}`,
              },
            });
          });
        }
      });
    });
    return extra;
  }

  return [];
}

/**
 * Extra fleet route shells for SuperAdmin-added cities / pickups.
 * Lets live packages (ow-6-2, hr-4-abha-internal, …) show on all 3 forms.
 */
export function syntheticFleetRoutesFromLocations(locations) {
  const loc = buildBookingLocationsFromFirestore(locations);
  const routes = [];
  const seen = new Set();
  const push = (route) => {
    if (!route?.id || seen.has(route.id)) return;
    seen.add(route.id);
    routes.push(route);
  };

  const between = getActiveCities(loc, 'betweenCities');
  between.forEach((from) => {
    between.forEach((to) => {
      if (from.id === to.id) return;
      push({
        id: buildBetweenCitiesRouteId(from.id, to.id),
        title: {
          en: `From ${from.en} to ${to.en}`,
          ar: `من ${from.ar} إلى ${to.ar}`,
        },
        cityFrom: String(from.id),
        cityTo: String(to.id),
        tripType: 'one_way',
        vehicles: [],
      });
    });
  });

  getActivePickupRoutes(loc).forEach((route) => {
    push({
      id: route.id,
      title: { en: route.titleEn || route.pickupLabelEn, ar: route.titleAr || route.pickupLabelAr },
      pickupLabel: { en: route.pickupLabelEn, ar: route.pickupLabelAr },
      dropoffLabel: { en: route.dropoffLabelEn, ar: route.dropoffLabelAr },
      cityFrom: route.cityFrom,
      cityTo: route.cityTo,
      category: route.category,
      tripType: 'round_trip',
      vehicles: [],
    });
  });

  const hourlySeen = new Map();
  ['hourly', 'ziyarat'].forEach((formKey) => {
    getActiveCities(loc, formKey).forEach((city) => {
      const cityKey = String(city.key || '').trim();
      if (!cityKey) return;
      const destKeys = new Set([
        'internal',
        ...(HOURLY_DESTINATIONS_BY_CITY[cityKey] || []),
        ...getActiveCities(loc, 'hourly').map((item) => String(item.key || '').trim()).filter(Boolean),
      ]);
      destKeys.delete(cityKey);
      destKeys.forEach((destinationKey) => {
        HOURLY_DURATIONS.forEach((hours) => {
          const id = `hr-${hours}-${cityKey}-${destinationKey}`;
          if (hourlySeen.has(id)) return;
          hourlySeen.set(id, true);
          push({
            id,
            title: {
              en: destinationKey === 'internal'
                ? `${hours}-Hour · ${city.en} · within city`
                : `${hours}-Hour · ${city.en} → ${destinationKey}`,
              ar: destinationKey === 'internal'
                ? `${hours} ساعة · ${city.ar} · داخل المدينة`
                : `${hours} ساعة · ${city.ar} → ${destinationKey}`,
            },
            baseCityId: String(city.id),
            baseCityKey: cityKey,
            destinationKey,
            hours,
            tripType: 'hourly',
            vehicles: [],
          });
        });
      });
    });
  });

  return routes;
}
