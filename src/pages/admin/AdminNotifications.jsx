import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Bell, Send, Users, Sparkles, FileText, Check } from 'lucide-react';
import { sendNotification, sendNotificationToAll, getAllNotifications } from '../../firebase/admin';
import { useAdminData } from '../../context/AdminDataContext';
import { useAdminDataLoader } from '../../hooks/useAdminDataLoader';
import { usePagination } from '../../hooks/usePagination';
import { useAdminInstantSearch, useResetPageOnFilter } from '../../hooks/useAdminInstantSearch';
import { useToast } from '../../context/ToastContext';
import { formatBookingDateTime } from '../../utils/bookingHelpers';
import { NOTIFICATION_TEMPLATES, TEMPLATE_CATEGORIES } from '../../data/notificationTemplates';
import AdminPageHeader from '../../components/admin/AdminPageHeader';
import AdminApplyButton from '../../components/admin/AdminApplyButton';
import AdminSelect from '../../components/admin/AdminSelect';
import AdminFilterBox from '../../components/admin/AdminFilterBox';
import AdminDataTable, { AdminTableRow, AdminTableCell, adminSnoColumn, AdminSnoCell } from '../../components/admin/AdminDataTable';
import AdminPagination from '../../components/admin/AdminPagination';
import GlassCard from '../../components/ui/GlassCard';
import LoadingSpinner from '../../components/ui/LoadingSpinner';

const PAGE_SIZE = 10;

