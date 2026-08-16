import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, HelpCircle, Download } from 'lucide-react';
import {
  getAllFaqs,
  createFaq,
  updateFaq,
  deleteFaq,
  seedDefaultFaqs,
} from '../../firebase/admin';
import MediaUpload from '../../components/admin/MediaUpload';
import { usePublishSiteContent } from '../../hooks/usePublishSiteContent';
import { useAdminDataLoader } from '../../hooks/useAdminDataLoader';
import { usePagination } from '../../hooks/usePagination';
import { useAdminInstantSearch, useResetPageOnFilter } from '../../hooks/useAdminInstantSearch';
import { useToast } from '../../context/ToastContext';
import { getDefaultFaqs } from '../../data/contentSeeds';
import AdminPageHeader from '../../components/admin/AdminPageHeader';
import AdminApplyButton from '../../components/admin/AdminApplyButton';
import AdminSelect from '../../components/admin/AdminSelect';
import AdminFilterBox from '../../components/admin/AdminFilterBox';
import AdminFilterChips from '../../components/admin/AdminFilterChips';
import AdminDataTable, { AdminTableRow, AdminTableCell, adminSnoColumn, AdminSnoCell } from '../../components/admin/AdminDataTable';
import { AdminCrudActions } from '../../components/admin/AdminTableActions';
import GlassCard from '../../components/ui/GlassCard';
import LoadingSpinner from '../../components/ui/LoadingSpinner';

const PAGE_SIZE = 8;
const CATEGORIES = ['all', 'booking', 'services', 'trips', 'general'];
const ICON_OPTIONS = ['calendar', 'concierge', 'route', 'info'];
const COLOR_OPTIONS = ['primary', 'secondary', 'blue', 'green'];

const emptyForm = {
  category: 'general',
  featured: false,
  icon: 'info',
  color: 'primary',
  imageUrl: '',
  questionEn: '',
  questionAr: '',
  answerEn: '',
  answerAr: '',
  sortOrder: 0,
  active: true,
};

