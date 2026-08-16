import { useState, useMemo, useCallback, useDeferredValue, useTransition, useEffect } from 'react';

/**
 * Instant SuperAdmin search: input updates immediately, list filter uses deferred value
 * so typing stays smooth even on large tables.
 */
export function useAdminInstantSearch(initial = '') {
  const [search, setSearch] = useState(initial);
  const deferredSearch = useDeferredValue(search);
  const query = useMemo(
    () => String(deferredSearch || '').toLowerCase().trim(),
    [deferredSearch],
  );
  const isPending = search !== deferredSearch;

  const onSearchChange = useCallback((value) => {
    setSearch(typeof value === 'string' ? value : String(value ?? ''));
  }, []);

  const clearSearch = useCallback(() => setSearch(''), []);

  return {
    search,
    setSearch,
    onSearchChange,
    clearSearch,
    /** Normalized lowercase query for filtering (deferred) */
    query,
    isPending,
  };
}

/**
 * Instant chip/status filter with non-blocking updates.
 */
export function useAdminInstantFilter(initial = 'all') {
  const [filter, setFilterRaw] = useState(initial);
  const [isPending, startTransition] = useTransition();

  const setFilter = useCallback((value) => {
    startTransition(() => setFilterRaw(value));
  }, [startTransition]);

  return { filter, setFilter, isPending };
}

/**
 * Reset pagination to page 1 whenever search/filters change.
 */
export function useResetPageOnFilter(setPage, ...deps) {
  useEffect(() => {
    setPage(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}
