import { resolveBetweenCitiesRouteId } from '../data/betweenCitiesPricing';
import { getRoundTripRouteForCities } from '../data/staticData';

/** One Way — التنقل بين المدن (directed city → city) */
export function resolveRouteId(from, to) {
  return resolveBetweenCitiesRouteId(from, to);
}

export {
  resolveHourlyRouteId,
  getHourlyDestinationsForCity,
  getHourlyDurationsForCity,
  cityIdToKey,
} from '../data/hourlyPricing';

/** Fallback when URL has from/to but no explicit round-trip route id */
export function resolveRoundTripRouteId(from, to) {
  return getRoundTripRouteForCities(from, to || from);
}

export function getStatusLabel(status, lang) {
  const labels = {
    pending: { ar: 'قيد الانتظار', en: 'Pending' },
    confirmed: { ar: 'مؤكد', en: 'Confirmed' },
    completed: { ar: 'مكتمل', en: 'Completed' },
    cancelled: { ar: 'ملغي', en: 'Cancelled' },
  };
  return labels[status]?.[lang] || status;
}

export function formatBookingDate(ts, lang) {
  if (!ts) return '—';
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleDateString(lang === 'ar' ? 'ar-SA' : 'en-US', {
    year: 'numeric', month: 'short', day: 'numeric',
  });
}

export function formatBookingDateTime(ts, lang) {
  if (!ts) return '—';
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleString(lang === 'ar' ? 'ar-SA' : 'en-US');
}

export function getCityName(cities, id, lang) {
  const c = cities.find((x) => x.id === id || x.id === String(id));
  return c ? c[lang] : id;
}
