import { VEHICLE_IMAGES } from './staticData';

/** Hourly rental — 4, 8, or 12 hours with driver */
export const HOURLY_DURATIONS = [4, 8, 12];

export const HOURLY_CARS = ['taurus', 'camry', 'staria', 'yukon', 'hiace'];

export const HOURLY_CAR_META = {
  taurus: { nameAr: 'تورس 2026', nameEn: 'Ford Taurus 2026', passengers: 4, vip: false },
  camry: { nameAr: 'كامري 2026', nameEn: 'Toyota Camry 2026', passengers: 4, vip: false },
  staria: { nameAr: 'ستاريا 2026', nameEn: 'Hyundai Staria 2026', passengers: 7, vip: false },
  yukon: { nameAr: 'جمس 2026', nameEn: 'GMC 2026', passengers: 7, vip: true },
  hiace: { nameAr: 'هايس 2026', nameEn: 'Toyota Hiace 2026', passengers: 10, vip: false },
};

/** SAR per hour by duration and car (from pricing sheet) */
export const HOURLY_RATES = {
  4: { taurus: 80, camry: 70, staria: 95, yukon: 115, hiace: 110 },
  8: { taurus: 70, camry: 60, staria: 85, yukon: 105, hiace: 100 },
  12: { taurus: 65, camry: 55, staria: 80, yukon: 100, hiace: 95 },
};

/** Base cities for hourly packages */
export const HOURLY_BASE_CITIES = [
  { id: '3', key: 'taif', ar: 'الطائف', en: 'Taif' },
  { id: '1', key: 'mecca', ar: 'مكة', en: 'Makkah' },
  { id: '2', key: 'jeddah', ar: 'جدة', en: 'Jeddah' },
  { id: '5', key: 'medina', ar: 'المدينة المنورة', en: 'Madinah' },
];

const CITY_NAMES = {
  taif: { ar: 'الطائف', en: 'Taif' },
  mecca: { ar: 'مكة', en: 'Makkah' },
  jeddah: { ar: 'جدة', en: 'Jeddah' },
  medina: { ar: 'المدينة المنورة', en: 'Madinah' },
};

/** Destinations available per base city */
export const HOURLY_DESTINATIONS_BY_CITY = {
  taif: ['internal', 'jeddah', 'medina', 'mecca'],
  mecca: ['internal', 'jeddah', 'medina', 'taif'],
  jeddah: ['internal', 'mecca', 'medina', 'taif'],
  medina: ['internal', 'mecca', 'jeddah', 'taif'],
};

const VEHICLE_DESC = {
  ar: 'استئجار سيارة بالسائق — خدمة مرنة داخل المدينة أو بين المدن مع ذهاب وعودة.',
  en: 'Car rental with driver — flexible service within the city or between cities with round trip.',
};

/**
 * Ziyarat / within-city Internal package totals (SAR) — sheet: جولات مزارات دينية
 * City IDs: 3=Taif, 1=Makkah, 2=Jeddah, 5=Madinah
 * 4h = sheet totals; 8h / 12h keep prior duration ratios from that base.
 */
export const ZIYARAT_INTERNAL_PRICES = {
  4: {
    3: { taurus: 550, camry: 500, staria: 600, yukon: 780, hiace: 800 },
    1: { taurus: 250, camry: 230, staria: 330, yukon: 450, hiace: 450 },
    2: { taurus: 250, camry: 230, staria: 330, yukon: 450, hiace: 450 },
    5: { taurus: 250, camry: 230, staria: 330, yukon: 450, hiace: 450 },
  },
  8: {
    3: { taurus: 960, camry: 860, staria: 1070, yukon: 1420, hiace: 1450 },
    1: { taurus: 440, camry: 390, staria: 590, yukon: 820, hiace: 820 },
    2: { taurus: 440, camry: 390, staria: 590, yukon: 820, hiace: 820 },
    5: { taurus: 440, camry: 390, staria: 590, yukon: 820, hiace: 820 },
  },
  12: {
    3: { taurus: 1340, camry: 1180, staria: 1520, yukon: 2040, hiace: 2070 },
    1: { taurus: 610, camry: 540, staria: 830, yukon: 1170, hiace: 1170 },
    2: { taurus: 610, camry: 540, staria: 830, yukon: 1170, hiace: 1170 },
    5: { taurus: 610, camry: 540, staria: 830, yukon: 1170, hiace: 1170 },
  },
};

/**
 * Full price matrix: [hours][baseCityId][destination] → { carKey: price }
 * City IDs: 3=Taif, 1=Makkah, 2=Jeddah, 5=Madinah
 * Source: استئجار سيارة بالسائق لمدة 4 / 8 / 12 ساعات + جولات مزارات دينية (internal)
 */
