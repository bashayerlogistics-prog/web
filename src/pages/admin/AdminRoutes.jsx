import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Map, Download } from 'lucide-react';
import {
  getAllRouteCards,
  createRouteCard,
  updateRouteCard,
  deleteRouteCard,
  seedDefaultRouteCards,
} from '../../firebase/admin';
import MediaUpload from '../../components/admin/MediaUpload';
import { usePublishSiteContent } from '../../hooks/usePublishSiteContent';
import { useAdminDataLoader } from '../../hooks/useAdminDataLoader';
import { usePagination } from '../../hooks/usePagination';
import { useAdminInstantSearch, useResetPageOnFilter } from '../../hooks/useAdminInstantSearch';
import { useToast } from '../../context/ToastContext';
import { getDefaultRouteCards } from '../../data/contentSeeds';
import AdminPageHeader from '../../components/admin/AdminPageHeader';
import AdminApplyButton from '../../components/admin/AdminApplyButton';
import AdminFilterBox from '../../components/admin/AdminFilterBox';
import AdminDataTable, { AdminTableRow, AdminTableCell, adminSnoColumn, AdminSnoCell } from '../../components/admin/AdminDataTable';
import { AdminCrudActions } from '../../components/admin/AdminTableActions';
import GlassCard from '../../components/ui/GlassCard';
import AdminPagination from '../../components/admin/AdminPagination';
import LoadingSpinner from '../../components/ui/LoadingSpinner';

const PAGE_SIZE = 6;
const emptyForm = {
  slug: '',
  titleEn: '',
  titleAr: '',
  descriptionEn: '',
  descriptionAr: '',
  imageUrl: '',
  sortOrder: 0,
  popular: false,
  active: true,
};

