import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Monitor, Smartphone, Tablet, MapPin, Clock, Shield, Globe,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { getUserLoginActivity } from '../../firebase/bookings';
import { formatBookingDateTime } from '../../utils/bookingHelpers';
import GlassCard from './GlassCard';
import LoadingSpinner from './LoadingSpinner';

function deviceIcon(item) {
  if (item?.isMobile || item?.deviceType === 'mobile') return Smartphone;
  const type = String(item?.deviceType || '').toLowerCase();
  if (type.includes('tablet') || type.includes('ipad')) return Tablet;
  return Monitor;
}

function deviceLabel(item, t) {
  if (item?.isMobile || item?.deviceType === 'mobile') {
    return t('dashboard.accountActivity.mobile');
  }
  if (item?.deviceType === 'tablet') return t('dashboard.accountActivity.tablet');
  const type = String(item?.deviceType || '').trim();
  if (type && type !== 'desktop') return type;
  return t('dashboard.accountActivity.desktop');
}

function locationLabel(item, t) {
  const city = item?.city?.trim();
  const country = item?.country?.trim();
  if (city && country) return `${city}, ${country}`;
  if (city || country) return city || country;
  if (item?.timezone) return item.timezone;
  if (item?.ipAddress) return item.ipAddress;
  return t('dashboard.accountActivity.unknownLocation');
}

export default function AccountActivity() {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!user?.uid) {
        setItems([]);
        setLoading(false);
        return;
      }
      setLoading(true);
      setError('');
      try {
        const list = await getUserLoginActivity(user.uid, 20);
        if (!cancelled) setItems(list);
      } catch (err) {
        console.error('Account activity load failed:', err);
        if (!cancelled) {
          setItems([]);
          setError(t('dashboard.accountActivity.loadError'));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [user?.uid, t]);

  if (!user?.uid) return null;

  return (
    <GlassCard>
      <div className="flex items-start gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl bg-primary-100 dark:bg-primary-900/40 flex items-center justify-center shrink-0">
          <Shield className="w-5 h-5 text-primary-600" />
        </div>
        <div className="min-w-0">
          <h2 className="font-black text-dark-800 dark:text-white text-base sm:text-lg">
            {t('dashboard.accountActivity.title')}
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-300 mt-0.5">
            {t('dashboard.accountActivity.subtitle')}
          </p>
        </div>
      </div>

      {loading ? (
        <LoadingSpinner text={t('common.loading')} />
      ) : error ? (
        <p className="text-sm text-amber-700 dark:text-amber-300">{error}</p>
      ) : items.length === 0 ? (
        <p className="text-sm text-gray-500">{t('dashboard.accountActivity.empty')}</p>
      ) : (
        <ul className="space-y-3">
          {items.map((item, index) => {
            const Icon = deviceIcon(item);
            const browser = item.browser || '—';

            return (
              <li
                key={item.id}
                className="rounded-xl border border-white/40 dark:border-white/10 bg-white/50 dark:bg-dark-700/30 p-3.5 sm:p-4"
              >
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-emerald-500 flex items-center justify-center shrink-0">
                    <Icon className="w-5 h-5 text-white" />
                  </div>
                  <div className="min-w-0 flex-1 space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-bold text-dark-800 dark:text-white text-sm">
                        {deviceLabel(item, t)} · {browser}
                      </p>
                      {index === 0 && (
                        <span className="text-[11px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
                          {t('dashboard.accountActivity.latest')}
                        </span>
                      )}
                    </div>

                    <p className="text-sm text-gray-600 dark:text-gray-300 flex items-center gap-1.5 min-w-0">
                      <MapPin className="w-3.5 h-3.5 shrink-0 text-primary-500" />
                      <span className="truncate">{locationLabel(item, t)}</span>
                    </p>

                    <p className="text-sm text-gray-600 dark:text-gray-300 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 shrink-0 text-primary-500" />
                      <span>
                        {t('dashboard.accountActivity.loginTime')}:{' '}
                        {formatBookingDateTime(item.createdAt, i18n.language)}
                      </span>
                    </p>

                    {item.ipAddress && item.ipAddress !== 'unknown' && (
                      <p className="text-xs text-gray-500 flex items-center gap-1.5" dir="ltr">
                        <Globe className="w-3.5 h-3.5 shrink-0" />
                        IP {item.ipAddress}
                      </p>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </GlassCard>
  );
}
