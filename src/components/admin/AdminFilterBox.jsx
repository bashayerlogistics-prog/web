import { useId, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronDown, Filter, Search, SlidersHorizontal } from 'lucide-react';
import AdminSearchBar from './AdminSearchBar';

/**
 * SuperAdmin search + filters — search always visible;
 * filter chips expand on click (modern, responsive).
 */
export default function AdminFilterBox({
  title,
  search,
  onSearchChange,
  searchPlaceholder,
  searchPending = false,
  filterSectionLabel,
  children,
  className = '',
  listPending = false,
  activeCount = 0,
  defaultOpen = false,
}) {
  const { t } = useTranslation();
  const panelId = useId();
  const hasSearch = typeof onSearchChange === 'function';
  const hasFilters = Boolean(children);
  const [open, setOpen] = useState(defaultOpen);
  const showPanel = hasFilters && open;

  return (
    <div className={`admin-filter-box glass-card-3d w-full overflow-hidden ${className}`}>
      <div className="admin-filter-toolbar p-3 sm:p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-3">
          {(title || hasFilters) && (
            <div className="flex items-center gap-2.5 min-w-0 sm:shrink-0">
              <span className="admin-filter-icon-badge" aria-hidden>
                <Filter className="w-4 h-4" />
              </span>
              {title && (
                <span className="admin-heading text-sm font-black truncate hidden sm:inline">
                  {title}
                </span>
              )}
              {(searchPending || listPending) && (
                <span className="text-[10px] font-bold uppercase tracking-wider text-brand/60 dark:text-gold/60 sm:ms-1">
                  {t('admin.searching', { defaultValue: 'Searching…' })}
                </span>
              )}
            </div>
          )}

          <div className="flex items-center gap-2 flex-1 min-w-0">
            {hasSearch && (
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <span className="w-9 h-9 rounded-xl bg-gradient-to-br from-brand/10 to-gold/5 border border-brand/10 flex items-center justify-center flex-shrink-0 sm:hidden">
                  <Search className="w-4 h-4 text-brand dark:text-gold" />
                </span>
                <AdminSearchBar
                  value={search}
                  onChange={onSearchChange}
                  placeholder={searchPlaceholder}
                  pending={searchPending || listPending}
                  className="flex-1 min-w-0"
                />
              </div>
            )}

            {hasFilters && (
              <button
                type="button"
                onClick={() => setOpen((v) => !v)}
                aria-expanded={open}
                aria-controls={panelId}
                className={`admin-filter-toggle-trigger touch-manipulation shrink-0 ${open ? 'admin-filter-toggle-trigger--open' : ''} ${activeCount > 0 ? 'admin-filter-toggle-trigger--active' : ''}`}
              >
                <SlidersHorizontal className="w-4 h-4" />
                <span className="hidden sm:inline">
                  {open
                    ? t('admin.hideFilters', { defaultValue: 'Hide filters' })
                    : t('admin.showFilters', { defaultValue: 'Filters' })}
                </span>
                <span className="sm:hidden font-bold text-xs">
                  {t('admin.filtersShort', { defaultValue: 'Filter' })}
                </span>
                {activeCount > 0 && (
                  <span className="admin-filter-active-badge">{activeCount}</span>
                )}
                <ChevronDown
                  className={`w-4 h-4 transition-transform duration-300 ${open ? 'rotate-180' : ''}`}
                />
              </button>
            )}
          </div>
        </div>
      </div>

      {hasFilters && (
        <div
          id={panelId}
          className={`admin-filter-collapse ${showPanel ? 'admin-filter-collapse--open' : ''}`}
          aria-hidden={!showPanel}
        >
          <div className="admin-filter-collapse-inner">
            <div className="admin-filter-divider mx-3 sm:mx-4" />
            <div
              className={`admin-filter-section admin-filter-section--filters px-3 sm:px-4 pb-3 sm:pb-4 pt-3 space-y-3 transition-opacity duration-150 ${listPending ? 'opacity-80' : ''}`}
            >
              <p className="text-[10px] sm:text-xs font-black uppercase tracking-wider text-brand/70 dark:text-gold/70">
                {filterSectionLabel || t('admin.filterByStatus')}
              </p>
              {children}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
