import { useState, useMemo, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Package,
  Download,
  Plus,
  Eye,
  EyeOff,
  Trash2,
  Plane,
  TrainFront,
  Clock,
  MapPin,
  Landmark,
} from 'lucide-react';
import {
  getProductsByTripType,
  createProduct,
  updateProduct,
  deleteProduct,
} from '../../firebase/admin';
import { usePublishSiteContent } from '../../hooks/usePublishSiteContent';
import { useAdminDataLoader } from '../../hooks/useAdminDataLoader';
import { usePagination } from '../../hooks/usePagination';
import { useAdminInstantSearch, useResetPageOnFilter } from '../../hooks/useAdminInstantSearch';
import { useToast } from '../../context/ToastContext';
import {
  getFleetService,
  carKeyOf,
  carOptionList,
  DEFAULT_FLEET_CAR,
} from '../../data/adminFleetServices';
import { getCarDisplayName, VEHICLE_IMAGES, resolveCarThumb } from '../../data/staticData';
import { dedupeFleetProducts, fleetCarRouteKey } from '../../utils/productDedupe';
import AdminPageHeader from './AdminPageHeader';
import AdminApplyButton from './AdminApplyButton';
import AdminSelect from './AdminSelect';
import AdminFilterBox from './AdminFilterBox';
import AdminFilterChips from './AdminFilterChips';
import AdminCarFilterStrip from './AdminCarFilterStrip';
import AdminDocsHint from './AdminDocsHint';
import AdminDataTable, { AdminTableRow, AdminTableCell } from './AdminDataTable';
import { AdminCrudActions } from './AdminTableActions';
import AdminPagination from './AdminPagination';
import GlassCard from '../ui/GlassCard';
import LoadingSpinner from '../ui/LoadingSpinner';
import MediaUpload from './MediaUpload';

const PAGE_SIZE = 10;

const SERVICE_ICONS = {
  cityToCity: MapPin,
  airport: Plane,
  train: TrainFront,
  withinCity: MapPin,
  hourly: Clock,
  ziyarat: Landmark,
};

function passengersForCar(car) {
  if (car === 'hiace') return 10;
  if (car === 'staria' || car === 'yukon') return 7;
  return 4;
}

function resolveVehicleKey(service, car, routeId) {
  if (!car || !routeId) return '';
  const defaults = service.getDefaults?.() || [];
  const hit = defaults.find(
    (d) => d.routeId === routeId && String(d.vehicleKey || '').split('-')[0] === car,
  );
  if (hit?.vehicleKey) return hit.vehicleKey;
  return `${car}-${routeId}`;
}

function makeEmptyForm(service) {
  const defaultCar = service.defaultCar || DEFAULT_FLEET_CAR;
  const base = {
    nameEn: '',
    nameAr: '',
    price: '',
    originalPrice: '',
    descriptionEn: '',
    descriptionAr: '',
    imageUrl: '',
    routeId: service.defaultRouteId,
    vehicleKey: resolveVehicleKey(service, defaultCar, service.defaultRouteId),
    passengers: passengersForCar(defaultCar),
    badgeEn: service.badgeEn || '',
    badgeAr: service.badgeAr || '',
    sortOrder: 0,
    active: true,
    hidePrice: false,
    tripType: service.tripType,
    type: 'fleet',
    fleetServiceId: service.id,
  };
  if (service.layout === 'round_trip') {
    return { ...base, pickupPrice: '', dropoffPrice: '' };
  }
  if (service.layout === 'hourly') {
    return { ...base, hourlyRate: '', hours: service.hoursOptions?.[0] || 4 };
  }
  return base;
}

function layoutI18nPrefix(layout) {
  if (layout === 'round_trip') return 'admin.roundTrip';
  if (layout === 'hourly') return 'admin.hourly';
  return 'admin.oneWay';
}

function carLabel(carKey, lang) {
  return getCarDisplayName(carKey, lang);
}

