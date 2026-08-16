import { useEffect, useState, useCallback, useRef, startTransition } from 'react';
import { useAdminAuth } from '../context/AdminAuthContext';

/**
 * Fast admin list loader.
 * - First load: full spinner
 * - Later refresh()/CRUD: silent update (keeps current rows, no flash)
 */
export function useAdminDataLoader(loadFn, deps = []) {
  const { isAdmin } = useAdminAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const loadFnRef = useRef(loadFn);
  const hasLoadedRef = useRef(false);
  const requestIdRef = useRef(0);

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
  }, [isAdmin]);

  useEffect(() => {
    if (!isAdmin) {
      setLoading(false);
      setRefreshing(false);
      setData(null);
      hasLoadedRef.current = false;
      return;
    }
    refresh({ silent: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin, ...deps]);

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