export default function AdminNotifications() {
  const { t, i18n } = useTranslation();
  const { toast } = useToast();
  const lang = i18n.language;
  const { users } = useAdminData();
  const [title, setTitle] = useState('');
  const [titleAr, setTitleAr] = useState('');
  const [message, setMessage] = useState('');
  const [messageAr, setMessageAr] = useState('');
  const [targetUser, setTargetUser] = useState('all');
  const [sending, setSending] = useState(false);
  const { search, onSearchChange, query, isPending: searchPending } = useAdminInstantSearch();
  const [templateCategory, setTemplateCategory] = useState('all');
  const [showTemplates, setShowTemplates] = useState(true);

  const { data: sent, loading, refresh } = useAdminDataLoader(getAllNotifications);
  const list = useMemo(() => {
    const all = sent || [];
    if (!query) return all;
    return all.filter((n) =>
      n.title?.toLowerCase().includes(query)
      || n.titleAr?.includes(query)
      || n.message?.toLowerCase().includes(query)
      || n.messageAr?.includes(query)
    );
  }, [sent, query]);
  const { page, setPage, paginated, from, to, total, totalPages } = usePagination(list, PAGE_SIZE);
  useResetPageOnFilter(setPage, query);

  const filteredTemplates = useMemo(() => {
    if (templateCategory === 'all') return NOTIFICATION_TEMPLATES;
    return NOTIFICATION_TEMPLATES.filter((tpl) => tpl.category === templateCategory);
  }, [templateCategory]);

  const applyTemplate = (tpl) => {
    setTitle(tpl.title);
    setTitleAr(tpl.titleAr);
    setMessage(tpl.message);
    setMessageAr(tpl.messageAr);
    toast.success(t('admin.notifications.templateApplied'));
  };

  const handleSend = async (e) => {
    e.preventDefault();
    setSending(true);
    try {
      const payload = { type: 'general', title, titleAr, message, messageAr };
      if (targetUser === 'all') {
        await sendNotificationToAll(users, payload);
        toast.success(t('admin.notifSentAll'));
      } else {
        await sendNotification(targetUser, payload);
        toast.success(t('admin.notifSent'));
      }
      setTitle(''); setTitleAr(''); setMessage(''); setMessageAr('');
      refresh();
    } catch {
      toast.error(t('common.error'));
    } finally {
      setSending(false);
    }
  };

  const getUserName = (userId) => {
    const u = users.find((x) => x.id === userId);
    return u?.displayName || u?.email || userId?.slice(0, 8) || '—';
  };

  const columns = [
    adminSnoColumn(t),
    { key: 'title', label: t('admin.notifications.titleField') },
    { key: 'message', label: t('admin.notifications.message') },
    { key: 'user', label: t('admin.table.recipient') },
    { key: 'date', label: t('dashboard.date') },
  ];

  return (
    <div className="space-y-6">
      <AdminPageHeader title={t('admin.nav.notifications')} subtitle={t('admin.notificationsSubtitle')} />

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 sm:gap-6 w-full">
        <div className="xl:col-span-1 space-y-4">
          <GlassCard>
            <button
              type="button"
              onClick={() => setShowTemplates((v) => !v)}
              className="w-full flex items-center justify-between gap-2 mb-3"
            >
              <h2 className="font-black flex items-center gap-2 text-base text-dark-800 dark:text-white">
                <Sparkles className="w-5 h-5 text-gold" />
                {t('admin.notifications.aiTemplates')}
              </h2>
              <span className="text-xs text-brand font-bold">{showTemplates ? '−' : '+'}</span>
            </button>

            {showTemplates && (
              <>
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {TEMPLATE_CATEGORIES.map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setTemplateCategory(cat.id)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors ${
                        templateCategory === cat.id
                          ? 'bg-brand text-white'
                          : 'bg-gray-100 dark:bg-brand/10 text-gray-600 dark:text-gray-300 hover:bg-brand/10'
                      }`}
                    >
                      {t(cat.labelKey)}
                    </button>
                  ))}
                </div>

                <div className="space-y-2 max-h-[280px] overflow-y-auto pe-1">
                  {filteredTemplates.map((tpl) => (
                    <div
                      key={tpl.id}
                      className="w-full text-start p-3 rounded-xl border border-gray-200 dark:border-brand/15 hover:border-brand/40 hover:bg-brand/5 transition-all group"
                    >
                      <div className="flex items-start gap-2">
                        <FileText className="w-4 h-4 text-brand mt-0.5 flex-shrink-0" />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-bold text-dark-800 dark:text-white truncate group-hover:text-brand">
                            {lang === 'ar' ? tpl.titleAr : tpl.title}
                          </p>
                          <p className="text-xs text-gray-400 line-clamp-2 mt-0.5">
                            {lang === 'ar' ? tpl.messageAr : tpl.message}
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => applyTemplate(tpl)}
                        className="mt-2 w-full inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-primary-500 to-emerald-600 text-white text-xs font-bold hover:scale-[1.02] transition-all"
                      >
                        <Check className="w-3.5 h-3.5" />
                        {t('common.apply')}
                      </button>
                    </div>
                  ))}
                </div>
              </>
            )}
          </GlassCard>

          <GlassCard>
            <form onSubmit={handleSend} className="space-y-4">
              <h2 className="font-black flex items-center gap-2 text-lg text-dark-800 dark:text-white">
                <Send className="w-5 h-5 text-primary-500" />
                {t('admin.sendNotification')}
              </h2>
              <AdminSelect value={targetUser} onChange={(e) => setTargetUser(e.target.value)}
                className="admin-input w-full">
                <option value="all">{t('admin.sendToAll')}</option>
                {users.map((u) => <option key={u.id} value={u.id}>{u.displayName || u.email}</option>)}
              </AdminSelect>
              <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title (EN)" required className="admin-input w-full" />
              <input value={titleAr} onChange={(e) => setTitleAr(e.target.value)} placeholder="العنوان (AR)" required dir="rtl" className="admin-input w-full" />
              <textarea value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Message EN" required rows={3} className="admin-input w-full resize-none" />
              <textarea value={messageAr} onChange={(e) => setMessageAr(e.target.value)} placeholder="الرسالة AR" required rows={3} dir="rtl" className="admin-input w-full resize-none" />
              <AdminApplyButton type="submit" loading={sending} label={t('admin.sendNotification')} fullWidth />
            </form>
          </GlassCard>
        </div>

        <div className="xl:col-span-2 space-y-4 w-full">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-primary-500" />
            <h2 className="font-black text-lg text-dark-800 dark:admin-on-dark">{t('admin.sentNotifications')}</h2>
            <span className="text-xs bg-primary-100 dark:bg-white/20 text-primary-700 dark:text-white px-2 py-0.5 rounded-full font-bold">{total}</span>
          </div>

          <AdminFilterBox
            title={t('admin.filters')}
            search={search}
            onSearchChange={onSearchChange}
            searchPending={searchPending}
            searchPlaceholder={t('admin.searchNotifications')}
          />

          <div className="lg:hidden space-y-3 w-full">
            {loading ? <LoadingSpinner /> : paginated.length === 0 ? (
              <GlassCard hover={false} className="text-center py-12">
                <Bell className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">{t('admin.noNotifications')}</p>
              </GlassCard>
            ) : paginated.map((n) => (
              <GlassCard key={n.id} className="!p-4 space-y-2 w-full">
                <p className="font-black text-dark-800 dark:text-white">{lang === 'ar' ? n.titleAr || n.title : n.title}</p>
                <p className="text-sm text-gray-500 line-clamp-2">{lang === 'ar' ? n.messageAr || n.message : n.message}</p>
                <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                  <span className="text-xs font-semibold px-2 py-1 rounded-lg bg-primary-50 dark:bg-primary-900/30 text-primary-600">
                    {n.userId ? getUserName(n.userId) : t('admin.sendToAll')}
                  </span>
                  <span className="text-xs text-gray-400">{formatBookingDateTime(n.createdAt, lang)}</span>
                </div>
              </GlassCard>
            ))}
            {!loading && total > 0 && (
              <GlassCard padding="p-0" hover={false}>
                <AdminPagination page={page} totalPages={totalPages} from={from} to={to} total={total} onPageChange={setPage} />
              </GlassCard>
            )}
          </div>

          <div className="hidden lg:block w-full">
          <AdminDataTable
            columns={columns}
            loading={loading}
            loadingComponent={<LoadingSpinner />}
            pagination={{ page, totalPages, from, to, total, onPageChange: setPage }}
          >
            {!loading && paginated.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="p-16 text-center">
                  <Bell className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500">{t('admin.noNotifications')}</p>
                </td>
              </tr>
            ) : paginated.map((n, idx) => (
              <AdminTableRow key={n.id}>
                <AdminSnoCell n={from + idx} />
                <AdminTableCell>
                  <p className="font-bold">{lang === 'ar' ? n.titleAr || n.title : n.title}</p>
                </AdminTableCell>
                <AdminTableCell>
                  <p className="text-gray-500 text-xs line-clamp-2 max-w-[200px]">{lang === 'ar' ? n.messageAr || n.message : n.message}</p>
                </AdminTableCell>
                <AdminTableCell>
                  <span className="text-xs font-semibold px-2 py-1 rounded-lg bg-primary-50 dark:bg-primary-900/30 text-primary-600">
                    {n.userId ? getUserName(n.userId) : t('admin.sendToAll')}
                  </span>
                </AdminTableCell>
                <AdminTableCell className="text-gray-500 text-xs whitespace-nowrap">
                  {formatBookingDateTime(n.createdAt, lang)}
                </AdminTableCell>
              </AdminTableRow>
            ))}
          </AdminDataTable>
          </div>
        </div>
      </div>
    </div>
  );
}
