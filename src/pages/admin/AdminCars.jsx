import { useMemo, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Download, Eye, EyeOff, Save, Plus } from 'lucide-react';
import {
  getAllCars,
  seedDefaultCars,
  updateCarAndSyncPackages,
  createCarWithPackages,
} from '../../firebase/admin';
import MediaUpload from '../../components/admin/MediaUpload';
import AddCarModal from '../../components/admin/AddCarModal';
import { CAR_FORM_IDS, DEFAULT_CAR_FORMS } from '../../utils/carCatalogHelpers';
import { usePublishSiteContent } from '../../hooks/usePublishSiteContent';
import { useAdminDataLoader } from '../../hooks/useAdminDataLoader';
import { useToast } from '../../context/ToastContext';
import {
  BOOKING_CAR_TYPES,
  getDefaultCarCatalog,
  getCarDisplayName,
} from '../../data/staticData';
import AdminPageHeader from '../../components/admin/AdminPageHeader';
import GlassCard from '../../components/ui/GlassCard';
import LoadingSpinner from '../../components/ui/LoadingSpinner';

function mergeCars(dbCars = []) {
  const byId = new Map();
  getDefaultCarCatalog().forEach((fallback) => {
    const live = (dbCars || []).find((c) => c.id === fallback.id);
    byId.set(fallback.id, live ? {
      ...fallback,
      ...live,
      id: fallback.id,
      forms: live.forms || fallback.forms || DEFAULT_CAR_FORMS,
    } : { ...fallback });
  });
  (dbCars || []).forEach((live) => {
    if (!byId.has(live.id)) {
      byId.set(live.id, {
        ...live,
        forms: live.forms || DEFAULT_CAR_FORMS,
        active: live.active !== false,
      });
    }
  });
  return [...byId.values()].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
}

function useAdminFleetBase() {
  const location = useLocation();
  const params = useParams();
  const isCategories = location.pathname.startsWith('/admin/categories');
  const basePath = isCategories ? '/admin/categories' : '/admin/cars';
  const itemId = String(params.categoryId || params.carId || '').toLowerCase() || null;
  return { basePath, itemId, isCategories };
}