function AdminCarThumb({ carKey, imageUrl }) {
  const fallback = resolveCarThumb(carKey, '') || VEHICLE_IMAGES.camry;
  const [src, setSrc] = useState(() => resolveCarThumb(carKey, imageUrl) || fallback);

  useEffect(() => {
    setSrc(resolveCarThumb(carKey, imageUrl) || fallback);
  }, [carKey, imageUrl, fallback]);

  return (
    <img
      src={src}
      alt=""
      className="w-10 h-10 rounded-lg object-cover shrink-0 bg-gray-100 dark:bg-white/10"
      onError={() => {
        if (src !== fallback) setSrc(fallback);
      }}
    />
  );
}

const STATUS_BADGE_ON = 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/25 dark:text-emerald-100';
const STATUS_BADGE_OFF = 'bg-gray-200 text-gray-700 dark:bg-gray-600/60 dark:text-gray-100';
const VISIBLE_BADGE = 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/25 dark:text-emerald-100';
const HIDDEN_BADGE = 'bg-amber-100 text-amber-900 dark:bg-amber-500/25 dark:text-amber-100';

export default function AdminFleetServicePage({ serviceId }) {
  const service = getFleetService(serviceId);
  const { t, i18n } = useTranslation();
  const { toast } = useToast();
  const publishSite = usePublishSiteContent();
  const lang = i18n.language?.startsWith('ar') ? 'ar' : 'en';
  const layoutNs = layoutI18nPrefix(service.layout);
  const ServiceIcon = SERVICE_ICONS[service.id] || Package;

  const [form, setForm] = useState(() => makeEmptyForm(service));
  const [editing, setEditing] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [carFilter, setCarFilter] = useState(service.defaultCar || DEFAULT_FLEET_CAR);
  const [routeFilter, setRouteFilter] = useState('all');
  const [hoursFilter, setHoursFilter] = useState('all');
  const [seeding, setSeeding] = useState(false);
  const [cleaning, setCleaning] = useState(false);
  const { search, onSearchChange, query, isPending: searchPending } = useAdminInstantSearch();

  const routeOptions = useMemo(() => service.getRoutes(), [service]);
  const carOptions = useMemo(() => carOptionList(service.cars), [service.cars]);

  const { data: allProducts, loading, refresh } = useAdminDataLoader(
    () => getProductsByTripType(service.loadTripType),
    [service.loadTripType],
    { cacheKey: `products:${service.loadTripType}` },
  );

  const rawMatched = useMemo(
    () => (allProducts || []).filter(service.matchProduct),
    [allProducts, service],
  );

  const { unique: serviceProducts, duplicates: duplicateDocs } = useMemo(
    () => dedupeFleetProducts(rawMatched),
    [rawMatched],
  );

  const list = useMemo(() => {
    return serviceProducts.filter((p) => {
      const car = carKeyOf(p);
      const matchCar = carFilter === 'all' || car === carFilter;
      const matchRoute = routeFilter === 'all' || p.routeId === routeFilter;
      const matchHours = !service.hoursOptions
        || hoursFilter === 'all'
        || String(p.hours) === hoursFilter;
      const matchSearch = !query
        || p.nameEn?.toLowerCase().includes(query)
        || p.nameAr?.includes(query)
        || String(p.price || '').includes(query)
        || p.vehicleKey?.includes(query)
        || carLabel(car, lang).toLowerCase().includes(query);
      return matchCar && matchRoute && matchHours && matchSearch;
    });
  }, [serviceProducts, carFilter, routeFilter, hoursFilter, query, lang, service.hoursOptions]);

  const { page, setPage, paginated, from, to, total, totalPages } = usePagination(list, PAGE_SIZE);
  useResetPageOnFilter(
    setPage,
    query,
    carFilter,
    routeFilter,
    service.hoursOptions ? hoursFilter : undefined,
  );

  const groupedPage = useMemo(() => {
    const groups = {};
    for (const p of paginated) {
      const rid = p.routeId || 'unknown';
      if (!groups[rid]) groups[rid] = [];
      groups[rid].push(p);
    }
    return Object.entries(groups);
  }, [paginated]);

  const routeLabel = (routeId) => {
    const route = routeOptions.find((r) => r.id === routeId);
    return route ? (route.label[lang] || route.label.ar || routeId) : routeId;
  };

  const fleetT = (key, fallbackKey, opts) => t(key, { defaultValue: t(fallbackKey, opts), ...opts });

  const resetForm = () => {
    setForm(makeEmptyForm(service));
    setEditing(null);
  };

  const openAddForm = () => {
    resetForm();
    setShowForm(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const carKey = carKeyOf({ vehicleKey: form.vehicleKey }) || form.vehicleKey?.split('-')[0] || service.defaultCar || DEFAULT_FLEET_CAR;
    const imageUrl = String(form.imageUrl || '').trim() || resolveCarThumb(carKey, '');
    if (!imageUrl) {
      toast.error(t('common.error'));
      return;
    }
    const payload = {
      ...form,
      imageUrl,
      vehicleKey: form.vehicleKey || carKey,
      carModelEn: getCarDisplayName(carKey, 'en'),
      carModelAr: getCarDisplayName(carKey, 'ar'),
      price: Number(form.price) || 0,
      originalPrice: Number(form.originalPrice) || Number(form.price) || 0,
      passengers: Number(form.passengers) || passengersForCar(carKey),
      sortOrder: Number(form.sortOrder) || 0,
      tripType: service.tripType,
      fleetServiceId: service.id,
    };
    if (service.layout === 'round_trip') {
      const pickup = Number(form.pickupPrice) || 0;
      const dropoff = Number(form.dropoffPrice) || 0;
      payload.pickupPrice = pickup;
      payload.dropoffPrice = dropoff;
      payload.price = Number(form.price) || pickup + dropoff;
      payload.originalPrice = Number(form.originalPrice) || payload.price;
    }
    if (service.layout === 'hourly') {
      payload.hourlyRate = Number(form.hourlyRate) || 0;
      payload.hours = Number(form.hours) || service.hoursOptions?.[0] || 4;
    }
    try {
      if (editing) {
        await updateProduct(editing, payload);
        toast.success(fleetT('admin.fleet.updated', `${layoutNs}.updated`));
      } else {
        await createProduct(payload);
        toast.success(fleetT('admin.fleet.created', `${layoutNs}.created`));
      }
      resetForm();
      setShowForm(false);
      await publishSite('soft');
      refresh();
    } catch {
      toast.error(t('common.error'));
    }
  };

  const handleEdit = (p) => {
    const base = {
      nameEn: p.nameEn || '',
      nameAr: p.nameAr || '',
      price: p.price ?? '',
      originalPrice: p.originalPrice ?? '',
      descriptionEn: p.descriptionEn || '',
      descriptionAr: p.descriptionAr || '',
      imageUrl: p.imageUrl || '',
      routeId: p.routeId || service.defaultRouteId,
      vehicleKey: p.vehicleKey || '',
      passengers: p.passengers || passengersForCar(carKeyOf(p)),
      badgeEn: p.badgeEn || service.badgeEn || '',
      badgeAr: p.badgeAr || service.badgeAr || '',
      sortOrder: p.sortOrder || 0,
      active: p.active ?? true,
      hidePrice: p.hidePrice ?? false,
      tripType: service.tripType,
      type: p.type || 'fleet',
      fleetServiceId: service.id,
    };
    if (service.layout === 'round_trip') {
      setForm({
        ...base,
        pickupPrice: p.pickupPrice ?? '',
        dropoffPrice: p.dropoffPrice ?? '',
      });
    } else if (service.layout === 'hourly') {
      setForm({
        ...base,
        hourlyRate: p.hourlyRate ?? '',
        hours: p.hours ?? (service.hoursOptions?.[0] || 4),
      });
    } else {
      setForm(base);
    }
    setEditing(p.id);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm(t('admin.confirmDelete'))) return;
    try {
      await deleteProduct(id);
      toast.success(fleetT('admin.fleet.deleted', 'admin.productDeleted'));
      await publishSite('soft');
      refresh();
    } catch {
      toast.error(t('common.error'));
    }
  };

  const toggleActive = async (p) => {
    try {
      await updateProduct(p.id, { active: !p.active });
      await publishSite('soft');
      refresh();
    } catch {
      toast.error(t('common.error'));
    }
  };

  const toggleHidePrice = async (p) => {
    try {
      await updateProduct(p.id, { hidePrice: !p.hidePrice });
      await publishSite('soft');
      refresh();
    } catch {
      toast.error(t('common.error'));
    }
  };

  const handleImportDefaults = async () => {
    setSeeding(true);
    try {
      const defaults = service.getDefaults().filter(service.matchProduct);
      const byKey = new Map(serviceProducts.map((p) => [fleetCarRouteKey(p), p]));
      let created = 0;
      let updated = 0;
      for (const item of defaults) {
        const key = fleetCarRouteKey(item);
        const existing = byKey.get(key);
        if (existing) {
          await updateProduct(existing.id, { ...item, active: true });
          updated += 1;
        } else {
          await createProduct(item);
          created += 1;
        }
      }
      if (!created && !updated) {
        toast.info(t('admin.alreadyImported'));
        return;
      }
      toast.success(t('admin.importedCount', { count: created + updated }));
      await publishSite('soft');
      refresh();
    } catch {
      toast.error(t('common.error'));
    } finally {
      setSeeding(false);
    }
  };

  const handleRemoveDuplicates = async () => {
    if (!duplicateDocs.length) {
      toast.info(fleetT('admin.fleet.noDuplicates', 'admin.oneWay.noDuplicates'));
      return;
    }
    if (!window.confirm(
      t('admin.oneWay.confirmRemoveDuplicates', { count: duplicateDocs.length }),
    )) return;
    setCleaning(true);
    try {
      const seen = new Set();
      let deleted = 0;
      for (const p of duplicateDocs) {
        if (!p?.id || seen.has(p.id)) continue;
        seen.add(p.id);
        await deleteProduct(p.id);
        deleted += 1;
      }
      toast.success(fleetT('admin.fleet.duplicatesRemoved', 'admin.oneWay.duplicatesRemoved', { count: deleted }));
      await publishSite('soft');
      refresh();
    } catch {
      toast.error(t('common.error'));
    } finally {
      setCleaning(false);
    }
  };

  const syncRoundTripPrice = (pickup, dropoff) => {
    const p = Number(pickup) || 0;
    const d = Number(dropoff) || 0;
    setForm((f) => ({ ...f, pickupPrice: pickup, dropoffPrice: dropoff, price: String(p + d) }));
  };

  const handleCarSelect = (car) => {
    setForm({
      ...form,
      vehicleKey: resolveVehicleKey(service, car, form.routeId),
      passengers: passengersForCar(car),
    });
  };

  const handleRouteSelect = (routeId) => {
    const car = carKeyOf({ vehicleKey: form.vehicleKey });
    setForm({
      ...form,
      routeId,
      vehicleKey: car ? resolveVehicleKey(service, car, routeId) : form.vehicleKey,
    });
  };

  const columns = useMemo(() => {
    if (service.layout === 'round_trip') {
      return [
        { key: 'car', label: fleetT('admin.fleet.cars', `${layoutNs}.car`) },
        { key: 'pickup', label: t(`${layoutNs}.pickupPrice`) },
        { key: 'dropoff', label: t(`${layoutNs}.dropoffPrice`) },
        { key: 'total', label: t(`${layoutNs}.roundTripPrice`) },
        { key: 'status', label: t('dashboard.status') },
        { key: 'priceVis', label: t(`${layoutNs}.priceVisibility`) },
        { key: 'actions', label: t('admin.table.actions'), className: 'text-end' },
      ];
    }
    if (service.layout === 'hourly') {
      return [
        { key: 'car', label: fleetT('admin.fleet.cars', `${layoutNs}.car`) },
        { key: 'hourlyRate', label: t(`${layoutNs}.hourlyRate`) },
        { key: 'hours', label: t(`${layoutNs}.duration`) },
        { key: 'total', label: t(`${layoutNs}.packagePrice`) },
        { key: 'status', label: t('dashboard.status') },
        { key: 'priceVis', label: t(`${layoutNs}.priceVisibility`) },
        { key: 'actions', label: t('admin.table.actions'), className: 'text-end' },
      ];
    }
    return [
      { key: 'car', label: fleetT('admin.fleet.cars', `${layoutNs}.car`) },
      { key: 'route', label: t(`${layoutNs}.route`) },
      { key: 'price', label: t(`${layoutNs}.price`) },
      { key: 'status', label: t('dashboard.status') },
      { key: 'priceVis', label: t(`${layoutNs}.priceVisibility`) },
      { key: 'actions', label: t('admin.table.actions'), className: 'text-end' },
    ];
  }, [service.layout, layoutNs, t, fleetT]);

  const carCount = (carId) => {
    if (carId === 'all') return serviceProducts.length;
    return serviceProducts.filter((p) => carKeyOf(p) === carId).length;
  };

  const activeFilterCount = (routeFilter === 'all' ? 0 : 1)
    + (service.hoursOptions && hoursFilter !== 'all' ? 1 : 0);

  const renderPriceCells = (p) => {
    if (service.layout === 'round_trip') {
      return (
        <>
          <AdminTableCell>
            <span className="font-semibold text-emerald-600">{p.pickupPrice ?? '—'} {t('booking.sar')}</span>
          </AdminTableCell>
          <AdminTableCell>
            <span className="font-semibold text-blue-600">{p.dropoffPrice ?? '—'} {t('booking.sar')}</span>
          </AdminTableCell>
          <AdminTableCell>
            <span className="font-black text-brand">{p.price} {t('booking.sar')}</span>
          </AdminTableCell>
        </>
      );
    }
    if (service.layout === 'hourly') {
      return (
        <>
          <AdminTableCell>
            <span className="font-semibold text-emerald-600">{p.hourlyRate ?? '—'} {t('booking.sar')}/{t('booking.hour')}</span>
          </AdminTableCell>
          <AdminTableCell>
            <span className="font-bold">{p.hours ?? '—'} {t('booking.hours_plural')}</span>
          </AdminTableCell>
          <AdminTableCell>
            <span className="font-black text-brand">{p.price} {t('booking.sar')}</span>
          </AdminTableCell>
        </>
      );
    }
    return (
      <>
        <AdminTableCell>
          <span className="text-xs font-semibold">{routeLabel(p.routeId)}</span>
        </AdminTableCell>
        <AdminTableCell>
          <span className="font-black text-brand">{p.price} {t('booking.sar')}</span>
        </AdminTableCell>
      </>
    );
  };

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title={t(service.titleKey, { defaultValue: t(service.navKey, { defaultValue: service.id }) })}
        subtitle={t(service.subtitleKey, { defaultValue: t(`${layoutNs}.subtitle`) })}
      >
        <div className="flex flex-wrap items-center gap-2">
          {service.cmsLink && (
            <Link
              to={service.cmsLink}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-gray-200 text-xs font-bold text-gray-600 hover:bg-gray-50 transition-all"
            >
              {fleetT('admin.fleet.editCms', 'admin.edit')}
            </Link>
          )}
          {duplicateDocs.length > 0 && (
            <button
              type="button"
              onClick={handleRemoveDuplicates}
              disabled={cleaning}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-red-200 font-bold text-red-600 hover:bg-red-50 transition-all"
            >
              <Trash2 className="w-4 h-4" />
              {cleaning
                ? t('common.loading')
                : fleetT('admin.fleet.removeDuplicates', 'admin.oneWay.removeDuplicates', { count: duplicateDocs.length })}
            </button>
          )}
          <button
            type="button"
            onClick={handleImportDefaults}
            disabled={seeding}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-brand/20 font-bold text-brand hover:bg-brand/5 transition-all"
          >
            <Download className="w-4 h-4" />
            {seeding ? t('common.loading') : fleetT('admin.fleet.importDefaults', `${layoutNs}.importDefaults`)}
          </button>
          <button
            type="button"
            onClick={openAddForm}
            className="flex items-center gap-2 bg-gradient-to-r from-primary-500 to-emerald-600 text-white font-bold px-4 py-2.5 rounded-xl shadow-lg hover:scale-105 transition-all"
          >
            <Plus className="w-5 h-5" />
            {fleetT('admin.fleet.add', `${layoutNs}.add`)}
          </button>
        </div>
      </AdminPageHeader>

      {service.docsFiles?.length > 0 && (
        <AdminDocsHint
          hintKey={service.docsHintKey}
          files={service.docsFiles}
        />
      )}

      <AdminCarFilterStrip
        cars={carOptions}
        value={carFilter}
        onChange={setCarFilter}
        countFor={carCount}
      />

      <AdminFilterBox
        title={t('admin.filters')}
        search={search}
        onSearchChange={onSearchChange}
        searchPending={searchPending}
        searchPlaceholder={t(service.searchKey, { defaultValue: t(`${layoutNs}.searchPlaceholder`) })}
        activeCount={activeFilterCount}
        defaultOpen={false}
      >
        <AdminFilterChips
          label={t('admin.fleet.routes', { defaultValue: t(`${layoutNs}.route`) })}
          value={routeFilter}
          onChange={setRouteFilter}
          options={[
            { key: 'all', label: t('admin.filterAll'), count: serviceProducts.length, variant: 'green' },
            ...routeOptions.map((r) => ({
              key: r.id,
              label: r.label[lang] || r.label.ar,
              count: serviceProducts.filter((p) => p.routeId === r.id).length,
              variant: 'gold',
            })),
          ]}
        />

        {service.hoursOptions && (
          <AdminFilterChips
            label={t(`${layoutNs}.duration`)}
            value={hoursFilter}
            onChange={setHoursFilter}
            options={[
              { key: 'all', label: t('admin.filterAll'), count: serviceProducts.length, variant: 'green' },
              ...service.hoursOptions.map((h) => ({
                key: String(h),
                label: `${h} ${t('booking.hours_plural')}`,
                count: serviceProducts.filter((p) => p.hours === h).length,
                variant: 'amber',
              })),
            ]}
          />
        )}
      </AdminFilterBox>

      {showForm && (
        <GlassCard className="admin-form-card animate-fade-in-up">
          <form onSubmit={handleSubmit} className="space-y-4">
            <h2 className="font-black text-lg admin-heading flex items-center gap-2">
              <ServiceIcon className="w-5 h-5 text-brand" />
              {editing ? t(`${layoutNs}.edit`) : fleetT('admin.fleet.add', `${layoutNs}.add`)}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input
                value={form.nameEn}
                onChange={(e) => setForm({ ...form, nameEn: e.target.value })}
                placeholder="Name (EN)"
                required
                className="admin-input"
              />
              <input
                value={form.nameAr}
                onChange={(e) => setForm({ ...form, nameAr: e.target.value })}
                placeholder="الاسم (AR)"
                required
                dir="rtl"
                className="admin-input"
              />
              <AdminSelect
                value={form.routeId}
                onChange={(e) => handleRouteSelect(e.target.value)}
                className="admin-input"
              >
                {routeOptions.map((r) => (
                  <option key={r.id} value={r.id}>{r.label[lang] || r.label.ar}</option>
                ))}
              </AdminSelect>
              <AdminSelect
                value={carKeyOf({ vehicleKey: form.vehicleKey })}
                onChange={(e) => handleCarSelect(e.target.value)}
                className="admin-input"
                required
              >
                <option value="">{fleetT('admin.fleet.selectCar', `${layoutNs}.selectCar`)}</option>
                {carOptions.map((c) => (
                  <option key={c.id} value={c.id}>{c.name(lang)}</option>
                ))}
              </AdminSelect>
              <input
                value={form.vehicleKey}
                onChange={(e) => setForm({ ...form, vehicleKey: e.target.value })}
                placeholder={t('admin.products.vehicleKey')}
                className="admin-input"
              />
              {service.layout === 'hourly' && (
                <AdminSelect
                  value={form.hours}
                  onChange={(e) => setForm({ ...form, hours: Number(e.target.value) })}
                  className="admin-input"
                >
                  {(service.hoursOptions || [4, 8, 12]).map((h) => (
                    <option key={h} value={h}>{h} {t('booking.hours_plural')}</option>
                  ))}
                </AdminSelect>
              )}
              {service.layout === 'round_trip' && (
                <>
                  <input
                    type="number"
                    value={form.pickupPrice}
                    onChange={(e) => syncRoundTripPrice(e.target.value, form.dropoffPrice)}
                    placeholder={t(`${layoutNs}.pickupPrice`)}
                    required
                    className="admin-input"
                  />
                  <input
                    type="number"
                    value={form.dropoffPrice}
                    onChange={(e) => syncRoundTripPrice(form.pickupPrice, e.target.value)}
                    placeholder={t(`${layoutNs}.dropoffPrice`)}
                    required
                    className="admin-input"
                  />
                </>
              )}
              {service.layout === 'hourly' && (
                <input
                  type="number"
                  value={form.hourlyRate}
                  onChange={(e) => setForm({ ...form, hourlyRate: e.target.value })}
                  placeholder={t(`${layoutNs}.hourlyRate`)}
                  className="admin-input"
                />
              )}
              <input
                type="number"
                value={form.price}
                onChange={(e) => setForm({ ...form, price: e.target.value })}
                placeholder={
                  service.layout === 'hourly'
                    ? t(`${layoutNs}.packagePrice`)
                    : service.layout === 'round_trip'
                      ? t(`${layoutNs}.roundTripPrice`)
                      : t(`${layoutNs}.price`)
                }
                required
                className="admin-input"
              />
              <input
                type="number"
                value={form.originalPrice}
                onChange={(e) => setForm({ ...form, originalPrice: e.target.value })}
                placeholder={t('admin.products.originalPrice')}
                className="admin-input"
              />
              <input
                type="number"
                value={form.passengers}
                onChange={(e) => setForm({ ...form, passengers: e.target.value })}
                placeholder={t('admin.products.passengers')}
                className="admin-input"
              />
              <input
                type="number"
                value={form.sortOrder}
                onChange={(e) => setForm({ ...form, sortOrder: e.target.value })}
                placeholder={t('admin.products.sortOrder')}
                className="admin-input"
              />
              <MediaUpload
                value={form.imageUrl}
                onChange={(url) => setForm({ ...form, imageUrl: url })}
                folder="products"
                allowUrl
                className="md:col-span-2"
              />
              <label className="flex items-center gap-2 px-4 py-3 rounded-xl border border-white/50 bg-white/50 dark:admin-surface">
                <input
                  type="checkbox"
                  checked={form.active}
                  onChange={(e) => setForm({ ...form, active: e.target.checked })}
                  className="w-4 h-4"
                />
                <span className="font-semibold">{t('admin.products.active')}</span>
              </label>
              <label className="flex items-center gap-2 px-4 py-3 rounded-xl border border-white/50 bg-white/50 dark:admin-surface">
                <input
                  type="checkbox"
                  checked={form.hidePrice}
                  onChange={(e) => setForm({ ...form, hidePrice: e.target.checked })}
                  className="w-4 h-4"
                />
                <span className="font-semibold">{fleetT('admin.fleet.hidePrice', `${layoutNs}.hidePrice`)}</span>
              </label>
            </div>
            <div className="flex gap-2">
              <AdminApplyButton type="submit" />
              <button type="button" onClick={() => setShowForm(false)} className="admin-btn-secondary">
                {t('common.cancel')}
              </button>
            </div>
          </form>
        </GlassCard>
      )}

      {loading ? (
        <LoadingSpinner />
      ) : list.length === 0 ? (
        <GlassCard hover={false} className="text-center py-16">
          <ServiceIcon className="w-14 h-14 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500 mb-4">{fleetT('admin.fleet.noData', `${layoutNs}.noData`)}</p>
          {duplicateDocs.length > 0 && (
            <button
              type="button"
              onClick={handleRemoveDuplicates}
              className="text-red-600 font-bold mb-3 block mx-auto"
            >
              {fleetT('admin.fleet.removeDuplicates', 'admin.oneWay.removeDuplicates', { count: duplicateDocs.length })}
            </button>
          )}
          <button type="button" onClick={handleImportDefaults} className="text-brand font-bold">
            {fleetT('admin.fleet.importDefaults', `${layoutNs}.importDefaults`)}
          </button>
        </GlassCard>
      ) : (
        <div className="space-y-4">
          {groupedPage.map(([routeId, items]) => (
            <div key={routeId} className="space-y-3 admin-page-block">
              <h2 className="font-black text-base admin-heading flex items-center gap-2">
                <ServiceIcon className="w-4 h-4 text-gold" />
                <span className="line-clamp-2">{routeLabel(routeId)}</span>
                <span className="text-xs font-semibold text-gray-400 shrink-0">
                  ({serviceProducts.filter((p) => p.routeId === routeId).length}{' '}
                  {fleetT('admin.fleet.cars', `${layoutNs}.cars`)})
                </span>
              </h2>
              <AdminDataTable columns={columns}>
                {items.map((p) => {
                  const car = carKeyOf(p);
                  return (
                    <AdminTableRow key={p.id}>
                      <AdminTableCell>
                        <div className="flex items-center gap-2">
                          <AdminCarThumb carKey={car} imageUrl={p.imageUrl} />
                          <div>
                            <span className="font-bold block">{carLabel(car, lang)}</span>
                            <span className="text-xs text-gray-500 line-clamp-1">
                              {lang === 'ar' ? p.nameAr : p.nameEn}
                            </span>
                          </div>
                        </div>
                      </AdminTableCell>
                      {renderPriceCells(p)}
                      <AdminTableCell>
                        <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${p.active !== false ? STATUS_BADGE_ON : STATUS_BADGE_OFF}`}>
                          {p.active !== false ? t('admin.products.active') : t('admin.products.inactive')}
                        </span>
                      </AdminTableCell>
                      <AdminTableCell>
                        <button
                          type="button"
                          onClick={() => toggleHidePrice(p)}
                          className={`inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full ${p.hidePrice ? HIDDEN_BADGE : VISIBLE_BADGE}`}
                        >
                          {p.hidePrice ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                          {p.hidePrice
                            ? fleetT('admin.fleet.hidden', `${layoutNs}.hidden`)
                            : fleetT('admin.fleet.visible', `${layoutNs}.visible`)}
                        </button>
                      </AdminTableCell>
                      <AdminTableCell className="text-end">
                        <AdminCrudActions
                          active={p.active}
                          onToggle={() => toggleActive(p)}
                          onEdit={() => handleEdit(p)}
                          onDelete={() => handleDelete(p.id)}
                        />
                      </AdminTableCell>
                    </AdminTableRow>
                  );
                })}
              </AdminDataTable>
            </div>
          ))}
          <GlassCard hover={false} className="!p-0 overflow-hidden">
            <AdminPagination
              page={page}
              totalPages={totalPages}
              from={from}
              to={to}
              total={total}
              onPageChange={setPage}
            />
          </GlassCard>
        </div>
      )}
    </div>
  );
}
