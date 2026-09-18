import { useEffect, useState, useCallback, useRef, startTransition } from 'react';
import { useAdminAuth } from '../context/AdminAuthContext';
import {
  readAdminDataCache,
  writeAdminDataCache,
  clearAdminDataCache,
  adminCacheKey,
  ADMIN_DATA_CACHE_TTL_MS,
} from '../utils/adminDataCache';
import { withTimeout } from '../utils/withTimeout';
import { runWithServerReads } from '../firebase/reads';

/** Focus/visibility refetch — keep low to cut Firestore reads while admin is open. */
const ADMIN_FOCUS_REFETCH_MS = 5 * 60_000;

/**
 * Fast admin list loader with local cache.
 * Explicit refresh/save uses server reads so IndexedDB never shows stale rows.
 */
export function useAdminDataLoader(loadFn, deps = [], options = {}) {
  const { isAdmin } = useAdminAuth();
  const cacheEnabled = options.cache !== false;
  const cacheTtl = options.cacheTtl ?? ADMIN_DATA_CACHE_TTL_MS;
  const resolvedCacheKey = cacheEnabled
    ? (options.cacheKey || adminCacheKey(deps) || loadFn?.name || '')
    : '';

  const [data, setData] = useState(() => (
    resolvedCacheKey ? readAdminDataCache(resolvedCacheKey, cacheTtl) : null
  ));
  const [loading, setLoading] = useState(() => {
    if (!resolvedCacheKey) return true;
    return readAdminDataCache(resolvedCacheKey, cacheTtl) == null;
  });
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const loadFnRef = useRef(loadFn);
  const hasLoadedRef = useRef(data != null);
  const requestIdRef = useRef(0);
  const lastFetchAtRef = useRef(0);

  loadFnRef.current = loadFn;

  const refresh = useCallback(async (opts = {}) => {
    if (!isAdmin) return false;
    const silent = opts.silent ?? hasLoadedRef.current;
    const fromServer = opts.fromServer ?? opts.bustCache ?? !silent;
    const requestId = ++requestIdRef.current;

    if (resolvedCacheKey && opts.bustCache) {
      clearAdminDataCache(resolvedCacheKey);
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
      startTransition(() => {
        setData(result);
        setError('');
      });
      if (resolvedCacheKey) {
        writeAdminDataCache(resolvedCacheKey, result, cacheTtl);
      }
      hasLoadedRef.current = true;
      return true;
    } catch (err) {
      if (requestId !== requestIdRef.current) return false;
      console.error('Admin data load error:', err);
      setError(err.code || 'load-failed');
      return false;
    } finally {
      if (requestId === requestIdRef.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, [isAdmin, resolvedCacheKey, cacheTtl]);

  useEffect(() => {
    if (!isAdmin) {
      setLoading(false);
      setRefreshing(false);
      setData(null);
      hasLoadedRef.current = false;
      return;
    }

    if (resolvedCacheKey) {
      const cached = readAdminDataCache(resolvedCacheKey, cacheTtl);
      if (cached != null) {
        setData(cached);
        hasLoadedRef.current = true;
        setLoading(false);
        // Revalidate from server in background (avoids IndexedDB stale after publish)
        refresh({ silent: true, fromServer: true });
        return;
      }
    }

    refresh({ silent: hasLoadedRef.current, fromServer: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin, resolvedCacheKey, ...deps]);

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
