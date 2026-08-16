import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Briefcase, Download } from 'lucide-react';
import {
  getAllServices,
  createService,
  updateService,
  deleteService,
  seedDefaultServices,
} from '../../firebase/admin';
import MediaUpload from '../../components/admin/MediaUpload';
import { usePublishSiteContent } from '../../hooks/usePublishSiteContent';
import { useAdminDataLoader } from '../../hooks/useAdminDataLoader';
import { usePagination } from '../../hooks/usePagination';
import { useAdminInstantSearch, useResetPageOnFilter } from '../../hooks/useAdminInstantSearch';
import { useToast } from '../../context/ToastContext';
import { getDefaultServices } from '../../data/contentSeeds';
import AdminPageHeader from '../../components/admin/AdminPageHeader';
import AdminApplyButton from '../../components/admin/AdminApplyButton';
import AdminSelect from '../../components/admin/AdminSelect';
import AdminFilterBox from '../../components/admin/AdminFilterBox';
import AdminFilterChips from '../../components/admin/AdminFilterChips';
import AdminDataTable, { AdminTableRow, AdminTableCell, adminSnoColumn, AdminSnoCell } from '../../components/admin/AdminDataTable';
import { AdminCrudActions } from '../../components/admin/AdminTableActions';
import AdminViewToggle from '../../components/admin/AdminViewToggle';
import GlassCard from '../../components/ui/GlassCard';
import AdminPagination from '../../components/admin/AdminPagination';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import AiSuggestionsTable from '../../components/admin/AiSuggestionsTable';
import ContentModeTabs from '../../components/admin/ContentModeTabs';
import { SERVICE_AI_SUGGESTIONS } from '../../data/aiContentSuggestions';

const ICON_OPTIONS = ['plane', 'train', 'route', 'map-pin', 'clock', 'star', 'kaaba', 'gem', 'mosque', 'bus'];
const PAGE_SIZE = 6;
const CATEGORY_OPTIONS = [
  { value: 'airport', en: 'Airports', ar: 'مطارات' },
  { value: 'train', en: 'Train', ar: 'قطار الحرمين' },
  { value: 'intercity', en: 'Cities', ar: 'بين المدن' },
  { value: 'withinCity', en: 'Within City', ar: 'داخل المدينة' },
  { value: 'hourly', en: 'Hourly', ar: 'بالساعة' },
  { value: 'tours', en: 'Ziyarat', ar: 'مزارات' },
];

const emptyForm = {
  titleEn: '',
  titleAr: '',
  descriptionEn: '',
  descriptionAr: '',
  imageUrl: '',
  icon: 'star',
  badge: 'primary',
  category: '',
  featuresEn: '',
  featuresAr: '',
  sortOrder: 0,
  active: true,
};

function featuresToText(features, lang) {
  if (!Array.isArray(features)) return '';
  return features.map((f) => f[lang] || '').filter(Boolean).join('\n');
}

function textToFeatures(enText, arText) {
  const enLines = enText.split('\n').map((s) => s.trim()).filter(Boolean);
  const arLines = arText.split('\n').map((s) => s.trim()).filter(Boolean);
  const len = Math.max(enLines.length, arLines.length);
  const features = [];
  for (let i = 0; i < len; i += 1) {
    features.push({ en: enLines[i] || '', ar: arLines[i] || '' });
  }
  return features;
}

