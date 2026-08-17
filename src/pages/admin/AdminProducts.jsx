import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Package, Download, Plus, Eye, EyeOff, Trash2 } from 'lucide-react';
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
import { getDefaultProducts } from '../../data/contentSeeds';
import {
  FLEET_ROUTES,
  BOOKING_CAR_TYPES,
  SHORT_NAMES,
  getCarDisplayName,
  resolveCarThumb,
} from '../../data/staticData';
import { dedupeProducts, productDedupeKey } from '../../utils/productDedupe';
import AdminPageHeader from '../../components/admin/AdminPageHeader';
import AdminApplyButton from '../../components/admin/AdminApplyButton';
import AdminSelect from '../../components/admin/AdminSelect';
import AdminFilterBox from '../../components/admin/AdminFilterBox';
import AdminFilterChips from '../../components/admin/AdminFilterChips';
import AdminDocsHint from '../../components/admin/AdminDocsHint';
import AdminDataTable, { AdminTableRow, AdminTableCell, adminSnoColumn, AdminSnoCell } from '../../components/admin/AdminDataTable';
import { AdminCrudActions } from '../../components/admin/AdminTableActions';
import AdminPagination from '../../components/admin/AdminPagination';
import GlassCard from '../../components/ui/GlassCard';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import MediaUpload from '../../components/admin/MediaUpload';

const PAGE_SIZE = 10;
const VALID_ROUTE_IDS = new Set(FLEET_ROUTES.map((r) => r.id));

const ROUTE_OPTIONS = FLEET_ROUTES.map((r) => ({ id: r.id, label: r.title }));
const CAR_OPTIONS = BOOKING_CAR_TYPES.map((c) => ({
  id: c,
  label: SHORT_NAMES[c],
}));

const emptyForm = {
  nameEn: '',
  nameAr: '',
  price: '',
  originalPrice: '',
  descriptionEn: '',
  descriptionAr: '',
  imageUrl: '',
  routeId: 'ow-2-1',
  vehicleKey: '',
  passengers: 4,
  badgeEn: 'Between Cities',
  badgeAr: 'التنقل بين المدن',
  sortOrder: 0,
  active: true,
  hidePrice: false,
  tripType: 'one_way',
  type: 'fleet',
};

function isValidOneWayRoute(routeId) {
  const rid = String(routeId || '');
  return rid.startsWith('ow-') || VALID_ROUTE_IDS.has(rid);
}

/** Proper between-cities products only (excludes legacy route ids like "jeddah-makkah"). */
function isOneWayProduct(p) {
  if (p.tripType === 'round_trip' || p.tripType === 'hourly') return false;
  const rid = String(p.routeId || '');
  if (rid.startsWith('rt-') || rid.startsWith('hr-')) return false;
  if (!isValidOneWayRoute(rid)) return false;
  return p.tripType === 'one_way' || Boolean(rid);
}

/** Legacy / bad one_way rows that should be cleaned from Firebase. */
function isOrphanOneWayProduct(p) {
  if (p.tripType === 'round_trip' || p.tripType === 'hourly') return false;
  const rid = String(p.routeId || '');
  if (rid.startsWith('rt-') || rid.startsWith('hr-')) return false;
  if (isValidOneWayRoute(rid)) return false;
  return p.tripType === 'one_way' || Boolean(rid);
}

function carLabel(carKey, lang) {
  return getCarDisplayName(carKey, lang);
}

