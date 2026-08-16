import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { CheckCircle, Copy, MapPin, Calendar, X, Navigation, Home } from 'lucide-react';
import { useArabicAlertSound } from '../../hooks/useArabicAlertSound';

export default function SuccessModal({ open, bookingId, booking, isGuest = false, onClose }) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;

  useArabicAlertSound(open, 'success');

  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  if (!open || !bookingId) return null;

  const copyRef = () => {
    navigator.clipboard?.writeText(bookingId);
  };

  return (
    <div className="fixed inset-0 z-[9998] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-dark-900/60 backdrop-blur-sm animate-fade-in" onClick={onClose} />
      <div className="relative w-full max-w-md bg-white dark:bg-dark-800 rounded-3xl shadow-2xl overflow-hidden animate-modal-in">
        <div className="bg-gradient-to-br from-primary-500 via-primary-600 to-primary-800 px-6 py-8 text-center text-white relative overflow-hidden">
          <div className="absolute inset-0 opacity-20">
            <div className="absolute -top-10 -end-10 w-40 h-40 bg-white rounded-full blur-2xl" />
            <div className="absolute -bottom-10 -start-10 w-32 h-32 bg-gold-400 rounded-full blur-2xl" />
          </div>
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 end-4 p-2 rounded-full bg-white/20 hover:bg-white/30 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="relative">
            <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4 animate-success-pop">
              <CheckCircle className="w-12 h-12 text-white" strokeWidth={2.5} />
            </div>
            <h2 className="text-2xl font-black">{t('ui.bookingSuccess')}</h2>
            <p className="text-primary-100 mt-2 text-sm">{t('ui.bookingSuccessDesc')}</p>
          </div>
        </div>

        <div className="p-6 space-y-4">
          <div className="flex items-center justify-between bg-gray-50 dark:bg-dark-700 rounded-xl px-4 py-3">
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">{t('ui.bookingRef')}</p>
              <p className="font-mono font-bold text-dark-800 dark:text-white">#{String(bookingId).slice(0, 10)}</p>
            </div>
            <button
              type="button"
              onClick={copyRef}
              className="p-2.5 rounded-xl bg-primary-100 dark:bg-primary-900/40 text-primary-600 hover:bg-primary-200 transition-colors"
              title={t('ui.copy')}
            >
              <Copy className="w-4 h-4" />
            </button>
          </div>

          {booking && (
            <div className="space-y-2 text-sm">
              {booking.from && booking.to && (
                <div className="flex items-center gap-2 text-dark-700 dark:text-gray-300">
                  <MapPin className="w-4 h-4 text-primary-500" />
                  <span>{booking.routeLabel}</span>
                </div>
              )}
              {(booking.date || booking.time) && (
                <div className="flex items-center gap-2 text-dark-700 dark:text-gray-300">
                  <Calendar className="w-4 h-4 text-primary-500" />
                  <span>{booking.date}{booking.date && booking.time ? ' — ' : ''}{booking.time}</span>
                </div>
              )}
            </div>
          )}

          {isGuest && (
            <p className="text-xs text-gray-500 text-center leading-relaxed">
              {lang === 'ar'
                ? 'تم الطلب بدون حساب. احفظ رقم الحجز للتتبع.'
                : 'Order placed without an account. Save your booking reference to track it.'}
            </p>
          )}

          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <Link
              to={`/track?ref=${bookingId}`}
              className="flex-1 flex items-center justify-center gap-2 bg-primary-500 hover:bg-primary-600 text-white font-bold py-3.5 rounded-xl transition-all shadow-lg shadow-primary-500/25"
            >
              <Navigation className="w-5 h-5" />
              {t('nav.track')}
            </Link>
            {isGuest ? (
              <Link
                to="/"
                onClick={onClose}
                className="flex-1 flex items-center justify-center gap-2 border-2 border-primary-500 text-primary-600 dark:text-primary-400 font-bold py-3.5 rounded-xl hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-colors"
              >
                <Home className="w-5 h-5" />
                {t('nav.home')}
              </Link>
            ) : (
              <Link
                to="/dashboard"
                className="flex-1 flex items-center justify-center gap-2 border-2 border-primary-500 text-primary-600 dark:text-primary-400 font-bold py-3.5 rounded-xl hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-colors"
              >
                {t('dashboard.title')}
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
