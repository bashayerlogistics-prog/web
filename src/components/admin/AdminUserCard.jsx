import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Mail, Phone, User, ShoppingBag, ChevronRight } from 'lucide-react';
import { formatBookingDate } from '../../utils/bookingHelpers';

export default function AdminUserCard({ user, bookingCount }) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;

  return (
    <div className="flex items-center gap-3 p-3 admin-card-inner rounded-xl border transition-all duration-250">
      <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-brand/15 to-gold/15 flex items-center justify-center flex-shrink-0 overflow-hidden ring-1 ring-brand/15 dark:ring-gold/20">
        {user.photoURL ? (
          <img src={user.photoURL} alt="" className="w-11 h-11 object-cover" />
        ) : (
          <User className="w-5 h-5 text-brand dark:text-gold" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-bold text-sm admin-heading truncate">{user.displayName || t('admin.unknownUser')}</p>
        <div className="flex items-center gap-1 text-xs admin-text-muted truncate">
          <Mail className="w-3 h-3 flex-shrink-0" />
          {user.email}
        </div>
        {user.phone && (
          <div className="flex items-center gap-1 text-xs admin-text-muted">
            <Phone className="w-3 h-3" />
            {user.phone}
          </div>
        )}
      </div>
      <div className="text-center flex-shrink-0">
        <div className="flex items-center gap-1 text-brand dark:text-gold font-black text-sm">
          <ShoppingBag className="w-3.5 h-3.5" />
          {bookingCount || 0}
        </div>
        <p className="text-[10px] admin-text-muted">{formatBookingDate(user.createdAt, lang)}</p>
      </div>
      <Link to="/admin/users" className="text-brand dark:text-gold">
        <ChevronRight className="w-4 h-4 rtl:rotate-180" />
      </Link>
    </div>
  );
}
