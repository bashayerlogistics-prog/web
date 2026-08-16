import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Users, Mail, Phone, ShoppingBag } from 'lucide-react';
import { formatBookingDate } from '../../utils/bookingHelpers';
import { useAdminData } from '../../context/AdminDataContext';
import { usePagination } from '../../hooks/usePagination';
import { useAdminInstantSearch, useResetPageOnFilter } from '../../hooks/useAdminInstantSearch';
import AdminPageHeader from '../../components/admin/AdminPageHeader';
import AdminFilterBox from '../../components/admin/AdminFilterBox';
import AdminDataTable, { AdminTableRow, AdminTableCell, adminSnoColumn, AdminSnoCell } from '../../components/admin/AdminDataTable';
import AdminPagination from '../../components/admin/AdminPagination';
import GlassCard from '../../components/ui/GlassCard';
import LoadingSpinner from '../../components/ui/LoadingSpinner';

const PAGE_SIZE = 10;

export default function AdminUsers() {
  const { t, i18n } = useTranslation();
  const { users, bookings, loading } = useAdminData();
  const { search, onSearchChange, query, isPending: searchPending } = useAdminInstantSearch();

  const bookingCounts = useMemo(() => {
    const counts = {};
    bookings.forEach((b) => {
      if (b.userId) counts[b.userId] = (counts[b.userId] || 0) + 1;
    });
    return counts;
  }, [bookings]);

  const filtered = useMemo(() => users.filter((u) => (
    !query
    || u.email?.toLowerCase().includes(query)
    || u.displayName?.toLowerCase().includes(query)
    || u.phone?.includes(query)
  )), [users, query]);

  const { page, setPage, paginated, from, to, total, totalPages } = usePagination(filtered, PAGE_SIZE);
  useResetPageOnFilter(setPage, query);

  const columns = [
    adminSnoColumn(t),
    { key: 'user', label: t('admin.table.user'), width: '28%' },
    { key: 'email', label: t('auth.email'), hide: true, width: '24%' },
    { key: 'phone', label: t('booking.phone'), hide: true, width: '16%' },
    { key: 'bookings', label: t('admin.userBookings'), width: '14%' },
    { key: 'joined', label: t('admin.joined'), width: '18%' },
  ];

  const emptyState = (
    <div className="p-12 text-center">
      <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
      <p className="text-gray-500">{t('admin.noUsers')}</p>
    </div>
  );

  return (
    <div className="space-y-4 sm:space-y-6 w-full">
      <AdminPageHeader title={t('admin.nav.users')} subtitle={t('admin.usersSubtitle', { count: users.length })} />

      <AdminFilterBox
        title={t('admin.filters')}
        search={search}
        onSearchChange={onSearchChange}
        searchPending={searchPending}
        searchPlaceholder={t('admin.searchUsers')}
        defaultOpen={false}
      />

      {/* Mobile cards */}
      <div className={`lg:hidden space-y-3 w-full transition-opacity duration-150 ${searchPending ? 'opacity-70' : ''}`}>
        {loading ? <LoadingSpinner /> : paginated.length === 0 ? (
          <GlassCard hover={false}>{emptyState}</GlassCard>
        ) : paginated.map((user) => (
          <GlassCard key={user.id} className="!p-4 space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary-400 to-emerald-500 flex items-center justify-center overflow-hidden glass-stat-icon flex-shrink-0">
                {user.photoURL ? <img src={user.photoURL} alt="" className="w-full h-full object-cover" /> : <Users className="w-6 h-6 text-white" />}
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-black text-dark-800 dark:text-white truncate">{user.displayName || t('admin.unknownUser')}</p>
                <p className="text-xs text-gray-500 truncate flex items-center gap-1 mt-0.5">
                  <Mail className="w-3 h-3 shrink-0" />{user.email}
                </p>
              </div>
              <span className="text-xs font-black text-brand bg-brand/10 px-2.5 py-1 rounded-lg shrink-0">
                {bookingCounts[user.id] || 0}
              </span>
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
              {user.phone && <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{user.phone}</span>}
              <span className="flex items-center gap-1"><ShoppingBag className="w-3 h-3" />{bookingCounts[user.id] || 0} {t('admin.userBookings')}</span>
              <span>{formatBookingDate(user.createdAt, i18n.language)}</span>
            </div>
          </GlassCard>
        ))}
        {!loading && paginated.length > 0 && (
          <AdminPagination page={page} totalPages={totalPages} from={from} to={to} total={total} onPageChange={setPage} />
        )}
      </div>

      {/* Desktop table */}
      <div className={`hidden lg:block transition-opacity duration-150 ${searchPending ? 'opacity-70' : ''}`}>
        {loading ? <LoadingSpinner /> : (
          <AdminDataTable
            columns={columns}
            pagination={{ page, totalPages, from, to, total, onPageChange: setPage }}
          >
            {paginated.length === 0 ? (
              <tr><td colSpan={columns.length}>{emptyState}</td></tr>
            ) : paginated.map((user, idx) => (
              <AdminTableRow key={user.id}>
                <AdminSnoCell n={from + idx} />
                <AdminTableCell>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-400 to-emerald-500 flex items-center justify-center overflow-hidden glass-stat-icon flex-shrink-0">
                      {user.photoURL ? <img src={user.photoURL} alt="" className="w-full h-full object-cover" /> : <Users className="w-5 h-5 text-white" />}
                    </div>
                    <span className="font-bold truncate">{user.displayName || t('admin.unknownUser')}</span>
                  </div>
                </AdminTableCell>
                <AdminTableCell hide>
                  <span className="text-gray-600 dark:text-gray-300 truncate block">{user.email}</span>
                </AdminTableCell>
                <AdminTableCell hide>{user.phone || '—'}</AdminTableCell>
                <AdminTableCell>
                  <span className="font-black text-brand">{bookingCounts[user.id] || 0}</span>
                </AdminTableCell>
                <AdminTableCell>{formatBookingDate(user.createdAt, i18n.language)}</AdminTableCell>
              </AdminTableRow>
            ))}
          </AdminDataTable>
        )}
      </div>
    </div>
  );
}
