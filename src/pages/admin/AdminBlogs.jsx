import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, FileText, Download } from 'lucide-react';
import {
  getAllBlogs,
  createBlog,
  updateBlog,
  deleteBlog,
  seedDefaultBlogs,
  replaceDefaultBlogs,
} from '../../firebase/admin';
import { useAdminDataLoader } from '../../hooks/useAdminDataLoader';
import { usePagination } from '../../hooks/usePagination';
import { useAdminInstantSearch, useResetPageOnFilter } from '../../hooks/useAdminInstantSearch';
import { usePublishSiteContent } from '../../hooks/usePublishSiteContent';
import { useToast } from '../../context/ToastContext';
import { getDefaultBlogs } from '../../data/contentSeeds';
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
import MediaUpload from '../../components/admin/MediaUpload';
import { BLOG_AI_SUGGESTIONS } from '../../data/aiContentSuggestions';

const emptyForm = {
  serviceId: '',
  badgeEn: '',
  badgeAr: '',
  titleEn: '',
  titleAr: '',
  excerptEn: '',
  excerptAr: '',
  contentEn: '',
  contentAr: '',
  dateEn: '',
  dateAr: '',
  imageUrl: '',
  sortOrder: 0,
  active: true,
};

const PAGE_SIZE = 6;

export default function AdminBlogs() {
  const { t, i18n } = useTranslation();
  const { toast } = useToast();
  const lang = i18n.language;
  const [form, setForm] = useState(emptyForm);
  const [editing, setEditing] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const { search, onSearchChange, query, isPending: searchPending } = useAdminInstantSearch();
  const [statusFilter, setStatusFilter] = useState('all');
  const [seeding, setSeeding] = useState(false);
  const [addMode, setAddMode] = useState('manual');
  const [viewMode, setViewMode] = useState('table');

  const publishSite = usePublishSiteContent();
  const { data: blogs, loading, refresh } = useAdminDataLoader(getAllBlogs);

  const list = useMemo(() => {
    const all = blogs || [];
    return all.filter((b) => {
      const matchStatus = statusFilter === 'all'
        || (statusFilter === 'active' ? b.active : !b.active);
      const matchSearch = !query
        || b.titleEn?.toLowerCase().includes(query)
        || b.titleAr?.includes(query)
        || b.excerptEn?.toLowerCase().includes(query);
      return matchStatus && matchSearch;
    });
  }, [blogs, query, statusFilter]);

  const { page, setPage, paginated, from, to, total, totalPages } = usePagination(list, PAGE_SIZE);
  useResetPageOnFilter(setPage, query, statusFilter);

  const activeCount = (blogs || []).filter((b) => b.active).length;
  const inactiveCount = (blogs || []).length - activeCount;

  const handleSubmit = async (e) => {
    e.preventDefault();
    const payload = {
      ...form,
      sortOrder: Number(form.sortOrder) || 0,
    };
    try {
      if (editing) {
        await updateBlog(editing, payload);
        toast.success(t('admin.blogUpdated'));
      } else {
        await createBlog(payload);
        toast.success(t('admin.blogCreated'));
      }
      setForm(emptyForm);
      setEditing(null);
      setShowForm(false);
      refresh();
      await publishSite();
    } catch {
      toast.error(t('common.error'));
    }
  };

  const handleEdit = (b) => {
    setForm({
      serviceId: b.serviceId || '',
      badgeEn: b.badgeEn || '',
      badgeAr: b.badgeAr || '',
      titleEn: b.titleEn || '',
      titleAr: b.titleAr || '',
      excerptEn: b.excerptEn || '',
      excerptAr: b.excerptAr || '',
      contentEn: b.contentEn || '',
      contentAr: b.contentAr || '',
      dateEn: b.dateEn || '',
      dateAr: b.dateAr || '',
      imageUrl: b.imageUrl || '',
      sortOrder: b.sortOrder || 0,
      active: b.active ?? true,
    });
    setEditing(b.id);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm(t('admin.confirmDelete'))) return;
    await deleteBlog(id);
    toast.success(t('admin.blogDeleted'));
    refresh();
    await publishSite();
  };

  const toggleActive = async (b) => {
    await updateBlog(b.id, { active: !b.active });
    refresh();
    await publishSite();
  };

  const handleSeed = async () => {
    setSeeding(true);
    try {
      const result = await seedDefaultBlogs(getDefaultBlogs());
      if (result.alreadyExists) {
        toast.info(t('admin.alreadyImported'));
      } else {
        toast.success(t('admin.importedCount', { count: result.imported }));
      }
      refresh();
      await publishSite();
    } catch {
      toast.error(t('common.error'));
    } finally {
      setSeeding(false);
    }
  };

  const handleReplaceDefaults = async () => {
    if (!window.confirm(t('admin.blogs.replaceConfirm'))) return;
    setSeeding(true);
    try {
      const count = await replaceDefaultBlogs(getDefaultBlogs());
      toast.success(t('admin.blogs.replaceDone', { count }));
      refresh();
      await publishSite();
    } catch {
      toast.error(t('common.error'));
    } finally {
      setSeeding(false);
    }
  };

  const columns = [
    adminSnoColumn(t),
    { key: 'image', label: t('admin.blogs.image') },
    { key: 'title', label: t('admin.blogs.title') },
    { key: 'date', label: t('admin.blogs.date') },
    { key: 'status', label: t('dashboard.status') },
    { key: 'actions', label: t('admin.table.actions'), className: 'text-end' },
  ];

  return (
    <div className="space-y-6">
      <AdminPageHeader title={t('admin.nav.blogs')} subtitle={t('admin.blogsSubtitle')}>
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={handleSeed} disabled={seeding}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-brand/20 font-bold text-brand hover:bg-brand/5">
            <Download className="w-4 h-4" />
            {seeding ? t('common.loading') : t('admin.importSiteDefaults')}
          </button>
          <button type="button" onClick={handleReplaceDefaults} disabled={seeding}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-gold/40 font-bold text-gold-dark hover:bg-gold/10">
            <Download className="w-4 h-4" />
            {seeding ? t('common.loading') : t('admin.blogs.replaceDefaults')}
          </button>
          <AdminViewToggle value={viewMode} onChange={setViewMode} />
          <button type="button" onClick={() => { setShowForm(true); setEditing(null); setForm(emptyForm); setAddMode('manual'); }}
            className="flex items-center gap-2 bg-gradient-to-r from-primary-500 to-emerald-600 text-white font-bold px-4 py-2.5 rounded-xl shadow-lg hover:scale-105 transition-all">
            <Plus className="w-5 h-5" />{t('admin.addBlog')}
          </button>
        </div>
      </AdminPageHeader>

      <AiSuggestionsTable
        suggestions={BLOG_AI_SUGGESTIONS}
        onApply={(item) => {
          setForm({
            ...emptyForm,
            serviceId: item.serviceId || '',
            badgeEn: item.badgeEn || '',
            badgeAr: item.badgeAr || '',
            titleEn: item.titleEn,
            titleAr: item.titleAr,
            excerptEn: item.excerptEn,
            excerptAr: item.excerptAr,
            contentEn: item.contentEn,
            contentAr: item.contentAr,
            dateEn: item.dateEn,
            dateAr: item.dateAr,
          });
          setEditing(null);
          setShowForm(true);
          setAddMode('manual');
          toast.success(t('admin.ai.applied'));
        }}
        getTitle={(item, lang) => (lang === 'ar' ? item.titleAr : item.titleEn)}
        getSubtitle={(item, lang) => (lang === 'ar' ? item.excerptAr : item.excerptEn)}
      />

      <AdminFilterBox title={t('admin.filters')} search={search} onSearchChange={onSearchChange} searchPending={searchPending} searchPlaceholder={t('admin.searchBlogs')} activeCount={statusFilter === 'all' ? 0 : 1} defaultOpen={false}>
        <AdminFilterChips
          value={statusFilter}
          onChange={setStatusFilter}
          options={[
            { key: 'all', label: t('admin.filterAll'), count: (blogs || []).length, variant: 'green' },
            { key: 'active', label: t('admin.products.active'), count: activeCount, variant: 'green' },
            { key: 'inactive', label: t('admin.products.inactive'), count: inactiveCount, variant: 'red' },
          ]}
        />
      </AdminFilterBox>

      {showForm && (
        <GlassCard className="animate-fade-in-up">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="font-black text-lg">{editing ? t('admin.editBlog') : t('admin.addBlog')}</h2>
              {!editing && <ContentModeTabs mode={addMode} onChange={setAddMode} />}
            </div>
            {addMode === 'ai' && !editing ? (
              <AiSuggestionsTable
                suggestions={BLOG_AI_SUGGESTIONS}
                onApply={(item) => {
                  setForm({
                    ...emptyForm,
                    serviceId: item.serviceId || '',
                    badgeEn: item.badgeEn || '',
                    badgeAr: item.badgeAr || '',
                    titleEn: item.titleEn,
                    titleAr: item.titleAr,
                    excerptEn: item.excerptEn,
                    excerptAr: item.excerptAr,
                    contentEn: item.contentEn,
                    contentAr: item.contentAr,
                    dateEn: item.dateEn,
                    dateAr: item.dateAr,
                  });
                  setAddMode('manual');
                  toast.success(t('admin.ai.applied'));
                }}
                getTitle={(item, lang) => (lang === 'ar' ? item.titleAr : item.titleEn)}
                getSubtitle={(item, lang) => (lang === 'ar' ? item.excerptAr : item.excerptEn)}
                className="!p-0 !shadow-none !bg-transparent !border-0"
              />
            ) : (
            <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <AdminSelect
                value={form.serviceId}
                onChange={(e) => setForm({ ...form, serviceId: e.target.value })}
                className="admin-input"
              >
                <option value="">{t('admin.blogs.serviceOptional')}</option>
                <option value="cityToCity">{t('admin.nav.cityToCity')}</option>
                <option value="airport">{t('admin.nav.airport')}</option>
                <option value="train">{t('admin.nav.train')}</option>
                <option value="withinCity">{t('admin.nav.withinCity')}</option>
                <option value="hourly">{t('admin.nav.hourly')}</option>
                <option value="ziyarat">{t('admin.nav.ziyarat')}</option>
              </AdminSelect>
              <input type="number" value={form.sortOrder} onChange={(e) => setForm({ ...form, sortOrder: e.target.value })} placeholder={t('admin.products.sortOrder')} className="admin-input" />
              <input value={form.badgeEn} onChange={(e) => setForm({ ...form, badgeEn: e.target.value })} placeholder={t('admin.blogs.badgeEn')} className="admin-input" />
              <input value={form.badgeAr} onChange={(e) => setForm({ ...form, badgeAr: e.target.value })} placeholder={t('admin.blogs.badgeAr')} dir="rtl" className="admin-input" />
              <input value={form.titleEn} onChange={(e) => setForm({ ...form, titleEn: e.target.value })} placeholder="Title (EN)" required className="admin-input" />
              <input value={form.titleAr} onChange={(e) => setForm({ ...form, titleAr: e.target.value })} placeholder="العنوان (AR)" required dir="rtl" className="admin-input" />
              <input value={form.dateEn} onChange={(e) => setForm({ ...form, dateEn: e.target.value })} placeholder="Date (EN)" className="admin-input" />
              <input value={form.dateAr} onChange={(e) => setForm({ ...form, dateAr: e.target.value })} placeholder="التاريخ (AR)" dir="rtl" className="admin-input" />
              <textarea value={form.excerptEn} onChange={(e) => setForm({ ...form, excerptEn: e.target.value })} placeholder="Excerpt (EN)" rows={2} className="admin-input md:col-span-2" />
              <textarea value={form.excerptAr} onChange={(e) => setForm({ ...form, excerptAr: e.target.value })} placeholder="المقتطف (AR)" rows={2} dir="rtl" className="admin-input md:col-span-2" />
              <textarea value={form.contentEn} onChange={(e) => setForm({ ...form, contentEn: e.target.value })} placeholder="Full content (EN)" rows={5} className="admin-input md:col-span-2" />
              <textarea value={form.contentAr} onChange={(e) => setForm({ ...form, contentAr: e.target.value })} placeholder="المحتوى الكامل (AR)" rows={5} dir="rtl" className="admin-input md:col-span-2" />
              <MediaUpload
                value={form.imageUrl}
                onChange={(imageUrl) => setForm((current) => ({ ...current, imageUrl }))}
                folder="blogs"
              />
              <label className="flex items-center gap-2 px-4 py-3 rounded-xl border border-white/50 bg-white/50 dark:admin-surface">
                <input type="checkbox" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} className="w-4 h-4" />
                <span className="font-semibold">{t('admin.products.active')}</span>
              </label>
            </div>
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
        <FileText className="w-5 h-5 text-brand" />
        {t('admin.ai.currentSaved')} ({total})
      </h2>

      {loading ? <LoadingSpinner /> : (
        <>
          <div className="w-full">
            {viewMode === 'table' ? (
            <AdminDataTable columns={columns} pagination={{ page, totalPages, from, to, total, onPageChange: setPage }}>
              {paginated.length === 0 ? (
                <tr><td colSpan={columns.length} className="p-16 text-center">
                  <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500">{t('admin.blogs.noBlogs')}</p>
                  <button type="button" onClick={handleSeed} className="mt-3 text-brand font-bold">{t('admin.importSiteDefaults')}</button>
                </td></tr>
              ) : paginated.map((b, idx) => (
                <AdminTableRow key={b.id}>
                  <AdminSnoCell n={from + idx} />
                  <AdminTableCell>
                    {b.imageUrl ? <img src={b.imageUrl} alt="" className="w-16 h-12 rounded-lg object-cover" /> : <FileText className="w-8 h-8 text-gray-300" />}
                  </AdminTableCell>
                  <AdminTableCell>
                    {(lang === 'ar' ? b.badgeAr : b.badgeEn) && (
                      <span className="text-[10px] font-bold text-gold bg-gold/10 px-2 py-0.5 rounded-full mb-1 inline-block">
                        {lang === 'ar' ? b.badgeAr : b.badgeEn}
                      </span>
                    )}
                    <p className="font-bold">{lang === 'ar' ? b.titleAr : b.titleEn}</p>
                    <p className="text-xs text-gray-500 line-clamp-2">{lang === 'ar' ? b.excerptAr : b.excerptEn}</p>
                  </AdminTableCell>
                  <AdminTableCell><span className="text-xs">{lang === 'ar' ? b.dateAr : b.dateEn}</span></AdminTableCell>
                  <AdminTableCell>
                    <span className={`text-xs font-bold px-2 py-1 rounded-full ${b.active ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
                      {b.active ? t('admin.products.active') : t('admin.products.inactive')}
                    </span>
                  </AdminTableCell>
                  <AdminTableCell className="text-end">
                    <AdminCrudActions
                      active={b.active}
                      onToggle={() => toggleActive(b)}
                      onEdit={() => handleEdit(b)}
                      onDelete={() => handleDelete(b.id)}
                    />
                  </AdminTableCell>
                </AdminTableRow>
              ))}
            </AdminDataTable>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                {paginated.map((b) => (
                  <GlassCard key={b.id} className="p-4">
                    {b.imageUrl && <img src={b.imageUrl} alt="" className="w-full h-32 object-cover rounded-xl mb-3" />}
                    <h3 className="font-black">{lang === 'ar' ? b.titleAr : b.titleEn}</h3>
                    <p className="text-xs text-gray-500 mt-1">{lang === 'ar' ? b.dateAr : b.dateEn}</p>
                    <p className="text-sm text-gray-600 mt-2 line-clamp-2">{lang === 'ar' ? b.excerptAr : b.excerptEn}</p>
                    <div className="flex gap-2 mt-3 justify-end">
                      <AdminCrudActions
                        active={b.active}
                        onToggle={() => toggleActive(b)}
                        onEdit={() => handleEdit(b)}
                        onDelete={() => handleDelete(b.id)}
                      />
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
    </div>
  );
}
