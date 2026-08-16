import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowLeftRight, Download, Plus, Eye, EyeOff } from 'lucide-react';
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
import { getDefaultRoundTripProducts } from '../../data/contentSeeds';
import { ROUND_TRIP_TRAIN_STATIONS, ROUND_TRIP_CARS, getCarDisplayName } from '../../data/staticData';
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

const PAGE_SIZE = 4;

const ROUTE_OPTIONS = ROUND_TRIP_TRAIN_STATIONS.map((r) => ({
  id: r.id,
  label: {
    ar: `${r.category === 'airport' ? 'مطار · ' : 'محطة · '}${r.title.ar}`,
    en: `${r.category === 'airport' ? 'Airport · ' : 'Train · '}${r.title.en}`,
  },
  category: r.category || 'train',
}));
const CAR_OPTIONS = ROUND_TRIP_CARS.map((c) => ({ id: c, label: { ar: getCarDisplayName(c, 'ar'), en: getCarDisplayName(c, 'en') } }));

const emptyForm = {
  nameEn: '',
  nameAr: '',
  price: '',
  originalPrice: '',
  pickupPrice: '',
  dropoffPrice: '',
  descriptionEn: '',
  descriptionAr: '',
  imageUrl: '',
  routeId: 'rt-jeddah-makkah',
  vehicleKey: '',
  passengers: 4,
  badgeEn: 'Round Trip',
  badgeAr: 'ذهاب وعودة',
  sortOrder: 0,
  active: true,
  hidePrice: false,
  tripType: 'round_trip',
  type: 'fleet',
};

function carLabel(carKey, lang) {
  return getCarDisplayName(carKey, lang);
}

