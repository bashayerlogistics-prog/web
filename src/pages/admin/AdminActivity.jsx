import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Activity as ActivityIcon, LogIn, KeyRound, ShoppingBag, UserPlus,
  FileText, Package, Image, Bell, CreditCard,
} from 'lucide-react';
import { formatBookingDateTime } from '../../utils/bookingHelpers';
import { getActivityLabel, getActivityDetails, normalizeActivityType } from '../../utils/activityHelpers';
import { useAdminData } from '../../context/AdminDataContext';
import { usePagination } from '../../hooks/usePagination';
import AdminPageHeader from '../../components/admin/AdminPageHeader';
import AdminFilterBox from '../../components/admin/AdminFilterBox';
import AdminFilterChips from '../../components/admin/AdminFilterChips';
import AdminDataTable, { AdminTableRow, AdminTableCell, adminSnoColumn, AdminSnoCell } from '../../components/admin/AdminDataTable';
import AdminPagination from '../../components/admin/AdminPagination';
import LoadingSpinner from '../../components/ui/LoadingSpinner';

const PAGE_SIZE = 10;

const typeConfig = {
  admin_login: { icon: LogIn, gradient: 'from-blue-500 to-indigo-600' },
  admin_password_changed: { icon: KeyRound, gradient: 'from-purple-500 to-violet-600' },
  booking_created: { icon: ShoppingBag, gradient: 'from-emerald-500 to-green-600' },
  booking_status_updated: { icon: ActivityIcon, gradient: 'from-amber-500 to-orange-600' },
  booking_payment_updated: { icon: CreditCard, gradient: 'from-cyan-500 to-teal-600' },
  payment_updated: { icon: CreditCard, gradient: 'from-cyan-500 to-teal-600' },
  user_registered: { icon: UserPlus, gradient: 'from-pink-500 to-rose-600' },
  price_request_created: { icon: FileText, gradient: 'from-indigo-500 to-blue-600' },
  product_created: { icon: Package, gradient: 'from-teal-500 to-emerald-600' },
  product_updated: { icon: Package, gradient: 'from-teal-500 to-emerald-600' },
  banner_created: { icon: Image, gradient: 'from-violet-500 to-purple-600' },
  notification_sent: { icon: Bell, gradient: 'from-primary-500 to-emerald-600' },
};

export default function AdminActivity() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const { activity, loading, error, refresh } = useAdminData();
  const [filter, setFilter] = useState('all');

  const types = [...new Set(activity.map((a) => a.type))];
  const filtered = filter === 'all' ? activity : activity.filter((a) => a.type === filter);
  const { page, setPage, paginated, from, to, total, totalPages } = usePagination(filtered, PAGE_SIZE);

  const columns = [
    adminSnoColumn(t),
    { key: 'activity', label: t('admin.table.activity'), width: '42%' },
    { key: 'details', label: t('admin.table.details'), width: '33%' },
    { key: 'dateTime', label: t('admin.table.dateTime'), width: '25%', className: 'text-end' },
  ];

  const getTypeConfig = (type) => typeConfig[type] || typeConfig[normalizeActivityType(type)] || {
    icon: ActivityIcon,
    gradient: 'from-gray-500 to-gray-600',
  };

  return (
    <div className="space-y-6">
      <AdminPageHeader title={t('admin.nav.activity')} subtitle={t('admin.activitySubtitle', { count: activity.length })} />

      {error && (
        <div className="px-4 py-3 rounded-xl bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-sm font-medium flex flex-wrap items-center justify-between gap-2">
          <span>
            {error === 'permission-denied'
              ? t('admin.activityPermissionError')
              : t('admin.dataError')}
          </span>
          <button
            type="button"
            onClick={() => refresh({ force: true })}
            className="font-bold underline underline-offset-2"
          >
            {t('admin.refresh')}
          </button>
        </div>
      )}
      <AdminFilterBox title={t('admin.filters')} filterSectionLabel={t('admin.filterByType')} activeCount={filter === 'all' ? 0 : 1} defaultOpen={false}>
        <AdminFilterChips
          value={filter}
          onChange={(v) => { setFilter(v); setPage(1); }}
          options={[
            { key: 'all', label: t('admin.filterAll'), count: activity.length },
            ...types.slice(0, 8).map((type) => ({
              key: type,
              label: t(`admin.activityTypes.${normalizeActivityType(type)}`, { defaultValue: type.replace(/_/g, ' ') }),
              count: activity.filter((a) => a.type === type).length,
            })),
          ]}
        />
      </AdminFilterBox>

      {/* Mobile cards */}
      <div className="lg:hidden space-y-3">
        {loading ? (
          <LoadingSpinner text={t('common.loading')} />
        ) : filtered.length === 0 ? (
          <div className="glass-card-3d p-12 text-center">
            <ActivityIcon className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">{t('admin.noActivity')}</p>
          </div>
        ) : (
          paginated.map((item) => {
            const cfg = getTypeConfig(item.type);
            const Icon = cfg.icon;
            return (
              <div key={item.id} className="glass-card-3d p-4 flex gap-3">
                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${cfg.gradient} flex items-center justify-center shrink-0`}>
                  <Icon className="w-5 h-5 text-white" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-brand text-sm leading-snug">{getActivityLabel(item, t)}</p>
                  {getActivityDetails(item) && (
                    <p className="text-xs text-gray-500 mt-1 line-clamp-2">{getActivityDetails(item)}</p>
                  )}
                  <p className="text-[10px] text-gray-400 mt-2">{formatBookingDateTime(item.createdAt, lang)}</p>
                </div>
              </div>
            );
          })
        )}
        {!loading && total > 0 && (
          <div className="glass-card-3d overflow-hidden">
            <AdminPagination page={page} totalPages={totalPages} from={from} to={to} total={total} onPageChange={setPage} />
          </div>
        )}
      </div>

      {/* Desktop table */}
      <div className="hidden lg:block">
      <AdminDataTable
        columns={columns}
        loading={loading}
        loadingComponent={<LoadingSpinner text={t('common.loading')} />}
        pagination={{ page, totalPages, from, to, total, onPageChange: setPage }}
      >
        {!loading && filtered.length === 0 ? (
          <tr>
            <td colSpan={columns.length} className="p-16 text-center">
              <ActivityIcon className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">{t('admin.noActivity')}</p>
            </td>
          </tr>
        ) : paginated.map((item, idx) => {
          const cfg = getTypeConfig(item.type);
          const Icon = cfg.icon;
          return (
            <AdminTableRow key={item.id}>
              <AdminSnoCell n={from + idx} />
              <AdminTableCell>
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${cfg.gradient} flex items-center justify-center flex-shrink-0`}>
                    <Icon className="w-4 h-4 text-white" />
                  </div>
                  <span className="font-semibold text-dark-800 dark:text-white line-clamp-2 leading-snug">
                    {getActivityLabel(item, t)}
                  </span>
                </div>
              </AdminTableCell>
              <AdminTableCell>
                <span className="text-xs text-gray-600 dark:text-gray-400 break-all">
                  {getActivityDetails(item)}
                </span>
              </AdminTableCell>
              <AdminTableCell className="text-end">
                <span className="text-xs text-gray-500 whitespace-nowrap">
                  {formatBookingDateTime(item.createdAt, lang)}
                </span>
              </AdminTableCell>
            </AdminTableRow>
          );
        })}
      </AdminDataTable>
      </div>
    </div>
  );
}
