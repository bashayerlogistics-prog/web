import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Share2, Download } from 'lucide-react';
import {
  getAllSocialLinks,
  createSocialLink,
  updateSocialLink,
  deleteSocialLink,
  seedDefaultSocialLinks,
} from '../../firebase/admin';
import MediaUpload from '../../components/admin/MediaUpload';
import { usePublishSiteContent } from '../../hooks/usePublishSiteContent';
import { useAdminDataLoader } from '../../hooks/useAdminDataLoader';
import { usePagination } from '../../hooks/usePagination';
import { useAdminInstantSearch, useResetPageOnFilter } from '../../hooks/useAdminInstantSearch';
import { useToast } from '../../context/ToastContext';
import { getDefaultSocialLinks } from '../../data/contentSeeds';
import AdminPageHeader from '../../components/admin/AdminPageHeader';
import AdminApplyButton from '../../components/admin/AdminApplyButton';
import AdminSelect from '../../components/admin/AdminSelect';
import AdminFilterBox from '../../components/admin/AdminFilterBox';
import AdminFilterChips from '../../components/admin/AdminFilterChips';
import AdminDataTable, { AdminTableRow, AdminTableCell, adminSnoColumn, AdminSnoCell } from '../../components/admin/AdminDataTable';
import { AdminCrudActions } from '../../components/admin/AdminTableActions';
import AdminPagination from '../../components/admin/AdminPagination';
import GlassCard from '../../components/ui/GlassCard';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import { SOCIAL_PLATFORMS, SOCIAL_PLATFORM_META, SocialBrandBadge, SocialBrandLink } from '../../components/ui/SocialIcon';

const PAGE_SIZE = 8;

const emptyForm = {
  nameEn: SOCIAL_PLATFORM_META.facebook.nameEn,
  nameAr: SOCIAL_PLATFORM_META.facebook.nameAr,
  platform: 'facebook',
  url: SOCIAL_PLATFORM_META.facebook.url,
  iconUrl: '',
  sortOrder: 0,
  active: true,
};

