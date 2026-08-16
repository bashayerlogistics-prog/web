import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import AdminSelect from './AdminSelect';

const DEFAULT_PAGE_SIZES = [10, 20, 50, 100];

export default function AdminPagination({
  page,
  totalPages,
  from,
  to,
  total,
  onPageChange,
  pageSize,
  onPageSizeChange,
  pageSizes = DEFAULT_PAGE_SIZES,
  className = '',
}) {
  const { t } = useTranslation();

  if (total === 0) return null;

  const pages = [];
  const maxVisible = 5;
  let start = Math.max(1, page - Math.floor(maxVisible / 2));
  let end = Math.min(totalPages, start + maxVisible - 1);
  if (end - start + 1 < maxVisible) start = Math.max(1, end - maxVisible + 1);
  for (let i = start; i <= end; i++) pages.push(i);

  const go = (p) => {
    if (p < 1 || p > totalPages || p === page) return;
    onPageChange(p);
  };

  const navBtn =
    'p-2 sm:p-2.5 rounded-xl transition-transform duration-150 active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed admin-pagination-btn border flex-shrink-0 touch-manipulation';
  const pageBtn = (active) =>
    `min-w-[32px] sm:min-w-[36px] h-8 sm:h-9 px-1.5 sm:px-2 rounded-xl text-xs sm:text-sm font-black transition-transform duration-150 active:scale-95 flex-shrink-0 touch-manipulation ${
      active
        ? 'bg-gradient-to-r from-brand to-brand-dark text-white shadow-md shadow-brand/25 border border-brand/30'
        : 'admin-pagination-btn text-gray-600 border hover:border-brand/40'
    }`;

  return (
    <div
      className={`admin-pagination flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 px-3 py-3 sm:px-4 sm:py-4 border-t border-brand/10 dark:border-white/5 w-full ${className}`}
    >
      <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
        <p className="text-xs sm:text-sm admin-text-muted font-medium text-center sm:text-start">
          {t('admin.table.showing', { from, to, total })}
        </p>
        {typeof onPageSizeChange === 'function' && (
          <label className="inline-flex items-center justify-center sm:justify-start gap-2 text-xs font-bold admin-text-muted">
            <span>{t('admin.table.perPage')}</span>
            <AdminSelect
              value={pageSize || pageSizes[0]}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
              className="px-2.5 py-1.5 rounded-lg border border-brand/20 bg-white dark:admin-input text-xs font-black text-brand dark:text-gold outline-none focus:ring-2 focus:ring-brand/30"
            >
              {pageSizes.map((size) => (
                <option key={size} value={size}>{size}</option>
              ))}
            </AdminSelect>
          </label>
        )}
      </div>

      <div className="flex items-center justify-center gap-1 sm:gap-1.5 w-full lg:w-auto max-w-full overflow-hidden flex-wrap">
        <button type="button" disabled={page <= 1} onClick={() => go(1)} className={navBtn} aria-label="First">
          <ChevronsLeft className="w-4 h-4 rtl:rotate-180" />
        </button>
        <button type="button" disabled={page <= 1} onClick={() => go(page - 1)} className={navBtn} aria-label="Previous">
          <ChevronLeft className="w-4 h-4 rtl:rotate-180" />
        </button>
        {start > 1 && (
          <>
            <button type="button" onClick={() => go(1)} className={pageBtn(false)}>1</button>
            {start > 2 && <span className="px-1 text-xs admin-text-muted">…</span>}
          </>
        )}
        {pages.map((p) => (
          <button key={p} type="button" onClick={() => go(p)} className={pageBtn(p === page)} aria-current={p === page ? 'page' : undefined}>
            {p}
          </button>
        ))}
        {end < totalPages && (
          <>
            {end < totalPages - 1 && <span className="px-1 text-xs admin-text-muted">…</span>}
            <button type="button" onClick={() => go(totalPages)} className={pageBtn(false)}>{totalPages}</button>
          </>
        )}
        <button type="button" disabled={page >= totalPages} onClick={() => go(page + 1)} className={navBtn} aria-label="Next">
          <ChevronRight className="w-4 h-4 rtl:rotate-180" />
        </button>
        <button type="button" disabled={page >= totalPages} onClick={() => go(totalPages)} className={navBtn} aria-label="Last">
          <ChevronsRight className="w-4 h-4 rtl:rotate-180" />
        </button>
        <span className="text-[10px] sm:text-xs font-bold admin-text-muted px-2 whitespace-nowrap">
          {page} / {totalPages}
        </span>
      </div>
    </div>
  );
}
