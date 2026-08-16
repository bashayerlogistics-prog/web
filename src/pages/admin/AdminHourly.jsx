import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Clock, Download, Plus, Eye, EyeOff } from 'lucide-react';
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
import { getDefaultHourlyProducts } from '../../data/contentSeeds';
import { getCarDisplayName } from '../../data/staticData';
import {
  HOURLY_FLEET_ROUTES,
  HOURLY_CARS,
  HOURLY_DURATIONS,
  HOURLY_BASE_CITIES,
} from '../../data/hourlyPricing';
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

const ROUTE_OPTIONS = HOURLY_FLEET_ROUTES.map((r) => ({ id: r.id, label: r.title }));
const CAR_OPTIONS = HOURLY_CARS.map((c) => ({
  id: c,
  label: { ar: getCarDisplayName(c, 'ar'), en: getCarDisplayName(c, 'en') },
}));

const emptyForm = {
  nameEn: '',
  nameAr: '',
  price: '',
  originalPrice: '',
  hourlyRate: '',
  hours: 4,
  descriptionEn: '',
  descriptionAr: '',
  imageUrl: '',
  routeId: 'hr-4-taif-internal',
  vehicleKey: '',
  passengers: 4,
  badgeEn: '4 Hours',
  badgeAr: '4 ساعات',
  sortOrder: 0,
  active: true,
  hidePrice: false,
  tripType: 'hourly',
  type: 'fleet',
};

function carLabel(carKey, lang) {
  return getCarDisplayName(carKey, lang);
}

