import {
  FLEET_ROUTES,
  ROUND_TRIP_FLEET_ROUTES,
  FLEET_VEHICLES,
  ROUTE_CARDS,
  ROUTE_SLUGS,
  ROUTE_SUFFIX,
  SHORT_NAMES,
  getVehicleSlug,
} from '../data/staticData';
import { HOURLY_FLEET_ROUTES } from '../data/hourlyPricing';

const ALL_FLEET_ROUTES = [...FLEET_ROUTES, ...ROUND_TRIP_FLEET_ROUTES, ...HOURLY_FLEET_ROUTES];

export function getVehiclesForRoute(fleetRoutes, routeId = 'ow-2-1') {
  const hasLive = Array.isArray(fleetRoutes) && fleetRoutes.length > 0;
  const routes = hasLive ? fleetRoutes : ALL_FLEET_ROUTES;
  const route = routes.find((r) => r.id === routeId);
  if (route?.vehicles?.length) return route.vehicles;
  // Never inject static/dummy cars when SuperAdmin packages are loaded
  if (hasLive) return [];
  const staticRoute = ALL_FLEET_ROUTES.find((r) => r.id === routeId);
  if (staticRoute?.vehicles?.length) return staticRoute.vehicles;
  return routes[0]?.vehicles || [];
}

/** Keep only the car the user selected (1 result). */
export function filterVehiclesByCarType(vehicles, carType) {
  if (!carType || !vehicles?.length) return vehicles || [];
  const key = String(carType).toLowerCase();
  const matched = vehicles.filter((v) => {
    const id = String(v.id || '').toLowerCase();
    const prefix = id.split('-')[0];
    return prefix === key || id.startsWith(`${key}-`);
  });
  return matched.slice(0, 1);
}

export function getRouteLabel(fleetRoutes, routeId, lang = 'ar') {
  const routes = fleetRoutes?.length ? fleetRoutes : ALL_FLEET_ROUTES;
  const fleetRoute = routes.find((r) => r.id === routeId);
  if (fleetRoute) return fleetRoute.title[lang] || fleetRoute.title.ar;
  const card = ROUTE_CARDS.find((r) => r.id === routeId);
  if (card) return card.title[lang] || card.title.ar;
  return routeId;
}

export function findVehicleById(fleetRoutes, vehicleId) {
  const id = String(vehicleId);
  const routes = fleetRoutes?.length ? fleetRoutes : ALL_FLEET_ROUTES;

  const numeric = FLEET_VEHICLES.find((v) => v.id === Number(vehicleId));
  if (numeric) {
    for (const route of routes) {
      const match = route.vehicles.find((v) => v.id === numeric.key);
      if (match) return { ...match, name: numeric.name, id: numeric.id };
    }
    return numeric;
  }

  for (const route of routes) {
    const match = route.vehicles.find((v) => v.id === id);
    if (match) {
      const short = FLEET_VEHICLES.find((v) => v.key === match.id);
      return short ? { ...match, name: short.name, id: short.id } : match;
    }
  }

  return routes[0]?.vehicles[0] || FLEET_VEHICLES[0];
}

export function findVehicleBySlug(fleetRoutes, slug) {
  const routes = fleetRoutes?.length ? fleetRoutes : ALL_FLEET_ROUTES;

  for (const [routeId, routeSlug] of Object.entries(ROUTE_SLUGS)) {
    if (!slug.endsWith(routeSlug)) continue;

    const type = slug.slice(0, -(routeSlug.length + 1));
    const suffix = ROUTE_SUFFIX[routeId];
    if (!suffix) continue;

    const vehicleKey = `${type}-${suffix}`;
    const route = routes.find((r) => r.id === routeId);
    const vehicle = route?.vehicles.find((v) => v.id === vehicleKey);
    if (!vehicle) continue;

    const short = FLEET_VEHICLES.find((v) => v.key === vehicleKey);
    return {
      vehicle,
      route,
      routeId,
      shortName: short?.name || {
        ar: vehicle.name.ar.split(' ').slice(0, 3).join(' '),
        en: SHORT_NAMES[type]?.en || type,
      },
    };
  }

  for (const route of routes) {
    for (const vehicle of route.vehicles) {
      if (getVehicleSlug(vehicle.id, route.id) !== slug) continue;
      const short = FLEET_VEHICLES.find((v) => v.key === vehicle.id);
      const type = vehicle.id.split('-')[0];
      return {
        vehicle,
        route,
        routeId: route.id,
        shortName: short?.name || {
          ar: vehicle.name.ar.split(' ').slice(0, 3).join(' '),
          en: SHORT_NAMES[type]?.en || type,
        },
      };
    }
  }

  return null;
}

export function buildVehicleRoutePrices(fleetRoutes, currentRouteId, currentPrice) {
  const routes = fleetRoutes?.length ? fleetRoutes : ALL_FLEET_ROUTES;
  const basePrice = currentPrice || 250;
  const multiplier = basePrice / 250;

  return routes.map((route) => {
    const prices = route.vehicles.map((v) => v.price).filter((p) => typeof p === 'number');
    const minPrice = prices.length ? Math.min(...prices) : 450;

    return {
      title: route.title,
      routeId: route.id,
      price: route.id === currentRouteId ? basePrice : Math.round(minPrice * multiplier),
    };
  });
}
