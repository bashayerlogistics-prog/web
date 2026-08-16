/**
 * Deduplicate fleet packages by route + vehicle (or name/price fallback).
 * Returns keepers and the duplicate docs that should be removed.
 */

export function productDedupeKey(p) {
  const routeId = String(p?.routeId || '').trim();
  const vehicleKey = String(p?.vehicleKey || '').trim();
  if (routeId && vehicleKey) return `${routeId}::${vehicleKey}`;
  const name = String(p?.nameEn || p?.nameAr || '').trim().toLowerCase();
  const price = p?.price ?? '';
  return `${routeId}::${name}::${price}`;
}

/** Match by route + car type (+ fleet page) so shared route ids stay distinct. */
export function fleetCarRouteKey(p) {
  const routeId = String(p?.routeId || '').trim();
  const car = String(p?.vehicleKey || '').split('-')[0]?.trim() || '';
  const fleetServiceId = String(p?.fleetServiceId || '').trim();
  if (routeId && car) {
    return fleetServiceId ? `${fleetServiceId}::${routeId}::${car}` : `${routeId}::${car}`;
  }
  return productDedupeKey(p);
}

export function preferProduct(a, b) {
  if ((a.active !== false) && (b.active === false)) return a;
  if ((b.active !== false) && (a.active === false)) return b;

  const aOw = String(a.routeId || '').startsWith('ow-');
  const bOw = String(b.routeId || '').startsWith('ow-');
  if (aOw && !bOw) return a;
  if (bOw && !aOw) return b;

  const aRt = String(a.routeId || '').startsWith('rt-');
  const bRt = String(b.routeId || '').startsWith('rt-');
  if (aRt && !bRt) return a;
  if (bRt && !aRt) return b;

  const aHr = String(a.routeId || '').startsWith('hr-');
  const bHr = String(b.routeId || '').startsWith('hr-');
  if (aHr && !bHr) return a;
  if (bHr && !aHr) return b;

  const as = Number(a.sortOrder) || 0;
  const bs = Number(b.sortOrder) || 0;
  if (as !== bs) return as < bs ? a : b;

  if (a.imageUrl && !b.imageUrl) return a;
  if (b.imageUrl && !a.imageUrl) return b;

  return a;
}

export function dedupeProducts(products) {
  return dedupeProductsByKey(products, productDedupeKey);
}

export function dedupeFleetProducts(products) {
  return dedupeProductsByKey(products, fleetCarRouteKey);
}

function dedupeProductsByKey(products, keyFn) {
  const map = new Map();
  const duplicates = [];
  for (const p of products || []) {
    const key = keyFn(p);
    const existing = map.get(key);
    if (!existing) {
      map.set(key, p);
      continue;
    }
    const winner = preferProduct(existing, p);
    const loser = winner === existing ? p : existing;
    map.set(key, winner);
    duplicates.push(loser);
  }
  return {
    unique: Array.from(map.values()),
    duplicates,
  };
}
