import { useEffect, useState, useCallback, useRef, startTransition } from 'react';
import { useAdminAuth } from '../context/AdminAuthContext';
import {
  readAdminDataCache,
  writeAdminDataCache,
  adminCacheKey,
  ADMIN_DATA_CACHE_TTL_MS,
} from '../utils/adminDataCache';

/**
 * Fast admin list loader with session cache (stale-while-revalidate).
 * - First visit: spinner → Firestore read → cache
 * - Return visit (≤3 min): instant rows from cache + silent refresh
 * - CRUD refresh(): updates cache without flash
 *
 * @param {() => Promise<any>} loadFn
 * @param {unknown[]} deps
 * @param {{ cacheKey?: string, cache?: boolean, cacheTtl?: number }} options
 */
export function useAdminDataLoader(loadFn, deps = [], options = {}) {
  const { isAdmin } = useAdminAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const loadFnRef = useRef(loadFn);
  const hasLoadedRef = useRef(false);
  const requestIdRef = useRef(0);

  const cacheEnabled = options.cache !== false;
  const cacheTtl = options.cacheTtl ?? ADMIN_DATA_CACHE_TTL_MS;
  const resolvedCacheKey = cacheEnabled
    ? (options.cacheKey || adminCacheKey(deps) || loadFnRef.current?.name || '')
    : '';

  loadFnRef.current = loadFn;

  const refresh = useCallback(async (opts = {}) => {
    if (!isAdmin) return;
    const silent = opts.silent ?? hasLoadedRef.current;
    const requestId = ++requestIdRef.current;

    if (silent) setRefreshing(true);
    else setLoading(true);

    try {
      const result = await loadFnRef.current();
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

    refresh({ silent: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin, resolvedCacheKey, ...deps]);

  return {
    data,
    /** True only on first load (no rows yet) — keeps pagination smooth after updates */
    loading: loading && data == null,
    refreshing,
    error,
    canLoad: isAdmin,
    refresh,
  };
}
