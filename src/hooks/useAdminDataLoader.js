import { useEffect, useState, useCallback, useRef, startTransition } from 'react';
import { useAdminAuth } from '../context/AdminAuthContext';
import {
  readAdminMemoryCache,
  writeAdminMemoryCache,
  clearAdminDataCache,
  adminCacheKey,
  ADMIN_SESSION_MEMORY_TTL_MS,
} from '../utils/adminDataCache';
import { withTimeout } from '../utils/withTimeout';
import { runWithServerReads } from '../firebase/reads';

/** Focus/visibility refetch — avoid hammering Firestore while typing. */
const ADMIN_FOCUS_REFETCH_MS = 3 * 60_000;

/**
 * SuperAdmin loader — session memory for instant tab switches,
 * always revalidate from server in background (no localStorage first-paint flash).
 */
export function useAdminDataLoader(loadFn, deps = [], options = {}) {
  const { isAdmin } = useAdminAuth();
  const memoryKey = options.cacheKey || adminCacheKey(deps) || loadFn?.name || 'admin-data';
  const memoryTtl = options.memoryTtl ?? ADMIN_SESSION_MEMORY_TTL_MS;

  const bootMemory = isAdmin ? readAdminMemoryCache(memoryKey, memoryTtl) : null;
  const [data, setData] = useState(() => bootMemory);
  const [loading, setLoading] = useState(() => bootMemory == null);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const loadFnRef = useRef(loadFn);
  const hasLoadedRef = useRef(bootMemory != null);
  const requestIdRef = useRef(0);
  const lastFetchAtRef = useRef(0);

  loadFnRef.current = loadFn;

  const refresh = useCallback(async (opts = {}) => {
    if (!isAdmin) return false;
    const silent = opts.silent ?? hasLoadedRef.current;
    const fromServer = opts.fromServer ?? opts.bustCache ?? true;
    const requestId = ++requestIdRef.current;

    if (opts.bustCache) {
      clearAdminDataCache(memoryKey);
    }

    if (silent) setRefreshing(true);
    else if (!hasLoadedRef.current) setLoading(true);

    try {
      const load = () => withTimeout(loadFnRef.current(), 12000, 'admin-data');
      const result = fromServer
        ? await runWithServerReads(load)
        : await load();
      if (requestId !== requestIdRef.current) return false;
      lastFetchAtRef.current = Date.now();
      writeAdminMemoryCache(memoryKey, result);
      startTransition(() => {
        setData(result);
        setError('');
      });
      hasLoadedRef.current = true;
      return true;
    } catch (err) {
      if (requestId !== requestIdRef.current) return false;
      console.error('Admin data load error:', err);
      if (!hasLoadedRef.current) {
        const cached = readAdminMemoryCache(memoryKey, Infinity);
        if (cached != null) {
          setData(cached);
          hasLoadedRef.current = true;
          setError('');
          return true;
        }
      }
      setError(err.code || 'load-failed');
      return false;
    } finally {
      if (requestId === requestIdRef.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, [isAdmin, memoryKey]);

  useEffect(() => {
    if (!isAdmin) {
      setLoading(false);
      setRefreshing(false);
      setData(null);
      hasLoadedRef.current = false;
      return;
    }

    const mem = readAdminMemoryCache(memoryKey, memoryTtl);
    if (mem != null) {
      setData(mem);
      hasLoadedRef.current = true;
      setLoading(false);
      // Background revalidate — UI stays smooth
      refresh({ silent: true, fromServer: true });
      return;
    }

    hasLoadedRef.current = false;
    setData(null);
    refresh({ silent: false, fromServer: true, bustCache: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin, memoryKey, ...deps]);

  useEffect(() => {
    if (!isAdmin) return undefined;
    const onVisible = () => {
      if (document.visibilityState !== 'visible') return;
      const now = Date.now();
      if (now - lastFetchAtRef.current < ADMIN_FOCUS_REFETCH_MS) return;
      lastFetchAtRef.current = now;
      refresh({ silent: true, fromServer: true });
    };
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', onVisible);
    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', onVisible);
    };
  }, [isAdmin, refresh]);

  return {
    data,
    loading: loading && data == null,
    refreshing,
    error,
    canLoad: isAdmin,
    refresh,
  };
}
