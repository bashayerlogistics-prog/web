import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Plus,
  Save,
  Plane,
  TrainFront,
  Clock,
  MapPin,
  Landmark,
  Package,
  Trash2,
} from 'lucide-react';
import {
  getProductsByTripType,
  createProduct,
  updateProduct,
  deleteProduct,
  updateHomeFleetShowcase,
  getAdminHomeFleetShowcase,
  getAdminHomeSections,
  updateHomeSection,
  getAllCars,
  createCarWithPackages,
  getReligiousToursSettings,
  updateReligiousToursSettings,
} from '../../firebase/admin';
import { usePublishSiteContent } from '../../hooks/usePublishSiteContent';
import { useAdminDataLoader } from '../../hooks/useAdminDataLoader';
import { useToast } from '../../context/ToastContext';
import {
  FLEET_SERVICES,
  HOME_FLEET_SERVICE_COUNTS,
  HOME_FLEET_SERVICE_IDS,
  FLEET_CARS,
  carKeyOf,
  carOptionList,
  getFleetService,
  buildNewFleetProduct,
  normalizeFleetShowcase,
  emptyFleetShowcase,
  hoursFromRouteId,
} from '../../data/adminFleetServices';
import { getCarDisplayName, resolveCarThumb } from '../../data/staticData';
import { DEFAULT_RELIGIOUS_TOURS } from '../../data/religiousTours';
import { dedupeFleetProducts } from '../../utils/productDedupe';
import AdminPageHeader from '../../components/admin/AdminPageHeader';
import AdminSelect from '../../components/admin/AdminSelect';
import AdminApplyButton from '../../components/admin/AdminApplyButton';
import AddCarModal from '../../components/admin/AddCarModal';
import MediaUpload from '../../components/admin/MediaUpload';
import GlassCard from '../../components/ui/GlassCard';
import LoadingSpinner from '../../components/ui/LoadingSpinner';

const SERVICE_ICONS = {
  cityToCity: MapPin,
  airport: Plane,
  train: TrainFront,
  withinCity: Package,
  hourly: Clock,
  ziyarat: Landmark,
};

const ZIYARAT_CITIES = [
  { key: 'makkah', en: 'Makkah', ar: 'مكة المكرمة' },
  { key: 'madinah', en: 'Madinah', ar: 'المدينة المنورة' },
  { key: 'jeddah', en: 'Jeddah', ar: 'جدة' },
  { key: 'riyadh', en: 'Riyadh', ar: 'الرياض' },
];

function productOnRoute(products, routeId, car) {
  return products.find(
    (p) => p.routeId === routeId && carKeyOf(p) === car && p.active !== false,
  ) || products.find(
    (p) => p.routeId === routeId && carKeyOf(p) === car,
  );
}

function rankedRouteId(service, products) {
  const counts = new Map();
  for (const p of products) {
    if (!p.routeId) continue;
    counts.set(p.routeId, (counts.get(p.routeId) || 0) + 1);
  }
  const routes = service.getRoutes() || [];
  let bestId = service.defaultRouteId;
  let bestScore = -1;
  for (const route of routes) {
    const n = counts.get(route.id) || 0;
    if (!n) continue;
    let score = n * 10;
    if (route.id === service.defaultRouteId) score += 50;
    if (score > bestScore) {
      bestScore = score;
      bestId = route.id;
    }
  }
  return bestId;
}

function ToggleSwitch({ on, onClick, disabled, label }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className={`inline-flex items-center gap-2 min-w-0 disabled:opacity-50 ${
        on ? 'text-emerald-700 dark:text-emerald-300' : 'text-gray-500'
      }`}
    >
      <span
        className={`w-11 h-6 rounded-full flex items-center px-0.5 shrink-0 transition-colors ${
          on ? 'bg-emerald-500 justify-end' : 'bg-gray-300 dark:bg-gray-600 justify-start'
        }`}
      >
        <span className="w-5 h-5 rounded-full bg-white shadow" />
      </span>
      {label ? <span className="text-[11px] font-bold leading-tight break-words">{label}</span> : null}
    </button>
  );
}

