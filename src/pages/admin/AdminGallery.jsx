import { useState, useEffect, useMemo, Children } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Image, Video, Monitor, RefreshCw } from 'lucide-react';
import {
  getAllGalleryItems,
  createGalleryItem,
  updateGalleryItem,
  deleteGalleryItem,
  getGalleryHeroSettings,
  updateGalleryHeroSettings,
  replaceGalleryItems,
} from '../../firebase/admin';
import { DEFAULT_GALLERY_HERO, DEFAULT_GALLERY_ITEMS } from '../../data/staticData';
import { getDefaultGalleryItems } from '../../data/contentSeeds';
import MediaUpload from '../../components/admin/MediaUpload';
import { usePublishSiteContent } from '../../hooks/usePublishSiteContent';
import { useAdminDataLoader } from '../../hooks/useAdminDataLoader';
import { usePagination } from '../../hooks/usePagination';
import { useAdminInstantSearch, useResetPageOnFilter } from '../../hooks/useAdminInstantSearch';
import { useToast } from '../../context/ToastContext';
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

const emptyForm = {
  titleEn: '',
  titleAr: '',
  subtitleEn: '',
  subtitleAr: '',
  locationEn: '',
  locationAr: '',
  metaEn: '',
  metaAr: '',
  category: 'city',
  mediaType: 'image',
  imageUrl: '',
  videoUrl: '',
  posterUrl: '',
  sortOrder: 0,
  active: true,
};

const PAGE_SIZE = 10;
const CATEGORIES = ['city', 'airport', 'market', 'route', 'fleet'];

function FieldGroup({ labelEn, labelAr, children }) {
  const [enField, arField] = Children.toArray(children);
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
      <div className="min-w-0">
        <label className="block text-xs font-bold text-gray-500 dark:text-gold-light mb-1.5 uppercase tracking-wide">
          {labelEn}
        </label>
        {enField}
      </div>
      <div className="min-w-0">
        <label className="block text-xs font-bold text-gray-500 dark:text-gold-light mb-1.5 uppercase tracking-wide">
          {labelAr}
        </label>
        {arField}
      </div>
    </div>
  );
}

function categoryLabel(t, key) {
  const map = {
    city: t('admin.gallery.catCity'),
    airport: t('admin.gallery.catAirport'),
    market: t('admin.gallery.catMarket'),
    route: t('admin.gallery.catRoute'),
    fleet: t('admin.gallery.catFleet'),
  };
  return map[key] || key;
}

