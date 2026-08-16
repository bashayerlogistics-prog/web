import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Image } from 'lucide-react';
import { getAllBanners, createBanner, updateBanner, deleteBanner } from '../../firebase/admin';
import MediaUpload from '../../components/admin/MediaUpload';
import { usePublishSiteContent } from '../../hooks/usePublishSiteContent';
import { useAdminDataLoader } from '../../hooks/useAdminDataLoader';
import { usePagination } from '../../hooks/usePagination';
import { useAdminInstantSearch, useResetPageOnFilter } from '../../hooks/useAdminInstantSearch';
import { useToast } from '../../context/ToastContext';
import AdminPageHeader from '../../components/admin/AdminPageHeader';
import AdminApplyButton from '../../components/admin/AdminApplyButton';
import AdminFilterBox from '../../components/admin/AdminFilterBox';
import AdminFilterChips from '../../components/admin/AdminFilterChips';
import AdminDataTable, { AdminTableRow, AdminTableCell, adminSnoColumn, AdminSnoCell } from '../../components/admin/AdminDataTable';
import { AdminCrudActions } from '../../components/admin/AdminTableActions';
import AdminPagination from '../../components/admin/AdminPagination';
import GlassCard from '../../components/ui/GlassCard';
import LoadingSpinner from '../../components/ui/LoadingSpinner';

const emptyForm = { titleEn: '', titleAr: '', subtitleEn: '', subtitleAr: '', imageUrl: '', link: '', sortOrder: 0, active: true };
const PAGE_SIZE = 6;