export default function AdminRoutes() {
  const { t, i18n } = useTranslation();
  const { toast } = useToast();
  const publishSite = usePublishSiteContent();
  const lang = i18n.language;
  const [form, setForm] = useState(emptyForm);
  const [editing, setEditing] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const { search, onSearchChange, query, isPending: searchPending } = useAdminInstantSearch();
  const [seeding, setSeeding] = useState(false);

  const { data: routes, loading, refresh } = useAdminDataLoader(getAllRouteCards);

  const list = useMemo(() => {
    return (routes || []).filter((r) => {
      if (!query) return true;
      return r.titleEn?.toLowerCase().includes(query) || r.titleAr?.includes(query) || r.slug?.includes(query);
    });
  }, [routes, query]);

  const { page, setPage, paginated, from, to, total, totalPages } = usePagination(list, PAGE_SIZE);
  useResetPageOnFilter(setPage, query);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const payload = {
      slug: form.slug.trim(),
      titleEn: form.titleEn,
      titleAr: form.titleAr,
      descriptionEn: form.descriptionEn,
      descriptionAr: form.descriptionAr,
      imageUrl: form.imageUrl,
      sortOrder: Number(form.sortOrder) || 0,
      popular: form.popular,
      active: form.active,
    };
    try {
      if (editing) {
        await updateRouteCard(editing, payload);
        toast.success(t('admin.routeUpdated'));
      } else {
        await createRouteCard(payload);
        toast.success(t('admin.routeCreated'));
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

  const handleEdit = (r) => {
    setForm({
      slug: r.slug || '',
      titleEn: r.titleEn || '',
      titleAr: r.titleAr || '',
      descriptionEn: r.descriptionEn || '',
      descriptionAr: r.descriptionAr || '',
      imageUrl: r.imageUrl || '',
      sortOrder: r.sortOrder || 0,
      popular: r.popular ?? false,
      active: r.active ?? true,
    });
    setEditing(r.id);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm(t('admin.confirmDelete'))) return;
    await deleteRouteCard(id);
    toast.success(t('admin.routeDeleted'));
    await publishSite('soft');
    refresh();
  };

  const toggleActive = async (r) => {
    await updateRouteCard(r.id, { active: !r.active });
    await publishSite('soft');
    refresh();
  };

  const handleSeed = async () => {
    setSeeding(true);
    try {
      const result = await seedDefaultRouteCards(getDefaultRouteCards());
      toast.success(result.alreadyExists ? t('admin.alreadyImported') : t('admin.importedCount', { count: result.imported }));
      refresh();
    } catch {
      toast.error(t('common.error'));
    } finally {
      setSeeding(false);
    }
  };

  const columns = [
    adminSnoColumn(t),
    { key: 'image', label: t('admin.routes.image') },
    { key: 'title', label: t('admin.routes.title') },
    { key: 'slug', label: t('admin.routes.slug') },
    { key: 'status', label: t('dashboard.status') },
    { key: 'actions', label: t('admin.table.actions'), className: 'text-end' },
  ];

  return (
    <div className="space-y-6">
      <AdminPageHeader title={t('admin.nav.routes')} subtitle={t('admin.routesSubtitle')}>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={handleSeed} disabled={seeding}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-brand/20 font-bold text-brand hover:bg-brand/5">
            <Download className="w-4 h-4" />
            {seeding ? t('common.loading') : t('admin.importSiteDefaults')}
          </button>
          <button type="button" onClick={() => { setShowForm(true); setEditing(null); setForm(emptyForm); }}
            className="flex items-center gap-2 bg-gradient-to-r from-primary-500 to-emerald-600 text-white font-bold px-4 py-2.5 rounded-xl shadow-lg">
            <Plus className="w-5 h-5" />{t('admin.addRoute')}
          </button>
        </div>
      </AdminPageHeader>

      <AdminFilterBox title={t('admin.filters')} search={search} onSearchChange={onSearchChange} searchPending={searchPending} searchPlaceholder={t('admin.searchRoutes')} defaultOpen={false} />

      {showForm && (
        <GlassCard className="animate-fade-in-up">
          <form onSubmit={handleSubmit} className="space-y-4">
            <h2 className="font-black text-lg">{editing ? t('admin.editRoute') : t('admin.addRoute')}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} placeholder={t('admin.routes.slug')} required disabled={!!editing} className="admin-input" />
              <input type="number" value={form.sortOrder} onChange={(e) => setForm({ ...form, sortOrder: e.target.value })} placeholder={t('admin.products.sortOrder')} className="admin-input" />
              <input value={form.titleEn} onChange={(e) => setForm({ ...form, titleEn: e.target.value })} placeholder="Title (EN)" required className="admin-input" />
              <input value={form.titleAr} onChange={(e) => setForm({ ...form, titleAr: e.target.value })} placeholder="العنوان (AR)" required dir="rtl" className="admin-input" />
              <textarea value={form.descriptionEn} onChange={(e) => setForm({ ...form, descriptionEn: e.target.value })} placeholder="Description (EN)" rows={3} className="admin-input md:col-span-2" />
              <textarea value={form.descriptionAr} onChange={(e) => setForm({ ...form, descriptionAr: e.target.value })} placeholder="الوصف (AR)" rows={3} dir="rtl" className="admin-input md:col-span-2" />
              <MediaUpload value={form.imageUrl} onChange={(url) => setForm({ ...form, imageUrl: url })} folder="routes" allowUrl className="md:col-span-2" />
              <label className="flex items-center gap-2 px-4 py-3 rounded-xl border border-white/50 bg-white/50 dark:admin-surface">
                <input type="checkbox" checked={form.popular} onChange={(e) => setForm({ ...form, popular: e.target.checked })} className="w-4 h-4" />
                <span className="font-semibold">{t('admin.routes.popular')}</span>
              </label>
              <label className="flex items-center gap-2 px-4 py-3 rounded-xl border border-white/50 bg-white/50 dark:admin-surface">
                <input type="checkbox" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} className="w-4 h-4" />
                <span className="font-semibold">{t('admin.products.active')}</span>
              </label>
            </div>
            {form.imageUrl && <img src={form.imageUrl} alt="" className="w-full max-h-48 object-cover rounded-xl" />}
            <div className="flex gap-2">
              <AdminApplyButton type="submit" />
              <button type="button" onClick={() => setShowForm(false)} className="px-6 py-2.5 rounded-xl border font-bold">{t('common.cancel')}</button>
            </div>
          </form>
        </GlassCard>
      )}

      {loading ? <LoadingSpinner /> : (
        <AdminDataTable columns={columns} pagination={{ page, totalPages, from, to, total, onPageChange: setPage }}>
          {paginated.length === 0 ? (
            <tr><td colSpan={columns.length} className="p-16 text-center">
              <Map className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">{t('admin.routes.noRoutes')}</p>
            </td></tr>
          ) : paginated.map((r, idx) => (
            <AdminTableRow key={r.id}>
              <AdminSnoCell n={from + idx} />
              <AdminTableCell>
                {r.imageUrl ? <img src={r.imageUrl} alt="" className="w-20 h-14 rounded-lg object-cover" /> : <Map className="w-8 h-8 text-gray-300" />}
              </AdminTableCell>
              <AdminTableCell>
                <p className="font-bold">{lang === 'ar' ? r.titleAr : r.titleEn}</p>
                <p className="text-xs text-gray-500 line-clamp-2">{lang === 'ar' ? r.descriptionAr : r.descriptionEn}</p>
              </AdminTableCell>
              <AdminTableCell><code className="text-xs bg-gray-100 dark:bg-white/10 px-2 py-1 rounded">{r.slug}</code></AdminTableCell>
              <AdminTableCell>
                <span className={`text-xs font-bold px-2 py-1 rounded-full ${r.active ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
                  {r.active ? t('admin.products.active') : t('admin.products.inactive')}
                </span>
              </AdminTableCell>
              <AdminTableCell className="text-end">
                <AdminCrudActions
                  active={r.active}
                  onToggle={() => toggleActive(r)}
                  onEdit={() => handleEdit(r)}
                  onDelete={() => handleDelete(r.id)}
                />
              </AdminTableCell>
            </AdminTableRow>
          ))}
        </AdminDataTable>
      )}
    </div>
  );
}
