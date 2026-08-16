import { useTranslation } from 'react-i18next';
import { Car } from 'lucide-react';
import { VEHICLE_IMAGES, getCarDisplayName, getCarImage } from '../../data/staticData';

/**
 * Always-visible 5-car toggle strip for SuperAdmin fleet pages.
 * Sits above the collapsible filter box so car data is one tap away.
 */
export default function AdminCarFilterStrip({
  cars = [],
  value,
  onChange,
  countFor,
  className = '',
}) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language?.startsWith('ar') ? 'ar' : 'en';

  if (!cars.length) return null;

  const total = countFor?.('all') ?? 0;

  return (
    <div className={`admin-car-filter-strip glass-card-3d w-full overflow-hidden ${className}`}>
      <div className="p-3 sm:p-4">
        <div className="flex items-center gap-2 mb-2.5">
          <span className="admin-filter-icon-badge" aria-hidden>
            <Car className="w-4 h-4" />
          </span>
          <span className="text-[10px] sm:text-xs font-black uppercase tracking-wider text-brand/70 dark:text-gold/70">
            {t('admin.fleet.cars', { defaultValue: t('admin.fleet.allCars', { defaultValue: 'Cars' }) })}
          </span>
          <span className="text-[10px] font-bold text-gray-400 ms-auto">{total} {t('admin.fleet.items', { defaultValue: 'items' })}</span>
        </div>
        <div className="admin-filter-toggle-track scrollbar-hide">
          <button
            type="button"
            onClick={() => onChange('all')}
            aria-pressed={value === 'all'}
            className={`admin-filter-toggle-btn touch-manipulation active:scale-[0.97] ${
              value === 'all' ? 'admin-filter-toggle-btn--green' : 'admin-filter-toggle-btn--idle'
            }`}
          >
            <span className="whitespace-nowrap">{t('admin.filterAll')}</span>
            <span className={`admin-filter-toggle-count ${value === 'all' ? 'admin-filter-toggle-count--active' : ''}`}>
              {total}
            </span>
          </button>
          {cars.map((c) => {
            const active = value === c.id;
            const count = countFor?.(c.id) ?? 0;
            const img = getCarImage(c.id) || VEHICLE_IMAGES[c.id] || VEHICLE_IMAGES.camry;
            const label = c.name?.(lang) || getCarDisplayName(c.id, lang);
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => onChange(c.id)}
                aria-pressed={active}
                className={`admin-filter-toggle-btn touch-manipulation active:scale-[0.97] ${
                  active ? 'admin-filter-toggle-btn--gold' : 'admin-filter-toggle-btn--idle-gold'
                }`}
              >
                <img src={img} alt="" className="w-6 h-6 rounded-md object-cover shrink-0" />
                <span className="whitespace-nowrap max-w-[88px] sm:max-w-none truncate">{label}</span>
                <span className={`admin-filter-toggle-count ${active ? 'admin-filter-toggle-count--active' : ''}`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
