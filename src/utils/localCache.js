export function readLocalCache(key, maxAgeMs = Infinity) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;

    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed.at !== 'number') return null;
    if (
      maxAgeMs != null
      && Number.isFinite(maxAgeMs)
      && Date.now() - parsed.at > maxAgeMs
    ) {
      return null;
    }

    return parsed.data;
  } catch {
    return null;
  }
}

/** Lifetime cache — never expires by age (Firestore refresh keeps data current). */
export function readPersistentCache(key) {
  return readLocalCache(key, Infinity);
}

export function writeLocalCache(key, data) {
  try {
    localStorage.setItem(key, JSON.stringify({ at: Date.now(), data }));
  } catch {
    // quota or private mode — ignore
  }
}

/** Throttled writer — coalesces rapid Firestore snapshot bursts */
export function createThrottledCacheWriter(key, waitMs = 800) {
  let timer = null;
  let pending = null;

  return (data) => {
    pending = data;
    if (timer) return;
    timer = setTimeout(() => {
      timer = null;
      if (pending != null) {
        writeLocalCache(key, pending);
        pending = null;
      }
    }, waitMs);
  };
}
