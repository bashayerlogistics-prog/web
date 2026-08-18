import {
  FLEET_CARS,
  FLEET_SERVICES,
  buildNewFleetProduct,
  carKeyOf,
} from '../data/adminFleetServices';
import { HOURLY_DURATIONS } from '../data/hourlyPricing';
import { applyBulkFleetPrices } from '../firebase/admin';

function hasPackage(products, routeId, car) {
  return (products || []).some(
    (p) => String(p.routeId) === String(routeId) && carKeyOf(p) === car,
  );
}

/**
 * When SuperAdmin adds a city, create empty SAR packages so all 3 forms ×
 * Between Cities + Hourly + Ziyarat can show/edit a price immediately.
 */
export function buildCreatesForNewCity(city, cities = [], products = [], cars = FLEET_CARS) {
  if (!city?.id) return [];
  const creates = [];
  const others = (cities || []).filter(
    (item) => item.id !== city.id && item.active !== false,
  );

  others.forEach((other) => {
    [`ow-${city.id}-${other.id}`, `ow-${other.id}-${city.id}`].forEach((routeId) => {
      cars.forEach((car) => {
        if (hasPackage(products, routeId, car)) return;
        creates.push(buildNewFleetProduct(FLEET_SERVICES.cityToCity, {
          car,
          routeId,
          price: 0,
        }));
      });
    });
  });

  const cityKey = String(city.key || '').trim();
  if (cityKey) {
    HOURLY_DURATIONS.forEach((hours) => {
      const routeId = `hr-${hours}-${cityKey}-internal`;
      cars.forEach((car) => {
        if (hasPackage(products, routeId, car)) return;
        creates.push(buildNewFleetProduct(FLEET_SERVICES.withinCity, {
          car,
          routeId,
          price: 0,
          hours,
        }));
      });
    });
  }

  return creates;
}

export async function seedPackagesForNewCity(city, cities, products, cars = FLEET_CARS) {
  const creates = buildCreatesForNewCity(city, cities, products, cars);
  if (!creates.length) return { created: 0 };
  const result = await applyBulkFleetPrices({ updates: [], creates });
  return result;
}