export default function AdminServices() {
  const { t, i18n } = useTranslation();
  const { toast } = useToast();
  const publishSite = usePublishSiteContent();
  const lang = i18n.language;
  const [form, setForm] = useState(emptyForm);
  const [editing, setEditing] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(null);
  const { search, onSearchChange, query, isPending: searchPending } = useAdminInstantSearch();
  const [statusFilter, setStatusFilter] = useState('all');
  const [seeding, setSeeding] = useState(false);
  const [addMode, setAddMode] = useState('manual');
  const [viewMode, setViewMode] = useState('table');

  const { data: services, loading, refresh } = useAdminDataLoader(getAllServices);

  const list = useMemo(() => {
    const all = services || [];
    return all.filter((s) => {
      const matchStatus = statusFilter === 'all'
        || (statusFilter === 'active' ? s.active : !s.active);
      const matchSearch = !query
        || s.titleEn?.toLowerCase().includes(query)
        || s.titleAr?.includes(query)
        || s.descriptionEn?.toLowerCase().includes(query);
      return matchStatus && matchSearch;
    });
  }, [services, query, statusFilter]);

  const { page, setPage, paginated, from, to, total, totalPages } = usePagination(list, PAGE_SIZE);
  useResetPageOnFilter(setPage, query, statusFilter);

  const activeCount = (services || []).filter((s) => s.active).length;
  const inactiveCount = (services || []).length - activeCount;

  const handleSubmit = async (e) => {
    e.preventDefault();
    const payload = {
      titleEn: form.titleEn,
      titleAr: form.titleAr,
      descriptionEn: form.descriptionEn,
      descriptionAr: form.descriptionAr,
      imageUrl: form.imageUrl,
      icon: form.icon,
      badge: form.badge,
      category: form.category || '',
      features: textToFeatures(form.featuresEn, form.featuresAr),
      sortOrder: Number(form.sortOrder) || 0,
      active: form.active,
    };
    try {
      if (editing) {
        await updateService(editing, payload);
        toast.success(t('admin.serviceUpdated'));
      } else {
        await createService(payload);
        toast.success(t('admin.serviceCreated'));
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

  const handleEdit = (s) => {
    setForm({
      titleEn: s.titleEn || '',
      titleAr: s.titleAr || '',
      descriptionEn: s.descriptionEn || '',
      descriptionAr: s.descriptionAr || '',
      imageUrl: s.imageUrl || '',
      icon: s.icon || 'star',
      badge: s.badge || 'primary',
      category: s.category || '',
      featuresEn: featuresToText(s.features, 'en'),
      featuresAr: featuresToText(s.features, 'ar'),
      sortOrder: s.sortOrder || 0,
      active: s.active ?? true,
    });
    setEditing(s.id);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm(t('admin.confirmDelete'))) return;
    await deleteService(id);
    toast.success(t('admin.serviceDeleted'));
    await publishSite('soft');
    refresh();
  };

  const toggleActive = async (s) => {
    await updateService(s.id, { active: !s.active });
    await publishSite('soft');
    refresh();
  };

  const handleSeed = async () => {
    setSeeding(true);
    try {
      const result = await seedDefaultServices(getDefaultServices());
      if (result.alreadyExists) {
        toast.info(t('admin.alreadyImported'));
      } else {
        const count = (result.imported || 0) + (result.updated || 0) + (result.removed || 0);
        toast.success(t('admin.importedCount', { count: count || 6 }));
      }
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
    { key: 'image', label: t('admin.services.image') },
    { key: 'title', label: t('admin.services.title') },
    { key: 'status', label: t('dashboard.status') },
    { key: 'actions', label: t('admin.table.actions'), className: 'text-end' },
  ];

  return (
    <div className="space-y-6">
      <AdminPageHeader title={t('admin.nav.services')} subtitle={t('admin.servicesSubtitle')}>
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={handleSeed} disabled={seeding}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-brand/20 font-bold text-brand hover:bg-brand/5">
            <Download className="w-4 h-4" />
            {seeding ? t('common.loading') : t('admin.importSiteDefaults')}
          </button>
          <AdminViewToggle value={viewMode} onChange={setViewMode} />
          <button type="button" onClick={() => { setShowForm(true); setEditing(null); setForm(emptyForm); setAddMode('manual'); }}
            className="flex items-center gap-2 bg-gradient-to-r from-primary-500 to-emerald-600 text-white font-bold px-4 py-2.5 rounded-xl shadow-lg hover:scale-105 transition-all">
            <Plus className="w-5 h-5" />{t('admin.addService')}
          </button>
        </div>
      </AdminPageHeader>

      <AiSuggestionsTable
        suggestions={SERVICE_AI_SUGGESTIONS}
        onApply={(item) => {
          setForm({
            ...emptyForm,
            titleEn: item.titleEn,
            titleAr: item.titleAr,
            descriptionEn: item.descriptionEn,
            descriptionAr: item.descriptionAr,
            icon: item.icon,
            badge: item.badge,
            category: item.category || '',
            featuresEn: item.featuresEn,
            featuresAr: item.featuresAr,
          });
          setEditing(null);
          setShowForm(true);
          setAddMode('manual');
          toast.success(t('admin.ai.applied'));
        }}
        getTitle={(item, lang) => (lang === 'ar' ? item.titleAr : item.titleEn)}
        getSubtitle={(item, lang) => (lang === 'ar' ? item.descriptionAr : item.descriptionEn)}
      />

      <AdminFilterBox title={t('admin.filters')} search={search} onSearchChange={onSearchChange} searchPending={searchPending} searchPlaceholder={t('admin.searchServices')} activeCount={statusFilter === 'all' ? 0 : 1} defaultOpen={false}>
        <AdminFilterChips
          value={statusFilter}
          onChange={setStatusFilter}
          options={[
            { key: 'all', label: t('admin.filterAll'), count: (services || []).length, variant: 'green' },
            { key: 'active', label: t('admin.products.active'), count: activeCount, variant: 'green' },
            { key: 'inactive', label: t('admin.products.inactive'), count: inactiveCount, variant: 'red' },
          ]}
        />
      </AdminFilterBox>

      {showForm && (
        <GlassCard className="animate-fade-in-up">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="font-black text-lg">{editing ? t('admin.editService') : t('admin.addService')}</h2>
              {!editing && <ContentModeTabs mode={addMode} onChange={setAddMode} />}
            </div>
            {addMode === 'ai' && !editing ? (
              <AiSuggestionsTable
                suggestions={SERVICE_AI_SUGGESTIONS}
                onApply={(item) => {
                  setForm({
                    ...emptyForm,
                    titleEn: item.titleEn,
                    titleAr: item.titleAr,
                    descriptionEn: item.descriptionEn,
                    descriptionAr: item.descriptionAr,
                    icon: item.icon,
                    badge: item.badge,
                    category: item.category || '',
                    featuresEn: item.featuresEn,
                    featuresAr: item.featuresAr,
                  });
                  setAddMode('manual');
                  toast.success(t('admin.ai.applied'));
                }}
                getTitle={(item, lang) => (lang === 'ar' ? item.titleAr : item.titleEn)}
                getSubtitle={(item, lang) => (lang === 'ar' ? item.descriptionAr : item.descriptionEn)}
                className="!p-0 !shadow-none !bg-transparent !border-0"
              />
            ) : (
            <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input value={form.titleEn} onChange={(e) => setForm({ ...form, titleEn: e.target.value })} placeholder="Title (EN)" required className="admin-input" />
              <input value={form.titleAr} onChange={(e) => setForm({ ...form, titleAr: e.target.value })} placeholder="العنوان (AR)" required dir="rtl" className="admin-input" />
              <textarea value={form.descriptionEn} onChange={(e) => setForm({ ...form, descriptionEn: e.target.value })} placeholder="Description (EN)" rows={3} className="admin-input md:col-span-2" />
              <textarea value={form.descriptionAr} onChange={(e) => setForm({ ...form, descriptionAr: e.target.value })} placeholder="الوصف (AR)" rows={3} dir="rtl" className="admin-input md:col-span-2" />
              <AdminSelect value={form.icon} onChange={(e) => setForm({ ...form, icon: e.target.value })} className="admin-input">
                {ICON_OPTIONS.map((ic) => <option key={ic} value={ic}>{ic}</option>)}
              </AdminSelect>
              <AdminSelect value={form.badge} onChange={(e) => setForm({ ...form, badge: e.target.value })} className="admin-input">
                <option value="primary">Primary</option>
                <option value="secondary">Secondary</option>
              </AdminSelect>
              <AdminSelect
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                className="admin-input md:col-span-2"
                required
              >
                <option value="">{lang === 'ar' ? 'التصنيف' : 'Category'}</option>
                {CATEGORY_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{lang === 'ar' ? opt.ar : opt.en}</option>
                ))}
              </AdminSelect>
              <textarea value={form.featuresEn} onChange={(e) => setForm({ ...form, featuresEn: e.target.value })} placeholder={t('admin.services.featuresEn')} rows={4} className="admin-input" />
              <textarea value={form.featuresAr} onChange={(e) => setForm({ ...form, featuresAr: e.target.value })} placeholder={t('admin.services.featuresAr')} rows={4} dir="rtl" className="admin-input" />
              <input type="number" value={form.sortOrder} onChange={(e) => setForm({ ...form, sortOrder: e.target.value })} placeholder={t('admin.products.sortOrder')} className="admin-input" />
              <MediaUpload
                value={form.imageUrl}
                onChange={(url) => setForm({ ...form, imageUrl: url })}
                folder="services"
                allowUrl
                className="md:col-span-2"
              />
              <label className="flex items-center gap-2 px-4 py-3 rounded-xl border border-white/50 bg-white/50 dark:admin-surface md:col-span-2">
                <input type="checkbox" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} className="w-4 h-4" />
                <span className="font-semibold">{t('admin.products.active')}</span>
              </label>
            </div>
            {form.imageUrl && (
              <img src={form.imageUrl} alt="" className="w-full max-h-48 object-cover rounded-xl cursor-pointer" onClick={() => setPreviewUrl(form.imageUrl)} role="presentation" />
            )}
            <div className="flex gap-2">
              <AdminApplyButton type="submit" />
              <button type="button" onClick={() => setShowForm(false)} className="px-6 py-2.5 rounded-xl border font-bold">{t('common.cancel')}</button>
            </div>
            </>
            )}
          </form>
        </GlassCard>
      )}

      <h2 className="font-black text-lg admin-heading flex items-center gap-2">
        <Briefcase className="w-5 h-5 text-brand" />
        {t('admin.ai.currentSaved')} ({total})
      </h2>

      {loading ? <LoadingSpinner /> : (
        <>
          <div className="w-full">
            {viewMode === 'table' ? (
            <AdminDataTable columns={columns} pagination={{ page, totalPages, from, to, total, onPageChange: setPage }}>
              {paginated.length === 0 ? (
                <tr><td colSpan={columns.length} className="p-16 text-center">
                  <Briefcase className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500">{t('admin.services.noServices')}</p>
                  <button type="button" onClick={handleSeed} className="mt-3 text-brand font-bold">{t('admin.importSiteDefaults')}</button>
                </td></tr>
              ) : paginated.map((s, idx) => (
                <AdminTableRow key={s.id}>
                  <AdminSnoCell n={from + idx} />
                  <AdminTableCell>
                    {s.imageUrl ? (
                      <button type="button" onClick={() => setPreviewUrl(s.imageUrl)}>
                        <img src={s.imageUrl} alt="" className="w-16 h-12 rounded-lg object-cover hover:ring-2 ring-primary-500" />
                      </button>
                    ) : <Briefcase className="w-8 h-8 text-gray-300" />}
                  </AdminTableCell>
                  <AdminTableCell>
                    <p className="font-bold">{lang === 'ar' ? s.titleAr : s.titleEn}</p>
                    <p className="text-xs text-gray-500 line-clamp-2">{lang === 'ar' ? s.descriptionAr : s.descriptionEn}</p>
                  </AdminTableCell>
                  <AdminTableCell>
                    <span className={`text-xs font-bold px-2 py-1 rounded-full ${s.active ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
                      {s.active ? t('admin.products.active') : t('admin.products.inactive')}
                    </span>
                  </AdminTableCell>
                  <AdminTableCell className="text-end">
                    <AdminCrudActions
                      active={s.active}
                      onToggle={() => toggleActive(s)}
                      onEdit={() => handleEdit(s)}
                      onDelete={() => handleDelete(s.id)}
                    />
                  </AdminTableCell>
                </AdminTableRow>
              ))}
            </AdminDataTable>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                {paginated.map((s) => (
                  <GlassCard key={s.id} className="!p-0 overflow-hidden">
                    {s.imageUrl && <img src={s.imageUrl} alt="" className="w-full h-40 object-cover" />}
                    <div className="p-4">
                      <h3 className="font-black">{lang === 'ar' ? s.titleAr : s.titleEn}</h3>
                      <p className="text-xs text-gray-500 mt-1 line-clamp-2">{lang === 'ar' ? s.descriptionAr : s.descriptionEn}</p>
                      <span className={`text-xs font-bold px-2 py-1 rounded-full mt-2 inline-block ${s.active ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
                        {s.active ? t('admin.products.active') : t('admin.products.inactive')}
                      </span>
                      <div className="flex gap-2 mt-3 justify-end">
                        <AdminCrudActions
                          active={s.active}
                          onToggle={() => toggleActive(s)}
                          onEdit={() => handleEdit(s)}
                          onDelete={() => handleDelete(s.id)}
                        />
                      </div>
                    </div>
                  </GlassCard>
                ))}
              </div>
            )}
            {total > 0 && viewMode === 'cards' && (
              <GlassCard padding="p-0" hover={false} className="mt-4">
                <AdminPagination page={page} totalPages={totalPages} from={from} to={to} total={total} onPageChange={setPage} />
              </GlassCard>
            )}
          </div>
        </>
      )}

      {previewUrl && (
        <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setPreviewUrl(null)} role="dialog" aria-modal="true">
          <img src={previewUrl} alt="" className="max-w-full max-h-[85vh] object-contain rounded-xl shadow-2xl" onClick={(e) => e.stopPropagation()} />
        </div>
      )}
    </div>
  );
}