export const HOURLY_PRICE_MATRIX = {
  4: {
    3: {
      internal: { ...ZIYARAT_INTERNAL_PRICES[4][3] },
      jeddah: { taurus: 980, camry: 990, staria: 1250, yukon: 1890, hiace: 1490 },
      medina: { taurus: 1720, camry: 1630, staria: 2330, yukon: 2920, hiace: 2940 },
      mecca: { taurus: 830, camry: 730, staria: 1030, yukon: 1290, hiace: 1290 },
    },
    1: {
      internal: { ...ZIYARAT_INTERNAL_PRICES[4][1] },
      jeddah: { taurus: 770, camry: 690, staria: 930, yukon: 1290, hiace: 1190 },
      medina: { taurus: 1270, camry: 1130, staria: 1630, yukon: 2090, hiace: 2090 },
      taif: { taurus: 830, camry: 730, staria: 1030, yukon: 1290, hiace: 1290 },
    },
    2: {
      internal: { ...ZIYARAT_INTERNAL_PRICES[4][2] },
      mecca: { taurus: 770, camry: 690, staria: 930, yukon: 1290, hiace: 1190 },
      medina: { taurus: 1270, camry: 1130, staria: 1630, yukon: 2090, hiace: 2090 },
      taif: { taurus: 1030, camry: 990, staria: 1250, yukon: 1890, hiace: 1490 },
    },
    5: {
      internal: { ...ZIYARAT_INTERNAL_PRICES[4][5] },
      mecca: { taurus: 1270, camry: 1130, staria: 1630, yukon: 2090, hiace: 2090 },
      jeddah: { taurus: 1270, camry: 1130, staria: 1630, yukon: 2090, hiace: 2090 },
      taif: { taurus: 1720, camry: 1630, staria: 2330, yukon: 2920, hiace: 2940 },
    },
  },
  8: {
    3: {
      internal: { ...ZIYARAT_INTERNAL_PRICES[8][3] },
      jeddah: { taurus: 1270, camry: 1130, staria: 1550, yukon: 2270, hiace: 2130 },
      medina: { taurus: 2020, camry: 1780, staria: 2580, yukon: 3300, hiace: 3200 },
      mecca: { taurus: 1120, camry: 930, staria: 1330, yukon: 1640, hiace: 1650 },
    },
    1: {
      internal: { ...ZIYARAT_INTERNAL_PRICES[8][1] },
      jeddah: { taurus: 1010, camry: 870, staria: 1230, yukon: 1670, hiace: 1550 },
      medina: { taurus: 1510, camry: 1330, staria: 1930, yukon: 2470, hiace: 2450 },
      taif: { taurus: 1120, camry: 930, staria: 1330, yukon: 1670, hiace: 1650 },
    },
    2: {
      internal: { ...ZIYARAT_INTERNAL_PRICES[8][2] },
      mecca: { taurus: 1010, camry: 870, staria: 1230, yukon: 1670, hiace: 1550 },
      medina: { taurus: 1510, camry: 1330, staria: 1930, yukon: 2470, hiace: 2450 },
      taif: { taurus: 1270, camry: 1130, staria: 1550, yukon: 2270, hiace: 2130 },
    },
    5: {
      internal: { ...ZIYARAT_INTERNAL_PRICES[8][5] },
      mecca: { taurus: 1510, camry: 1330, staria: 1930, yukon: 2470, hiace: 2450 },
      jeddah: { taurus: 1510, camry: 1330, staria: 1930, yukon: 2470, hiace: 2450 },
      taif: { taurus: 2020, camry: 1780, staria: 2580, yukon: 3300, hiace: 3200 },
    },
  },
  12: {
    3: {
      internal: { ...ZIYARAT_INTERNAL_PRICES[12][3] },
      jeddah: { taurus: 1490, camry: 1370, staria: 1830, yukon: 2600, hiace: 2470 },
      medina: { taurus: 2240, camry: 1960, staria: 2860, yukon: 3600, hiace: 3640 },
      mecca: { taurus: 1290, camry: 1110, staria: 1610, yukon: 1800, hiace: 1990 },
    },
    1: {
      internal: { ...ZIYARAT_INTERNAL_PRICES[12][1] },
      jeddah: { taurus: 1230, camry: 1070, staria: 1510, yukon: 2000, hiace: 1890 },
      medina: { taurus: 1730, camry: 1510, staria: 2210, yukon: 2800, hiace: 2790 },
      taif: { taurus: 1290, camry: 1110, staria: 1610, yukon: 1800, hiace: 1990 },
    },
    2: {
      internal: { ...ZIYARAT_INTERNAL_PRICES[12][2] },
      mecca: { taurus: 1230, camry: 1070, staria: 1510, yukon: 2000, hiace: 1890 },
      medina: { taurus: 1730, camry: 1510, staria: 2210, yukon: 2800, hiace: 2790 },
      taif: { taurus: 1490, camry: 1370, staria: 1830, yukon: 2600, hiace: 2470 },
    },
    5: {
      internal: { ...ZIYARAT_INTERNAL_PRICES[12][5] },
      mecca: { taurus: 1730, camry: 1510, staria: 2210, yukon: 2800, hiace: 2790 },
      jeddah: { taurus: 1730, camry: 1510, staria: 2210, yukon: 2800, hiace: 2790 },
      taif: { taurus: 2240, camry: 1960, staria: 2860, yukon: 3600, hiace: 3640 },
    },
  },
};