export default function AdminSocialMedia() {
  const { t, i18n } = useTranslation();
  const { toast } = useToast();
  const publishSite = usePublishSiteContent();
  const lang = i18n.language;
  const [form, setForm] = useState(emptyForm);
  const [editing, setEditing] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const { search, onSearchChange, query, isPending: searchPending } = useAdminInstantSearch();
  const [statusFilter, setStatusFilter] = useState('all');
  const [seeding, setSeeding] = useState(false);

  const { data: links, loading, refresh } = useAdminDataLoader(getAllSocialLinks);

  const list = useMemo(() => {
    const all = links || [];
    return all.filter((item) => {
      const matchStatus = statusFilter === 'all'
        || (statusFilter === 'active' ? item.active : !item.active);
      const matchSearch = !query
        || item.nameEn?.toLowerCase().includes(query)
        || item.nameAr?.includes(query)
        || item.platform?.toLowerCase().includes(query)
        || item.url?.toLowerCase().includes(query);
      return matchStatus && matchSearch;
    });
  }, [links, query, statusFilter]);

  const { page, setPage, paginated, from, to, total, totalPages } = usePagination(list, PAGE_SIZE);
  useResetPageOnFilter(setPage, query, statusFilter);

  const activeCount = (links || []).filter((x) => x.active).length;
  const inactiveCount = (links || []).length - activeCount;

  const applyPlatform = (platform) => {
    const next = SOCIAL_PLATFORM_META[platform] || SOCIAL_PLATFORM_META.custom;
    const prev = SOCIAL_PLATFORM_META[form.platform] || SOCIAL_PLATFORM_META.custom;
    const keepNameEn = form.nameEn && form.nameEn !== prev.nameEn;
    const keepNameAr = form.nameAr && form.nameAr !== prev.nameAr;
    const keepUrl = form.url && form.url !== prev.url;
    setForm({
      ...form,
      platform,
      nameEn: keepNameEn ? form.nameEn : next.nameEn,
      nameAr: keepNameAr ? form.nameAr : next.nameAr,
      url: keepUrl ? form.url : next.url,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const payload = {
      ...form,
      sortOrder: Number(form.sortOrder) || 0,
      iconUrl: form.iconUrl || '',
      url: form.url.trim(),
    };
    try {
      if (editing) {
        await updateSocialLink(editing, payload);
        toast.success(t('admin.socialUpdated'));
      } else {
        await createSocialLink(payload);
        toast.success(t('admin.socialCreated'));
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

  const handleEdit = (item) => {
    setForm({
      nameEn: item.nameEn || '',
      nameAr: item.nameAr || '',
      platform: item.platform || 'custom',
      url: item.url || '',
      iconUrl: item.iconUrl || '',
      sortOrder: item.sortOrder ?? 0,
      active: item.active ?? true,
    });
    setEditing(item.id);
    setShowForm(true);
  };

  const toggleActive = async (item) => {
    await updateSocialLink(item.id, { active: !item.active });
    await publishSite('soft');
    refresh();
  };

  const handleDelete = async (id) => {
    if (!window.confirm(t('admin.confirmDelete'))) return;
    await deleteSocialLink(id);
    toast.success(t('admin.socialDeleted'));
    await publishSite('soft');
    refresh();
  };

  const handleSeed = async () => {
    setSeeding(true);
    try {
      const result = await seedDefaultSocialLinks(getDefaultSocialLinks());
      toast.success(result.alreadyExists ? t('admin.alreadyImported') : t('admin.importedCount', { count: result.imported }));
      if (!result.alreadyExists) await publishSite('soft');
      refresh();
    } catch {
      toast.error(t('common.error'));
    } finally {
      setSeeding(false);
    }
  };

  const columns = [
    adminSnoColumn(t),
    { key: 'icon', label: t('admin.social.icon') },
    { key: 'name', label: t('admin.social.name') },
    { key: 'platform', label: t('admin.social.platform') },
    { key: 'link', label: t('admin.social.link') },
    { key: 'status', label: t('dashboard.status') },
    { key: 'actions', label: t('admin.table.actions'), className: 'text-end' },
  ];

  return (
    <div className="space-y-6">
      <AdminPageHeader title={t('admin.nav.social')} subtitle={t('admin.socialSubtitle')}>
        <button
          type="button"
          onClick={handleSeed}
          disabled={seeding}
          className="flex items-center gap-2 bg-white dark:admin-surface border border-brand/20 text-brand font-bold px-4 py-2.5 rounded-xl hover:bg-brand/5 transition-all disabled:opacity-60"
        >
          <Download className="w-4 h-4" />
          {seeding ? t('common.loading') : t('admin.importSiteDefaults')}
        </button>
        <button
          type="button"
          onClick={() => { setShowForm(true); setEditing(null); setForm(emptyForm); }}
          className="flex items-center gap-2 bg-gradient-to-r from-primary-500 to-emerald-600 text-white font-bold px-4 py-2.5 rounded-xl shadow-lg hover:scale-105 transition-all"
        >
          <Plus className="w-5 h-5" />
          {t('admin.addSocial')}
        </button>
      </AdminPageHeader>

      <AdminFilterBox
        title={t('admin.filters')}
        search={search}
        onSearchChange={onSearchChange}
        searchPending={searchPending}
        searchPlaceholder={t('admin.searchSocial')}
        activeCount={statusFilter === 'all' ? 0 : 1}
      >
        <AdminFilterChips
          value={statusFilter}
          onChange={setStatusFilter}
          options={[
            { key: 'all', label: t('admin.filterAll'), count: (links || []).length, variant: 'green' },
            { key: 'active', label: t('admin.products.active'), count: activeCount, variant: 'green' },
            { key: 'inactive', label: t('admin.products.inactive'), count: inactiveCount, variant: 'red' },
          ]}
        />
      </AdminFilterBox>

      {showForm && (
        <GlassCard className="animate-fade-in-up">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <input
                value={form.nameEn}
                onChange={(e) => setForm({ ...form, nameEn: e.target.value })}
                placeholder={t('admin.social.nameEn')}
                required
                className="admin-input"
              />
              <input
                value={form.nameAr}
                onChange={(e) => setForm({ ...form, nameAr: e.target.value })}
                placeholder={t('admin.social.nameAr')}
                required
                dir="rtl"
                className="admin-input"
              />
              <AdminSelect
                value={form.platform}
                onChange={(e) => applyPlatform(e.target.value)}
                className="admin-input"
              >
                {SOCIAL_PLATFORMS.map((p) => (
                  <option key={p} value={p}>{SOCIAL_PLATFORM_META[p]?.label || p}</option>
                ))}
              </AdminSelect>
              <input
                type="number"
                value={form.sortOrder}
                onChange={(e) => setForm({ ...form, sortOrder: e.target.value })}
                placeholder={t('admin.social.order')}
                className="admin-input"
              />
              <div className="md:col-span-2 space-y-1">
                <input
                  value={form.url}
                  onChange={(e) => setForm({ ...form, url: e.target.value })}
                  placeholder={SOCIAL_PLATFORM_META[form.platform]?.url || t('admin.social.link')}
                  required
                  type="url"
                  className="admin-input w-full"
                />
                <p className="text-xs text-gray-500">{t('admin.social.urlHint')}</p>
              </div>
              <MediaUpload
                value={form.iconUrl}
                onChange={(url) => setForm({ ...form, iconUrl: url })}
                folder="social"
                allowUrl
                label={t('admin.social.customIcon')}
                className="md:col-span-2"
                previewClassName="w-16 h-16 object-contain rounded-xl"
              />
            </div>
            <div className="flex items-center gap-3 text-sm text-gray-500">
              <span>{t('admin.social.preview')}:</span>
              <SocialBrandBadge platform={form.platform} iconUrl={form.iconUrl} size="md" />
            </div>
            <div className="flex gap-2">
              <AdminApplyButton type="submit" />
              <button type="button" onClick={() => setShowForm(false)} className="px-6 py-2.5 rounded-xl border font-bold">
                {t('common.cancel')}
              </button>
            </div>
          </form>
        </GlassCard>
      )}

      {loading ? <LoadingSpinner /> : (
        <>
          <div className="lg:hidden space-y-4 w-full">
            {paginated.length === 0 ? (
              <GlassCard hover={false} className="text-center py-12 text-gray-500">
                {t('admin.social.noLinks')}
              </GlassCard>
            ) : paginated.map((item) => (
              <GlassCard key={item.id} className="!p-4 w-full">
                <div className="flex items-center gap-3">
                  <span className="shrink-0">
                    <SocialBrandBadge platform={item.platform} iconUrl={item.iconUrl} size="md" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="font-bold truncate">{lang === 'ar' ? item.nameAr : item.nameEn}</p>
                    <p className="text-xs text-gray-500 truncate">{item.url}</p>
                    <p className="text-[11px] text-brand/70 mt-0.5">{SOCIAL_PLATFORM_META[item.platform]?.label || item.platform}</p>
                  </div>
                </div>
                <div className="mt-3 flex items-center justify-between gap-2">
                  <span className={`text-xs font-bold px-2 py-1 rounded-full ${item.active ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
                    {item.active ? t('admin.products.active') : t('admin.products.inactive')}
                  </span>
                  <AdminCrudActions
                    active={item.active}
                    onToggle={() => toggleActive(item)}
                    onEdit={() => handleEdit(item)}
                    onDelete={() => handleDelete(item.id)}
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

          <div className="hidden lg:block w-full">
            <AdminDataTable columns={columns} pagination={{ page, totalPages, from, to, total, onPageChange: setPage }}>
              {paginated.length === 0 ? (
                <tr>
                  <td colSpan={columns.length} className="p-12 text-center text-gray-500">{t('admin.social.noLinks')}</td>
                </tr>
              ) : paginated.map((item, idx) => (
                <AdminTableRow key={item.id}>
                  <AdminSnoCell n={from + idx} />
                  <AdminTableCell>
                    <SocialBrandBadge platform={item.platform} iconUrl={item.iconUrl} size="md" />
                  </AdminTableCell>
                  <AdminTableCell>
                    <p className="font-bold">{lang === 'ar' ? item.nameAr : item.nameEn}</p>
                  </AdminTableCell>
                  <AdminTableCell>
                    <span className="text-xs font-semibold text-brand/80">{SOCIAL_PLATFORM_META[item.platform]?.label || item.platform}</span>
                  </AdminTableCell>
                  <AdminTableCell>
                    <a href={item.url} target="_blank" rel="noreferrer" className="text-xs text-primary-600 truncate max-w-[180px] block hover:underline">
                      {item.url || '—'}
                    </a>
                  </AdminTableCell>
                  <AdminTableCell>
                    <span className={`text-xs font-bold px-2 py-1 rounded-full ${item.active ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
                      {item.active ? t('admin.products.active') : t('admin.products.inactive')}
                    </span>
                  </AdminTableCell>
                  <AdminTableCell className="text-end">
                    <AdminCrudActions
                      active={item.active}
                      onToggle={() => toggleActive(item)}
                      onEdit={() => handleEdit(item)}
                      onDelete={() => handleDelete(item.id)}
                    />
                  </AdminTableCell>
                </AdminTableRow>
              ))}
            </AdminDataTable>
          </div>

          <h3 className="hidden lg:block font-black text-lg mt-8 mb-4">{t('admin.table.previewCards')}</h3>
          <div className="hidden lg:flex flex-wrap gap-3">
            {paginated.map((item) => (
              <SocialBrandLink
                key={`preview-${item.id}`}
                href={item.url}
                platform={item.platform}
                iconUrl={item.iconUrl}
                label={lang === 'ar' ? item.nameAr : item.nameEn}
                size="lg"
              />
            ))}
            {paginated.length === 0 && (
              <div className="flex items-center gap-2 text-gray-400 text-sm">
                <Share2 className="w-4 h-4" />
                {t('admin.social.noLinks')}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
