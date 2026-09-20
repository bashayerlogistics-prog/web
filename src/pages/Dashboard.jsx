import { useEffect, useState, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Calendar, MapPin, Tag, LogOut, Car, Plus, Navigation,
  Clock, Users, ChevronRight, Phone, CreditCard,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getUserBookings, getUserProfile, updateUserPhone } from '../firebase/bookings';
import { CITIES } from '../data/staticData';
import AppNavLink from '../components/ui/AppNavLink';
import { getStatusLabel, getCityName, formatBookingDate } from '../utils/bookingHelpers';
import { buildOrderNumberMap, getOrderDisplayId } from '../utils/orderHelpers';
import { getPaymentStatusLabel } from '../utils/paymentHelpers';
import StatusBadge from '../components/ui/StatusBadge';
import AlertBanner from '../components/ui/AlertBanner';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import UserNotificationBell from '../components/ui/UserNotificationBell';
import AccountActivity from '../components/ui/AccountActivity';

export default function Dashboard() {
  const { t, i18n } = useTranslation();
  const { user, logout } = useAuth();
  const lang = i18n.language;

  const [bookings, setBookings] = useState([]);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState('');
  const [phoneInput, setPhoneInput] = useState('');
  const [phoneSaving, setPhoneSaving] = useState(false);
  const [phoneError, setPhoneError] = useState('');
  const [phoneSaved, setPhoneSaved] = useState(false);
  const [showActivity, setShowActivity] = useState(false);

  const loadData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setFetchError('');
    try {
      const [b, p] = await Promise.all([
        getUserBookings(user.uid),
        getUserProfile(user.uid).catch(() => null),
      ]);
      setBookings(b);
      setProfile(p);
    } catch (err) {
      console.error('Dashboard error:', err);
      setBookings([]);
      setFetchError(err.code || err.message);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadData();
    return undefined;
  }, [loadData]);

  const orderNumberMap = useMemo(() => buildOrderNumberMap(bookings), [bookings]);
  const displayName = profile?.displayName || user?.displayName || user?.email;
  const displayEmail = profile?.email || user?.email;
  const displayPhone = profile?.phone || '';

  const savePhone = async (e) => {
    e.preventDefault();
    if (!user?.uid) return;
    const trimmed = phoneInput.trim();
    if (trimmed.length < 8) {
      setPhoneError(t('dashboard.phoneInvalid'));
      return;
    }
    setPhoneSaving(true);
    setPhoneError('');
    try {
      const saved = await updateUserPhone(user.uid, trimmed);
      setProfile((prev) => ({ ...(prev || {}), phone: saved }));
      setPhoneSaved(true);
      setPhoneInput('');
    } catch (err) {
      setPhoneError(err.message || t('dashboard.phoneSaveFailed'));
    } finally {
      setPhoneSaving(false);
    }
  };

  const stats = useMemo(() => ({
    total: bookings.length,
    pending: bookings.filter((b) => b.status === 'pending').length,
    completed: bookings.filter((b) => b.status === 'completed' || b.status === 'confirmed').length,
  }), [bookings]);

  const initials = (displayName || '?')
    .split(/\s+/)
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="dashboard-page min-h-screen bg-[#F3F5F7]">
      {/* Compact brand hero */}
      <header className="dashboard-hero relative overflow-hidden bg-brand text-white">
        <div className="absolute inset-0 pointer-events-none opacity-40" aria-hidden>
          <div className="absolute -top-16 -end-10 w-56 h-56 rounded-full bg-gold/30 blur-3xl" />
          <div className="absolute -bottom-20 -start-8 w-48 h-48 rounded-full bg-white/10 blur-3xl" />
        </div>

        <div className="relative max-w-5xl mx-auto px-4 sm:px-6 pt-3 pb-5 sm:pb-7">
          <div className="flex items-center justify-between gap-3 mb-4 sm:mb-5">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-white/15 border border-white/25 flex items-center justify-center text-base sm:text-lg font-black overflow-hidden shrink-0">
                {(profile?.photoURL || user?.photoURL) ? (
                  <img src={profile?.photoURL || user?.photoURL} alt="" className="w-full h-full object-cover" />
                ) : initials}
              </div>
              <div className="min-w-0">
                <p className="text-white/70 text-[11px] sm:text-xs font-semibold tracking-wide">
                  {t('dashboard.welcome')}
                </p>
                <h1 className="text-lg sm:text-2xl font-black truncate leading-tight">{displayName}</h1>
                <p className="text-white/75 text-[11px] sm:text-xs truncate mt-0.5">{displayEmail}</p>
              </div>
            </div>
            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
              <UserNotificationBell />
              <button
                type="button"
                onClick={logout}
                className="inline-flex items-center justify-center gap-1.5 min-h-10 px-2.5 sm:px-3 rounded-xl bg-white/10 border border-white/20 text-xs sm:text-sm font-semibold hover:bg-white/20 transition-colors"
                aria-label={t('auth.logout')}
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">{t('auth.logout')}</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 sm:gap-3">
            {[
              { label: t('dashboard.stats.total'), value: stats.total, icon: Car },
              { label: t('dashboard.stats.pending'), value: stats.pending, icon: Clock },
              { label: t('dashboard.stats.completed'), value: stats.completed, icon: Tag },
            ].map(({ label, value, icon: Icon }) => (
              <div
                key={label}
                className="rounded-2xl bg-white/10 border border-white/20 px-2.5 py-3 sm:px-4 sm:py-3.5 text-center sm:text-start"
              >
                <Icon className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-gold mx-auto sm:mx-0 mb-1.5" />
                <p className="text-lg sm:text-2xl font-black tabular-nums leading-none">{value}</p>
                <p className="text-[10px] sm:text-xs text-white/80 mt-1 leading-snug font-medium line-clamp-2">{label}</p>
              </div>
            ))}
          </div>

          <div className="mt-4 flex gap-2">
            <AppNavLink
              to="/#pricing-calculator"
              className="flex-1 inline-flex items-center justify-center gap-2 min-h-11 rounded-xl bg-gold text-brand font-black text-sm shadow-lg shadow-black/10 active:scale-[0.98] transition-transform"
            >
              <Plus className="w-4 h-4 shrink-0" />
              {t('nav.bookNow')}
            </AppNavLink>
            <Link
              to="/track"
              className="inline-flex items-center justify-center gap-1.5 min-h-11 px-4 rounded-xl bg-white/10 border border-white/25 text-sm font-bold hover:bg-white/15 transition-colors"
            >
              <Navigation className="w-4 h-4" />
              <span className="hidden xs:inline sm:inline">{t('nav.track')}</span>
            </Link>
          </div>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-5 sm:py-8 space-y-4 sm:space-y-6">
        {!displayPhone && (
          <section className="rounded-2xl bg-white border border-gray-100 shadow-sm p-4 sm:p-5">
            <div className="flex items-start gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-brand/10 flex items-center justify-center shrink-0">
                <Phone className="w-5 h-5 text-brand" />
              </div>
              <div className="min-w-0">
                <h2 className="font-black text-brand text-sm sm:text-base">{t('dashboard.addPhoneTitle')}</h2>
                <p className="text-xs sm:text-sm text-gray-500 mt-0.5">{t('dashboard.addPhoneHint')}</p>
              </div>
            </div>
            {phoneSaved ? (
              <p className="text-sm font-semibold text-emerald-600">{t('dashboard.phoneSaved')}</p>
            ) : (
              <form onSubmit={savePhone} className="flex flex-col sm:flex-row gap-2">
                <input
                  type="tel"
                  dir="ltr"
                  value={phoneInput}
                  onChange={(e) => setPhoneInput(e.target.value)}
                  placeholder="+9665XXXXXXXX"
                  className="flex-1 min-w-0 rounded-xl border border-gray-200 bg-white px-3 py-3 text-sm"
                  autoComplete="tel"
                />
                <button
                  type="submit"
                  disabled={phoneSaving}
                  className="shrink-0 rounded-xl bg-brand hover:bg-brand-dark text-white font-bold px-4 py-3 text-sm disabled:opacity-60"
                >
                  {phoneSaving ? t('common.loading') : t('dashboard.savePhone')}
                </button>
              </form>
            )}
            {phoneError && <p className="text-sm text-red-600 mt-2">{phoneError}</p>}
          </section>
        )}

        {displayPhone && (
          <div className="flex items-center gap-2 text-xs sm:text-sm text-gray-600 bg-white border border-gray-100 rounded-xl px-3 py-2.5">
            <Phone className="w-3.5 h-3.5 text-brand shrink-0" />
            <span className="font-semibold text-brand" dir="ltr">{displayPhone}</span>
          </div>
        )}

        <div className="flex items-center justify-between gap-3">
          <h2 className="text-base sm:text-xl font-black text-brand">{t('dashboard.myBookings')}</h2>
          <Link
            to="/track"
            className="text-xs sm:text-sm text-brand font-bold flex items-center gap-1 hover:text-gold transition-colors"
          >
            {t('nav.track')}
            <ChevronRight className="w-4 h-4 rtl:rotate-180" />
          </Link>
        </div>

        {fetchError && (
          <AlertBanner type="warning" title={t('dashboard.loadError')} message={fetchError} />
        )}

        {loading ? (
          <div className="py-16">
            <LoadingSpinner text={t('common.loading')} />
          </div>
        ) : bookings.length === 0 ? (
          <section className="rounded-2xl bg-white border border-gray-100 shadow-sm text-center py-12 px-5">
            <div className="w-16 h-16 bg-brand/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Car className="w-8 h-8 text-brand" />
            </div>
            <h3 className="text-base font-black text-brand mb-1">{t('dashboard.noBookings')}</h3>
            <p className="text-gray-500 text-sm mb-5 max-w-xs mx-auto">{t('dashboard.noBookingsDesc')}</p>
            <AppNavLink
              to="/#pricing-calculator"
              className="inline-flex items-center gap-2 bg-brand text-white font-bold py-3 px-6 rounded-xl"
            >
              <Plus className="w-5 h-5" />
              {t('nav.bookNow')}
            </AppNavLink>
          </section>
        ) : (
          <ul className="space-y-3">
            {bookings.map((booking) => {
              const routeLabel = `${getCityName(CITIES, booking.from, lang)} → ${getCityName(CITIES, booking.to, lang)}`;
              return (
                <li key={booking.id}>
                  <article className="rounded-2xl bg-white border border-gray-100 shadow-sm p-4 active:scale-[0.995] transition-transform">
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="min-w-0">
                        <p className="text-[11px] text-gray-400 font-bold mb-1.5 break-all">
                          #{getOrderDisplayId(booking, orderNumberMap)}
                        </p>
                        <StatusBadge status={booking.status} label={getStatusLabel(booking.status, lang)} />
                      </div>
                      <Link
                        to={`/track?ref=${booking.id}`}
                        className="inline-flex items-center gap-1.5 text-xs font-bold text-brand bg-brand/5 hover:bg-brand/10 px-3 py-2 rounded-xl shrink-0"
                      >
                        <Navigation className="w-3.5 h-3.5" />
                        {t('nav.track')}
                      </Link>
                    </div>

                    <div className="flex items-start gap-3 mb-3">
                      <div className="w-9 h-9 rounded-xl bg-brand flex items-center justify-center shrink-0">
                        <MapPin className="w-4 h-4 text-gold" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[10px] uppercase tracking-wide text-gray-400 font-bold">{t('dashboard.route')}</p>
                        <p className="font-bold text-brand text-sm leading-snug break-words">{routeLabel}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="rounded-xl bg-[#F7F8FA] px-3 py-2.5 min-w-0">
                        <p className="text-gray-400 font-semibold flex items-center gap-1 mb-0.5">
                          <Calendar className="w-3 h-3" /> {t('dashboard.date')}
                        </p>
                        <p className="font-bold text-gray-800 break-words">
                          {booking.date || formatBookingDate(booking.createdAt, lang)}
                        </p>
                      </div>
                      <div className="rounded-xl bg-[#F7F8FA] px-3 py-2.5 min-w-0">
                        <p className="text-gray-400 font-semibold flex items-center gap-1 mb-0.5">
                          <Tag className="w-3 h-3" /> {t('dashboard.price')}
                        </p>
                        <p className="font-black text-brand tabular-nums">
                          {booking.totalPrice || booking.price} {t('booking.sar')}
                        </p>
                      </div>
                      <div className="rounded-xl bg-[#F7F8FA] px-3 py-2.5 col-span-2 min-w-0">
                        <p className="text-gray-400 font-semibold flex items-center gap-1 mb-0.5">
                          <CreditCard className="w-3 h-3" /> {t('dashboard.payment')}
                        </p>
                        <p className="font-semibold text-gray-800">
                          {getPaymentStatusLabel(booking.paymentStatus || 'pending', lang)}
                          {booking.paymentMethod ? ` · ${String(booking.paymentMethod).replace(/_/g, ' ')}` : ''}
                        </p>
                      </div>
                    </div>

                    {booking.passengers && (
                      <p className="flex items-center gap-1.5 text-[11px] text-gray-500 mt-2.5 px-0.5">
                        <Users className="w-3.5 h-3.5" />
                        {booking.passengers} {t('booking.passengers')}
                        {booking.cars ? ` · ${booking.cars} ${t('booking.cars')}` : ''}
                      </p>
                    )}
                  </article>
                </li>
              );
            })}
          </ul>
        )}

        <div className="pt-1">
          <button
            type="button"
            onClick={() => setShowActivity((v) => !v)}
            className="w-full text-center text-xs font-bold text-gray-500 hover:text-brand py-2"
          >
            {showActivity
              ? (lang === 'ar' ? 'إخفاء نشاط الحساب' : 'Hide account activity')
              : (lang === 'ar' ? 'عرض نشاط الحساب' : 'Show account activity')}
          </button>
          {showActivity && <AccountActivity />}
        </div>
      </div>
    </div>
  );
}
