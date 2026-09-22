const PREFIX = 'bashayer-admin-data-v3-';
const LEGACY_PREFIXES = ['bashayer-admin-data-v2-', 'bashayer-admin-data-v1-'];
export const ADMIN_DATA_CACHE_TTL_MS = 15 * 60_000;

function storage() {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function adminCacheKey(parts) {
  return String(parts)
    .split(',')
    .map((p) => String(p).trim())
    .filter(Boolean)
    .join('|');
}

export function readAdminDataCache(key, ttlMs = ADMIN_DATA_CACHE_TTL_MS) {
  if (!key) return null;
  try {
    const raw = storage()?.getItem(PREFIX + key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (Date.now() - (parsed.at || 0) > (parsed.ttl ?? ttlMs)) return null;
    return parsed.data ?? null;
  } catch {
    return null;
  }
}

export function writeAdminDataCache(key, data, ttlMs = ADMIN_DATA_CACHE_TTL_MS) {
  if (!key) return;
  try {
    storage()?.setItem(
      PREFIX + key,
      JSON.stringify({ at: Date.now(), ttl: ttlMs, data }),
    );
  } catch {
    // ignore quota errors
  }
}

export function clearAdminDataCache(key) {
  try {
    const store = storage();
    if (!store) return;
    if (key) {
      store.removeItem(PREFIX + key);
      LEGACY_PREFIXES.forEach((prefix) => store.removeItem(prefix + key));
      return;
    }
    for (let i = store.length - 1; i >= 0; i -= 1) {
      const k = store.key(i);
      if (!k) continue;
      if (k.startsWith(PREFIX) || LEGACY_PREFIXES.some((prefix) => k.startsWith(prefix))) {
        store.removeItem(k);
      }
    }
  } catch {
    // ignore
  }
}