export function cityIdToKey(cityId) {
  const map = { '1': 'mecca', '2': 'jeddah', '3': 'taif', '5': 'medina' };
  return map[String(cityId)] || 'taif';
}

/**
 * Compact labels for booking dropdowns (Hours is a separate field).
 * Full duration text stays on the Hours control — avoids truncated selects.
 */
export function buildHourlyDestinationLabel(_hours, baseCityKey, destKey, lang = 'ar') {
  const dest = CITY_NAMES[destKey];

  if (destKey === 'internal') {
    const labels = {
      taif: { ar: 'مشاوير داخل الطائف', en: 'Trips within Taif' },
      mecca: { ar: 'مشاوير داخل مكة', en: 'Trips within Makkah' },
      jeddah: { ar: 'مشاوير داخل جدة', en: 'Trips within Jeddah' },
      medina: { ar: 'مشاوير داخل المدينة', en: 'Trips within Madinah' },
    };
    return labels[baseCityKey]?.[lang] || labels[baseCityKey]?.ar || '';
  }

  const destName = dest?.[lang] || dest?.ar || destKey;
  if (lang === 'ar') {
    return `ذهاب وعودة إلى ${destName}`;
  }
  return `Round trip to ${destName}`;
}

export function buildHourlyRouteId(hours, baseCityId, destKey) {
  const cityKey = cityIdToKey(baseCityId);
  return `hr-${hours}-${cityKey}-${destKey}`;
}

export function parseHourlyRouteId(routeId) {
  const match = String(routeId || '').match(/^hr-(\d+)-(\w+)-(\w+)$/);
  if (!match) return null;
  return { hours: Number(match[1]), baseCityKey: match[2], destKey: match[3] };
}

/** Live SuperAdmin hourly packages for a city → destination keys (fallback: static sheet). */
function liveHourlyDestKeys(baseCityId, hours, fleetRoutes) {
  if (!Array.isArray(fleetRoutes) || !fleetRoutes.length) return null;
  const cityKey = cityIdToKey(baseCityId);
  const h = Number(hours);
  const keys = new Set();
  for (const route of fleetRoutes) {
    const parsed = parseHourlyRouteId(route?.id);
    if (parsed) {
      if (parsed.hours === h && parsed.baseCityKey === cityKey) keys.add(parsed.destKey);
      continue;
    }
    if (
      (route?.tripType === 'hourly' || String(route?.id || '').startsWith('hr-'))
      && Number(route?.hours) === h
      && String(route?.baseCityId) === String(baseCityId)
      && route?.destinationKey
    ) {
      keys.add(route.destinationKey);
    }
  }
  return keys.size ? keys : null;
}

/** Live SuperAdmin hourly packages for a city → duration options. */
export function getHourlyDurationsForCity(baseCityId, fleetRoutes = null) {
  // No live catalog yet → static defaults. Empty live catalog → no options.
  if (!Array.isArray(fleetRoutes)) return [...HOURLY_DURATIONS];
  if (!fleetRoutes.length) return [];

  const cityKey = cityIdToKey(baseCityId);
  const hours = new Set();
  for (const route of fleetRoutes) {
    const parsed = parseHourlyRouteId(route?.id);
    if (parsed) {
      if (parsed.baseCityKey === cityKey) hours.add(parsed.hours);
      continue;
    }
    if (
      (route?.tripType === 'hourly' || String(route?.id || '').startsWith('hr-'))
      && String(route?.baseCityId) === String(baseCityId)
      && route?.hours
    ) {
      hours.add(Number(route.hours));
    }
  }
  return HOURLY_DURATIONS.filter((h) => hours.has(h));
}

