import { useEffect, useState, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Calendar, MapPin, Tag, LogOut, Car, Plus, Navigation,
  Clock, Users, ChevronRight, Sparkles, BarChart3, CreditCard, Phone,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getUserBookings, getUserProfile, updateUserPhone } from '../firebase/bookings';
import { CITIES } from '../data/staticData';
import BrandLogo from '../components/ui/BrandLogo';
import AppNavLink from '../components/ui/AppNavLink';
import { getStatusLabel, getCityName, formatBookingDate } from '../utils/bookingHelpers';
import { buildOrderNumberMap, getOrderDisplayId } from '../utils/orderHelpers';
import { getPaymentStatusLabel } from '../utils/paymentHelpers';
import GlassCard from '../components/ui/GlassCard';
import MiniBarChart from '../components/ui/MiniBarChart';
import StatusDonut from '../components/ui/StatusDonut';
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
  const [notifCount, setNotifCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState('');
  const [phoneInput, setPhoneInput] = useState('');
  const [phoneSaving, setPhoneSaving] = useState(false);
  const [phoneError, setPhoneError] = useState('');
  const [phoneSaved, setPhoneSaved] = useState(false);

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
    // Explicit user actions reload this page; no polling while it remains open.
    return undefined;
  }, [loadData]);

  const orderNumberMap = useMemo(() => buildOrderNumberMap(bookings), [bookings]);
  const displayName = profile?.displayName || user?.displayName || user?.email;
  const displayEmail = profile?.email || user?.email;
  const displayPhone = profile?.phone || '';
  const authProvider = profile?.authProvider
    || (user?.providerData?.some((p) => p.providerId === 'google.com') ? 'google' : 'password');

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

  const stats = {
    total: bookings.length,
    pending: bookings.filter((b) => b.status === 'pending').length,
    confirmed: bookings.filter((b) => b.status === 'confirmed').length,
    completed: bookings.filter((b) => b.status === 'completed').length,
    cancelled: bookings.filter((b) => b.status === 'cancelled').length,
  };

  const chartData = [
    { label: t('admin.status.pending'), value: stats.pending, gradient: 'from-amber-400 to-orange-500' },
    { label: t('admin.status.confirmed'), value: stats.confirmed, gradient: 'from-emerald-400 to-green-500' },
    { label: t('admin.status.completed'), value: stats.completed, gradient: 'from-blue-400 to-cyan-500' },
    { label: t('admin.status.cancelled'), value: stats.cancelled, gradient: 'from-red-400 to-rose-500' },
  ];

  const donutSegments = [
    { label: 'pending', value: stats.pending, color: '#f59e0b' },
    { label: 'confirmed', value: stats.confirmed, color: '#10b981' },
    { label: 'completed', value: stats.completed, color: '#3b82f6' },
    { label: 'cancelled', value: stats.cancelled, color: '#ef4444' },
  ].filter((s) => s.value > 0 || stats.total === 0);

  const initials = (displayName || '?')
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="dashboard-page min-h-screen mesh-bg">
      <div className="dashboard-hero relative overflow-hidden bg-gradient-to-br from-primary-600 via-primary-700 to-emerald-900 text-white">
        <div className="absolute inset-0 pointer-events-none" aria-hidden>
          <div className="absolute top-0 end-0 w-96 h-96 bg-white/10 rounded-full blur-3xl animate-float-glow" />
          <div className="absolute bottom-0 start-0 w-72 h-72 bg-gold-400/20 rounded-full blur-3xl" />
        </div>
        <div className="container mx-auto px-4 py-6 sm:py-8 md:py-10 relative">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 sm:gap-6">
            <div className="dashboard-user-glass flex items-start sm:items-center gap-3 sm:gap-4 flex-1 min-w-0">
              <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-white/15 backdrop-blur-md flex items-center justify-center text-lg sm:text-xl font-black border border-white/30 shadow-2xl glass-stat-icon overflow-hidden shrink-0">
                {(profile?.photoURL || user?.photoURL) ? (
                  <img src={profile?.photoURL || user?.photoURL} alt="" className="w-full h-full object-cover" />
                ) : (
                  initials
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <BrandLogo variant="full" tone="light" alt="" className="h-5 sm:h-6 w-auto max-w-[140px] sm:max-w-none" />
                  <p className="text-white/90 text-xs sm:text-sm flex items-center gap-1 font-medium">
                    <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0 text-gold-300" />
                    {t('dashboard.welcome')}
                  </p>
                </div>
                <h1 className="text-xl sm:text-2xl md:text-3xl font-black text-white truncate drop-shadow-sm">{displayName}</h1>
                <p className="text-white/85 text-xs sm:text-sm mt-1 break-all">{displayEmail}</p>
                {displayPhone && (
                  <p className="text-white/80 text-xs mt-1 flex items-center gap-1">
                    <Phone className="w-3.5 h-3.5 shrink-0" />
                    {displayPhone}
                  </p>
                )}
                <p className="text-white/75 text-xs mt-0.5">
                  {t('dashboard.signedInWith')}: {authProvider === 'google' ? 'Google' : 'Email'}
                </p>
                <p className="text-white/75 text-xs mt-0.5">{t('dashboard.subtitle')}</p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2 sm:gap-3 w-full lg:w-auto">
              <UserNotificationBell onUpdate={setNotifCount} />
              {notifCount > 0 && (
                <span className="text-xs bg-white/20 backdrop-blur px-3 py-1 rounded-full border border-white/20">
                  {notifCount} {t('userNotifications.title')}
                </span>
              )}
              <AppNavLink
                to="/#pricing-calculator"
                className="inline-flex flex-1 sm:flex-none items-center justify-center gap-2 bg-white text-primary-700 hover:bg-primary-50 font-bold py-2.5 sm:py-3 px-4 sm:px-5 rounded-xl shadow-xl hover:scale-[1.02] transition-all text-sm sm:text-base"
              >
                <Plus className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" />
                <span className="truncate">{t('nav.bookNow')}</span>
              </AppNavLink>
              <button type="button" onClick={logout}
                className="inline-flex flex-1 sm:flex-none items-center justify-center gap-2 bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/25 font-semibold py-2.5 sm:py-3 px-4 sm:px-5 rounded-xl transition-all text-sm sm:text-base">
                <LogOut className="w-4 h-4 shrink-0" />
                {t('auth.logout')}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 min-[480px]:grid-cols-3 gap-2.5 sm:gap-3 mt-6 sm:mt-8">
            {[
              { label: t('dashboard.stats.total'), value: stats.total, icon: Car },
              { label: t('dashboard.stats.pending'), value: stats.pending, icon: Clock },
              { label: t('dashboard.stats.completed'), value: stats.completed, icon: Sparkles },
            ].map(({ label, value, icon: Icon }) => (
              <div key={label} className="bg-white/15 backdrop-blur-xl rounded-2xl p-3.5 sm:p-4 border border-white/30 shadow-lg hover:bg-white/20 transition-colors min-w-0">
                <Icon className="w-4 h-4 sm:w-5 sm:h-5 text-gold-300 mb-1.5 sm:mb-2" />
                <p className="text-xl sm:text-2xl font-black tabular-nums text-white">{value}</p>
                <p className="text-[11px] sm:text-xs text-white/85 mt-1 leading-snug font-medium">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6 sm:py-8 md:py-10 space-y-6 sm:space-y-8">
        {!displayPhone && (
          <GlassCard className="border border-primary-200/60 dark:border-primary-700/40">
            <div className="flex items-start gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-primary-100 dark:bg-primary-900/40 flex items-center justify-center shrink-0">
                <Phone className="w-5 h-5 text-primary-600" />
              </div>
              <div className="min-w-0">
                <h2 className="font-black text-dark-800 dark:text-white text-base sm:text-lg">
                  {t('dashboard.addPhoneTitle')}
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-300 mt-0.5">
                  {authProvider === 'google' ? t('dashboard.addPhoneGoogleHint') : t('dashboard.addPhoneHint')}
                </p>
              </div>
            </div>
            {phoneSaved ? (
              <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                {t('dashboard.phoneSaved')}
              </p>
            ) : (
              <form onSubmit={savePhone} className="flex flex-col sm:flex-row gap-2 sm:items-stretch">
                <input
                  type="tel"
                  dir="ltr"
                  value={phoneInput}
                  onChange={(e) => setPhoneInput(e.target.value)}
                  placeholder="+9665XXXXXXXX"
                  className="flex-1 min-w-0 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-dark-800 px-3 py-2.5 text-sm text-dark-800 dark:text-white"
                  autoComplete="tel"
                />
                <button
                  type="submit"
                  disabled={phoneSaving}
                  className="shrink-0 rounded-xl bg-primary-600 hover:bg-primary-700 text-white font-bold px-4 py-2.5 text-sm disabled:opacity-60"
                >
                  {phoneSaving ? t('common.loading') : t('dashboard.savePhone')}
                </button>
              </form>
            )}
            {phoneError && (
              <p className="text-sm text-red-600 mt-2">{phoneError}</p>
            )}
          </GlassCard>
        )}

        <AccountActivity />

        {bookings.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <GlassCard className="lg:col-span-2">
              <div className="flex items-center gap-2 mb-5">
                <BarChart3 className="w-5 h-5 text-primary-500" />
                <h2 className="font-black text-dark-800 dark:text-white">{t('dashboard.charts.activity')}</h2>
              </div>
              <MiniBarChart data={chartData} height={150} />
            </GlassCard>
            <GlassCard>
              <h2 className="font-black text-dark-800 dark:text-white mb-4">{t('dashboard.charts.status')}</h2>
              <div className="flex justify-center">
                <StatusDonut segments={donutSegments.length ? donutSegments : [{ label: 'empty', value: 1, color: '#d1d5db' }]} size={120} />
              </div>
            </GlassCard>
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg sm:text-xl md:text-2xl font-black text-dark-800 dark:text-white">{t('dashboard.myBookings')}</h2>
          <Link to="/track" className="text-sm text-primary-600 font-bold flex items-center gap-1 hover:gap-2 transition-all glass-card-3d !px-4 !py-2 shrink-0">
            {t('nav.track')}
            <ChevronRight className="w-4 h-4 rtl:rotate-180" />
          </Link>
        </div>

        {fetchError && (
          <AlertBanner type="warning" title={t('dashboard.loadError')} message={fetchError} />
        )}

        {loading ? (
          <LoadingSpinner text={t('common.loading')} />
        ) : bookings.length === 0 ? (
          <GlassCard className="text-center py-16">
            <div className="w-20 h-20 bg-gradient-to-br from-primary-100 to-emerald-100 dark:from-primary-900/40 dark:to-emerald-900/30 rounded-3xl flex items-center justify-center mx-auto mb-5 glass-stat-icon">
              <Car className="w-10 h-10 text-primary-500" />
            </div>
            <h3 className="text-lg font-bold text-dark-800 dark:text-white mb-2">{t('dashboard.noBookings')}</h3>
            <p className="text-gray-500 text-sm mb-6 max-w-xs mx-auto">{t('dashboard.noBookingsDesc')}</p>
            <AppNavLink
              to="/#pricing-calculator"
              className="inline-flex items-center gap-2 bg-gradient-to-r from-primary-500 to-emerald-600 text-white font-bold py-3 px-8 rounded-xl shadow-lg hover:scale-105 transition-all"
            >
              <Plus className="w-5 h-5" />
              {t('nav.bookNow')}
            </AppNavLink>
          </GlassCard>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {bookings.map((booking, i) => (
              <GlassCard key={booking.id} className="animate-fade-in-up min-w-0" style={{ animationDelay: `${i * 80}ms` }}>
                <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
                  <div className="min-w-0">
                    <p className="text-xs text-primary-600 font-black mb-1.5 break-all">#{getOrderDisplayId(booking, orderNumberMap)}</p>
                    <StatusBadge status={booking.status} label={getStatusLabel(booking.status, lang)} />
                  </div>
                  <Link to={`/track?ref=${booking.id}`}
                    className="flex items-center gap-1.5 text-sm font-bold text-primary-600 bg-primary-50 dark:bg-primary-900/30 hover:bg-primary-100 px-3 py-2 rounded-xl transition-all hover:scale-105 shrink-0">
                    <Navigation className="w-4 h-4" />
                    {t('nav.track')}
                  </Link>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center gap-3 p-3 bg-white/50 dark:bg-dark-700/30 rounded-xl border border-white/40 dark:border-white/5 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-emerald-500 flex items-center justify-center glass-stat-icon shrink-0">
                      <MapPin className="w-5 h-5 text-white" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs text-gray-500">{t('dashboard.route')}</p>
                      <p className="font-bold text-dark-800 dark:text-white text-sm break-words">
                        {getCityName(CITIES, booking.from, lang)} → {getCityName(CITIES, booking.to, lang)}
                      </p>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 min-[400px]:grid-cols-2 gap-3">
                    <div className="flex items-center gap-2 p-3 bg-white/50 dark:bg-dark-700/30 rounded-xl border border-white/40 dark:border-white/5 min-w-0">
                      <Calendar className="w-4 h-4 text-primary-500 shrink-0" />
                      <div className="min-w-0">
                        <p className="text-xs text-gray-500">{t('dashboard.date')}</p>
                        <p className="text-sm font-semibold break-words">{booking.date || formatBookingDate(booking.createdAt, lang)}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 p-3 bg-white/50 dark:bg-dark-700/30 rounded-xl border border-white/40 dark:border-white/5 min-w-0">
                      <Tag className="w-4 h-4 text-primary-500 shrink-0" />
                      <div className="min-w-0">
                        <p className="text-xs text-gray-500">{t('dashboard.price')}</p>
                        <p className="text-sm font-bold text-primary-600">{booking.totalPrice || booking.price} {t('booking.sar')}</p>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 p-3 bg-white/50 dark:bg-dark-700/30 rounded-xl border border-white/40 dark:border-white/5">
                    <CreditCard className="w-4 h-4 text-primary-500" />
                    <div>
                      <p className="text-xs text-gray-500">{t('dashboard.payment')}</p>
                      <p className="text-sm font-semibold text-dark-800 dark:text-white">
                        {getPaymentStatusLabel(booking.paymentStatus || 'pending', lang)}
                        {booking.paymentMethod ? ` · ${String(booking.paymentMethod).replace(/_/g, ' ')}` : ''}
                      </p>
                    </div>
                  </div>
                  {booking.passengers && (
                    <div className="flex items-center gap-2 text-xs text-gray-500 px-1">
                      <Users className="w-3.5 h-3.5" />
                      {booking.passengers} {t('booking.passengers')} · {booking.cars} {t('booking.cars')}
                    </div>
                  )}
                </div>
              </GlassCard>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