export default function AdminHomeFleet({
  embedded = false,
  serviceIds = HOME_FLEET_SERVICE_IDS,
}) {
  const { t, i18n } = useTranslation();
  const { toast } = useToast();
  const publishSite = usePublishSiteContent();
  const lang = i18n.language?.startsWith('ar') ? 'ar' : 'en';
  const [savingKey, setSavingKey] = useState('');
  const [addFor, setAddFor] = useState(null);
  const [addForm, setAddForm] = useState({ car: '', routeId: '', price: '', nameEn: '', nameAr: '', imageUrl: '' });
  const [addCarOpen, setAddCarOpen] = useState(false);
  const [addingCar, setAddingCar] = useState(false);
  const [cityImages, setCityImages] = useState(DEFAULT_RELIGIOUS_TOURS.cityImages);

  const { data: tripBundles, loading, refresh } = useAdminDataLoader(
    async () => {
      const [oneWay, roundTrip, hourly, showcase, sections, cars, ziyarat] = await Promise.all([
        getProductsByTripType('one_way'),
        getProductsByTripType('round_trip'),
        getProductsByTripType('hourly'),
        getAdminHomeFleetShowcase(),
        getAdminHomeSections(),
        getAllCars(),
        getReligiousToursSettings(),
      ]);
      return {
        products: [...(oneWay || []), ...(roundTrip || []), ...(hourly || [])],
        showcase: normalizeFleetShowcase(showcase),
        sectionActive: sections?.fleet?.active !== false,
        cars: cars || [],
        cityImages: ziyarat?.cityImages || {},
      };
    },
    [],
    { cacheKey: 'admin:home-fleet' },
  );

  const allProducts = tripBundles?.products || [];
  const liveCars = tripBundles?.cars || [];
  const [localShowcase, setLocalShowcase] = useState(null);
  const [sectionOn, setSectionOn] = useState(true);
  const showcase = localShowcase || tripBundles?.showcase || emptyFleetShowcase();

  useEffect(() => {
    if (tripBundles?.showcase) setLocalShowcase(tripBundles.showcase);
    if (typeof tripBundles?.sectionActive === 'boolean') setSectionOn(tripBundles.sectionActive);
    if (tripBundles?.cityImages) {
      setCityImages({ ...DEFAULT_RELIGIOUS_TOURS.cityImages, ...tripBundles.cityImages });
    }
  }, [tripBundles?.showcase, tripBundles?.sectionActive, tripBundles?.cityImages]);

  const carChoices = useMemo(() => {
    const ids = [...FLEET_CARS];
    for (const car of liveCars) {
      const id = String(car.id || '').split('-')[0];
      if (id && !ids.includes(id) && car.active !== false) ids.push(id);
    }
    return carOptionList(ids);
  }, [liveCars]);

  const visibleServiceIds = useMemo(
    () => HOME_FLEET_SERVICE_IDS.filter((id) => serviceIds.includes(id)),
    [serviceIds],
  );

  const byService = useMemo(() => {
    const map = {};
    for (const id of HOME_FLEET_SERVICE_IDS) {
      const service = FLEET_SERVICES[id];
      const { unique } = dedupeFleetProducts((allProducts || []).filter(service.matchProduct));
      map[id] = unique;
    }
    return map;
  }, [allProducts]);

  const persistShowcase = async (serviceId, slot) => {
    const merged = {
      routeId: slot.routeId,
      carIds: slot.carIds,
      active: slot.active !== false,
    };
    const next = normalizeFleetShowcase({
      ...showcase,
      [serviceId]: { ...showcase[serviceId], ...merged },
    });
    setLocalShowcase(next);
    await updateHomeFleetShowcase({ [serviceId]: next[serviceId] });
    await publishSite('soft');
  };

  const saveSlot = async (serviceId, slotIndex, payload) => {
    const service = getFleetService(serviceId);
    const products = byService[serviceId] || [];
    const key = `${serviceId}:${slotIndex}`;
    setSavingKey(key);
    try {
      const { car, routeId, price, nameEn, nameAr, imageUrl } = payload;
      const existing = productOnRoute(products, routeId, car);
      const numericPrice = Number(price);
      if (!Number.isFinite(numericPrice) || numericPrice < 0) {
        toast.error(t('common.error'));
        return;
      }
      if (existing) {
        const patch = {
          price: numericPrice,
          originalPrice: existing.originalPrice || numericPrice,
          active: true,
          nameEn: nameEn || existing.nameEn,
          nameAr: nameAr || existing.nameAr,
          imageUrl: imageUrl || existing.imageUrl,
        };
        if (service.layout === 'hourly' && existing.hours) {
          patch.hourlyRate = Math.round(numericPrice / Number(existing.hours));
        }
        await updateProduct(existing.id, patch);
        toast.success(t('admin.fleet.updated'));
      } else {
        const created = buildNewFleetProduct(service, { car, routeId, price: numericPrice });
        await createProduct({
          ...created,
          nameEn: nameEn || created.nameEn,
          nameAr: nameAr || created.nameAr,
          imageUrl: imageUrl || created.imageUrl,
        });
        toast.success(t('admin.fleet.created'));
      }

      const limit = HOME_FLEET_SERVICE_COUNTS[serviceId] || 2;
      const currentCars = [...(showcase[serviceId]?.carIds || [])];
      while (currentCars.length < limit) currentCars.push('');
      currentCars[slotIndex] = car;
      await persistShowcase(serviceId, {
        routeId,
        carIds: currentCars.filter(Boolean),
        active: showcase[serviceId]?.active !== false,
      });
      refresh();
    } catch {
      toast.error(t('common.error'));
    } finally {
      setSavingKey('');
    }
  };

  const changeRoute = async (serviceId, routeId) => {
    const products = byService[serviceId] || [];
    const service = getFleetService(serviceId);
    const limit = HOME_FLEET_SERVICE_COUNTS[serviceId] || 2;
    const existingCars = (showcase[serviceId]?.carIds || []).filter((car) => (
      productOnRoute(products, routeId, car)
    ));
    const pool = [...new Set([
      ...service.cars,
      ...products.map((p) => carKeyOf(p)).filter(Boolean),
    ])];
    const fill = pool.filter((car) => (
      !existingCars.includes(car) && productOnRoute(products, routeId, car)
    ));
    const carIds = [...existingCars, ...fill].slice(0, limit);
    setSavingKey(`${serviceId}:route`);
    try {
      await persistShowcase(serviceId, {
        routeId,
        carIds,
        active: showcase[serviceId]?.active !== false,
      });
      toast.success(t('admin.homeFleet.routePinned'));
    } catch {
      toast.error(t('common.error'));
    } finally {
      setSavingKey('');
    }
  };

  const toggleService = async (serviceId) => {
    const current = showcase[serviceId] || {};
    setSavingKey(`${serviceId}:toggle`);
    try {
      await persistShowcase(serviceId, {
        routeId: current.routeId || '',
        carIds: current.carIds || [],
        active: current.active === false,
      });
      toast.success(current.active === false ? t('admin.homeFleet.serviceOn') : t('admin.homeFleet.serviceOff'));
    } catch {
      toast.error(t('common.error'));
    } finally {
      setSavingKey('');
    }
  };

  const toggleSection = async () => {
    setSavingKey('section');
    try {
      await updateHomeSection('fleet', !sectionOn);
      setSectionOn(!sectionOn);
      await publishSite('soft');
      toast.success(!sectionOn ? t('admin.sections.turnedOn') : t('admin.sections.turnedOff'));
    } catch {
      toast.error(t('common.error'));
    } finally {
      setSavingKey('');
    }
  };

  const toggleProduct = async (product, field) => {
    if (!product?.id) return;
    setSavingKey(product.id);
    try {
      const next = field === 'active' ? product.active === false : !product[field];
      await updateProduct(product.id, { [field]: next });
      await publishSite('soft');
      refresh();
    } catch {
      toast.error(t('common.error'));
    } finally {
      setSavingKey('');
    }
  };

  const removeProduct = async (product) => {
    if (!product?.id) return;
    if (!window.confirm(t('admin.confirmDelete'))) return;
    setSavingKey(product.id);
    try {
      await deleteProduct(product.id);
      await publishSite('soft');
      toast.success(t('admin.fleet.deleted'));
      refresh();
    } catch {
      toast.error(t('common.error'));
    } finally {
      setSavingKey('');
    }
  };

  const openAdd = (serviceId, routeId) => {
    const service = getFleetService(serviceId);
    const car = service.defaultCar;
    setAddFor(serviceId);
    setAddForm({
      car,
      routeId: routeId || service.defaultRouteId,
      price: '',
      nameEn: getCarDisplayName(car, 'en'),
      nameAr: getCarDisplayName(car, 'ar'),
      imageUrl: resolveCarThumb(car, ''),
    });
  };

  const submitAdd = async (e) => {
    e.preventDefault();
    if (!addFor) return;
    const service = getFleetService(addFor);
    setSavingKey(`${addFor}:add`);
    try {
      const created = buildNewFleetProduct(service, addForm);
      await createProduct({
        ...created,
        nameEn: addForm.nameEn || created.nameEn,
        nameAr: addForm.nameAr || created.nameAr,
        imageUrl: addForm.imageUrl || created.imageUrl,
      });
      toast.success(t('admin.fleet.created'));
      setAddFor(null);
      await publishSite('soft');
      refresh();
    } catch {
      toast.error(t('common.error'));
    } finally {
      setSavingKey('');
    }
  };

  const handleAddCar = async (payload) => {
    setAddingCar(true);
    try {
      const result = await createCarWithPackages(payload);
      await publishSite('soft');
      await refresh();
      setAddCarOpen(false);
      toast.success(t('admin.cars.addNewSuccess', { id: result.id, count: result.packagesCreated }));
    } catch (err) {
      toast.error(err?.message || t('admin.cars.addNewFailed'));
    } finally {
      setAddingCar(false);
    }
  };

  const saveZiyaratImages = async () => {
    setSavingKey('ziyarat-images');
    try {
      await updateReligiousToursSettings({ cityImages });
      await publishSite('soft');
      toast.success(t('admin.homeFleet.ziyaratImagesSaved'));
    } catch {
      toast.error(t('common.error'));
    } finally {
      setSavingKey('');
    }
  };

  return (
    <div className="space-y-6">
      {!embedded && (
        <>
          <AdminPageHeader
            title={t('fleet.title')}
            subtitle={t('fleet.subtitle')}
            purposeKey="homeFleet"
          >
            <ToggleSwitch
              on={sectionOn}
              disabled={savingKey === 'section'}
              onClick={toggleSection}
              label={sectionOn ? t('admin.homeFleet.sectionOn') : t('admin.homeFleet.sectionOff')}
            />
            <button
              type="button"
              onClick={() => setAddCarOpen(true)}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-brand text-white text-sm font-bold"
            >
              <Plus className="w-4 h-4" />
              {t('admin.cars.addNew')}
            </button>
          </AdminPageHeader>
          <p className="text-[11px] font-black uppercase tracking-widest text-brand/70 dark:text-gold/70 px-1">
            {t('fleet.badge')}
          </p>
        </>
      )}

      {embedded && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-black text-brand dark:text-white">{t('admin.bookingForms.pricesTitle')}</p>
            <p className="text-[11px] text-gray-500 mt-0.5">{t('admin.bookingForms.pricesHint')}</p>
          </div>
          <button
            type="button"
            onClick={() => setAddCarOpen(true)}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-brand text-white text-sm font-bold"
          >
            <Plus className="w-4 h-4" />
            {t('admin.cars.addNew')}
          </button>
        </div>
      )}

      {loading && !tripBundles ? (
        <LoadingSpinner />
      ) : (
        <div className="flex flex-col gap-6 lg:gap-8">
          {visibleServiceIds.map((serviceId) => (
            <ServiceEditor
              key={serviceId}
              serviceId={serviceId}
              lang={lang}
              t={t}
              products={byService[serviceId] || []}
              pin={showcase[serviceId]}
              carChoices={carChoices}
              savingKey={savingKey}
              addOpen={addFor === serviceId}
              addForm={addForm}
              setAddForm={setAddForm}
              onChangeRoute={(routeId) => changeRoute(serviceId, routeId)}
              onToggleService={() => toggleService(serviceId)}
              onSaveSlot={(slotIndex, payload) => saveSlot(serviceId, slotIndex, payload)}
              onToggleProduct={toggleProduct}
              onDeleteProduct={removeProduct}
              onOpenAdd={(routeId) => openAdd(serviceId, routeId)}
              onCloseAdd={() => setAddFor(null)}
              onSubmitAdd={submitAdd}
              cityImages={cityImages}
              setCityImages={setCityImages}
              onSaveZiyaratImages={saveZiyaratImages}
            />
          ))}
        </div>
      )}

      <AddCarModal
        open={addCarOpen}
        onClose={() => setAddCarOpen(false)}
        onSave={handleAddCar}
        saving={addingCar}
        cars={liveCars}
        lang={lang}
        t={t}
      />
    </div>
  );
}

