import { resolveRouteId, resolveHourlyRouteId, getHourlyDurationsForCity } from './bookingHelpers';
import { filterVehiclesByCarType } from './fleetHelpers';
import { HOURLY_DURATIONS } from '../data/hourlyPricing';
import { getCarDisplayName } from '../data/staticData';

/** Resolve fleet route id from homepage form state. */
export function resolveBookingSearchRouteId({
  tripType,
  from,
  to,
  rtRoute,
  hours = 4,
  hourlyDest = 'internal',
}) {
  if (tripType === 'round_trip' || tripType === 'one_way') {
    return rtRoute || '';
  }
  if (tripType === 'hourly') {
    if (!from) return '';
    return resolveHourlyRouteId(from, hourlyDest || 'internal', Number(hours));
  }
  if (!from) return '';
  return resolveRouteId(from, to || from);
}

/** Vehicles for live price preview / booking search (instant, no artificial delay). */
export function preferredFleetService({ formId, tripType, hourlyDest } = {}) {
  if (formId === 'religiousTours') return 'ziyarat';
  if (tripType === 'hourly') {
    return (!hourlyDest || hourlyDest === 'internal') ? 'withinCity' : 'hourly';
  }
  return '';
}

export function filterVehiclesForForm(vehicles, formId) {
  if (!formId || !vehicles?.length) return vehicles || [];
  const scoped = vehicles.filter((v) => v.bookingFormId === formId);
  if (scoped.length) return scoped;
  return vehicles.filter((v) => !v.bookingFormId);
}

export function getBookingPreviewVehicles(fleet, routeId, carType, tripContext) {
  if (!routeId) return [];
  let all = fleet?.getVehiclesForRoute?.(routeId) || [];
  const prefer = preferredFleetService(tripContext);
  if (prefer) {
    const matchedService = all.filter((v) => v.fleetServiceId === prefer);
    if (matchedService.length) all = matchedService;
  }
  all = filterVehiclesForForm(all, tripContext?.formId);
  if (!carType) return all;
  const matched = filterVehiclesByCarType(all, carType);
  return matched.length ? matched : all.slice(0, 1);
}

export function getBookingPreviewVehicle(fleet, routeId, carType, tripContext) {
  return getBookingPreviewVehicles(fleet, routeId, carType, tripContext)[0] || null;
}

/** Hours dropdown: SuperAdmin packages for the city, else 4 / 8 / 12. */
export function bookingHourOptions(from, fleetRoutes) {
  const list = getHourlyDurationsForCity(from, fleetRoutes);
  const hours = (Array.isArray(list) && list.length ? list : HOURLY_DURATIONS)
    .map((h) => Number(h))
    .filter((h) => Number.isFinite(h) && h > 0);
  return hours.length ? hours : [...HOURLY_DURATIONS];
}

export function bookingHourSelectOptions(from, fleetRoutes, t) {
  return bookingHourOptions(from, fleetRoutes).map((h) => ({
    value: String(h),
    label: `${h} ${h === 1 ? t('booking.hour') : t('booking.hours_plural')}`,
  }));
}

export function bookingUiLang(lang) {
  return String(lang || '').startsWith('ar') ? 'ar' : 'en';
}

export function shortVehicleName(vehicle, lang) {
  const code = bookingUiLang(lang);
  const key = String(vehicle?.id || '').split('-')[0];
  return (
    getCarDisplayName(key, code)
    || vehicle?.name?.[code]
    || vehicle?.name?.ar
    || vehicle?.name?.en
    || ''
  );
}

/** Live SuperAdmin package price for homepage forms. */
export function numericPriceForTrip(vehicle, tripType) {
  if (!vehicle) return 0;
  const pickup = Number(vehicle.pickupPrice);
  const dropoff = Number(vehicle.dropoffPrice);
  const hasSplit = Number.isFinite(pickup) || Number.isFinite(dropoff);
  if (tripType === 'one_way' && hasSplit && (Number.isFinite(pickup) && pickup > 0)) {
    return pickup;
  }
  if (tripType === 'round_trip' && hasSplit && (pickup > 0 || dropoff > 0)) {
    return (Number.isFinite(pickup) ? pickup : 0) + (Number.isFinite(dropoff) ? dropoff : 0);
  }
  return Number(vehicle.price) || 0;
}

export function formatBookingPriceDisplay(vehicle, currency, contactLabel = '', tripType) {
  if (!vehicle) return '';
  if (vehicle.hidePrice) return contactLabel || '';
  const low = numericPriceForTrip(vehicle, tripType);
  const listed = Number(vehicle.originalPrice) || Number(vehicle.price) || low;
  const high = tripType === 'one_way' || tripType === 'round_trip' ? low : Math.max(listed, low);
  if (!low && !high) return '';
  if (low === high) return `${low} ${currency}`;
  return `${Math.min(low, high)} - ${Math.max(low, high)} ${currency}`;
}

export function vehiclePriceLabel(vehicle, t, tripType) {
  if (!vehicle || vehicle.hidePrice) return t('booking.contactForPrice');
  return (
    formatBookingPriceDisplay(vehicle, t('booking.sar'), t('booking.contactForPrice'), tripType)
    || t('booking.contactForPrice')
  );
}