/** Index: car cards → separate admin pages */
function AdminCarsIndex({ cars, seeding, onSeed, onAdd, lang, t, basePath, isCategories }) {
  return (
    <div className="space-y-4 sm:space-y-6">
      <AdminPageHeader
        title={isCategories ? t('admin.nav.categories') : t('admin.nav.cars')}
        subtitle={
          isCategories
            ? t('admin.categories.hubSubtitle')
            : t('admin.cars.hubSubtitle', { defaultValue: t('admin.cars.subtitle') })
        }
      >
        <button
          type="button"
          onClick={onAdd}
          className="flex items-center gap-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl bg-brand text-white font-bold text-sm touch-target"
        >
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">{t('admin.cars.addNew')}</span>
        </button>
        <button
          type="button"
          onClick={onSeed}
          disabled={seeding}
          className="flex items-center gap-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl border border-brand/20 font-bold text-sm text-brand hover:bg-brand/5 touch-target"
        >
          <Download className="w-4 h-4" />
          <span className="hidden sm:inline">
            {seeding ? t('admin.cars.seeding') : t('admin.cars.importDefaults')}
          </span>
        </button>
      </AdminPageHeader>

      <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-3">
        {cars.map((car) => {
          const isActive = car.active !== false;
          const name =
            lang === 'ar'
              ? car.nameAr || getCarDisplayName(car.id, 'ar')
              : car.nameEn || getCarDisplayName(car.id, 'en');
          return (
            <Link key={car.id} to={`${basePath}/${car.id}`} className="block group">
              <GlassCard className="p-3.5 sm:p-5 space-y-3 h-full transition-transform group-hover:-translate-y-0.5">
                <div className="flex items-start gap-3">
                  <img
                    src={car.imageUrl}
                    alt=""
                    className="w-20 h-14 rounded-xl object-cover border border-black/5 dark:border-white/10 shrink-0"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-[10px] font-black uppercase tracking-wider text-brand/70 dark:text-gold/70">
                        {car.id}
                      </p>
                      <span
                        className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${
                          isActive
                            ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                            : 'bg-gray-500/15 text-gray-600 dark:text-gray-300'
                        }`}
                      >
                        {isActive
                          ? t('admin.status.active', { defaultValue: 'Active' })
                          : t('admin.status.inactive', { defaultValue: 'Hidden' })}
                      </span>
                    </div>
                    <h3 className="font-bold text-sm sm:text-base truncate">{name}</h3>
                    <p className="text-xs text-gray-500">
                      {car.passengers} {t('admin.cars.passengers')}
                      {car.vip ? ' · VIP' : ''}
                    </p>
                    <p className="text-xs font-bold text-brand mt-2 group-hover:text-gold transition-colors">
                      {isCategories
                        ? t('admin.categories.openPage')
                        : t('admin.cars.openPage', { defaultValue: 'Open car page →' })}
                    </p>
                  </div>
                </div>
              </GlassCard>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

/** Single-item SuperAdmin page (car or category) */
function AdminCarDetail({
  car,
  allCars,
  draft,
  busy,
  lang,
  t,
  setField,
  onSave,
  onToggleActive,
  basePath,
  isCategories,
}) {
  const navigate = useNavigate();
  if (!car) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-gray-500">
          {isCategories
            ? t('admin.categories.notFound')
            : t('admin.cars.notFound', { defaultValue: 'Car not found' })}
        </p>
        <button
          type="button"
          onClick={() => navigate(basePath)}
          className="admin-btn-secondary inline-flex items-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          {isCategories
            ? t('admin.categories.backToList')
            : t('admin.cars.backToList', { defaultValue: 'All cars' })}
        </button>
      </div>
    );
  }

  const isActive = draft.active !== false;
  const title =
    lang === 'ar'
      ? draft.nameAr || getCarDisplayName(car.id, 'ar')
      : draft.nameEn || getCarDisplayName(car.id, 'en');

  return (
    <div className="space-y-4 sm:space-y-6">
      <AdminPageHeader
        title={title}
        subtitle={
          isCategories
            ? t('admin.categories.detailSubtitle', { id: car.id })
            : t('admin.cars.detailSubtitle', {
                id: car.id,
                defaultValue: `Edit ${car.id} — updates products, services & booking`,
              })
        }
      >
        <button
          type="button"
          onClick={() => navigate(basePath)}
          className="flex items-center gap-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl border border-brand/20 font-bold text-sm text-brand hover:bg-brand/5 touch-target"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="hidden sm:inline">
            {isCategories
              ? t('admin.categories.backToList')
              : t('admin.cars.backToList', { defaultValue: 'All cars' })}
          </span>
        </button>
      </AdminPageHeader>

      <div className="flex flex-wrap gap-2">
        {(allCars || []).map((item) => (
          <Link
            key={item.id}
            to={`${basePath}/${item.id}`}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors ${
              item.id === car.id
                ? 'bg-brand text-white border-brand'
                : 'border-brand/15 text-brand hover:bg-brand/5'
            }`}
          >
            {getCarDisplayName(item.id, lang)}
          </Link>
        ))}
      </div>

      <GlassCard className="p-4 sm:p-6 space-y-4 max-w-2xl">
        <div className="flex items-start gap-3">
          <img
            src={draft.imageUrl}
            alt=""
            className="w-24 h-16 sm:w-28 sm:h-20 rounded-xl object-cover border border-black/5 dark:border-white/10 shrink-0"
          />
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-black uppercase tracking-wider text-brand/70 dark:text-gold/70">
              {car.id}
            </p>
            <h3 className="font-bold text-base sm:text-lg truncate">{title}</h3>
            <span
              className={`inline-block mt-1 text-[10px] font-bold px-1.5 py-0.5 rounded-md ${
                isActive
                  ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                  : 'bg-gray-500/15 text-gray-600 dark:text-gray-300'
              }`}
            >
              {isActive
                ? t('admin.status.active', { defaultValue: 'Active' })
                : t('admin.status.inactive', { defaultValue: 'Hidden' })}
            </span>
          </div>
        </div>

        <div className="grid gap-2">
          <label className="text-[11px] font-bold text-gray-500">{t('admin.cars.nameEn')}</label>
          <input
            className="admin-input"
            value={draft.nameEn || ''}
            onChange={(e) => setField('nameEn', e.target.value)}
            placeholder="Toyota Camry 2026"
          />
          <label className="text-[11px] font-bold text-gray-500">{t('admin.cars.nameAr')}</label>
          <input
            className="admin-input"
            dir="rtl"
            value={draft.nameAr || ''}
            onChange={(e) => setField('nameAr', e.target.value)}
            placeholder="كامري 2026"
          />
          <label className="text-[11px] font-bold text-gray-500">{t('admin.cars.modelEn')}</label>
          <input
            className="admin-input"
            value={draft.modelEn || ''}
            onChange={(e) => setField('modelEn', e.target.value)}
            placeholder="Toyota Camry 2026"
          />
          <label className="text-[11px] font-bold text-gray-500">{t('admin.cars.modelAr')}</label>
          <input
            className="admin-input"
            dir="rtl"
            value={draft.modelAr || ''}
            onChange={(e) => setField('modelAr', e.target.value)}
            placeholder="كامري 2026"
          />
          <label className="text-[11px] font-bold text-gray-500">{t('admin.cars.passengers')}</label>
          <input
            type="number"
            min="1"
            className="admin-input"
            value={draft.passengers ?? 4}
            onChange={(e) => setField('passengers', e.target.value)}
          />
          <MediaUpload
            value={draft.imageUrl || ''}
            onChange={(url) => setField('imageUrl', url)}
            folder="vehicles"
            allowUrl
            label={t('admin.cars.image')}
          />
        </div>

        <div className="rounded-xl border border-brand/10 p-3 space-y-2">
          <p className="text-[11px] font-black uppercase tracking-wide text-brand">{t('admin.cars.formsTitle')}</p>
          <div className="flex flex-wrap gap-2">
            {CAR_FORM_IDS.map((key) => (
              <label key={key} className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 text-xs font-bold cursor-pointer">
                <input
                  type="checkbox"
                  checked={(draft.forms || DEFAULT_CAR_FORMS)[key] !== false}
                  onChange={() => setField('forms', {
                    ...(draft.forms || DEFAULT_CAR_FORMS),
                    [key]: !(draft.forms || DEFAULT_CAR_FORMS)[key],
                  })}
                />
                {t(`admin.cars.forms.${key}`)}
              </label>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={onToggleActive}
            className="admin-btn-secondary w-full inline-flex items-center justify-center gap-2 text-sm"
          >
            {isActive ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            {isActive
              ? t('admin.cars.hideOnSite', { defaultValue: 'Hide on site' })
              : t('admin.cars.showOnSite', { defaultValue: 'Show on site' })}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={onSave}
            className="admin-btn-primary w-full inline-flex items-center justify-center gap-2 text-sm"
          >
            <Save className="w-4 h-4" />
            {busy ? t('admin.cars.saving') : t('admin.cars.save')}
          </button>
        </div>
      </GlassCard>
    </div>
  );
}

export default function AdminCars() {
  const { basePath, itemId: activeKey, isCategories } = useAdminFleetBase();
  const { t, i18n } = useTranslation();
  const { toast } = useToast();
  const publishSite = usePublishSiteContent();
  const lang = i18n.language?.startsWith('ar') ? 'ar' : 'en';
  const [drafts, setDrafts] = useState({});
  const [savingId, setSavingId] = useState(null);
  const [seeding, setSeeding] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [adding, setAdding] = useState(false);

  const { data: dbCars, loading, refresh } = useAdminDataLoader(getAllCars);
  const cars = useMemo(() => mergeCars(dbCars), [dbCars]);

  const selectedCar = activeKey ? cars.find((c) => c.id === activeKey) : null;

  const getDraft = (car) => (car ? drafts[car.id] || car : null);

  const setField = (field, value) => {
    if (!selectedCar) return;
    setDrafts((prev) => ({
      ...prev,
      [selectedCar.id]: {
        ...(prev[selectedCar.id] || selectedCar),
        id: selectedCar.id,
        [field]: value,
      },
    }));
  };

  const persistCar = async (targetId, patch = {}) => {
    const original = cars.find((c) => c.id === targetId);
    const draft = { ...(drafts[targetId] || original || { id: targetId }), ...patch };
    if (!draft.nameEn?.trim() || !draft.nameAr?.trim()) {
      toast.error(t('admin.cars.nameRequired'));
      return false;
    }
    if (!draft.imageUrl?.trim()) {
      toast.error(t('admin.cars.imageRequired'));
      return false;
    }

    setSavingId(targetId);
    try {
      const synced = await updateCarAndSyncPackages(
        targetId,
        {
          nameEn: draft.nameEn.trim(),
          nameAr: draft.nameAr.trim(),
          modelEn: (draft.modelEn || draft.nameEn).trim(),
          modelAr: (draft.modelAr || draft.nameAr).trim(),
          imageUrl: draft.imageUrl.trim(),
          passengers: Number(draft.passengers) || 4,
          vip: Boolean(draft.vip),
          sortOrder: Number(draft.sortOrder) ?? (BOOKING_CAR_TYPES.indexOf(targetId) >= 0 ? BOOKING_CAR_TYPES.indexOf(targetId) : 99),
          active: draft.active !== false,
          forms: draft.forms || DEFAULT_CAR_FORMS,
        },
        {
          nameEn: original?.nameEn,
          nameAr: original?.nameAr,
          modelEn: original?.modelEn,
          modelAr: original?.modelAr,
        },
      );
      await publishSite('soft');
      setDrafts((prev) => {
        const next = { ...prev };
        delete next[targetId];
        return next;
      });
      await refresh();
      toast.success(t('admin.cars.saved', { count: synced }));
      return true;
    } catch (err) {
      console.error(err);
      toast.error(t('admin.cars.saveFailed'));
      return false;
    } finally {
      setSavingId(null);
    }
  };

  const handleSeed = async () => {
    setSeeding(true);
    try {
      const result = await seedDefaultCars();
      await publishSite('soft');
      await refresh();
      if (result.alreadyExists) {
        toast.info(t('admin.cars.alreadySeeded'));
      } else {
        toast.success(t('admin.cars.seeded'));
      }
    } catch (err) {
      console.error(err);
      toast.error(t('admin.cars.seedFailed'));
    } finally {
      setSeeding(false);
    }
  };

  const handleAddCar = async (payload) => {
    setAdding(true);
    try {
      const result = await createCarWithPackages(payload);
      await publishSite('soft');
      await refresh();
      setAddOpen(false);
      toast.success(t('admin.cars.addNewSuccess', { id: result.id, count: result.packagesCreated }));
    } catch (err) {
      console.error(err);
      toast.error(err?.message || t('admin.cars.addNewFailed'));
    } finally {
      setAdding(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <LoadingSpinner />
      </div>
    );
  }

  if (activeKey) {
    const car = selectedCar || cars.find((c) => c.id === activeKey);
    if (!car) {
      return (
        <AdminCarDetail
          car={null}
          allCars={cars}
          draft={null}
          busy={false}
          lang={lang}
          t={t}
          setField={() => {}}
          onSave={() => {}}
          onToggleActive={() => {}}
          basePath={basePath}
          isCategories={isCategories}
        />
      );
    }

    const draft = getDraft(car);
    return (
      <AdminCarDetail
        car={car}
        allCars={cars}
        draft={draft}
        busy={savingId === car.id}
        lang={lang}
        t={t}
        setField={setField}
        onSave={() => persistCar(car.id)}
        onToggleActive={async () => {
          const nextActive = draft.active === false;
          setField('active', nextActive);
          await persistCar(car.id, { active: nextActive });
        }}
        basePath={basePath}
        isCategories={isCategories}
      />
    );
  }

  return (
    <>
      <AdminCarsIndex
        cars={cars}
        seeding={seeding}
        onSeed={handleSeed}
        onAdd={() => setAddOpen(true)}
        lang={lang}
        t={t}
        basePath={basePath}
        isCategories={isCategories}
      />
      <AddCarModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onSave={handleAddCar}
        saving={adding}
        cars={cars}
        lang={lang}
        t={t}
      />
    </>
  );
}
