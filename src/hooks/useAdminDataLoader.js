import { useEffect, useState, useCallback, useRef, startTransition } from 'react';
import { useAdminAuth } from '../context/AdminAuthContext';
import {
  readAdminDataCache,
  writeAdminDataCache,
  adminCacheKey,
  ADMIN_DATA_CACHE_TTL_MS,
} from '../utils/adminDataCache';
import { withTimeout } from '../utils/withTimeout';

/**
 * Fast admin list loader with local cache (stale-while-revalidate).
 * First paint uses cache when present — no full-page spinner on return visits.
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

  loadFnRef.current = loadFn;

  const refresh = useCallback(async (opts = {}) => {
    if (!isAdmin) return;
    const silent = opts.silent ?? hasLoadedRef.current;
    const requestId = ++requestIdRef.current;

    if (silent) setRefreshing(true);
    else if (!hasLoadedRef.current) setLoading(true);

    try {
      const result = await withTimeout(loadFnRef.current(), 12000, 'admin-data');
      if (requestId !== requestIdRef.current) return;
      startTransition(() => {
        setData(result);
        setError('');
      });
      if (resolvedCacheKey) {
        writeAdminDataCache(resolvedCacheKey, result, cacheTtl);
      }
      hasLoadedRef.current = true;
    } catch (err) {
      if (requestId !== requestIdRef.current) return;
      console.error('Admin data load error:', err);
      setError(err.code || 'load-failed');
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
        refresh({ silent: true });
        return;
      }
    }

    refresh({ silent: hasLoadedRef.current });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin, resolvedCacheKey, ...deps]);

  useEffect(() => {
    if (!isAdmin) return undefined;
    let last = 0;
    const onVisible = () => {
      if (document.visibilityState !== 'visible') return;
      const now = Date.now();
      if (now - last < 20_000) return;
      last = now;
      refresh({ silent: true });
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