export default function AdminGallery() {
  const { t, i18n } = useTranslation();
  const { toast } = useToast();
  const publishSite = usePublishSiteContent();
  const lang = i18n.language;
  const [tab, setTab] = useState('items');
  const [form, setForm] = useState(emptyForm);
  const [editing, setEditing] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const { search, onSearchChange, query, isPending: searchPending } = useAdminInstantSearch();
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [heroForm, setHeroForm] = useState({ ...DEFAULT_GALLERY_HERO });
  const [heroLoading, setHeroLoading] = useState(true);
  const [heroSaving, setHeroSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);

  const { data: items, loading, refresh } = useAdminDataLoader(getAllGalleryItems);

  useEffect(() => {
    (async () => {
      setHeroLoading(true);
      try {
        const data = await getGalleryHeroSettings();
        setHeroForm({ ...DEFAULT_GALLERY_HERO, ...(data || {}) });
      } catch {
        toast.error(t('common.error'));
      } finally {
        setHeroLoading(false);
      }
    })();
  }, [t, toast]);

  const list = useMemo(() => {
    const all = items || [];
    return all.filter((b) => {
      const matchStatus = statusFilter === 'all'
        || (statusFilter === 'active' ? b.active : !b.active);
      const matchCategory = categoryFilter === 'all' || (b.category || 'city') === categoryFilter;
      const matchSearch = !query
        || b.titleEn?.toLowerCase().includes(query)
        || b.titleAr?.includes(query)
        || b.locationEn?.toLowerCase().includes(query)
        || b.locationAr?.includes(query)
        || b.metaEn?.toLowerCase().includes(query)
        || b.metaAr?.includes(query)
        || b.subtitleEn?.toLowerCase().includes(query)
        || b.subtitleAr?.includes(query);
      return matchStatus && matchCategory && matchSearch;
    });
  }, [items, query, statusFilter, categoryFilter]);

  const { page, setPage, paginated, from, to, total, totalPages } = usePagination(list, PAGE_SIZE);
  useResetPageOnFilter(setPage, query, statusFilter, categoryFilter);

  const activeCount = (items || []).filter((b) => b.active).length;
  const inactiveCount = (items || []).length - activeCount;

  const categoryCounts = useMemo(() => {
    const all = items || [];
    const counts = { all: all.length };
    CATEGORIES.forEach((c) => {
      counts[c] = all.filter((b) => (b.category || 'city') === c).length;
    });
    return counts;
  }, [items]);

  const buildPayload = (source = form) => ({
    titleEn: source.titleEn || '',
    titleAr: source.titleAr || '',
    subtitleEn: source.subtitleEn || '',
    subtitleAr: source.subtitleAr || '',
    locationEn: source.locationEn || '',
    locationAr: source.locationAr || '',
    metaEn: source.metaEn || '',
    metaAr: source.metaAr || '',
    category: source.category || 'city',
    mediaType: source.mediaType || (source.videoUrl ? 'video' : 'image'),
    imageUrl: source.imageUrl || '',
    videoUrl: source.videoUrl || '',
    posterUrl: source.posterUrl || source.imageUrl || '',
    sortOrder: Number(source.sortOrder) || 0,
    active: source.active ?? true,
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    const payload = buildPayload();
    try {
      if (editing) {
        await updateGalleryItem(editing, payload);
        toast.success(t('admin.gallery.itemUpdated'));
      } else {
        await createGalleryItem(payload);
        toast.success(t('admin.gallery.itemCreated'));
      }
      setShowForm(false);
      setEditing(null);
      setForm(emptyForm);
      await publishSite('soft');
      refresh();
    } catch {
      toast.error(t('common.error'));
    }
  };

  const toggleActive = async (item) => {
    try {
      await updateGalleryItem(item.id, { active: !item.active });
      toast.success(t('admin.gallery.itemUpdated'));
      await publishSite('soft');
      refresh();
    } catch {
      toast.error(t('common.error'));
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm(t('admin.confirmDelete'))) return;
    try {
      await deleteGalleryItem(id);
      toast.success(t('admin.gallery.itemDeleted'));
      await publishSite('soft');
      refresh();
    } catch {
      toast.error(t('common.error'));
    }
  };

  const handleSyncDefaults = async () => {
    if (!window.confirm(t('admin.gallery.syncDefaultsConfirm'))) return;
    setSyncing(true);
    try {
      const pack = getDefaultGalleryItems?.() || DEFAULT_GALLERY_ITEMS.map(({ id, ...rest }) => rest);
      await replaceGalleryItems(pack);
      await publishSite('soft');
      toast.success(t('admin.gallery.syncDefaultsDone'));
      refresh();
    } catch {
      toast.error(t('common.error'));
    } finally {
      setSyncing(false);
    }
  };

  const handleHeroSave = async (e) => {
    e.preventDefault();
    setHeroSaving(true);
    try {
      await updateGalleryHeroSettings(heroForm);
      await publishSite('soft');
      toast.success(t('admin.gallery.heroSaved'));
    } catch {
      toast.error(t('common.error'));
    } finally {
      setHeroSaving(false);
    }
  };

  const setHero = (key, value) => setHeroForm((f) => ({ ...f, [key]: value }));

  const startEdit = (b) => {
    setForm({
      ...emptyForm,
      titleEn: b.titleEn || '',
      titleAr: b.titleAr || '',
      subtitleEn: b.subtitleEn || '',
      subtitleAr: b.subtitleAr || '',
      locationEn: b.locationEn || '',
      locationAr: b.locationAr || '',
      metaEn: b.metaEn || '',
      metaAr: b.metaAr || '',
      category: b.category || 'city',
      mediaType: b.mediaType || (b.videoUrl ? 'video' : 'image'),
      imageUrl: b.imageUrl || '',
      videoUrl: b.videoUrl || '',
      posterUrl: b.posterUrl || b.imageUrl || '',
      sortOrder: b.sortOrder ?? 0,
      active: b.active ?? true,
    });
    setEditing(b.id);
    setShowForm(true);
  };

  const columns = [
    adminSnoColumn(t),
    { key: 'preview', label: t('admin.gallery.media') },
    { key: 'title', label: t('admin.gallery.titleField') },
    { key: 'location', label: t('admin.gallery.location') },
    { key: 'category', label: t('admin.gallery.category') },
    { key: 'type', label: t('admin.gallery.type') },
    { key: 'status', label: t('dashboard.status') },
    { key: 'actions', label: t('admin.table.actions'), className: 'text-end' },
  ];

  return (
    <div className="space-y-6">
      <AdminPageHeader title={t('admin.nav.gallery')} subtitle={t('admin.gallery.subtitle')}>
        {tab === 'items' && (
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handleSyncDefaults}
              disabled={syncing}
              className="flex items-center gap-2 border border-brand/30 text-brand font-bold px-4 py-2.5 rounded-xl hover:bg-brand/5 transition-all disabled:opacity-60"
            >
              <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
              {t('admin.gallery.syncDefaults')}
            </button>
            <button
              type="button"
              onClick={() => { setShowForm(true); setEditing(null); setForm(emptyForm); }}
              className="flex items-center gap-2 bg-gradient-to-r from-primary-500 to-emerald-600 text-white font-bold px-4 py-2.5 rounded-xl shadow-lg hover:scale-105 transition-all"
            >
              <Plus className="w-5 h-5" />
              {t('admin.gallery.addItem')}
            </button>
          </div>
        )}
      </AdminPageHeader>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setTab('items')}
          className={`px-4 py-2 rounded-xl font-bold text-sm transition-all ${tab === 'items' ? 'bg-brand text-white' : 'border border-brand/20 text-brand'}`}
        >
          <span className="inline-flex items-center gap-2"><Image className="w-4 h-4" />{t('admin.gallery.tabItems')}</span>
        </button>
        <button
          type="button"
          onClick={() => setTab('hero')}
          className={`px-4 py-2 rounded-xl font-bold text-sm transition-all ${tab === 'hero' ? 'bg-brand text-white' : 'border border-brand/20 text-brand'}`}
        >
          <span className="inline-flex items-center gap-2"><Monitor className="w-4 h-4" />{t('admin.gallery.tabHero')}</span>
        </button>
      </div>

      {tab === 'hero' && (
        heroLoading ? <LoadingSpinner /> : (
          <GlassCard>
            <form onSubmit={handleHeroSave} className="space-y-5">
              <FieldGroup labelEn="Title EN" labelAr="العنوان AR">
                <input value={heroForm.titleEn || ''} onChange={(e) => setHero('titleEn', e.target.value)} className="admin-input w-full" />
                <input value={heroForm.titleAr || ''} onChange={(e) => setHero('titleAr', e.target.value)} dir="rtl" className="admin-input w-full" />
              </FieldGroup>
              <FieldGroup labelEn="Subtitle EN" labelAr="الوصف AR">
                <textarea value={heroForm.subtitleEn || ''} onChange={(e) => setHero('subtitleEn', e.target.value)} rows={3} className="admin-input w-full resize-none" />
                <textarea value={heroForm.subtitleAr || ''} onChange={(e) => setHero('subtitleAr', e.target.value)} rows={3} dir="rtl" className="admin-input w-full resize-none" />
              </FieldGroup>
              <label className="flex items-center gap-2 font-bold text-sm">
                <input
                  type="checkbox"
                  checked={heroForm.showVideo === true}
                  onChange={(e) => setHero('showVideo', e.target.checked)}
                />
                {t('admin.gallery.showVideo')}
              </label>
              <MediaUpload
                value={heroForm.videoUrl || ''}
                onChange={(url) => setHeroForm((f) => ({ ...f, videoUrl: url }))}
                folder="gallery-hero"
                videoMode
                allowUrl
                label={t('admin.gallery.heroVideo')}
              />
              <AdminApplyButton type="submit" loading={heroSaving} />
            </form>
          </GlassCard>
        )
      )}

      {tab === 'items' && (
        <>
          <AdminFilterBox
            title={t('admin.filters')}
            search={search}
            onSearchChange={onSearchChange}
            searchPending={searchPending}
            searchPlaceholder={t('admin.gallery.search')}
            activeCount={(statusFilter === 'all' ? 0 : 1) + (categoryFilter === 'all' ? 0 : 1)}
          >
            <AdminFilterChips
              value={statusFilter}
              onChange={setStatusFilter}
              options={[
                { key: 'all', label: t('admin.filterAll'), count: (items || []).length, variant: 'green' },
                { key: 'active', label: t('admin.products.active'), count: activeCount, variant: 'green' },
                { key: 'inactive', label: t('admin.products.inactive'), count: inactiveCount, variant: 'red' },
              ]}
            />
            <AdminFilterChips
              label={t('admin.filterByCategory')}
              value={categoryFilter}
              onChange={setCategoryFilter}
              options={[
                { key: 'all', label: t('admin.gallery.catAll'), count: categoryCounts.all, variant: 'green' },
                ...CATEGORIES.map((c) => ({
                  key: c,
                  label: categoryLabel(t, c),
                  count: categoryCounts[c] || 0,
                  variant: 'green',
                })),
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
                  <input value={form.locationEn} onChange={(e) => setForm({ ...form, locationEn: e.target.value })} placeholder="Location EN" className="admin-input" />
                  <input value={form.locationAr} onChange={(e) => setForm({ ...form, locationAr: e.target.value })} placeholder="الموقع AR" dir="rtl" className="admin-input" />
                  <input value={form.metaEn} onChange={(e) => setForm({ ...form, metaEn: e.target.value })} placeholder="Meta EN (e.g. 85km · VIP)" className="admin-input" />
                  <input value={form.metaAr} onChange={(e) => setForm({ ...form, metaAr: e.target.value })} placeholder="البيانات AR" dir="rtl" className="admin-input" />
                  <input
                    type="number"
                    value={form.sortOrder}
                    onChange={(e) => setForm({ ...form, sortOrder: e.target.value })}
                    placeholder="Sort order"
                    className="admin-input"
                  />
                  <AdminSelect
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                    className="admin-input"
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c}>{categoryLabel(t, c)}</option>
                    ))}
                  </AdminSelect>
                  <AdminSelect
                    value={form.mediaType}
                    onChange={(e) => setForm({ ...form, mediaType: e.target.value })}
                    className="admin-input"
                  >
                    <option value="image">{t('admin.gallery.typeImage')}</option>
                    <option value="video">{t('admin.gallery.typeVideo')}</option>
                  </AdminSelect>
                </div>

                <MediaUpload
                  value={form.imageUrl}
                  onChange={(url) => setForm((f) => ({ ...f, imageUrl: url, posterUrl: f.posterUrl || url }))}
                  folder="gallery"
                  allowUrl
                  label={t('admin.gallery.image')}
                />

                {form.mediaType === 'video' && (
                  <MediaUpload
                    value={form.videoUrl}
                    onChange={(url) => setForm((f) => ({ ...f, videoUrl: url }))}
                    folder="gallery"
                    videoMode
                    allowUrl
                    label={t('admin.gallery.video')}
                  />
                )}

                <div className="flex gap-2">
                  <AdminApplyButton type="submit" />
                  <button type="button" onClick={() => setShowForm(false)} className="px-6 py-2.5 rounded-xl border font-bold">{t('common.cancel')}</button>
                </div>
              </form>
            </GlassCard>
          )}

          {loading ? <LoadingSpinner /> : (
            <>
              <div className="lg:hidden space-y-4 w-full">
                {paginated.length === 0 ? (
                  <GlassCard hover={false} className="text-center py-12 text-gray-500">{t('admin.gallery.noItems')}</GlassCard>
                ) : paginated.map((b) => (
                  <GlassCard key={b.id} className="!p-0 overflow-hidden w-full">
                    <div className="aspect-[16/10] bg-gray-100 dark:admin-surface relative overflow-hidden">
                      {b.mediaType === 'video' && b.videoUrl ? (
                        <video src={b.videoUrl} poster={b.posterUrl || b.imageUrl} className="w-full h-full object-cover" muted />
                      ) : b.imageUrl ? (
                        <img src={b.imageUrl} alt="" className="w-full h-full object-cover" loading="lazy" decoding="async" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center"><Image className="w-10 h-10 text-gray-300" /></div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent flex items-end p-4">
                        <div className="text-white min-w-0">
                          <h3 className="font-black truncate">{lang === 'ar' ? b.titleAr : b.titleEn}</h3>
                          <p className="text-sm text-white/80 line-clamp-1">{lang === 'ar' ? b.subtitleAr : b.subtitleEn}</p>
                          <p className="text-xs text-white/70 mt-1">
                            {(lang === 'ar' ? b.locationAr : b.locationEn) || '—'}
                            {' · '}
                            {categoryLabel(t, b.category || 'city')}
                          </p>
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
                        onEdit={() => startEdit(b)}
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

              <div className="hidden lg:block w-full overflow-x-auto">
                <AdminDataTable columns={columns} pagination={{ page, totalPages, from, to, total, onPageChange: setPage }}>
                  {paginated.length === 0 ? (
                    <tr><td colSpan={columns.length} className="p-12 text-center text-gray-500">{t('admin.gallery.noItems')}</td></tr>
                  ) : paginated.map((b, idx) => (
                    <AdminTableRow key={b.id}>
                      <AdminSnoCell n={from + idx} />
                      <AdminTableCell>
                        {b.imageUrl || b.posterUrl ? (
                          <img src={b.imageUrl || b.posterUrl} alt="" className="w-24 h-14 rounded-lg object-cover" loading="lazy" decoding="async" />
                        ) : (
                          <Image className="w-8 h-8 text-gray-300" />
                        )}
                      </AdminTableCell>
                      <AdminTableCell>
                        <p className="font-bold">{lang === 'ar' ? b.titleAr : b.titleEn}</p>
                        <p className="text-xs text-gray-500 line-clamp-1">{lang === 'ar' ? b.subtitleAr : b.subtitleEn}</p>
                        {(b.metaEn || b.metaAr) && (
                          <p className="text-[11px] text-gray-400 mt-0.5">{lang === 'ar' ? b.metaAr : b.metaEn}</p>
                        )}
                      </AdminTableCell>
                      <AdminTableCell>
                        <p className="text-sm font-semibold">{lang === 'ar' ? (b.locationAr || b.locationEn) : (b.locationEn || b.locationAr) || '—'}</p>
                      </AdminTableCell>
                      <AdminTableCell>
                        <span className="text-xs font-bold px-2 py-1 rounded-full bg-primary-50 text-primary-700 dark:bg-primary-900/30 dark:text-primary-200">
                          {categoryLabel(t, b.category || 'city')}
                        </span>
                      </AdminTableCell>
                      <AdminTableCell>
                        <span className="inline-flex items-center gap-1 text-xs font-bold">
                          {b.mediaType === 'video' ? <Video className="w-3.5 h-3.5" /> : <Image className="w-3.5 h-3.5" />}
                          {b.mediaType === 'video' ? t('admin.gallery.typeVideo') : t('admin.gallery.typeImage')}
                        </span>
                      </AdminTableCell>
                      <AdminTableCell>
                        <span className={`text-xs font-bold px-2 py-1 rounded-full ${b.active ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
                          {b.active ? t('admin.products.active') : t('admin.products.inactive')}
                        </span>
                      </AdminTableCell>
                      <AdminTableCell className="text-end">
                        <AdminCrudActions
                          active={b.active}
                          onToggle={() => toggleActive(b)}
                          onEdit={() => startEdit(b)}
                          onDelete={() => handleDelete(b.id)}
                        />
                      </AdminTableCell>
                    </AdminTableRow>
                  ))}
                </AdminDataTable>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
