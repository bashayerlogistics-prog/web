import { useState, useMemo, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, MessageCircle, Download } from 'lucide-react';
import {
  getAllTravelReservations,
  createTravelReservation,
  updateTravelReservation,
  deleteTravelReservation,
  seedDefaultTravelReservations,
} from '../../firebase/admin';
import MediaUpload from '../../components/admin/MediaUpload';
import { usePublishSiteContent } from '../../hooks/usePublishSiteContent';
import { useAdminDataLoader } from '../../hooks/useAdminDataLoader';
import { usePagination } from '../../hooks/usePagination';
import { useAdminInstantSearch, useResetPageOnFilter } from '../../hooks/useAdminInstantSearch';
import { useToast } from '../../context/ToastContext';
import { getDefaultTravelReservations } from '../../data/contentSeeds';
import { TRAVEL_RESERVATION_ACCENTS } from '../../data/travelReservations';
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

const PAGE_SIZE = 10;
const DEFAULT_COUNT = getDefaultTravelReservations().length;

const emptyForm = {
  titleEn: '',
  titleAr: '',
  hintEn: '',
  hintAr: '',
  messageEn: 'Hello, I would like help with a reservation.',
  messageAr: 'مرحباً، أود المساعدة في الحجز.',
  imageUrl: '',
  accent: 'gold',
  sortOrder: 0,
  active: true,
};