export default function AdminFAQ() {
  const { t, i18n } = useTranslation();
  const { toast } = useToast();
  const publishSite = usePublishSiteContent();
  const lang = i18n.language;
  const [form, setForm] = useState(emptyForm);
  const [editing, setEditing] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const { search, onSearchChange, query, isPending: searchPending } = useAdminInstantSearch();
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [seeding, setSeeding] = useState(false);

  const { data: faqs, loading, refresh } = useAdminDataLoader(getAllFaqs);

  const list = useMemo(() => {
    return (faqs || []).filter((f) => {
      const matchCat = categoryFilter === 'all' || f.category === categoryFilter;
      const matchSearch = !query || f.questionEn?.toLowerCase().includes(query) || f.questionAr?.includes(query);
      return matchCat && matchSearch;
    });
  }, [faqs, query, categoryFilter]);

  const { page, setPage, paginated, from, to, total, totalPages } = usePagination(list, PAGE_SIZE);
  useResetPageOnFilter(setPage, query, categoryFilter);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const payload = { ...form, sortOrder: Number(form.sortOrder) || 0, imageUrl: form.imageUrl || '' };
    try {
      if (editing) {
        await updateFaq(editing, payload);
        toast.success(t('admin.faqUpdated'));
      } else {
        await createFaq(payload);
        toast.success(t('admin.faqCreated'));
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

  const handleEdit = (f) => {
    setForm({
      category: f.category || 'general',
      featured: f.featured ?? false,
      icon: f.icon || 'info',
      color: f.color || 'primary',
      imageUrl: f.imageUrl || '',
      questionEn: f.questionEn || '',
      questionAr: f.questionAr || '',
      answerEn: f.answerEn || '',
      answerAr: f.answerAr || '',
      sortOrder: f.sortOrder || 0,
      active: f.active ?? true,
    });
    setEditing(f.id);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm(t('admin.confirmDelete'))) return;
    await deleteFaq(id);
    toast.success(t('admin.faqDeleted'));
    await publishSite('soft');
    refresh();
  };

  const toggleActive = async (f) => {
    await updateFaq(f.id, { active: !f.active });
    await publishSite('soft');
    refresh();
  };

  const handleSeed = async () => {
    setSeeding(true);
    try {
      const result = await seedDefaultFaqs(getDefaultFaqs());
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
    { key: 'image', label: t('admin.faq.image') },
    { key: 'question', label: t('admin.faq.question') },
    { key: 'category', label: t('admin.faq.category') },
    { key: 'status', label: t('dashboard.status') },
    { key: 'actions', label: t('admin.table.actions'), className: 'text-end' },
  ];

  return (
    <div className="space-y-6">
      <AdminPageHeader title={t('admin.nav.faq')} subtitle={t('admin.faqSubtitle')}>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={handleSeed} disabled={seeding}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-brand/20 font-bold text-brand hover:bg-brand/5">
            <Download className="w-4 h-4" />
            {seeding ? t('common.loading') : t('admin.importSiteDefaults')}
          </button>
          <button type="button" onClick={() => { setShowForm(true); setEditing(null); setForm(emptyForm); }}
            className="flex items-center gap-2 bg-gradient-to-r from-primary-500 to-emerald-600 text-white font-bold px-4 py-2.5 rounded-xl shadow-lg">
            <Plus className="w-5 h-5" />{t('admin.addFaq')}
          </button>
        </div>
      </AdminPageHeader>

      <AdminFilterBox title={t('admin.filters')} search={search} onSearchChange={onSearchChange} searchPending={searchPending} searchPlaceholder={t('admin.searchFaq')} filterSectionLabel={t('admin.filterByCategory')} activeCount={categoryFilter === 'all' ? 0 : 1} defaultOpen={false}>
        <AdminFilterChips
          value={categoryFilter}
          onChange={setCategoryFilter}
          options={CATEGORIES.map((c) => ({ key: c, label: t(`faq.${c}`) }))}
        />
      </AdminFilterBox>

      {showForm && (
        <GlassCard className="animate-fade-in-up">
          <form onSubmit={handleSubmit} className="space-y-4">
            <h2 className="font-black text-lg">{editing ? t('admin.editFaq') : t('admin.addFaq')}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <AdminSelect value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="admin-input">
                {CATEGORIES.filter((c) => c !== 'all').map((c) => <option key={c} value={c}>{t(`faq.${c}`)}</option>)}
              </AdminSelect>
              <input type="number" value={form.sortOrder} onChange={(e) => setForm({ ...form, sortOrder: e.target.value })} placeholder={t('admin.products.sortOrder')} className="admin-input" />
              <AdminSelect value={form.icon} onChange={(e) => setForm({ ...form, icon: e.target.value })} className="admin-input">
                {ICON_OPTIONS.map((ic) => <option key={ic} value={ic}>{ic}</option>)}
              </AdminSelect>
              <AdminSelect value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })} className="admin-input">
                {COLOR_OPTIONS.map((c) => <option key={c} value={c}>{c}</option>)}
              </AdminSelect>
              <input value={form.questionEn} onChange={(e) => setForm({ ...form, questionEn: e.target.value })} placeholder="Question (EN)" required className="admin-input md:col-span-2" />
              <input value={form.questionAr} onChange={(e) => setForm({ ...form, questionAr: e.target.value })} placeholder="السؤال (AR)" required dir="rtl" className="admin-input md:col-span-2" />
              <textarea value={form.answerEn} onChange={(e) => setForm({ ...form, answerEn: e.target.value })} placeholder="Answer (EN)" rows={3} required className="admin-input md:col-span-2" />
              <textarea value={form.answerAr} onChange={(e) => setForm({ ...form, answerAr: e.target.value })} placeholder="الإجابة (AR)" rows={3} required dir="rtl" className="admin-input md:col-span-2" />
              <div className="md:col-span-2">
                <p className="text-xs text-gray-500 mb-2">{t('admin.faq.imageOptional')}</p>
                <MediaUpload value={form.imageUrl} onChange={(url) => setForm({ ...form, imageUrl: url })} folder="faq" allowUrl />
              </div>
              <label className="flex items-center gap-2 px-4 py-3 rounded-xl border border-white/50 bg-white/50 dark:admin-surface">
                <input type="checkbox" checked={form.featured} onChange={(e) => setForm({ ...form, featured: e.target.checked })} className="w-4 h-4" />
                <span className="font-semibold">{t('admin.faq.featured')}</span>
              </label>
              <label className="flex items-center gap-2 px-4 py-3 rounded-xl border border-white/50 bg-white/50 dark:admin-surface">
                <input type="checkbox" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} className="w-4 h-4" />
                <span className="font-semibold">{t('admin.products.active')}</span>
              </label>
            </div>
            {form.imageUrl && <img src={form.imageUrl} alt="" className="w-full max-h-40 object-cover rounded-xl" />}
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
              <HelpCircle className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">{t('admin.faq.noFaqs')}</p>
            </td></tr>
          ) : paginated.map((f, idx) => (
            <AdminTableRow key={f.id}>
              <AdminSnoCell n={from + idx} />
              <AdminTableCell>
                {f.imageUrl ? (
                  <img src={f.imageUrl} alt="" className="w-16 h-12 rounded-lg object-cover" />
                ) : (
                  <div className="w-16 h-12 rounded-lg bg-brand/10 flex items-center justify-center">
                    <HelpCircle className="w-5 h-5 text-brand" />
                  </div>
                )}
              </AdminTableCell>
              <AdminTableCell>
                <p className="font-bold line-clamp-2">{lang === 'ar' ? f.questionAr : f.questionEn}</p>
                {f.featured && <span className="text-[10px] font-bold text-gold uppercase">{t('faq.featured')}</span>}
              </AdminTableCell>
              <AdminTableCell><span className="text-xs font-semibold capitalize">{t(`faq.${f.category}`)}</span></AdminTableCell>
              <AdminTableCell>
                <span className={`text-xs font-bold px-2 py-1 rounded-full ${f.active ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
                  {f.active ? t('admin.products.active') : t('admin.products.inactive')}
                </span>
              </AdminTableCell>
              <AdminTableCell className="text-end">
                <AdminCrudActions
                  active={f.active}
                  onToggle={() => toggleActive(f)}
                  onEdit={() => handleEdit(f)}
                  onDelete={() => handleDelete(f.id)}
                />
              </AdminTableCell>
            </AdminTableRow>
          ))}
        </AdminDataTable>
      )}
    </div>
  );
}
