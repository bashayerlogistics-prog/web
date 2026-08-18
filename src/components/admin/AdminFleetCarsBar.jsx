import { useState } from 'react';
import { Car, Eye, EyeOff, Plus, Loader2 } from 'lucide-react';
import AddCarModal from './AddCarModal';
import { AdminAlertModal } from './AdminBookingFormEditor';
import { carCatalogLabel, liveFleetCarCount, MIN_FLEET_CARS, MAX_FLEET_CARS } from '../../utils/carCatalogHelpers';

export default function AdminFleetCarsBar({
  cars = [],
  lang = 'en',
  t,
  togglingId = '',
  adding = false,
  onToggle,
  onAdd,
}) {
  const [addOpen, setAddOpen] = useState(false);
  const [hideTarget, setHideTarget] = useState(null);
  const liveCount = liveFleetCarCount(cars);
  const atMin = liveCount <= MIN_FLEET_CARS;
  const atMax = liveCount >= MAX_FLEET_CARS;

  const requestToggle = (car) => {
    if (car.active === false) {
      if (atMax) return;
      onToggle?.(car, true);
      return;
    }
    if (atMin) return;
    setHideTarget(car);
  };

  return (
    <div className="rounded-2xl border border-brand/15 bg-white dark:bg-white/5 overflow-hidden">
      <div className="px-4 py-3 flex flex-wrap items-center gap-2 border-b border-gray-100 dark:border-white/10">
        <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-brand text-white">
          <Car className="w-4 h-4" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-black text-brand dark:text-white">
            {t('admin.bookingForms.carsBarTitle')}
          </p>
          <p className="text-[11px] text-gray-500">{t('admin.bookingForms.carsBarHint')}</p>
        </div>
        <span className="text-[11px] font-black text-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-1 rounded-lg">
          {t('admin.bookingForms.carsBarLive', { count: liveCount, max: MAX_FLEET_CARS })}
        </span>
        <span className="text-[10px] font-bold text-gray-400">
          {t('admin.bookingForms.carsBarRange', { min: MIN_FLEET_CARS, max: MAX_FLEET_CARS })}
        </span>
        <button
          type="button"
          disabled={atMax}
          onClick={() => setAddOpen(true)}
          title={atMax ? t('admin.bookingForms.carsBarMaxReached', { max: MAX_FLEET_CARS }) : undefined}
          className="inline-flex items-center gap-1 px-3 py-2 rounded-xl text-[11px] font-bold bg-brand text-white hover:bg-brand-light disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Plus className="w-3.5 h-3.5" />
          {t('admin.bookingForms.carsBarAdd')}
        </button>
      </div>
      <div className="px-4 py-3 flex flex-wrap gap-2">
        {cars.map((car) => {
          const on = car.active !== false;
          const busy = togglingId === car.id;
          const label = carCatalogLabel(car, lang);
          return (
            <button
              key={car.id}
              type="button"
              disabled={busy || (on && atMin) || (!on && atMax)}
              onClick={() => requestToggle(car)}
              title={
                on
                  ? (atMin
                    ? t('admin.bookingForms.carsBarMinReached', { min: MIN_FLEET_CARS })
                    : t('admin.bookingForms.hide'))
                  : (atMax
                    ? t('admin.bookingForms.carsBarMaxReached', { max: MAX_FLEET_CARS })
                    : t('admin.bookingForms.show'))
              }
              className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-[11px] font-bold border disabled:opacity-50 ${
                on
                  ? 'bg-brand text-white border-brand'
                  : 'bg-gray-50 text-gray-500 border-gray-200 dark:bg-white/5 dark:text-white/50 dark:border-white/15'
              }`}
            >
              {busy ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : on ? (
                <Eye className="w-3 h-3" />
              ) : (
                <EyeOff className="w-3 h-3" />
              )}
              {label}
              {!on ? (
                <span className="text-[9px] uppercase opacity-80">{t('admin.bookingForms.carsBarHidden')}</span>
              ) : null}
            </button>
          );
        })}
      </div>

      <AddCarModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onSave={async (payload) => {
          const ok = await onAdd?.(payload);
          if (ok !== false) setAddOpen(false);
        }}
        saving={adding}
        cars={cars}
        lang={lang}
        t={t}
      />

      <AdminAlertModal
        open={Boolean(hideTarget)}
        type="warning"
        title={t('admin.bookingForms.carsBarHideTitle')}
        body={t('admin.bookingForms.carsBarHideBody', {
          name: hideTarget ? carCatalogLabel(hideTarget, lang) : '',
        })}
        confirmLabel={t('admin.bookingForms.hide')}
        cancelLabel={t('common.cancel')}
        onConfirm={() => {
          if (hideTarget) onToggle?.(hideTarget, false);
          setHideTarget(null);
        }}
        onClose={() => setHideTarget(null)}
      />
    </div>
  );
}