function ServiceEditor({
  serviceId,
  lang,
  t,
  products,
  pin,
  carChoices,
  savingKey,
  addOpen,
  addForm,
  setAddForm,
  onChangeRoute,
  onToggleService,
  onSaveSlot,
  onToggleProduct,
  onDeleteProduct,
  onOpenAdd,
  onCloseAdd,
  onSubmitAdd,
  cityImages,
  setCityImages,
  onSaveZiyaratImages,
}) {
  const service = getFleetService(serviceId);
  const Icon = SERVICE_ICONS[service.id] || Package;
  const routes = useMemo(() => service.getRoutes(), [service]);
  const limit = HOME_FLEET_SERVICE_COUNTS[serviceId] || 2;
  const routeId = pin?.routeId || rankedRouteId(service, products);
  const visible = pin?.active !== false;
  const heading = lang === 'ar' ? service.badgeAr : service.badgeEn;

  const slotCars = useMemo(() => {
    const pinned = (pin?.carIds || []).filter(Boolean);
    const onRoute = [
      ...service.cars,
      ...carChoices.map((c) => c.id),
    ].filter((c, i, arr) => arr.indexOf(c) === i && productOnRoute(products, routeId, c));
    const merged = [...pinned, ...onRoute.filter((c) => !pinned.includes(c))];
    const slots = [];
    for (let i = 0; i < limit; i += 1) {
      slots.push(merged[i] || service.cars[i] || service.defaultCar);
    }
    return slots;
  }, [pin, products, routeId, service, limit, carChoices]);

  return (
    <GlassCard className={`p-4 sm:p-5 md:p-6 space-y-4 h-full overflow-visible ${visible ? '' : 'opacity-70'}`}>
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 border-b border-brand/10 pb-3">
        <h3 className="font-black text-base sm:text-lg text-brand flex items-start gap-2 min-w-0">
          <span className="w-2 h-5 bg-gradient-to-b from-gold to-gold-dark rounded-full shrink-0 mt-0.5" />
          <Icon className="w-5 h-5 text-brand shrink-0 mt-0.5" />
          <span className="break-words leading-snug">{heading}</span>
        </h3>
        <ToggleSwitch
          on={visible}
          disabled={savingKey === `${serviceId}:toggle`}
          onClick={onToggleService}
          label={visible ? t('admin.table.show') : t('admin.table.hide')}
        />
      </div>

      <label className="block space-y-1.5 min-w-0">
        <span className="text-[11px] font-bold text-gray-500">{t('admin.homeFleet.homepageRoute')}</span>
        <AdminSelect
          className="admin-select--wrap w-full"
          value={routeId}
          onChange={(e) => onChangeRoute(e.target.value)}
          disabled={savingKey === `${serviceId}:route`}
        >
          {routes.map((r) => (
            <option key={r.id} value={r.id}>{r.label[lang] || r.label.ar}</option>
          ))}
        </AdminSelect>
      </label>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 min-w-0">
        {slotCars.map((car, index) => (
          <CarSlot
            key={`${serviceId}-${index}-${routeId}`}
            service={service}
            lang={lang}
            t={t}
            cars={carChoices}
            products={products}
            routeId={routeId}
            car={car}
            saving={savingKey === `${serviceId}:${index}` || savingKey === productOnRoute(products, routeId, car)?.id}
            onSave={(payload) => onSaveSlot(index, payload)}
            onToggle={onToggleProduct}
            onDelete={onDeleteProduct}
          />
        ))}
      </div>

      {addOpen ? (
        <form onSubmit={onSubmitAdd} className="rounded-xl border border-brand/20 bg-brand/[0.04] p-3 space-y-3">
          <p className="text-xs font-black">{t('admin.homeFleet.insertNew')}</p>
          <AdminSelect
            className="admin-select--wrap w-full"
            value={addForm.routeId}
            onChange={(e) => setAddForm({ ...addForm, routeId: e.target.value })}
          >
            {routes.map((r) => (
              <option key={r.id} value={r.id}>{r.label[lang] || r.label.ar}</option>
            ))}
          </AdminSelect>
          <AdminSelect
            className="admin-select--wrap w-full"
            value={addForm.car}
            onChange={(e) => {
              const car = e.target.value;
              setAddForm({
                ...addForm,
                car,
                nameEn: addForm.nameEn || getCarDisplayName(car, 'en'),
                nameAr: addForm.nameAr || getCarDisplayName(car, 'ar'),
                imageUrl: addForm.imageUrl || resolveCarThumb(car, ''),
              });
            }}
          >
            {carChoices.map((c) => (
              <option key={c.id} value={c.id}>{c.name(lang)}</option>
            ))}
          </AdminSelect>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 min-w-0">
            <label className="block space-y-1 min-w-0">
              <span className="text-[11px] font-bold text-gray-500">Name (EN)</span>
              <textarea
                rows={2}
                value={addForm.nameEn}
                onChange={(e) => setAddForm({ ...addForm, nameEn: e.target.value })}
                placeholder="Name (EN)"
                className="admin-input w-full min-h-[4.5rem] resize-y text-sm leading-relaxed"
              />
            </label>
            <label className="block space-y-1 min-w-0">
              <span className="text-[11px] font-bold text-gray-500">الاسم (AR)</span>
              <textarea
                rows={2}
                dir="rtl"
                value={addForm.nameAr}
                onChange={(e) => setAddForm({ ...addForm, nameAr: e.target.value })}
                placeholder="الاسم (AR)"
                className="admin-input w-full min-h-[4.5rem] resize-y text-sm leading-relaxed"
              />
            </label>
          </div>
          <input
            type="number"
            min="0"
            required
            value={addForm.price}
            onChange={(e) => setAddForm({ ...addForm, price: e.target.value })}
            placeholder={t('admin.products.price')}
            className="admin-input"
          />
          <MediaUpload
            value={addForm.imageUrl}
            onChange={(url) => setAddForm({ ...addForm, imageUrl: url })}
            folder="products"
            allowUrl
          />
          <div className="flex gap-2">
            <AdminApplyButton
              type="submit"
              size="sm"
              loading={savingKey === `${serviceId}:add`}
              label={t('admin.homeFleet.insert')}
            />
            <button type="button" onClick={onCloseAdd} className="admin-btn-secondary text-xs px-3 py-1.5">
              {t('common.cancel')}
            </button>
          </div>
        </form>
      ) : (
        <button
          type="button"
          onClick={() => onOpenAdd(routeId)}
          className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 rounded-xl border border-brand/20 text-sm font-bold text-brand hover:bg-brand/5"
        >
          <Plus className="w-4 h-4" />
          {t('admin.homeFleet.insertNew')}
        </button>
      )}

      {serviceId === 'ziyarat' ? (
        <div className="rounded-xl border border-brand/10 p-3 space-y-3">
          <p className="text-xs font-black">{t('admin.homeFleet.ziyaratImages')}</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {ZIYARAT_CITIES.map((city) => (
              <div key={city.key} className="space-y-1">
                <p className="text-[11px] font-bold text-gray-500">{lang === 'ar' ? city.ar : city.en}</p>
                <MediaUpload
                  value={cityImages?.[city.key] || ''}
                  onChange={(url) => setCityImages((prev) => ({ ...prev, [city.key]: url }))}
                  folder="ziyarat"
                  allowUrl
                />
              </div>
            ))}
          </div>
          <AdminApplyButton
            type="button"
            size="sm"
            loading={savingKey === 'ziyarat-images'}
            onClick={onSaveZiyaratImages}
            label={t('common.save')}
          />
        </div>
      ) : null}
    </GlassCard>
  );
}