export default function AdminBanners() {
  const { t, i18n } = useTranslation();
  const { toast } = useToast();
  const publishSite = usePublishSiteContent();
  const lang = i18n.language;
  const [form, setForm] = useState(emptyForm);
  const [editing, setEditing] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const { search, onSearchChange, query, isPending: searchPending } = useAdminInstantSearch();
  const [statusFilter, setStatusFilter] = useState('all');

  const { data: banners, loading, refresh } = useAdminDataLoader(getAllBanners);
  const list = useMemo(() => {
    const all = banners || [];
    return all.filter((b) => {
      const matchStatus = statusFilter === 'all'
        || (statusFilter === 'active' ? b.active : !b.active);
      const matchSearch = !query
        || b.titleEn?.toLowerCase().includes(query)
        || b.titleAr?.includes(query)
        || b.link?.toLowerCase().includes(query);
      return matchStatus && matchSearch;
    });
  }, [banners, query, statusFilter]);
  const { page, setPage, paginated, from, to, total, totalPages } = usePagination(list, PAGE_SIZE);
  useResetPageOnFilter(setPage, query, statusFilter);

  const activeCount = (banners || []).filter((b) => b.active).length;
  const inactiveCount = (banners || []).length - activeCount;

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editing) {
        await updateBanner(editing, form);
        toast.success(t('admin.bannerUpdated'));
      } else {
        await createBanner(form);
        toast.success(t('admin.bannerCreated'));
      }
      setShowForm(false);
      setEditing(null);
      setForm(emptyForm);
      await publishSite();
      refresh();
    } catch {
      toast.error(t('common.error'));
    }
  };

  const toggleActive = async (banner) => {
    await updateBanner(banner.id, { active: !banner.active });
    await publishSite();
    refresh();
  };

  const handleDelete = async (id) => {
    if (!window.confirm(t('admin.confirmDelete'))) return;
    await deleteBanner(id);
    toast.success(t('admin.bannerDeleted'));
    await publishSite();
    refresh();
  };

  const columns = [
    adminSnoColumn(t),
    { key: 'preview', label: t('admin.banners.image') },
    { key: 'title', label: t('admin.banners.titleField') },
    { key: 'link', label: t('admin.banners.link') },
    { key: 'status', label: t('dashboard.status') },
    { key: 'actions', label: t('admin.table.actions'), className: 'text-end' },
  ];

  return (
    <div className="space-y-6">
      <AdminPageHeader title={t('admin.nav.banners')} subtitle={t('admin.bannersSubtitle')}>
        <button type="button" onClick={() => { setShowForm(true); setEditing(null); setForm(emptyForm); }}
          className="flex items-center gap-2 bg-gradient-to-r from-primary-500 to-emerald-600 text-white font-bold px-4 py-2.5 rounded-xl shadow-lg hover:scale-105 transition-all">
          <Plus className="w-5 h-5" />{t('admin.addBanner')}
        </button>
      </AdminPageHeader>

      <AdminFilterBox
        title={t('admin.filters')}
        search={search}
        onSearchChange={onSearchChange}
        searchPending={searchPending}
        searchPlaceholder={t('admin.searchBanners')}
        activeCount={statusFilter === 'all' ? 0 : 1}
      >
        <AdminFilterChips
          value={statusFilter}
          onChange={setStatusFilter}
          options={[
            { key: 'all', label: t('admin.filterAll'), count: (banners || []).length, variant: 'green' },
            { key: 'active', label: t('admin.products.active'), count: activeCount, variant: 'green' },
            { key: 'inactive', label: t('admin.products.inactive'), count: inactiveCount, variant: 'red' },
          ]}
        />
      </AdminFilterBox>

      {showForm && (
        <GlassCard className="animate-fade-in-up">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <input value={form.titleEn} onChange={(e) => setForm({ ...form, titleEn: e.target.value })} placeholder="Title EN" required className="admin-input" />
              <input value={form.titleAr} onChange={(e) => setForm({ ...form, titleAr: e.target.value })} placeholder="العنوان AR" required dir="rtl" className="admin-input" />
              <input value={form.subtitleEn} onChange={(e) => setForm({ ...form, subtitleEn: e.target.value })} placeholder="Subtitle EN" className="admin-input" />
              <input value={form.subtitleAr} onChange={(e) => setForm({ ...form, subtitleAr: e.target.value })} placeholder="الوصف AR" dir="rtl" className="admin-input" />
              <input value={form.link} onChange={(e) => setForm({ ...form, link: e.target.value })} placeholder="Link URL" className="admin-input md:col-span-2" />
              <MediaUpload
                value={form.imageUrl}
                onChange={(url) => setForm({ ...form, imageUrl: url })}
                folder="banners"
                allowUrl
                className="md:col-span-2"
              />
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
        <>
          {/* Mobile — full width cards */}
          <div className="lg:hidden space-y-4 w-full">
            {paginated.length === 0 ? (
              <GlassCard hover={false} className="text-center py-12 text-gray-500">{t('admin.banners.noBanners')}</GlassCard>
            ) : paginated.map((b) => (
              <GlassCard key={b.id} className="!p-0 overflow-hidden w-full">
                <div className="aspect-[21/9] bg-gray-100 dark:admin-surface relative overflow-hidden">
                  {b.imageUrl ? <img src={b.imageUrl} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center"><Image className="w-10 h-10 text-gray-300" /></div>}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent flex items-end p-4">
                    <div className="text-white min-w-0">
                      <h3 className="font-black truncate">{lang === 'ar' ? b.titleAr : b.titleEn}</h3>
                      <p className="text-sm text-white/80 line-clamp-1">{lang === 'ar' ? b.subtitleAr : b.subtitleEn}</p>
                    </div>
                  </div>
                </div>
                <div className="p-4 flex items-center justify-between gap-2">
                  <span className={`text-xs font-bold px-2 py-1 rounded-full ${b.active ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
                    {b.active ? t('admin.products.active') : t('admin.products.inactive')}
                  </span>
                  <AdminCrudActions
                    active={b.active}
                    onToggle={() => toggleActive(b)}
                    onEdit={() => { setForm(b); setEditing(b.id); setShowForm(true); }}
                    onDelete={() => handleDelete(b.id)}
                  />
                </div>
              </GlassCard>
            ))}
            {total > 0 && (
              <GlassCard padding="p-0" hover={false}>
                <AdminPagination page={page} totalPages={totalPages} from={from} to={to} total={total} onPageChange={setPage} />
              </GlassCard>
            )}
          </div>

          {/* Desktop table */}
          <div className="hidden lg:block w-full">
          <AdminDataTable columns={columns} pagination={{ page, totalPages, from, to, total, onPageChange: setPage }}>
            {paginated.length === 0 ? (
              <tr><td colSpan={columns.length} className="p-12 text-center text-gray-500">{t('admin.banners.noBanners')}</td></tr>
            ) : paginated.map((b, idx) => (
              <AdminTableRow key={b.id}>
                <AdminSnoCell n={from + idx} />
                <AdminTableCell>
                  {b.imageUrl ? <img src={b.imageUrl} alt="" className="w-24 h-12 rounded-lg object-cover" /> : <Image className="w-8 h-8 text-gray-300" />}
                </AdminTableCell>
                <AdminTableCell>
                  <p className="font-bold">{lang === 'ar' ? b.titleAr : b.titleEn}</p>
                  <p className="text-xs text-gray-500">{lang === 'ar' ? b.subtitleAr : b.subtitleEn}</p>
                </AdminTableCell>
                <AdminTableCell><span className="text-xs text-primary-600 truncate max-w-[120px] block">{b.link || '—'}</span></AdminTableCell>
                <AdminTableCell>
                  <span className={`text-xs font-bold px-2 py-1 rounded-full ${b.active ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
                    {b.active ? t('admin.products.active') : t('admin.products.inactive')}
                  </span>
                </AdminTableCell>
                <AdminTableCell className="text-end">
                  <AdminCrudActions
                    active={b.active}
                    onToggle={() => toggleActive(b)}
                    onEdit={() => { setForm(b); setEditing(b.id); setShowForm(true); }}
                    onDelete={() => handleDelete(b.id)}
                  />
                </AdminTableCell>
              </AdminTableRow>
            ))}
          </AdminDataTable>
          </div>

          <h3 className="hidden lg:block font-black text-lg mt-8 mb-4">{t('admin.table.previewCards')}</h3>
          <div className="hidden lg:grid grid-cols-1 md:grid-cols-2 gap-4">
            {paginated.map((b) => (
              <GlassCard key={`card-${b.id}`} className="!p-0 overflow-hidden">
                <div className="aspect-[21/9] bg-gray-100 dark:admin-surface relative overflow-hidden">
                  {b.imageUrl ? <img src={b.imageUrl} alt="" className="w-full h-full object-cover hover:scale-105 transition-transform duration-500" /> : <div className="w-full h-full flex items-center justify-center"><Image className="w-10 h-10 text-gray-300" /></div>}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent flex items-end p-4">
                    <div className="text-white">
                      <h3 className="font-black">{lang === 'ar' ? b.titleAr : b.titleEn}</h3>
                      <p className="text-sm text-white/80">{lang === 'ar' ? b.subtitleAr : b.subtitleEn}</p>
                    </div>
                  </div>
                </div>
              </GlassCard>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
