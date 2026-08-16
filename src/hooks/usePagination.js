import { useState, useEffect, useMemo, useCallback, startTransition } from 'react';

/**
 * Smooth client-side pagination for SuperAdmin tables.
 * Page changes use startTransition so filters/lists stay responsive.
 */
export function usePagination(items, pageSize = 10) {
  const [page, setPageRaw] = useState(1);
  const list = Array.isArray(items) ? items : [];
  const size = Math.max(1, Number(pageSize) || 10);

  const totalPages = Math.max(1, Math.ceil(list.length / size) || 1);

  const setPage = useCallback((next) => {
    startTransition(() => {
      setPageRaw((current) => {
        const value = typeof next === 'function' ? next(current) : next;
        const n = Number(value) || 1;
        return Math.min(Math.max(1, n), Math.max(1, Math.ceil(list.length / size) || 1));
      });
    });
  }, [list.length, size]);

  useEffect(() => {
    if (page > totalPages) {
      startTransition(() => setPageRaw(totalPages));
    }
  }, [page, totalPages]);

  const paginated = useMemo(
    () => list.slice((page - 1) * size, page * size),
    [list, page, size],
  );

  const from = list.length === 0 ? 0 : (page - 1) * size + 1;
  const to = Math.min(page * size, list.length);

  return {
    page,
    setPage,
    totalPages,
    paginated,
    from,
    to,
    total: list.length,
    pageSize: size,
  };
}
