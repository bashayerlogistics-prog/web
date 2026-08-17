import { useEffect, useState } from 'react';
import { X, Plus } from 'lucide-react';
import MediaUpload from './MediaUpload';
import AdminSelect from './AdminSelect';
import { CAR_FORM_IDS, DEFAULT_CAR_FORMS, slugifyCarId } from '../../utils/carCatalogHelpers';
import { BOOKING_CAR_TYPES } from '../../data/staticData';

const inputClass = 'admin-input w-full text-sm py-2.5';

export default function AddCarModal({
  open,
  onClose,
  onSave,
  saving,
  cars,
  lang,
  t,
}) {
  const [form, setForm] = useState({
    carId: '',
    nameEn: '',
    nameAr: '',
    passengers: 4,
    imageUrl: '',
    vip: false,
    priceFromCarId: 'camry',
    forms: { ...DEFAULT_CAR_FORMS },
  });

  useEffect(() => {
    if (!open) return undefined;
    document.body.style.overflow = 'hidden';
    const onEscape = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onEscape);
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', onEscape);
    };
  }, [open, onClose]);

  useEffect(() => {
    if (!open) {
      setForm({
        carId: '',
        nameEn: '',
        nameAr: '',
        passengers: 4,
        imageUrl: '',
        vip: false,
        priceFromCarId: 'camry',
        forms: { ...DEFAULT_CAR_FORMS },
      });
    }
  }, [open]);

  if (!open) return null;

  const priceOptions = cars?.length
    ? cars.filter((c) => c.active !== false)
    : BOOKING_CAR_TYPES.map((id) => ({ id }));

  const toggleForm = (key) => {
    setForm((prev) => ({
      ...prev,
      forms: { ...prev.forms, [key]: !prev.forms[key] },
    }));
  };

  const handleNameEn = (value) => {
    setForm((prev) => ({
      ...prev,
      nameEn: value,
      carId: prev.carId || slugifyCarId(value),
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const refCar = cars?.find((c) => c.id === form.priceFromCarId);
    onSave({
      ...form,
      carId: slugifyCarId(form.carId || form.nameEn),
      refNameEn: refCar?.nameEn || refCar?.modelEn || '',
      refNameAr: refCar?.nameAr || refCar?.modelAr || '',
    });
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      <button type="button" className="absolute inset-0 bg-dark-900/65 backdrop-blur-sm" onClick={onClose} aria-label={t('common.cancel')} />
      <div role="dialog" aria-modal="true" className="relative w-full max-w-2xl max-h-[92vh] overflow-y-auto rounded-3xl border border-brand/15 bg-white dark:bg-[#180b2a] shadow-2xl">
        <div className="sticky top-0 z-10 flex items-center justify-between gap-4 px-5 py-4 border-b border-brand/10 bg-white/95 dark:bg-[#180b2a]/95 backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-brand/10 flex items-center justify-center">
              <Plus className="w-5 h-5 text-brand" />
            </div>
            <h2 className="font-black text-lg text-brand">{t('admin.cars.addNewTitle')}</h2>
          </div>
          <button type="button" onClick={onClose} className="p-2 rounded-xl hover:bg-brand/5">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <p className="text-xs text-gray-500">{t('admin.cars.addNewHint')}</p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-bold text-gray-500">{t('admin.cars.nameEn')}</label>
              <input className={inputClass} value={form.nameEn} onChange={(e) => handleNameEn(e.target.value)} required />
            </div>
            <div>
              <label className="text-[11px] font-bold text-gray-500">{t('admin.cars.nameAr')}</label>
              <input className={inputClass} dir="rtl" value={form.nameAr} onChange={(e) => setForm({ ...form, nameAr: e.target.value })} required />
            </div>
            <div>
              <label className="text-[11px] font-bold text-gray-500">{t('admin.cars.carId')}</label>
              <input className={inputClass} dir="ltr" value={form.carId} onChange={(e) => setForm({ ...form, carId: slugifyCarId(e.target.value) })} placeholder="land-cruiser" required />
            </div>
            <div>
              <label className="text-[11px] font-bold text-gray-500">{t('admin.cars.passengers')}</label>
              <input type="number" min="1" className={inputClass} value={form.passengers} onChange={(e) => setForm({ ...form, passengers: e.target.value })} />
            </div>
          </div>

          <div>
            <label className="text-[11px] font-bold text-gray-500 mb-1 block">{t('admin.cars.priceFromCar')}</label>
            <AdminSelect
              value={form.priceFromCarId}
              onChange={(e) => setForm({ ...form, priceFromCarId: e.target.value })}
              className={inputClass}
            >
              {priceOptions.map((car) => (
                <option key={car.id} value={car.id}>
                  {lang === 'ar' ? (car.nameAr || car.id) : (car.nameEn || car.id)}
                </option>
              ))}
            </AdminSelect>
            <p className="text-[10px] text-gray-400 mt-1">{t('admin.cars.priceFromCarHint')}</p>
          </div>

          <div>
            <p className="text-[11px] font-black uppercase tracking-wide text-brand mb-2">{t('admin.cars.formsTitle')}</p>
            <div className="flex flex-wrap gap-2">
              {CAR_FORM_IDS.map((key) => (
                <label key={key} className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-brand/15 text-xs font-bold cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.forms[key] !== false}
                    onChange={() => toggleForm(key)}
                  />
                  {t(`admin.cars.forms.${key}`)}
                </label>
              ))}
            </div>
          </div>

          <MediaUpload
            value={form.imageUrl}
            onChange={(url) => setForm({ ...form, imageUrl: url })}
            folder="vehicles"
            allowUrl
            label={t('admin.cars.image')}
          />

          <label className="inline-flex items-center gap-2 text-sm font-bold cursor-pointer">
            <input type="checkbox" checked={form.vip} onChange={(e) => setForm({ ...form, vip: e.target.checked })} />
            VIP
          </label>

          <div className="flex justify-end gap-3 pt-2 border-t border-brand/10">
            <button type="button" onClick={onClose} className="px-5 py-2.5 rounded-xl border border-brand/20 font-bold text-brand">
              {t('common.cancel')}
            </button>
            <button type="submit" disabled={saving} className="admin-btn-primary px-5 py-2.5 rounded-xl font-bold disabled:opacity-60">
              {saving ? t('admin.cars.saving') : t('admin.cars.addNewSubmit')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