export default function AdminProducts() {
  const { t, i18n } = useTranslation();
  const { toast } = useToast();
  const publishSite = usePublishSiteContent();
  const lang = i18n.language?.startsWith('ar') ? 'ar' : 'en';
  const [form, setForm] = useState(emptyForm);
  const [editing, setEditing] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [routeFilter, setRouteFilter] = useState('all');
  const [seeding, setSeeding] = useState(false);
  const [cleaning, setCleaning] = useState(false);
  const { search, onSearchChange, query, isPending: searchPending } = useAdminInstantSearch();

  const { data: allProducts, loading, refresh } = useAdminDataLoader(
    () => getProductsByTripType('one_way'),
    [],
  );

  const rawOneWay = useMemo(() => allProducts || [], [allProducts]);

  const { unique: oneWayProducts, duplicates: duplicateDocs } = useMemo(
    () => dedupeProducts(rawOneWay.filter(isOneWayProduct)),
    [rawOneWay],
  );

  const orphanDocs = useMemo(
    () => rawOneWay.filter(isOrphanOneWayProduct),
    [rawOneWay],
  );

  const junkCount = duplicateDocs.length + orphanDocs.length;

  const list = useMemo(() => {
    return oneWayProducts.filter((p) => {
      const matchRoute = routeFilter === 'all' || p.routeId === routeFilter;
      const matchSearch = !query
        || p.nameEn?.toLowerCase().includes(query)
        || p.nameAr?.includes(query)
        || String(p.price || '').includes(query)
        || p.vehicleKey?.includes(query)
        || carLabel(p.vehicleKey?.split('-')[0] || '', lang).toLowerCase().includes(query);
      return matchRoute && matchSearch;
    });
  }, [oneWayProducts, query, routeFilter, lang]);

  // Paginate cars (not route groups) so a single route never dumps 70+ rows
  const { page, setPage, paginated, from, to, total, totalPages } = usePagination(list, PAGE_SIZE);
  useResetPageOnFilter(setPage, query, routeFilter);

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
    const route = ROUTE_OPTIONS.find((r) => r.id === routeId);
    return route ? (route.label[lang] || route.label.ar) : routeId;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const carKey = form.vehicleKey.split('-')[0] || form.vehicleKey;
    const payload = {
      ...form,
      carModelEn: getCarDisplayName(carKey, 'en'),
      carModelAr: getCarDisplayName(carKey, 'ar'),
      price: Number(form.price) || 0,
      originalPrice: Number(form.originalPrice) || Number(form.price) || 0,
      passengers: Number(form.passengers) || 4,
      sortOrder: Number(form.sortOrder) || 0,
      tripType: 'one_way',
    };
    try {
      if (editing) {
        await updateProduct(editing, payload);
        toast.success(t('admin.oneWay.updated'));
      } else {
        await createProduct(payload);
        toast.success(t('admin.oneWay.created'));
      }
      setForm(emptyForm);
      setEditing(null);
      setShowForm(false);
      await publishSite('soft');
      refresh();
    } catch {
      toast.error(t('common.error'));
    }
  };

  const handleEdit = (p) => {
    setForm({
      nameEn: p.nameEn || '',
      nameAr: p.nameAr || '',
      price: p.price || '',
      originalPrice: p.originalPrice || '',
      descriptionEn: p.descriptionEn || '',
      descriptionAr: p.descriptionAr || '',
      imageUrl: p.imageUrl || '',
      routeId: p.routeId || 'ow-2-1',
      vehicleKey: p.vehicleKey || '',
      passengers: p.passengers || 4,
      badgeEn: p.badgeEn || 'Between Cities',
      badgeAr: p.badgeAr || 'التنقل بين المدن',
      sortOrder: p.sortOrder || 0,
      active: p.active ?? true,
      hidePrice: p.hidePrice ?? false,
      tripType: 'one_way',
      type: p.type || 'fleet',
    });
    setEditing(p.id);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm(t('admin.confirmDelete'))) return;
    await deleteProduct(id);
    toast.success(t('admin.productDeleted'));
    await publishSite('soft');
    refresh();
  };

  const toggleActive = async (p) => {
    await updateProduct(p.id, { active: !p.active });
    await publishSite('soft');
    refresh();
  };

  const toggleHidePrice = async (p) => {
    await updateProduct(p.id, { hidePrice: !p.hidePrice });
    await publishSite('soft');
    refresh();
  };

  const handleRemoveDuplicates = async () => {
    if (!junkCount) {
      toast.info(t('admin.oneWay.noDuplicates'));
      return;
    }
    if (!window.confirm(t('admin.oneWay.confirmRemoveDuplicates', { count: junkCount }))) return;
    setCleaning(true);
    try {
      const toDelete = [...duplicateDocs, ...orphanDocs];
      const seen = new Set();
      let deleted = 0;
      for (const p of toDelete) {
        if (!p?.id || seen.has(p.id)) continue;
        seen.add(p.id);
        await deleteProduct(p.id);
        deleted += 1;
      }
      toast.success(t('admin.oneWay.duplicatesRemoved', { count: deleted }));
      await publishSite('soft');
      refresh();
    } catch {
      toast.error(t('common.error'));
    } finally {
      setCleaning(false);
    }
  };

  const handleSeed = async () => {
    setSeeding(true);
    try {
      const defaults = getDefaultProducts();
      const byKey = new Map(oneWayProducts.map((p) => [productDedupeKey(p), p]));
      let created = 0;
      let updated = 0;
      for (const item of defaults) {
        const key = productDedupeKey(item);
        const existing = byKey.get(key);
        if (existing) {
          await updateProduct(existing.id, {
            ...item,
            active: true,
          });
          updated += 1;
        } else {
          await createProduct(item);
          created += 1;
        }
      }
      const defaultKeys = new Set(defaults.map((d) => productDedupeKey(d)));
      for (const p of oneWayProducts) {
        if (!defaultKeys.has(productDedupeKey(p)) && p.active !== false) {
          await updateProduct(p.id, { active: false });
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

  const columns = [
    adminSnoColumn(t),
    { key: 'car', label: t('admin.oneWay.car') },
    { key: 'route', label: t('admin.oneWay.route') },
    { key: 'price', label: t('admin.oneWay.price') },
    { key: 'status', label: t('dashboard.status') },
    { key: 'priceVis', label: t('admin.oneWay.priceVisibility') },
    { key: 'actions', label: t('admin.table.actions'), className: 'text-end' },
  ];

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title={t('admin.nav.oneWay')}
        subtitle={t('admin.oneWay.subtitle')}
      >
        <div className="flex flex-wrap items-center gap-2">
          {junkCount > 0 && (
            <button
              type="button"
              onClick={handleRemoveDuplicates}
              disabled={cleaning}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-red-200 font-bold text-red-600 hover:bg-red-50 transition-all"
            >
              <Trash2 className="w-4 h-4" />
              {cleaning ? t('common.loading') : t('admin.oneWay.removeDuplicates', { count: junkCount })}
            </button>
          )}
          <button
            type="button"
            onClick={handleSeed}
            disabled={seeding}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-brand/20 font-bold text-brand hover:bg-brand/5 transition-all"
          >
            <Download className="w-4 h-4" />
            {seeding ? t('common.loading') : t('admin.oneWay.importDefaults')}
          </button>
          <button
            type="button"
            onClick={() => { setShowForm(true); setEditing(null); setForm(emptyForm); }}
            className="flex items-center gap-2 bg-gradient-to-r from-primary-500 to-emerald-600 text-white font-bold px-4 py-2.5 rounded-xl shadow-lg hover:scale-105 transition-all"
          >
            <Plus className="w-5 h-5" />
            {t('admin.oneWay.add')}
          </button>
        </div>
      </AdminPageHeader>

      <AdminDocsHint
        hintKey="admin.oneWay.docsHint"
        files={[
          { en: 'docs/between-cities-prices-en.md', ar: 'docs/between-cities-prices-ar.md', labelEn: 'Between cities', labelAr: 'التنقل بين المدن' },
        ]}
      />

      <AdminFilterBox
        title={t('admin.filters')}
        search={search}
        onSearchChange={onSearchChange}
        searchPending={searchPending}
        searchPlaceholder={t('admin.oneWay.searchPlaceholder')}
        filterSectionLabel={t('admin.filterByRoute')}
        activeCount={routeFilter === 'all' ? 0 : 1}
      >
        <AdminFilterChips
          value={routeFilter}
          onChange={setRouteFilter}
          options={[
            { key: 'all', label: t('admin.filterAll'), count: oneWayProducts.length, variant: 'green' },
            ...ROUTE_OPTIONS.map((r) => ({
              key: r.id,
              label: r.label[lang] || r.label.ar,
              count: oneWayProducts.filter((p) => p.routeId === r.id).length,
              variant: 'green',
            })),
          ]}
        />
      </AdminFilterBox>

      {showForm && (
        <GlassCard className="admin-form-card animate-fade-in-up">
          <form onSubmit={handleSubmit} className="space-y-4">
            <h2 className="font-black text-lg admin-heading flex items-center gap-2">
              <Package className="w-5 h-5 text-brand" />
              {editing ? t('admin.oneWay.edit') : t('admin.oneWay.add')}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input value={form.nameEn} onChange={(e) => setForm({ ...form, nameEn: e.target.value })} placeholder="Name (EN)" required className="admin-input" />
              <input value={form.nameAr} onChange={(e) => setForm({ ...form, nameAr: e.target.value })} placeholder="الاسم (AR)" required dir="rtl" className="admin-input" />
              <AdminSelect value={form.routeId} onChange={(e) => setForm({ ...form, routeId: e.target.value })} className="admin-input">
                {ROUTE_OPTIONS.map((r) => (
                  <option key={r.id} value={r.id}>{r.label[lang] || r.label.ar}</option>
                ))}
              </AdminSelect>
              <AdminSelect
                value={form.vehicleKey.split('-')[0] || ''}
                onChange={(e) => {
                  const car = e.target.value;
                  const parsed = String(form.routeId || '').replace(/^ow-/, '').replace(/-/g, '');
                  const suffix = parsed ? `ow${parsed}` : 'ow';
                  setForm({
                    ...form,
                    vehicleKey: car ? `${car}-${suffix}` : '',
                    passengers: car === 'hiace' ? 10 : car === 'staria' || car === 'yukon' ? 7 : 4,
                  });
                }}
                className="admin-input"
              >
                <option value="">{t('admin.oneWay.selectCar')}</option>
                {CAR_OPTIONS.map((c) => (
                  <option key={c.id} value={c.id}>{c.label[lang] || c.label.ar}</option>
                ))}
              </AdminSelect>
              <input value={form.vehicleKey} onChange={(e) => setForm({ ...form, vehicleKey: e.target.value })} placeholder={t('admin.products.vehicleKey')} className="admin-input" />
              <input type="number" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} placeholder={t('admin.oneWay.price')} required className="admin-input" />
              <input type="number" value={form.originalPrice} onChange={(e) => setForm({ ...form, originalPrice: e.target.value })} placeholder={t('admin.products.originalPrice')} className="admin-input" />
              <input type="number" value={form.passengers} onChange={(e) => setForm({ ...form, passengers: e.target.value })} placeholder={t('admin.products.passengers')} className="admin-input" />
              <input type="number" value={form.sortOrder} onChange={(e) => setForm({ ...form, sortOrder: e.target.value })} placeholder={t('admin.products.sortOrder')} className="admin-input" />
              <MediaUpload value={form.imageUrl} onChange={(url) => setForm({ ...form, imageUrl: url })} folder="products" allowUrl className="md:col-span-2" />
              <label className="flex items-center gap-2 px-4 py-3 rounded-xl border border-white/50 bg-white/50 dark:admin-surface">
                <input type="checkbox" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} className="w-4 h-4" />
                <span className="font-semibold">{t('admin.products.active')}</span>
              </label>
              <label className="flex items-center gap-2 px-4 py-3 rounded-xl border border-white/50 bg-white/50 dark:admin-surface">
                <input type="checkbox" checked={form.hidePrice} onChange={(e) => setForm({ ...form, hidePrice: e.target.checked })} className="w-4 h-4" />
                <span className="font-semibold">{t('admin.oneWay.hidePrice')}</span>
              </label>
            </div>
            <div className="flex gap-2">
              <AdminApplyButton type="submit" />
              <button type="button" onClick={() => setShowForm(false)} className="admin-btn-secondary">{t('common.cancel')}</button>
            </div>
          </form>
        </GlassCard>
      )}

      {loading ? <LoadingSpinner /> : (
        list.length === 0 ? (
          <GlassCard hover={false} className="text-center py-16">
            <Package className="w-14 h-14 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 mb-4">{t('admin.oneWay.noData')}</p>
            {junkCount > 0 ? (
              <button type="button" onClick={handleRemoveDuplicates} className="text-red-600 font-bold mb-3 block mx-auto">
                {t('admin.oneWay.removeDuplicates', { count: junkCount })}
              </button>
            ) : null}
            <button type="button" onClick={handleSeed} className="text-brand font-bold">{t('admin.oneWay.importDefaults')}</button>
          </GlassCard>
        ) : (
          <div className="space-y-4">
            {groupedPage.map(([routeId, items]) => (
            <div key={routeId} className="space-y-3 admin-page-block">
              <h2 className="font-black text-base admin-heading flex items-center gap-2">
                <Package className="w-4 h-4 text-gold" />
                <span className="line-clamp-2">{routeLabel(routeId)}</span>
                <span className="text-xs font-semibold text-gray-400 shrink-0">
                  ({oneWayProducts.filter((p) => p.routeId === routeId).length} {t('admin.oneWay.cars')})
                </span>
              </h2>
              <AdminDataTable columns={columns}>
                {items.map((p, idx) => {
                  const carKey = p.vehicleKey?.split('-')[0] || '';
                  return (
                    <AdminTableRow key={p.id}>
                      <AdminSnoCell n={idx + 1} />
                      <AdminTableCell>
                        <div className="flex items-center gap-2">
                          <img
                            src={resolveCarThumb(carKey, p.imageUrl)}
                            alt=""
                            className="w-10 h-10 rounded-lg object-cover shrink-0 bg-gray-100 dark:bg-white/10"
                            onError={(e) => {
                              e.currentTarget.src = resolveCarThumb(carKey, '');
                            }}
                          />
                          <div>
                            <span className="font-bold block">{carLabel(carKey, lang)}</span>
                            <span className="text-xs text-gray-500 line-clamp-1">{lang === 'ar' ? p.nameAr : p.nameEn}</span>
                          </div>
                        </div>
                      </AdminTableCell>
                      <AdminTableCell>
                        <span className="text-xs font-semibold">{routeLabel(p.routeId)}</span>
                      </AdminTableCell>
                      <AdminTableCell>
                        <span className="font-black text-brand">{p.price} {t('booking.sar')}</span>
                      </AdminTableCell>
                      <AdminTableCell>
                        <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${p.active !== false ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/25 dark:text-emerald-100' : 'bg-gray-200 text-gray-700 dark:bg-gray-600/60 dark:text-gray-100'}`}>
                          {p.active !== false ? t('admin.products.active') : t('admin.products.inactive')}
                        </span>
                      </AdminTableCell>
                      <AdminTableCell>
                        <button
                          type="button"
                          onClick={() => toggleHidePrice(p)}
                          className={`inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full ${p.hidePrice ? 'bg-amber-100 text-amber-900 dark:bg-amber-500/25 dark:text-amber-100' : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/25 dark:text-emerald-100'}`}
                        >
                          {p.hidePrice ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                          {p.hidePrice ? t('admin.oneWay.hidden') : t('admin.oneWay.visible')}
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
              <AdminPagination page={page} totalPages={totalPages} from={from} to={to} total={total} onPageChange={setPage} />
            </GlassCard>
          </div>
        )
      )}
    </div>
  );
}
