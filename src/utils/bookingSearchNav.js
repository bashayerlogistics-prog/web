import { resolveRouteId, resolveHourlyRouteId } from './bookingHelpers';
import { filterVehiclesByCarType } from './fleetHelpers';

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
export function getBookingPreviewVehicles(fleet, routeId, carType) {
  if (!routeId) return [];
  const all = fleet?.getVehiclesForRoute?.(routeId) || [];
  if (!carType) return all;
  const matched = filterVehiclesByCarType(all, carType);
  return matched.length ? matched : all.slice(0, 1);
}

export function getBookingPreviewVehicle(fleet, routeId, carType) {
  return getBookingPreviewVehicles(fleet, routeId, carType)[0] || null;
}