export default function AdminTravelReservations() {
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
  const autoSeededRef = useRef(false);

  const { data: items, loading, refresh } = useAdminDataLoader(getAllTravelReservations);

  // First visit: auto-load Hotel → Flight → Train → Bus → Nusuk for edit
  useEffect(() => {
    if (loading || autoSeededRef.current) return;
    if ((items || []).length >= DEFAULT_COUNT) return;

    autoSeededRef.current = true;
    (async () => {
      setSeeding(true);
      try {
        const result = await seedDefaultTravelReservations(getDefaultTravelReservations());
        if (!result.alreadyExists) {
          toast.success(t('admin.importedCount', { count: result.imported }));
          await publishSite('soft');
        }
        refresh();
      } catch {
        autoSeededRef.current = false;
        toast.error(t('common.error'));
      } finally {
        setSeeding(false);
      }
    })();
  }, [loading, items, publishSite, refresh, t, toast]);

  const list = useMemo(() => {
    const all = items || [];
    return all.filter((item) => {
      const matchStatus = statusFilter === 'all'
        || (statusFilter === 'active' ? item.active : !item.active);
      const matchSearch = !query
        || item.titleEn?.toLowerCase().includes(query)
        || item.titleAr?.includes(query)
        || item.hintEn?.toLowerCase().includes(query)
        || item.hintAr?.includes(query);
      return matchStatus && matchSearch;
    });
  }, [items, query, statusFilter]);

  const { page, setPage, paginated, from, to, total, totalPages } = usePagination(list, PAGE_SIZE);
  useResetPageOnFilter(setPage, query, statusFilter);

  const activeCount = (items || []).filter((x) => x.active).length;
  const inactiveCount = (items || []).length - activeCount;

  const buildPayload = (source = form) => ({
    titleEn: source.titleEn || '',
    titleAr: source.titleAr || '',
    hintEn: source.hintEn || '',
    hintAr: source.hintAr || '',
    messageEn: source.messageEn || '',
    messageAr: source.messageAr || '',
    imageUrl: source.imageUrl || '',
    accent: source.accent || 'gold',
    sortOrder: Number(source.sortOrder) || 0,
    active: source.active ?? true,
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    const payload = buildPayload();
    try {
      if (editing) {
        await updateTravelReservation(editing, payload);
        toast.success(t('admin.travelReservations.itemUpdated'));
      } else {
        await createTravelReservation(payload);
        toast.success(t('admin.travelReservations.itemCreated'));
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
      titleEn: item.titleEn || '',
      titleAr: item.titleAr || '',
      hintEn: item.hintEn || '',
      hintAr: item.hintAr || '',
      messageEn: item.messageEn || '',
      messageAr: item.messageAr || '',
      imageUrl: item.imageUrl || '',
      accent: item.accent || 'gold',
      sortOrder: item.sortOrder ?? 0,
      active: item.active ?? true,
    });
    setEditing(item.id);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const toggleActive = async (item) => {
    try {
      await updateTravelReservation(item.id, { active: !item.active });
      toast.success(t('admin.travelReservations.itemUpdated'));
      await publishSite('soft');
      refresh();
    } catch {
      toast.error(t('common.error'));
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm(t('admin.confirmDelete'))) return;
    try {
      await deleteTravelReservation(id);
      toast.success(t('admin.travelReservations.itemDeleted'));
      await publishSite('soft');
      refresh();
    } catch {
      toast.error(t('common.error'));
    }
  };

  const handleSeed = async () => {
    setSeeding(true);
    try {
      const result = await seedDefaultTravelReservations(getDefaultTravelReservations());
      toast.success(
        result.alreadyExists
          ? t('admin.alreadyImported')
          : t('admin.importedCount', { count: result.imported }),
      );
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
    { key: 'image', label: t('admin.travelReservations.image') },
    { key: 'name', label: t('admin.travelReservations.name') },
    { key: 'accent', label: t('admin.travelReservations.accent') },
    { key: 'status', label: t('dashboard.status') },
    { key: 'actions', label: t('admin.table.actions'), className: 'text-end' },
  ];

  const emptyMessage = (
    <div className="text-center py-10 space-y-3">
      <p className="text-gray-500">{t('admin.travelReservations.noItems')}</p>
      <button
        type="button"
        onClick={handleSeed}
        disabled={seeding}
        className="inline-flex items-center gap-2 bg-brand text-white font-bold px-4 py-2.5 rounded-xl disabled:opacity-60"
      >
        <Download className="w-4 h-4" />
        {seeding ? t('common.loading') : t('admin.importSiteDefaults')}
      </button>
    </div>
  );

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title={t('admin.nav.travelReservations')}
        subtitle={t('admin.travelReservations.subtitle')}
      >
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
          {t('admin.travelReservations.add')}
        </button>
      </AdminPageHeader>

      <AdminFilterBox
        title={t('admin.filters')}
        search={search}
        onSearchChange={onSearchChange}
        searchPending={searchPending}
        searchPlaceholder={t('admin.travelReservations.search')}
        activeCount={statusFilter === 'all' ? 0 : 1}
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
      </AdminFilterBox>

      {showForm && (
        <GlassCard className="animate-fade-in-up">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <input
                value={form.titleEn}
                onChange={(e) => setForm({ ...form, titleEn: e.target.value })}
                placeholder={t('admin.travelReservations.titleEn')}
                required
                className="admin-input"
              />
              <input
                value={form.titleAr}
                onChange={(e) => setForm({ ...form, titleAr: e.target.value })}
                placeholder={t('admin.travelReservations.titleAr')}
                required
                dir="rtl"
                className="admin-input"
              />
              <input
                value={form.hintEn}
                onChange={(e) => setForm({ ...form, hintEn: e.target.value })}
                placeholder={t('admin.travelReservations.hintEn')}
                className="admin-input"
              />
              <input
                value={form.hintAr}
                onChange={(e) => setForm({ ...form, hintAr: e.target.value })}
                placeholder={t('admin.travelReservations.hintAr')}
                dir="rtl"
                className="admin-input"
              />
              <textarea
                value={form.messageEn}
                onChange={(e) => setForm({ ...form, messageEn: e.target.value })}
                placeholder={t('admin.travelReservations.messageEn')}
                rows={2}
                className="admin-input md:col-span-1"
              />
              <textarea
                value={form.messageAr}
                onChange={(e) => setForm({ ...form, messageAr: e.target.value })}
                placeholder={t('admin.travelReservations.messageAr')}
                rows={2}
                dir="rtl"
                className="admin-input md:col-span-1"
              />
              <AdminSelect
                value={form.accent}
                onChange={(e) => setForm({ ...form, accent: e.target.value })}
                className="admin-input"
              >
                {TRAVEL_RESERVATION_ACCENTS.map((a) => (
                  <option key={a.id} value={a.id}>
                    {t(`admin.travelReservations.accents.${a.id}`)}
                  </option>
                ))}
              </AdminSelect>
              <input
                type="number"
                value={form.sortOrder}
                onChange={(e) => setForm({ ...form, sortOrder: e.target.value })}
                placeholder={t('admin.travelReservations.order')}
                className="admin-input"
              />
              <MediaUpload
                value={form.imageUrl}
                onChange={(url) => setForm({ ...form, imageUrl: url })}
                folder="travel-reservations"
                allowUrl
                label={t('admin.travelReservations.image')}
                className="md:col-span-2"
                previewClassName="w-24 h-24 object-contain rounded-full"
              />
              <label className="flex items-center gap-2 text-sm font-bold text-brand md:col-span-2">
                <input
                  type="checkbox"
                  checked={form.active}
                  onChange={(e) => setForm({ ...form, active: e.target.checked })}
                />
                {t('admin.products.active')}
              </label>
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

      {loading || seeding ? <LoadingSpinner /> : (
        <>
          <div className="lg:hidden space-y-4 w-full">
            {paginated.length === 0 ? (
              <GlassCard hover={false}>{emptyMessage}</GlassCard>
            ) : paginated.map((item) => (
              <GlassCard key={item.id} className="!p-4 w-full">
                <div className="flex items-center gap-3">
                  {item.imageUrl ? (
                    <img src={item.imageUrl} alt="" className="w-14 h-14 rounded-full object-contain bg-white border shrink-0" />
                  ) : (
                    <span className="w-14 h-14 rounded-full bg-brand/10 flex items-center justify-center shrink-0">
                      <MessageCircle className="w-6 h-6 text-brand" />
                    </span>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="font-bold truncate">{lang === 'ar' ? item.titleAr : item.titleEn}</p>
                    <p className="text-xs text-gray-500 truncate">
                      {lang === 'ar' ? item.hintAr : item.hintEn}
                    </p>
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
                  <td colSpan={columns.length}>{emptyMessage}</td>
                </tr>
              ) : paginated.map((item, idx) => (
                <AdminTableRow key={item.id}>
                  <AdminSnoCell n={from + idx} />
                  <AdminTableCell>
                    {item.imageUrl ? (
                      <img src={item.imageUrl} alt="" className="w-12 h-12 rounded-full object-contain bg-white border" />
                    ) : (
                      <span className="inline-flex w-12 h-12 rounded-full bg-brand/10 items-center justify-center">
                        <MessageCircle className="w-5 h-5 text-brand" />
                      </span>
                    )}
                  </AdminTableCell>
                  <AdminTableCell>
                    <p className="font-bold">{lang === 'ar' ? item.titleAr : item.titleEn}</p>
                    <p className="text-xs text-gray-500">{lang === 'ar' ? item.hintAr : item.hintEn}</p>
                  </AdminTableCell>
                  <AdminTableCell>
                    <span className="text-xs font-semibold text-brand/80">
                      {t(`admin.travelReservations.accents.${item.accent || 'gold'}`)}
                    </span>
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
        </>
      )}
    </div>
  );
}
