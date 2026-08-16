import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Search, MapPin, Calendar, Tag, Clock, Car, Users, CreditCard, Lock } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getBookingForTracking } from '../firebase/bookings';
import { CITIES } from '../data/staticData';
import { getStatusLabel, getCityName } from '../utils/bookingHelpers';
import { getPaymentStatusLabel } from '../utils/paymentHelpers';
import StatusBadge from '../components/ui/StatusBadge';
import BookingTracker from '../components/ui/BookingTracker';
import AlertBanner from '../components/ui/AlertBanner';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import { formatOrderNumber } from '../utils/orderHelpers';

export default function TrackBooking() {
  const { t, i18n } = useTranslation();
  const { user, loading: authLoading } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const lang = i18n.language;

  const [ref, setRef] = useState(searchParams.get('ref') || '');
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [accessDenied, setAccessDenied] = useState(false);

  const lookupBooking = async (reference) => {
    if (!reference.trim()) return;
    if (!user) {
      setAccessDenied(true);
      setBooking(null);
      return;
    }
    setLoading(true);
    setNotFound(false);
    setAccessDenied(false);
    setBooking(null);
    try {
      const data = await getBookingForTracking(reference.trim());
      if (!data) {
        setNotFound(true);
        return;
      }
      if (data.userId !== user.uid) {
        setAccessDenied(true);
        return;
      }
      setBooking(data);
    } catch (err) {
      console.error('Track booking error:', err);
      if (err?.code === 'permission-denied') {
        setAccessDenied(true);
      } else {
        setNotFound(true);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (authLoading) return;
    const initialRef = searchParams.get('ref');
    if (initialRef && user) lookupBooking(initialRef);
  }, [authLoading, user]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSearch = async (e) => {
    e.preventDefault();
    setSearchParams({ ref: ref.trim() });
    await lookupBooking(ref);
  };

  const vehicleName = booking?.vehicleName?.[lang] || booking?.vehicleName?.en || '';

  if (authLoading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <LoadingSpinner text={t('common.loading')} />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-50 via-white to-primary-50/20 dark:from-dark-900 dark:via-dark-900 dark:to-dark-800">
        <div className="container mx-auto px-4 max-w-2xl py-16">
          <AlertBanner
            type="warning"
            title={t('dashboard.trackLoginRequired')}
            message={t('dashboard.trackAccessDenied')}
          />
          <div className="mt-6 text-center">
            <Link to="/login" state={{ from: { pathname: '/track', search: searchParams.toString() ? `?${searchParams.toString()}` : '' } }}
              className="inline-flex items-center gap-2 bg-primary-500 hover:bg-primary-600 text-white font-bold px-6 py-3 rounded-xl">
              <Lock className="w-4 h-4" />
              {t('auth.login')}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 via-white to-primary-50/20 dark:from-dark-900 dark:via-dark-900 dark:to-dark-800">
      <div className="bg-gradient-to-br from-primary-600 to-primary-800 text-white py-10 md:py-14">
        <div className="container mx-auto px-4 max-w-2xl text-center">
          <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-4 backdrop-blur-sm">
            <Search className="w-8 h-8" />
          </div>
          <h1 className="text-2xl md:text-4xl font-black">{t('ui.trackTitle')}</h1>
          <p className="text-primary-200 mt-2 text-sm md:text-base">{t('ui.trackSubtitle')}</p>
        </div>
      </div>

      <div className="container mx-auto px-4 max-w-2xl -mt-6 pb-12">
        <form onSubmit={handleSearch} className="bg-white dark:bg-dark-800 rounded-2xl shadow-xl border border-gray-100 dark:border-dark-700 p-2 flex gap-2 mb-8">
          <input
            type="text"
            value={ref}
            onChange={(e) => setRef(e.target.value)}
            placeholder={t('ui.bookingRefPlaceholder')}
            className="flex-1 px-4 py-3.5 bg-transparent text-dark-800 dark:text-white font-mono text-sm outline-none"
          />
          <button
            type="submit"
            disabled={loading}
            className="bg-primary-500 hover:bg-primary-600 disabled:opacity-60 text-white font-bold px-6 py-3.5 rounded-xl flex items-center gap-2 transition-all shadow-lg shadow-primary-500/25"
          >
            <Search className="w-5 h-5" />
            <span className="hidden sm:inline">{loading ? t('common.loading') : t('booking.search')}</span>
          </button>
        </form>

        {loading && <LoadingSpinner text={t('ui.searching')} />}

        {notFound && (
          <AlertBanner type="error" title={t('ui.notFound')} message={t('ui.notFoundDesc')} />
        )}

        {accessDenied && (
          <AlertBanner type="warning" title={t('dashboard.trackAccessDenied')} message={t('dashboard.trackLoginRequired')} />
        )}

        {booking && !loading && (
          <div className="space-y-6 animate-fade-in-up">
            <div className="bg-white dark:bg-dark-800 rounded-3xl border border-gray-100 dark:border-dark-700 p-6 shadow-sm">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <p className="text-xs admin-text-primary font-black">#{formatOrderNumber(booking.orderNumber)}</p>
                  <h2 className="text-lg font-black text-dark-800 dark:text-white mt-1">{t('ui.orderStatus')}</h2>
                </div>
                <StatusBadge status={booking.status} label={getStatusLabel(booking.status, lang)} size="lg" />
              </div>
              <BookingTracker status={booking.status} />
            </div>

            <div className="bg-white dark:bg-dark-800 rounded-3xl border border-gray-100 dark:border-dark-700 overflow-hidden shadow-sm">
              <div className="bg-gradient-to-r from-primary-500 to-primary-600 px-6 py-4 text-white">
                <h3 className="font-bold flex items-center gap-2">
                  <Car className="w-5 h-5" />
                  {t('ui.tripDetails')}
                </h3>
              </div>
              <div className="p-6 space-y-4">
                {vehicleName && (
                  <div className="flex items-center gap-3 p-3 bg-primary-50 dark:bg-primary-900/20 rounded-xl">
                    <Car className="w-5 h-5 text-primary-600" />
                    <span className="font-bold text-dark-800 dark:text-white">{vehicleName}</span>
                  </div>
                )}
                {booking.from && booking.to && (
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-dark-700 flex items-center justify-center">
                      <MapPin className="w-5 h-5 text-primary-500" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">{t('dashboard.route')}</p>
                      <p className="font-bold text-dark-800 dark:text-white">
                        {getCityName(CITIES, booking.from, lang)} → {getCityName(CITIES, booking.to, lang)}
                      </p>
                    </div>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-dark-700/50 rounded-xl">
                    <Calendar className="w-5 h-5 text-primary-500" />
                    <div>
                      <p className="text-xs text-gray-500">{t('dashboard.date')}</p>
                      <p className="font-semibold text-sm text-dark-700 dark:text-gray-300">{booking.date}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-dark-700/50 rounded-xl">
                    <Clock className="w-5 h-5 text-primary-500" />
                    <div>
                      <p className="text-xs text-gray-500">{t('booking.pickupTime')}</p>
                      <p className="font-semibold text-sm text-dark-700 dark:text-gray-300">{booking.time}</p>
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-dark-700/50 rounded-xl">
                    <Users className="w-5 h-5 text-primary-500" />
                    <div>
                      <p className="text-xs text-gray-500">{t('booking.passengers')}</p>
                      <p className="font-semibold text-sm">{booking.passengers}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-dark-700/50 rounded-xl">
                    <Tag className="w-5 h-5 text-primary-500" />
                    <div>
                      <p className="text-xs text-gray-500">{t('dashboard.price')}</p>
                      <p className="font-bold text-primary-600">{booking.totalPrice || booking.price} {t('booking.sar')}</p>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-dark-700/50 rounded-xl">
                  <CreditCard className="w-5 h-5 text-primary-500" />
                  <div>
                    <p className="text-xs text-gray-500">{t('dashboard.payment')}</p>
                    <p className="text-sm font-semibold">
                      {getPaymentStatusLabel(booking.paymentStatus || 'pending', lang)}
                      {booking.paymentMethod ? ` · ${String(booking.paymentMethod).replace(/_/g, ' ')}` : ''}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
