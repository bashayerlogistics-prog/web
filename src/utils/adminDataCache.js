const PREFIX = 'bashayer-admin-data-v1-';
export const ADMIN_DATA_CACHE_TTL_MS = 3 * 60_000;

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
    const raw = sessionStorage.getItem(PREFIX + key);
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
    sessionStorage.setItem(
      PREFIX + key,
      JSON.stringify({ at: Date.now(), ttl: ttlMs, data }),
    );
  } catch {
    // ignore quota errors
  }
}

export function clearAdminDataCache(key) {
  try {
    if (key) {
      sessionStorage.removeItem(PREFIX + key);
      return;
    }
    for (let i = sessionStorage.length - 1; i >= 0; i -= 1) {
      const k = sessionStorage.key(i);
      if (k?.startsWith(PREFIX)) sessionStorage.removeItem(k);
    }
  } catch {
    // ignore
  }
}