export default function AdminRoundTrip() {
  const { t, i18n } = useTranslation();
  const { toast } = useToast();
  const publishSite = usePublishSiteContent();
  const lang = i18n.language?.startsWith('ar') ? 'ar' : 'en';
  const [form, setForm] = useState(emptyForm);
  const [editing, setEditing] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [routeFilter, setRouteFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all'); // all | airport | train
  const [seeding, setSeeding] = useState(false);
  const { search, onSearchChange, query, isPending: searchPending } = useAdminInstantSearch();

  const { data: allProducts, loading, refresh } = useAdminDataLoader(
    () => getProductsByTripType('round_trip'),
    [],
  );

  const roundTripProducts = useMemo(
    () => (allProducts || []).filter((p) => p.tripType === 'round_trip' || String(p.routeId || '').startsWith('rt-')),
    [allProducts],
  );

  const list = useMemo(() => {
    return roundTripProducts.filter((p) => {
      const routeMeta = ROUTE_OPTIONS.find((r) => r.id === p.routeId);
      const cat = routeMeta?.category || (String(p.routeId || '').includes('airport') ? 'airport' : 'train');
      const matchCategory = categoryFilter === 'all' || cat === categoryFilter;
      const matchRoute = routeFilter === 'all' || p.routeId === routeFilter;
      const matchSearch = !query
        || p.nameEn?.toLowerCase().includes(query)
        || p.nameAr?.includes(query)
        || String(p.price || '').includes(query)
        || p.vehicleKey?.includes(query);
      return matchCategory && matchRoute && matchSearch;
    });
  }, [roundTripProducts, query, routeFilter, categoryFilter]);

  const grouped = useMemo(() => {
    const groups = {};
    for (const p of list) {
      const rid = p.routeId || 'unknown';
      if (!groups[rid]) groups[rid] = [];
      groups[rid].push(p);
    }
    return groups;
  }, [list]);

  const groupEntries = useMemo(() => Object.entries(grouped), [grouped]);
  const { page, setPage, paginated, from, to, total, totalPages } = usePagination(groupEntries, PAGE_SIZE);
  useResetPageOnFilter(setPage, query, routeFilter, categoryFilter);

  const routeLabel = (routeId) => {
    const route = ROUTE_OPTIONS.find((r) => r.id === routeId);
    return route ? (route.label[lang] || route.label.ar) : routeId;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const pickup = Number(form.pickupPrice) || 0;
    const dropoff = Number(form.dropoffPrice) || 0;
    const payload = {
      ...form,
      carModelEn: getCarDisplayName(form.vehicleKey.split('-')[0] || form.vehicleKey, 'en'),
      carModelAr: getCarDisplayName(form.vehicleKey.split('-')[0] || form.vehicleKey, 'ar'),
      price: Number(form.price) || pickup + dropoff,
      originalPrice: Number(form.originalPrice) || Number(form.price) || pickup + dropoff,
      pickupPrice: pickup,
      dropoffPrice: dropoff,
      passengers: Number(form.passengers) || 4,
      sortOrder: Number(form.sortOrder) || 0,
      tripType: 'round_trip',
    };
    try {
      if (editing) {
        await updateProduct(editing, payload);
        toast.success(t('admin.roundTrip.updated'));
      } else {
        await createProduct(payload);
        toast.success(t('admin.roundTrip.created'));
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
      pickupPrice: p.pickupPrice || '',
      dropoffPrice: p.dropoffPrice || '',
      descriptionEn: p.descriptionEn || '',
      descriptionAr: p.descriptionAr || '',
      imageUrl: p.imageUrl || '',
      routeId: p.routeId || 'rt-jeddah-makkah',
      vehicleKey: p.vehicleKey || '',
      passengers: p.passengers || 4,
      badgeEn: p.badgeEn || 'Round Trip',
      badgeAr: p.badgeAr || 'ذهاب وعودة',
      sortOrder: p.sortOrder || 0,
      active: p.active ?? true,
      hidePrice: p.hidePrice ?? false,
      tripType: 'round_trip',
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

  const handleSeed = async () => {
    setSeeding(true);
    try {
      const defaults = getDefaultRoundTripProducts();
      const existingKeys = new Set(roundTripProducts.map((p) => p.vehicleKey));
      const toImport = defaults.filter((d) => !existingKeys.has(d.vehicleKey));
      if (!toImport.length) {
        toast.info(t('admin.alreadyImported'));
        return;
      }
      await Promise.all(toImport.map((item) => createProduct(item)));
      toast.success(t('admin.importedCount', { count: toImport.length }));
      await publishSite('soft');
      refresh();
    } catch {
      toast.error(t('common.error'));
    } finally {
      setSeeding(false);
    }
  };

  const syncRoundTripPrice = (pickup, dropoff) => {
    const p = Number(pickup) || 0;
    const d = Number(dropoff) || 0;
    setForm((f) => ({ ...f, pickupPrice: pickup, dropoffPrice: dropoff, price: String(p + d) }));
  };

  const columns = [
    adminSnoColumn(t),
    { key: 'car', label: t('admin.roundTrip.car') },
    { key: 'pickup', label: t('admin.roundTrip.pickupPrice') },
    { key: 'dropoff', label: t('admin.roundTrip.dropoffPrice') },
    { key: 'total', label: t('admin.roundTrip.roundTripPrice') },
    { key: 'status', label: t('dashboard.status') },
    { key: 'priceVis', label: t('admin.roundTrip.priceVisibility') },
    { key: 'actions', label: t('admin.table.actions'), className: 'text-end' },
  ];

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title={t('admin.nav.roundTrip')}
        subtitle={t('admin.roundTrip.subtitle')}
      >
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleSeed}
            disabled={seeding}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-brand/20 font-bold text-brand hover:bg-brand/5 transition-all"
          >
            <Download className="w-4 h-4" />
            {seeding ? t('common.loading') : t('admin.roundTrip.importDefaults')}
          </button>
          <button
            type="button"
            onClick={() => { setShowForm(true); setEditing(null); setForm(emptyForm); }}
            className="flex items-center gap-2 bg-gradient-to-r from-primary-500 to-emerald-600 text-white font-bold px-4 py-2.5 rounded-xl shadow-lg hover:scale-105 transition-all"
          >
            <Plus className="w-5 h-5" />
            {t('admin.roundTrip.add')}
          </button>
        </div>
      </AdminPageHeader>

      <AdminDocsHint
        hintKey="admin.roundTrip.docsHint"
        files={[
          { en: 'docs/airport-pickup-dropoff-prices-en.md', ar: 'docs/airport-pickup-dropoff-prices-ar.md', labelEn: 'Airports', labelAr: 'المطارات' },
          { en: 'docs/round-trip-train-station-prices-en.md', ar: 'docs/round-trip-train-station-prices-ar.md', labelEn: 'Train stations', labelAr: 'محطات القطار' },
        ]}
      />

      <AdminFilterBox
        title={t('admin.filters')}
        search={search}
        onSearchChange={onSearchChange}
        searchPending={searchPending}
        searchPlaceholder={t('admin.roundTrip.searchPlaceholder')}
        filterSectionLabel={t('admin.filterByCategory')}
        activeCount={(categoryFilter === 'all' ? 0 : 1) + (routeFilter === 'all' ? 0 : 1)}
      >
        <AdminFilterChips
          value={categoryFilter}
          onChange={(id) => { setCategoryFilter(id); setRouteFilter('all'); }}
          options={[
            { id: 'all', label: lang === 'ar' ? 'الكل' : 'All' },
            { id: 'airport', label: lang === 'ar' ? 'المطارات' : 'Airports' },
            { id: 'train', label: lang === 'ar' ? 'محطات القطار' : 'Train stations' },
          ].map((c) => ({
            key: c.id,
            label: c.label,
            count: c.id === 'all'
              ? roundTripProducts.length
              : roundTripProducts.filter((p) => {
                const meta = ROUTE_OPTIONS.find((r) => r.id === p.routeId);
                const cat = meta?.category || (String(p.routeId || '').includes('airport') ? 'airport' : 'train');
                return cat === c.id;
              }).length,
            variant: 'green',
          }))}
        />
        <AdminFilterChips
          label={t('admin.filterByRoute')}
          value={routeFilter}
          onChange={setRouteFilter}
          options={[
            {
              key: 'all',
              label: lang === 'ar' ? 'كل المسارات' : 'All routes',
              variant: 'amber',
            },
            ...ROUTE_OPTIONS
              .filter((r) => categoryFilter === 'all' || r.category === categoryFilter)
              .map((r) => ({
                key: r.id,
                label: r.label[lang]?.replace(/^(Airport|Train|مطار|محطة) · /, '')?.split('↔')[0]?.trim() || r.id,
                count: roundTripProducts.filter((p) => p.routeId === r.id).length,
                variant: 'amber',
              })),
          ]}
        />
      </AdminFilterBox>

      {showForm && (
        <GlassCard className="admin-form-card animate-fade-in-up">
          <form onSubmit={handleSubmit} className="space-y-4">
            <h2 className="font-black text-lg admin-heading flex items-center gap-2">
              <ArrowLeftRight className="w-5 h-5 text-brand" />
              {editing ? t('admin.roundTrip.edit') : t('admin.roundTrip.add')}
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
                onChange={(e) => setForm({ ...form, vehicleKey: e.target.value })}
                className="admin-input"
              >
                <option value="">{t('admin.roundTrip.selectCar')}</option>
                {CAR_OPTIONS.map((c) => (
                  <option key={c.id} value={c.id}>{c.label[lang] || c.label.ar}</option>
                ))}
              </AdminSelect>
              <input value={form.vehicleKey} onChange={(e) => setForm({ ...form, vehicleKey: e.target.value })} placeholder={t('admin.products.vehicleKey')} className="admin-input" />
              <input type="number" value={form.passengers} onChange={(e) => setForm({ ...form, passengers: e.target.value })} placeholder={t('admin.products.passengers')} className="admin-input" />
              <input
                type="number"
                value={form.pickupPrice}
                onChange={(e) => syncRoundTripPrice(e.target.value, form.dropoffPrice)}
                placeholder={t('admin.roundTrip.pickupPrice')}
                required
                className="admin-input"
              />
              <input
                type="number"
                value={form.dropoffPrice}
                onChange={(e) => syncRoundTripPrice(form.pickupPrice, e.target.value)}
                placeholder={t('admin.roundTrip.dropoffPrice')}
                required
                className="admin-input"
              />
              <input type="number" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} placeholder={t('admin.roundTrip.roundTripPrice')} required className="admin-input" />
              <input type="number" value={form.originalPrice} onChange={(e) => setForm({ ...form, originalPrice: e.target.value })} placeholder={t('admin.products.originalPrice')} className="admin-input" />
              <input type="number" value={form.sortOrder} onChange={(e) => setForm({ ...form, sortOrder: e.target.value })} placeholder={t('admin.products.sortOrder')} className="admin-input" />
              <MediaUpload value={form.imageUrl} onChange={(url) => setForm({ ...form, imageUrl: url })} folder="products" allowUrl className="md:col-span-2" />
              <label className="flex items-center gap-2 px-4 py-3 rounded-xl border border-white/50 bg-white/50 dark:admin-surface">
                <input type="checkbox" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} className="w-4 h-4" />
                <span className="font-semibold">{t('admin.products.active')}</span>
              </label>
              <label className="flex items-center gap-2 px-4 py-3 rounded-xl border border-white/50 bg-white/50 dark:admin-surface">
                <input type="checkbox" checked={form.hidePrice} onChange={(e) => setForm({ ...form, hidePrice: e.target.checked })} className="w-4 h-4" />
                <span className="font-semibold">{t('admin.roundTrip.hidePrice')}</span>
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
        Object.keys(grouped).length === 0 ? (
          <GlassCard hover={false} className="text-center py-16">
            <ArrowLeftRight className="w-14 h-14 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 mb-4">{t('admin.roundTrip.noData')}</p>
            <button type="button" onClick={handleSeed} className="text-brand font-bold">{t('admin.roundTrip.importDefaults')}</button>
          </GlassCard>
        ) : (
          <div className="space-y-4">
            {paginated.map(([routeId, items]) => (
            <div key={routeId} className="space-y-3 admin-page-block">
              <h2 className="font-black text-base admin-heading flex items-center gap-2">
                <ArrowLeftRight className="w-4 h-4 text-gold" />
                {routeLabel(routeId)}
                <span className="text-xs font-semibold text-gray-400">({items.length} {t('admin.roundTrip.cars')})</span>
              </h2>
              <AdminDataTable columns={columns}>
                {items.map((p, idx) => {
                  const carKey = p.vehicleKey?.split('-')[0] || '';
                  return (
                    <AdminTableRow key={p.id}>
                      <AdminSnoCell n={idx + 1} />
                      <AdminTableCell>
                        <span className="font-bold block">{carLabel(carKey, lang)}</span>
                        <span className="text-xs text-gray-500">{lang === 'ar' ? p.nameAr : p.nameEn}</span>
                      </AdminTableCell>
                      <AdminTableCell>
                        <span className="font-semibold text-emerald-600">{p.pickupPrice ?? '—'} {t('booking.sar')}</span>
                      </AdminTableCell>
                      <AdminTableCell>
                        <span className="font-semibold text-blue-600">{p.dropoffPrice ?? '—'} {t('booking.sar')}</span>
                      </AdminTableCell>
                      <AdminTableCell>
                        <span className="font-black text-brand">{p.price} {t('booking.sar')}</span>
                      </AdminTableCell>
                      <AdminTableCell>
                        <span className={`text-xs font-bold px-2 py-1 rounded-full ${p.active ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
                          {p.active ? t('admin.products.active') : t('admin.products.inactive')}
                        </span>
                      </AdminTableCell>
                      <AdminTableCell>
                        <button
                          type="button"
                          onClick={() => toggleHidePrice(p)}
                          className={`inline-flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-full ${p.hidePrice ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}
                          title={p.hidePrice ? t('admin.roundTrip.priceHidden') : t('admin.roundTrip.priceVisible')}
                        >
                          {p.hidePrice ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                          {p.hidePrice ? t('admin.roundTrip.hidden') : t('admin.roundTrip.visible')}
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
