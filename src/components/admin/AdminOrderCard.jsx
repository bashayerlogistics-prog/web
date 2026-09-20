import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { MapPin, Calendar, Tag, User, ChevronRight, Phone } from 'lucide-react';
import { CITIES } from '../../data/staticData';
import { getCityName, getStatusLabel, formatBookingDate } from '../../utils/bookingHelpers';
import { formatOrderNumber, resolveOrderCustomer } from '../../utils/orderHelpers';
import StatusBadge from '../ui/StatusBadge';

export default function AdminOrderCard({ booking, user, compact, orderDisplayId }) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const customer = resolveOrderCustomer(booking, user);

  return (
    <div className={`admin-card-inner rounded-xl border hover:shadow-md transition-all duration-250 ${compact ? 'p-3' : 'p-4'}`}>
      <div className="flex items-start justify-between gap-2 mb-2">
        <span className="text-xs font-black text-brand dark:text-gold">#{orderDisplayId || formatOrderNumber(booking.orderNumber)}</span>
        <StatusBadge status={booking.status} label={getStatusLabel(booking.status, lang)} />
      </div>
      <div className="space-y-1.5 text-sm">
        <div className="flex items-center gap-2 admin-heading">
          <MapPin className="w-3.5 h-3.5 text-brand dark:text-gold flex-shrink-0" />
          <span className="truncate text-sm">{getCityName(CITIES, booking.from, lang)} → {getCityName(CITIES, booking.to, lang)}</span>
        </div>
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 admin-text-muted">
            <Calendar className="w-3.5 h-3.5" />
            <span className="text-xs">{booking.date || formatBookingDate(booking.createdAt, lang)}</span>
          </div>
          <div className="flex items-center gap-1 font-bold text-brand dark:text-gold text-xs">
            <Tag className="w-3.5 h-3.5" />
            {booking.totalPrice || booking.price} {t('booking.sar')}
          </div>
        </div>
        {customer.hasAny && (
          <div className="flex flex-col gap-0.5 text-xs admin-text-muted pt-1 border-t border-gray-200/80 dark:border-white/10">
            <div className="flex items-center gap-1.5 min-w-0">
              <User className="w-3 h-3 shrink-0" />
              <span className="truncate font-semibold">{customer.label || t('admin.unknownUser')}</span>
            </div>
            {customer.phone && (
              <div className="flex items-center gap-1.5 ps-4" dir="ltr">
                <Phone className="w-3 h-3 shrink-0" />
                <span className="truncate">{customer.phone}</span>
              </div>
            )}
          </div>
        )}
      </div>
      <Link to="/admin/orders" className="flex items-center gap-1 text-xs text-brand dark:text-gold font-bold mt-2 hover:gap-2 transition-all">
        {t('admin.viewDetails')}
        <ChevronRight className="w-3.5 h-3.5 rtl:rotate-180" />
      </Link>
    </div>
  );
}