export default function AdminHourly() {
  const { t, i18n } = useTranslation();
  const { toast } = useToast();
  const publishSite = usePublishSiteContent();
  const lang = i18n.language?.startsWith('ar') ? 'ar' : 'en';
  const [form, setForm] = useState(emptyForm);
  const [editing, setEditing] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [hoursFilter, setHoursFilter] = useState('all');
  const [routeFilter, setRouteFilter] = useState('all');
  const [seeding, setSeeding] = useState(false);
  const { search, onSearchChange, query, isPending: searchPending } = useAdminInstantSearch();

  const { data: allProducts, loading, refresh } = useAdminDataLoader(
    () => getProductsByTripType('hourly'),
    [],
  );

  const hourlyProducts = useMemo(
    () => (allProducts || []).filter((p) => p.tripType === 'hourly' || String(p.routeId || '').startsWith('hr-')),
    [allProducts],
  );

  const list = useMemo(() => {
    return hourlyProducts.filter((p) => {
      const matchHours = hoursFilter === 'all' || String(p.hours) === hoursFilter;
      const matchRoute = routeFilter === 'all'
        || p.routeId === routeFilter
        || (routeFilter !== 'all' && String(p.routeId || '').includes(`-${routeFilter}-`));
      const matchSearch = !query
        || p.nameEn?.toLowerCase().includes(query)
        || p.nameAr?.includes(query)
        || String(p.price || '').includes(query)
        || p.vehicleKey?.includes(query);
      return matchHours && matchRoute && matchSearch;
    });
  }, [hourlyProducts, query, hoursFilter, routeFilter]);

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
  useResetPageOnFilter(setPage, query, hoursFilter, routeFilter);

  const routeLabel = (routeId) => {
    const route = ROUTE_OPTIONS.find((r) => r.id === routeId);
    return route ? (route.label[lang] || route.label.ar) : routeId;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const payload = {
      ...form,
      price: Number(form.price) || 0,
      originalPrice: Number(form.originalPrice) || Number(form.price) || 0,
      hourlyRate: Number(form.hourlyRate) || 0,
      hours: Number(form.hours) || 4,
      passengers: Number(form.passengers) || 4,
      sortOrder: Number(form.sortOrder) || 0,
      tripType: 'hourly',
    };
    try {
      if (editing) {
        await updateProduct(editing, payload);
        toast.success(t('admin.hourly.updated'));
      } else {
        await createProduct(payload);
        toast.success(t('admin.hourly.created'));
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
      hourlyRate: p.hourlyRate || '',
      hours: p.hours || 4,
      descriptionEn: p.descriptionEn || '',
      descriptionAr: p.descriptionAr || '',
      imageUrl: p.imageUrl || '',
      routeId: p.routeId || 'hr-4-taif-internal',
      vehicleKey: p.vehicleKey || '',
      passengers: p.passengers || 4,
      badgeEn: p.badgeEn || '4 Hours',
      badgeAr: p.badgeAr || '4 ساعات',
      sortOrder: p.sortOrder || 0,
      active: p.active ?? true,
      hidePrice: p.hidePrice ?? false,
      tripType: 'hourly',
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
      const defaults = getDefaultHourlyProducts();
      const existingKeys = new Set(hourlyProducts.map((p) => p.vehicleKey));
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

  const columns = [
    adminSnoColumn(t),
    { key: 'car', label: t('admin.hourly.car') },
    { key: 'hourlyRate', label: t('admin.hourly.hourlyRate') },
    { key: 'hours', label: t('admin.hourly.duration') },
    { key: 'total', label: t('admin.hourly.packagePrice') },
    { key: 'status', label: t('dashboard.status') },
    { key: 'priceVis', label: t('admin.hourly.priceVisibility') },
    { key: 'actions', label: t('admin.table.actions'), className: 'text-end' },
  ];

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title={t('admin.nav.hourly')}
        subtitle={t('admin.hourly.subtitle')}
      >
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleSeed}
            disabled={seeding}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-brand/20 font-bold text-brand hover:bg-brand/5 transition-all"
          >
            <Download className="w-4 h-4" />
            {seeding ? t('common.loading') : t('admin.hourly.importDefaults')}
          </button>
          <button
            type="button"
            onClick={() => { setShowForm(true); setEditing(null); setForm(emptyForm); }}
            className="flex items-center gap-2 bg-gradient-to-r from-primary-500 to-emerald-600 text-white font-bold px-4 py-2.5 rounded-xl shadow-lg hover:scale-105 transition-all"
          >
            <Plus className="w-5 h-5" />
            {t('admin.hourly.add')}
          </button>
        </div>
      </AdminPageHeader>

      <AdminDocsHint
        hintKey="admin.hourly.docsHint"
        files={[
          { en: 'docs/hourly-rental-prices-en.md', ar: 'docs/hourly-rental-prices-ar.md', labelEn: 'Hourly', labelAr: 'بالساعة' },
          { en: 'docs/within-city-trips-prices-en.md', ar: 'docs/within-city-trips-prices-ar.md', labelEn: 'Within city', labelAr: 'داخل المدينة' },
        ]}
      />

      <AdminFilterBox
        title={t('admin.filters')}
        search={search}
        onSearchChange={onSearchChange}
        searchPending={searchPending}
        searchPlaceholder={t('admin.hourly.searchPlaceholder')}
        filterSectionLabel={t('admin.filterByHours')}
        activeCount={(hoursFilter === 'all' ? 0 : 1) + (routeFilter === 'all' ? 0 : 1)}
      >
        <AdminFilterChips
          value={hoursFilter}
          onChange={setHoursFilter}
          options={[
            { key: 'all', label: t('admin.filterAll'), count: hourlyProducts.length, variant: 'green' },
            ...HOURLY_DURATIONS.map((h) => ({
              key: String(h),
              label: `${h} ${t('booking.hours_plural')}`,
              count: hourlyProducts.filter((p) => p.hours === h).length,
              variant: 'green',
            })),
          ]}
        />
        <AdminFilterChips
          label={t('admin.filterByCity')}
          value={routeFilter}
          onChange={(key) => setRouteFilter(routeFilter === key && key !== 'all' ? 'all' : key)}
          options={HOURLY_BASE_CITIES.map((city) => ({
            key: city.key,
            label: city[lang],
            count: hourlyProducts.filter((p) => p.routeId?.includes(`-${city.key}-`)).length,
            variant: 'gold',
          }))}
        />
      </AdminFilterBox>

      {showForm && (
        <GlassCard className="admin-form-card animate-fade-in-up">
          <form onSubmit={handleSubmit} className="space-y-4">
            <h2 className="font-black text-lg admin-heading flex items-center gap-2">
              <Clock className="w-5 h-5 text-brand" />
              {editing ? t('admin.hourly.edit') : t('admin.hourly.add')}
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
                <option value="">{t('admin.hourly.selectCar')}</option>
                {CAR_OPTIONS.map((c) => (
                  <option key={c.id} value={c.id}>{c.label[lang] || c.label.ar}</option>
                ))}
              </AdminSelect>
              <input value={form.vehicleKey} onChange={(e) => setForm({ ...form, vehicleKey: e.target.value })} placeholder={t('admin.products.vehicleKey')} className="admin-input" />
              <AdminSelect value={form.hours} onChange={(e) => setForm({ ...form, hours: Number(e.target.value) })} className="admin-input">
                {HOURLY_DURATIONS.map((h) => (
                  <option key={h} value={h}>{h} {t('booking.hours_plural')}</option>
                ))}
              </AdminSelect>
              <input type="number" value={form.hourlyRate} onChange={(e) => setForm({ ...form, hourlyRate: e.target.value })} placeholder={t('admin.hourly.hourlyRate')} className="admin-input" />
              <input type="number" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} placeholder={t('admin.hourly.packagePrice')} required className="admin-input" />
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
                <span className="font-semibold">{t('admin.hourly.hidePrice')}</span>
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
            <Clock className="w-14 h-14 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 mb-4">{t('admin.hourly.noData')}</p>
            <button type="button" onClick={handleSeed} className="text-brand font-bold">{t('admin.hourly.importDefaults')}</button>
          </GlassCard>
        ) : (
          <div className="space-y-4">
            {paginated.map(([routeId, items]) => (
            <div key={routeId} className="space-y-3 admin-page-block">
              <h2 className="font-black text-base admin-heading flex items-center gap-2">
                <Clock className="w-4 h-4 text-gold" />
                <span className="line-clamp-2">{routeLabel(routeId)}</span>
                <span className="text-xs font-semibold text-gray-400 shrink-0">({items.length} {t('admin.hourly.cars')})</span>
              </h2>
              <AdminDataTable columns={columns}>
                {items.map((p, idx) => {
                  const carKey = p.vehicleKey?.split('-')[0] || '';
                  return (
                    <AdminTableRow key={p.id}>
                      <AdminSnoCell n={idx + 1} />
                      <AdminTableCell>
                        <div className="flex items-center gap-2">
                          {p.imageUrl && (
                            <img src={p.imageUrl} alt="" className="w-10 h-10 rounded-lg object-cover shrink-0" />
                          )}
                          <div>
                            <span className="font-bold block">{carLabel(carKey, lang)}</span>
                            <span className="text-xs text-gray-500 line-clamp-1">{lang === 'ar' ? p.nameAr : p.nameEn}</span>
                          </div>
                        </div>
                      </AdminTableCell>
                      <AdminTableCell>
                        <span className="font-semibold text-emerald-600">{p.hourlyRate ?? '—'} {t('booking.sar')}/{t('booking.hour')}</span>
                      </AdminTableCell>
                      <AdminTableCell>
                        <span className="font-bold">{p.hours ?? '—'} {t('booking.hours_plural')}</span>
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
                        >
                          {p.hidePrice ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                          {p.hidePrice ? t('admin.hourly.hidden') : t('admin.hourly.visible')}
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