function CarSlot({ service, lang, t, cars, products, routeId, car, saving, onSave, onToggle, onDelete }) {
  const [carId, setCarId] = useState(car);
  const currentCar = carId || car;
  const live = productOnRoute(products, routeId, currentCar);
  const [price, setPrice] = useState(live?.price ?? '');
  const [nameEn, setNameEn] = useState(live?.nameEn || getCarDisplayName(currentCar, 'en'));
  const [nameAr, setNameAr] = useState(live?.nameAr || getCarDisplayName(currentCar, 'ar'));
  const [imageUrl, setImageUrl] = useState(live?.imageUrl || resolveCarThumb(currentCar, ''));

  useEffect(() => {
    setCarId(car);
  }, [car]);

  useEffect(() => {
    setPrice(live?.price ?? '');
    setNameEn(live?.nameEn || getCarDisplayName(currentCar, 'en'));
    setNameAr(live?.nameAr || getCarDisplayName(currentCar, 'ar'));
    setImageUrl(live?.imageUrl || resolveCarThumb(currentCar, ''));
  }, [live?.id, live?.price, live?.nameEn, live?.nameAr, live?.imageUrl, currentCar, routeId]);

  const exists = Boolean(live);
  const hours = live?.hours || hoursFromRouteId(routeId);
  const isActive = live?.active !== false;

  return (
    <div className={`rounded-xl border p-3 sm:p-4 space-y-3 min-w-0 overflow-visible ${isActive ? 'border-black/5 dark:border-white/10 bg-white/50 dark:bg-white/5' : 'border-amber-200/60 bg-amber-50/40 dark:bg-amber-500/10'}`}>
      <MediaUpload
        value={imageUrl}
        onChange={setImageUrl}
        folder="products"
        allowUrl
        previewClassName="w-full h-28 sm:h-32 object-cover rounded-xl"
      />
      <label className="block space-y-1 min-w-0">
        <span className="text-[11px] font-bold text-gray-500">{t('admin.fleet.selectCar')}</span>
        <AdminSelect
          className="admin-select--wrap w-full"
          value={currentCar}
          onChange={(e) => setCarId(e.target.value)}
        >
          {cars.map((c) => (
            <option key={c.id} value={c.id}>{c.name(lang)}</option>
          ))}
        </AdminSelect>
      </label>
      <label className="block space-y-1 min-w-0">
        <span className="text-[11px] font-bold text-gray-500">Name (EN)</span>
        <textarea
          rows={2}
          value={nameEn}
          onChange={(e) => setNameEn(e.target.value)}
          placeholder="Name (EN)"
          title={nameEn}
          className="admin-input w-full min-h-[4.5rem] resize-y py-2 text-sm leading-relaxed"
        />
      </label>
      <label className="block space-y-1 min-w-0">
        <span className="text-[11px] font-bold text-gray-500">الاسم (AR)</span>
        <textarea
          rows={2}
          dir="rtl"
          value={nameAr}
          onChange={(e) => setNameAr(e.target.value)}
          placeholder="الاسم (AR)"
          title={nameAr}
          className="admin-input w-full min-h-[4.5rem] resize-y py-2 text-sm leading-relaxed"
        />
      </label>
      <label className="block space-y-1 min-w-0">
        <span className="text-[11px] font-bold text-gray-500">{t('admin.products.price')}</span>
        <input
          type="number"
          min="0"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          placeholder={t('admin.products.price')}
          className="admin-input w-full py-2.5"
        />
      </label>
      {service.layout === 'hourly' && hours ? (
        <p className="text-xs text-gray-500">
          {hours} {t('booking.hours_plural')}
        </p>
      ) : null}

      {exists ? (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <ToggleSwitch
            on={isActive}
            disabled={saving}
            onClick={() => onToggle(live, 'active')}
            label={isActive ? t('admin.table.show') : t('admin.table.hide')}
          />
          <ToggleSwitch
            on={!live.hidePrice}
            disabled={saving}
            onClick={() => onToggle(live, 'hidePrice')}
            label={live.hidePrice ? t('admin.fleet.hidden') : t('admin.fleet.visible')}
          />
        </div>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={saving || price === ''}
          onClick={() => onSave({ car: currentCar, routeId, price, nameEn, nameAr, imageUrl })}
          className="flex-1 min-w-[7.5rem] inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-brand text-white text-sm font-bold disabled:opacity-50"
        >
          <Save className="w-4 h-4 shrink-0" />
          {saving
            ? t('common.loading')
            : exists
              ? t('admin.homeFleet.updatePrice')
              : t('admin.homeFleet.insert')}
        </button>
        {exists ? (
          <button
            type="button"
            disabled={saving}
            onClick={() => onDelete(live)}
            className="inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl border border-red-200 text-red-600 text-sm font-bold disabled:opacity-50"
            aria-label={t('admin.table.delete')}
          >
            <Trash2 className="w-4 h-4 shrink-0" />
          </button>
        ) : null}
      </div>
    </div>
  );
}