export function getHourlyDestinationsForCity(baseCityId, hours, lang = 'ar', fleetRoutes = null) {
  const cityKey = cityIdToKey(baseCityId);
  const staticKeys = HOURLY_DESTINATIONS_BY_CITY[cityKey] || [];

  if (Array.isArray(fleetRoutes)) {
    if (!fleetRoutes.length) return [];
    const liveKeys = liveHourlyDestKeys(baseCityId, hours, fleetRoutes);
    if (!liveKeys) return [];
    const destKeys = [
      ...staticKeys.filter((k) => liveKeys.has(k)),
      ...[...liveKeys].filter((k) => !staticKeys.includes(k)),
    ];
    return destKeys.map((destKey) => ({
      key: destKey,
      routeId: buildHourlyRouteId(hours, baseCityId, destKey),
      label: buildHourlyDestinationLabel(hours, cityKey, destKey, lang),
    }));
  }

  return staticKeys.map((destKey) => ({
    key: destKey,
    routeId: buildHourlyRouteId(hours, baseCityId, destKey),
    label: buildHourlyDestinationLabel(hours, cityKey, destKey, lang),
  }));
}

export function resolveHourlyRouteId(fromCityId, destKey, hours = 4) {
  if (!fromCityId || !destKey) return `hr-${hours}-taif-internal`;
  return buildHourlyRouteId(hours, fromCityId, destKey);
}

function buildHourlyVehicle(carKey, pkg, prices) {
  const meta = HOURLY_CAR_META[carKey];
  const price = prices[carKey] ?? 0;
  const hourlyRate = HOURLY_RATES[pkg.hours]?.[carKey] ?? 0;

  return {
    id: `${carKey}-${pkg.suffix}`,
    name: {
      ar: `${meta.nameAr} — ${pkg.title.ar}`,
      en: `${meta.nameEn} — ${pkg.title.en}`,
    },
    image: VEHICLE_IMAGES[carKey] || VEHICLE_IMAGES.camry,
    passengers: meta.passengers,
    badge: {
      ar: `${pkg.hours} ساعات`,
      en: `${pkg.hours} Hours`,
    },
    brandTag: { ar: 'بشاير العطاء', en: 'Bashayer Logistics' },
    price,
    originalPrice: price,
    hourlyRate,
    hours: pkg.hours,
    vip: meta.vip,
    hidePrice: false,
    tripType: 'hourly',
    description: VEHICLE_DESC,
  };
}

function buildHourlyPackage(hours, baseCityId, destKey) {
  const cityKey = cityIdToKey(baseCityId);
  const routeId = buildHourlyRouteId(hours, baseCityId, destKey);
  const prices = HOURLY_PRICE_MATRIX[hours]?.[baseCityId]?.[destKey] || {};
  const baseCity = HOURLY_BASE_CITIES.find((c) => c.id === baseCityId);
  const destLabelAr = buildHourlyDestinationLabel(hours, cityKey, destKey, 'ar');
  const destLabelEn = buildHourlyDestinationLabel(hours, cityKey, destKey, 'en');

  const suffix = `h${hours}${cityKey.slice(0, 2)}${destKey.slice(0, 2)}`;

  const pkg = {
    hours,
    suffix,
    title: {
      ar: `استئجار ${hours} ساعات — ${baseCity?.ar || cityKey} — ${destLabelAr}`,
      en: `${hours}-Hour Rental — ${baseCity?.en || cityKey} — ${destLabelEn}`,
    },
  };

  return {
    id: routeId,
    title: pkg.title,
    baseCityId,
    baseCityKey: cityKey,
    destinationKey: destKey,
    hours,
    hourlyRates: HOURLY_RATES[hours],
    tripType: 'hourly',
    vehicles: HOURLY_CARS.map((carKey) => buildHourlyVehicle(carKey, pkg, prices)),
  };
}

/** All static hourly fleet routes */
export const HOURLY_FLEET_ROUTES = (() => {
  const routes = [];
  for (const hours of HOURLY_DURATIONS) {
    for (const city of HOURLY_BASE_CITIES) {
      const destKeys = HOURLY_DESTINATIONS_BY_CITY[city.key] || [];
      for (const destKey of destKeys) {
        routes.push(buildHourlyPackage(hours, city.id, destKey));
      }
    }
  }
  return routes;
})();

export function getHourlyRouteForSelection(fromCityId, destKey, hours) {
  const routeId = resolveHourlyRouteId(fromCityId, destKey, hours);
  return HOURLY_FLEET_ROUTES.find((r) => r.id === routeId) || HOURLY_FLEET_ROUTES[0];
}

export function getVehiclesForHourlyRoute(routeId) {
  const route = HOURLY_FLEET_ROUTES.find((r) => r.id === routeId);
  return route?.vehicles || HOURLY_FLEET_ROUTES[0]?.vehicles || [];
}
