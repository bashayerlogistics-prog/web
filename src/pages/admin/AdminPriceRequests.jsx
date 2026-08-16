import { useTranslation } from 'react-i18next';
import { FileText, Mail, Phone, User } from 'lucide-react';
import { useAdminData } from '../../context/AdminDataContext';
import { usePagination } from '../../hooks/usePagination';
import { formatBookingDateTime } from '../../utils/bookingHelpers';
import AdminPageHeader from '../../components/admin/AdminPageHeader';
import AdminDataTable, { AdminTableRow, AdminTableCell, adminSnoColumn, AdminSnoCell } from '../../components/admin/AdminDataTable';
import AdminPagination from '../../components/admin/AdminPagination';
import LoadingSpinner from '../../components/ui/LoadingSpinner';

const PAGE_SIZE = 10;

export default function AdminPriceRequests() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const { priceRequests, loading } = useAdminData();
  const { page, setPage, paginated, from, to, total, totalPages } = usePagination(priceRequests, PAGE_SIZE);

  const columns = [
    adminSnoColumn(t),
    { key: 'customer', label: t('admin.customer'), width: '28%' },
    { key: 'contact', label: t('admin.table.contact'), width: '22%' },
    { key: 'price', label: t('booking.suggestedPrice'), width: '15%' },
    { key: 'details', label: t('admin.table.details'), width: '25%' },
    { key: 'date', label: t('admin.table.dateTime'), width: '20%', className: 'text-end' },
  ];

  return (
    <div className="space-y-4 sm:space-y-6">
      <AdminPageHeader
        title={t('admin.nav.yourPrice')}
        subtitle={t('admin.yourPrice.subtitle', { count: priceRequests.length })}
      />

      {/* Mobile cards */}
      <div className="lg:hidden space-y-3">
        {loading ? (
          <LoadingSpinner text={t('common.loading')} />
        ) : paginated.length === 0 ? (
          <div className="glass-card-3d p-12 text-center">
            <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">{t('admin.noPriceRequests')}</p>
          </div>
        ) : (
          paginated.map((req) => (
            <div key={req.id} className="glass-card-3d p-4 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <p className="font-black text-brand">{req.name || t('admin.unknownUser')}</p>
                {req.suggestedPrice && (
                  <span className="text-sm font-bold text-brand shrink-0">
                    {req.suggestedPrice} {t('booking.sar')}
                  </span>
                )}
              </div>
              {req.email && (
                <p className="text-xs text-gray-500 flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 shrink-0" />
                  <span dir="ltr" className="truncate">{req.email}</span>
                </p>
              )}
              {req.phone && (
                <p className="text-xs text-gray-500 flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 shrink-0" />
                  <span dir="ltr">{req.phone}</span>
                </p>
              )}
              {req.tripDetails && (
                <p className="text-xs text-gray-600 line-clamp-3">{req.tripDetails}</p>
              )}
              <p className="text-[10px] text-gray-400">
                {formatBookingDateTime(req.createdAt, lang)}
              </p>
            </div>
          ))
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
          {!loading && paginated.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="p-16 text-center">
                <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">{t('admin.noPriceRequests')}</p>
              </td>
            </tr>
          ) : paginated.map((req, idx) => (
            <AdminTableRow key={req.id}>
              <AdminSnoCell n={from + idx} />
              <AdminTableCell>
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-brand/10 flex items-center justify-center shrink-0">
                    <User className="w-4 h-4 text-brand" />
                  </div>
                  <span className="font-semibold truncate">{req.name || '—'}</span>
                </div>
              </AdminTableCell>
              <AdminTableCell>
                <div className="space-y-0.5 text-xs">
                  {req.email && <p dir="ltr" className="truncate">{req.email}</p>}
                  {req.phone && <p dir="ltr">{req.phone}</p>}
                </div>
              </AdminTableCell>
              <AdminTableCell>
                <span className="font-bold text-brand">
                  {req.suggestedPrice ? `${req.suggestedPrice} ${t('booking.sar')}` : '—'}
                </span>
              </AdminTableCell>
              <AdminTableCell>
                <span className="text-xs text-gray-600 line-clamp-2">{req.tripDetails || '—'}</span>
              </AdminTableCell>
              <AdminTableCell className="text-end">
                <span className="text-xs text-gray-500 whitespace-nowrap">
                  {formatBookingDateTime(req.createdAt, lang)}
                </span>
              </AdminTableCell>
            </AdminTableRow>
          ))}
        </AdminDataTable>
      </div>
    </div>
  );
}
