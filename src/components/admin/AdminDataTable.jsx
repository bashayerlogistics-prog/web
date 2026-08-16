import AdminPagination from './AdminPagination';

/** Shared S.No column for SuperAdmin tables */
export function adminSnoColumn(t) {
  return {
    key: 'sno',
    label: t('admin.table.sno', { defaultValue: 'S.No' }),
    width: '3.25rem',
    thClass: 'text-center',
    className: 'text-center',
  };
}

export function AdminSnoCell({ n, className = '' }) {
  return (
    <AdminTableCell className={`admin-sno-cell text-center tabular-nums font-black text-brand/75 dark:text-gold/85 ${className}`}>
      {n}
    </AdminTableCell>
  );
}

export default function AdminDataTable({
  columns,
  children,
  loading,
  loadingComponent,
  pagination,
  className = '',
  noScroll = false,
  refreshing = false,
}) {
  return (
    <div className={`glass-card-3d overflow-hidden w-full transition-opacity duration-200 ${refreshing ? 'opacity-80' : ''} ${className}`}>
      <div className={noScroll ? 'overflow-hidden' : 'overflow-x-auto scrollbar-hide -mx-px'}>
        <table className="w-full min-w-[640px] lg:table-fixed">
          <thead>
            <tr className="admin-table-head">
              {columns.map((col) => (
                <th
                  key={col.key}
                  style={col.width ? { width: col.width } : undefined}
                  className={`px-2 sm:px-4 py-3.5 text-[10px] sm:text-xs font-black uppercase tracking-wider text-brand dark:text-gold ${col.thClass || col.className || 'text-start'} ${col.hide ? 'hidden sm:table-cell' : ''}`}
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100/80 dark:divide-white/5">
            {loading ? (
              <tr>
                <td colSpan={columns.length} className="p-12 text-center">
                  {loadingComponent}
                </td>
              </tr>
            ) : children}
          </tbody>
        </table>
      </div>
      {!loading && pagination && (
        <AdminPagination {...pagination} />
      )}
    </div>
  );
}

export function AdminTableRow({ children, onClick, className = '' }) {
  return (
    <tr
      onClick={onClick}
      className={`group admin-table-row transition-colors duration-150 ${onClick ? 'cursor-pointer' : ''} ${className}`}
    >
      {children}
    </tr>
  );
}

export function AdminTableCell({ children, className = '', hide = false }) {
  return (
    <td className={`admin-table-cell px-2 sm:px-4 py-2.5 sm:py-3.5 text-xs sm:text-sm text-gray-900 dark:text-gray-100 align-middle ${hide ? 'hidden sm:table-cell' : ''} ${className}`}>
      {children}
    </td>
  );
}
