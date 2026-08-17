/**
 * التنقل بين المدن — Moving Between Cities (One Way / ذهاب)
 * Source sheet: ذهاب + عودة (directional price per leg; most routes symmetric)
 * Cities: Makkah(1) · Jeddah(2) · Taif(3) · Madinah(5)
 */

export const BETWEEN_CITIES_CARS = ['taurus', 'camry', 'staria', 'yukon', 'hiace'];

export const BETWEEN_CITY_META = {
  1: { key: 'makkah', ar: 'مكة', en: 'Makkah' },
  2: { key: 'jeddah', ar: 'جدة', en: 'Jeddah' },
  3: { key: 'taif', ar: 'الطائف', en: 'Taif' },
  5: { key: 'madinah', ar: 'المدينة المنورة', en: 'Madinah' },
};

/** City ids used in between-cities / one-way booking */
export const BETWEEN_CITY_IDS = Object.keys(BETWEEN_CITY_META);

/**
 * Directed prices: `${fromCityId}-${toCityId}` → { carKey: SAR }
 * Taif→Makkah mirrored from Makkah→Taif (sheet listed one direction)
 * Camry Jeddah↔Taif is asymmetric (380 vs 350) per sheet
 */
export const BETWEEN_CITIES_PRICE_MATRIX = {
  '1-2': { taurus: 250, camry: 230, staria: 300, yukon: 450, hiace: 400 },
  '2-1': { taurus: 250, camry: 230, staria: 300, yukon: 450, hiace: 400 },
  '5-1': { taurus: 500, camry: 450, staria: 650, yukon: 850, hiace: 850 },
  '1-5': { taurus: 500, camry: 450, staria: 650, yukon: 850, hiace: 850 },
  '5-2': { taurus: 500, camry: 450, staria: 650, yukon: 850, hiace: 850 },
  '2-5': { taurus: 500, camry: 450, staria: 650, yukon: 850, hiace: 850 },
  '2-3': { taurus: 380, camry: 380, staria: 460, yukon: 750, hiace: 690 },
  '3-2': { taurus: 380, camry: 350, staria: 460, yukon: 750, hiace: 690 },
  '1-3': { taurus: 280, camry: 250, staria: 350, yukon: 450, hiace: 450 },
  '3-1': { taurus: 280, camry: 250, staria: 350, yukon: 450, hiace: 450 },
};

export function buildBetweenCitiesRouteId(fromId, toId) {
  return `ow-${fromId}-${toId}`;
}

export function parseBetweenCitiesRouteId(routeId) {
  const m = String(routeId || '').match(/^ow-(\d+)-(\d+)$/);
  if (!m) return null;
  return { fromId: m[1], toId: m[2] };
}

export function resolveBetweenCitiesRouteId(fromId, toId) {
  if (!fromId || !toId) return 'ow-2-1';
  return buildBetweenCitiesRouteId(fromId, toId);
}

/** True when sheet has a directed price for this city pair */
export function hasBetweenCitiesRoute(fromId, toId) {
  if (!fromId || !toId || String(fromId) === String(toId)) return false;
  return Boolean(BETWEEN_CITIES_PRICE_MATRIX[`${fromId}-${toId}`]);
}

/** Valid "To" cities for a given "From" (one-way). Live SuperAdmin cities overlay the sheet. */
export function getBetweenCitiesDestinations(fromId, liveCities = null) {
  if (Array.isArray(liveCities) && liveCities.length) {
    return liveCities
      .map((city) => String(city.id ?? city))
      .filter((toId) => toId && toId !== String(fromId));
  }
  return BETWEEN_CITY_IDS.filter((toId) => hasBetweenCitiesRoute(fromId, toId));
}

export function betweenCitiesRouteTitle(fromId, toId) {
  const from = BETWEEN_CITY_META[fromId] || BETWEEN_CITY_META[String(fromId)];
  const to = BETWEEN_CITY_META[toId] || BETWEEN_CITY_META[String(toId)];
  return {
    ar: `من ${from?.ar || fromId} إلى ${to?.ar || toId}`,
    en: `From ${from?.en || fromId} to ${to?.en || toId}`,
  };
}
