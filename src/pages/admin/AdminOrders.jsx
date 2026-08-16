import { useEffect, useMemo, useRef, useState, useCallback, startTransition } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Eye, CreditCard, ShoppingBag, Plus, ArrowUpDown, X, MessageCircle, Globe, Phone,
} from 'lucide-react';
import {
  updateBookingStatus,
  updateBookingPayment,
  sendNotification,
  subscribeToBookingsPage,
  getBookingsPage,
} from '../../firebase/admin';
import { confirmPayment, rejectPayment } from '../../firebase/payment';
import { useAdminAuth } from '../../context/AdminAuthContext';
import { CITIES } from '../../data/staticData';
import { getCityName, getStatusLabel, formatBookingDate } from '../../utils/bookingHelpers';
import { buildOrderNumberMap, getOrderDisplayId, orderNumberMatches } from '../../utils/orderHelpers';
import { useAdminData } from '../../context/AdminDataContext';
import { useToast } from '../../context/ToastContext';
import { useAdminInstantSearch, useAdminInstantFilter } from '../../hooks/useAdminInstantSearch';
import AdminPageHeader from '../../components/admin/AdminPageHeader';
import AdminSelect from '../../components/admin/AdminSelect';
import AdminFilterBox from '../../components/admin/AdminFilterBox';
import AdminFilterChips from '../../components/admin/AdminFilterChips';
import AdminDataTable, { AdminTableRow, AdminTableCell, adminSnoColumn, AdminSnoCell } from '../../components/admin/AdminDataTable';
import AdminTableActions, { AdminTableAction } from '../../components/admin/AdminTableActions';
import AdminPagination from '../../components/admin/AdminPagination';
import OrderDetailModal from '../../components/admin/OrderDetailModal';
import ManualOrderModal from '../../components/admin/ManualOrderModal';
import SendNotificationModal from '../../components/admin/SendNotificationModal';
import { getPaymentMethodLabel, getPaymentStatusLabel } from '../../utils/paymentHelpers';
import { subscribeToPendingOrders } from '../../utils/offlineOrderQueue';
import StatusBadge from '../../components/ui/StatusBadge';
import LoadingSpinner from '../../components/ui/LoadingSpinner';

const PAYMENT_FILTERS = ['all', 'pending', 'proof_submitted', 'paid', 'rejected', 'refunded'];
const METHOD_FILTERS = ['all', 'whatsapp', 'bank_transfer', 'online_gateway', 'cash'];
const SOURCE_FILTERS = ['all', 'website', 'whatsapp', 'manual'];
const SORT_OPTIONS = ['newest', 'oldest', 'amount_high', 'amount_low'];
const PAGE_SIZES = [10, 20, 50, 100];

const STATUS_CHIP_VARIANTS = {
  all: 'green',
  pending: 'amber',
  confirmed: 'green',
  completed: 'green',
  cancelled: 'red',
};

const PAYMENT_BADGE = {
  pending: 'bg-amber-100 text-amber-800 border-amber-200',
  proof_submitted: 'bg-blue-100 text-blue-800 border-blue-200',
  paid: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  rejected: 'bg-red-100 text-red-800 border-red-200',
  refunded: 'bg-violet-100 text-violet-800 border-violet-200',
};

function tsMillis(booking) {
  const ts = booking?.createdAt;
  if (!ts) return 0;
  return ts.toMillis?.() ?? (ts.seconds ? ts.seconds * 1000 : new Date(ts).getTime() || 0);
}

function SourceIcon({ source }) {
  if (source === 'whatsapp') return <MessageCircle className="w-3.5 h-3.5 text-green-600" />;
  if (source === 'manual') return <Phone className="w-3.5 h-3.5 text-brand" />;
  return <Globe className="w-3.5 h-3.5 text-brand" />;
}

export default function AdminOrders() {
  const { t, i18n } = useTranslation();
  const { toast } = useToast();
  const { adminEmail } = useAdminAuth();
  const lang = i18n.language;
  const { usersMap, bookingCounts, refresh: refreshAdmin } = useAdminData();
  const { search, onSearchChange, query, isPending: searchPending } = useAdminInstantSearch();
  const { filter: statusFilter, setFilter: setStatusFilter } = useAdminInstantFilter('all');
  const { filter: paymentFilter, setFilter: setPaymentFilter } = useAdminInstantFilter('all');
  const { filter: methodFilter, setFilter: setMethodFilter } = useAdminInstantFilter('all');
  const { filter: sourceFilter, setFilter: setSourceFilter } = useAdminInstantFilter('all');
  const { filter: sortBy, setFilter: setSortBy } = useAdminInstantFilter('newest');
  const [pageSize, setPageSize] = useState(20);
  const [page, setPage] = useState(1);
  const [bookings, setBookings] = useState([]);
  const [pendingLocalOrders, setPendingLocalOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [notifModal, setNotifModal] = useState({ open: false, booking: null, user: null });
  const [manualOpen, setManualOpen] = useState(false);
  const pageCursorRef = useRef({}); // page number → startAfter cursor for that page
  const lastDocRef = useRef(null);

  useEffect(() => subscribeToPendingOrders((pending) => {
    setPendingLocalOrders(pending.map((item) => ({
      id: item.bookingId,
      ...item.orderData,
      userId: item.userId,
      orderNumber: item.orderNumber,
      status: 'pending',
      paymentStatus: item.orderData.paymentStatus || 'pending',
      createdAt: item.queuedAt,
      _offlinePending: true,
    })));
  }), []);

  const visibleBookings = useMemo(() => {
    const remoteIds = new Set(bookings.map((booking) => booking.id));
    return [...pendingLocalOrders.filter((booking) => !remoteIds.has(booking.id)), ...bookings];
  }, [bookings, pendingLocalOrders]);

  const serverQuery = useMemo(() => ({
    status: statusFilter,
    paymentStatus: paymentFilter,
    pageSize,
  }), [statusFilter, paymentFilter, pageSize]);

  // Reset to live first page whenever server filters / page size change.
  useEffect(() => {
    setPage(1);
    pageCursorRef.current = {};
    lastDocRef.current = null;
  }, [statusFilter, paymentFilter, pageSize]);

  // Page 1: live listener so new orders keep arriving. Later pages: one-shot cursor fetch.
  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    if (page === 1) {
      const unsub = subscribeToBookingsPage(
        serverQuery,
        ({ items, lastDoc, hasMore: more }) => {
          if (cancelled) return;
          startTransition(() => {
            setBookings(items);
            setHasMore(more);
            setLoading(false);
            lastDocRef.current = lastDoc;
            if (lastDoc) pageCursorRef.current[2] = lastDoc;
          });
        },
        (err) => {
          console.error('Orders live failed:', err);
          if (!cancelled) setLoading(false);
        },
      );
      return () => {
        cancelled = true;
        unsub();
      };
    }

    (async () => {
      try {
        const cursor = pageCursorRef.current[page] || null;
        const { items, lastDoc, hasMore: more } = await getBookingsPage({
          ...serverQuery,
          cursor,
        });
        if (cancelled) return;
        setBookings(items);
        setHasMore(more);
        lastDocRef.current = lastDoc;
        if (lastDoc) pageCursorRef.current[page + 1] = lastDoc;
      } catch (err) {
        console.error('Orders page fetch failed:', err);
        if (!cancelled) setBookings([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [page, serverQuery]);

  const counts = useMemo(() => ({
    all: bookingCounts.all || 0,
    pending: bookingCounts.pending || 0,
    confirmed: bookingCounts.confirmed || 0,
    completed: bookingCounts.completed || 0,
    cancelled: bookingCounts.cancelled || 0,
  }), [bookingCounts]);

  const paymentCounts = useMemo(() => ({
    all: bookingCounts.payment?.all ?? bookingCounts.all ?? 0,
    pending: bookingCounts.payment?.pending ?? 0,
    proof_submitted: bookingCounts.payment?.proof_submitted ?? 0,
    paid: bookingCounts.payment?.paid ?? 0,
    rejected: bookingCounts.payment?.rejected ?? 0,
    refunded: bookingCounts.payment?.refunded ?? 0,
  }), [bookingCounts]);

  const orderNumberMap = useMemo(() => buildOrderNumberMap(visibleBookings), [visibleBookings]);

  const filtered = useMemo(() => {
    const list = visibleBookings.filter((b) => {
      const matchLocalStatus = !b._offlinePending
        || statusFilter === 'all'
        || b.status === statusFilter;
      const matchLocalPayment = !b._offlinePending
        || paymentFilter === 'all'
        || b.paymentStatus === paymentFilter;
      const method = b.paymentMethod || '';
      const matchMethod = methodFilter === 'all' || method === methodFilter;
      const source = b.orderSource || (b.paymentMethod === 'whatsapp' ? 'whatsapp' : 'website');
      const matchSource = sourceFilter === 'all' || source === sourceFilter;
      const user = usersMap[b.userId];
      const matchSearch = !query
        || orderNumberMatches(b, orderNumberMap, query)
        || user?.email?.toLowerCase().includes(query)
        || user?.displayName?.toLowerCase().includes(query)
        || b.customerName?.toLowerCase().includes(query)
        || b.customerEmail?.toLowerCase().includes(query)
        || b.customerPhone?.includes(query);
      return matchLocalStatus && matchLocalPayment && matchMethod && matchSource && matchSearch;
    });

    return [...list].sort((a, b) => {
      const amountA = Number(a.totalPrice || a.price || 0);
      const amountB = Number(b.totalPrice || b.price || 0);
      if (sortBy === 'oldest') return tsMillis(a) - tsMillis(b);
      if (sortBy === 'amount_high') return amountB - amountA;
      if (sortBy === 'amount_low') return amountA - amountB;
      return tsMillis(b) - tsMillis(a);
    });
  }, [
    visibleBookings,
    usersMap,
    orderNumberMap,
    query,
    statusFilter,
    paymentFilter,
    methodFilter,
    sourceFilter,
    sortBy,
  ]);

  const serverTotal = useMemo(() => {
    const localCount = pendingLocalOrders.filter((booking) => {
      const statusMatches = statusFilter === 'all' || booking.status === statusFilter;
      const paymentMatches = paymentFilter === 'all' || booking.paymentStatus === paymentFilter;
      return statusMatches && paymentMatches;
    }).length;
    if (statusFilter !== 'all' && paymentFilter === 'all') return (counts[statusFilter] || 0) + localCount;
    if (paymentFilter !== 'all' && statusFilter === 'all') return (paymentCounts[paymentFilter] || 0) + localCount;
    if (statusFilter === 'all' && paymentFilter === 'all') return (counts.all || 0) + localCount;
    // Both filters: approximate from loaded window + paging
    return Math.max(filtered.length, (page - 1) * pageSize + filtered.length + (hasMore ? pageSize : 0));
  }, [statusFilter, paymentFilter, counts, paymentCounts, pendingLocalOrders, filtered.length, page, pageSize, hasMore]);

  const totalPages = Math.max(1, Math.ceil(serverTotal / pageSize) || 1);
  const from = filtered.length === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min((page - 1) * pageSize + filtered.length, serverTotal);
  const paginated = filtered;

  useEffect(() => {
    setPage(1);
  }, [query, methodFilter, sourceFilter, sortBy]);

  const refresh = useCallback(async () => {
    await refreshAdmin({ silent: true, force: true });
    if (page !== 1) {
      const cursor = pageCursorRef.current[page] || null;
      const { items, lastDoc, hasMore: more } = await getBookingsPage({ ...serverQuery, cursor });
      setBookings(items);
      setHasMore(more);
      lastDocRef.current = lastDoc;
      if (lastDoc) pageCursorRef.current[page + 1] = lastDoc;
    }
  }, [refreshAdmin, page, serverQuery]);

  const activeFilterCount = [
    statusFilter !== 'all',
    paymentFilter !== 'all',
    methodFilter !== 'all',
    sourceFilter !== 'all',
    sortBy !== 'newest',
  ].filter(Boolean).length;

  const clearFilters = () => {
    setStatusFilter('all');
    setPaymentFilter('all');
    setMethodFilter('all');
    setSourceFilter('all');
    setSortBy('newest');
    onSearchChange('');
  };

  const handleStatusChange = async (bookingId, newStatus) => {
    const booking = visibleBookings.find((b) => b.id === bookingId);
    try {
      await updateBookingStatus(bookingId, newStatus, { notifyUserId: booking?.userId });
      if (selectedBooking?.id === bookingId) setSelectedBooking({ ...selectedBooking, status: newStatus });
      toast.success(t('ui.statusUpdated'));
      refresh();
    } catch { toast.error(t('common.error')); }
  };

  const handlePaymentChange = async (bookingId, paymentStatus) => {
    try {
      await updateBookingPayment(bookingId, paymentStatus);
      if (selectedBooking?.id === bookingId) setSelectedBooking({ ...selectedBooking, paymentStatus });
      toast.success(t('admin.paymentUpdated'));
      refresh();
    } catch { toast.error(t('common.error')); }
  };

  const handleConfirmPayment = async (bookingId) => {
    try {
      await confirmPayment(bookingId, adminEmail);
      if (selectedBooking?.id === bookingId) {
        setSelectedBooking({ ...selectedBooking, paymentStatus: 'paid', status: 'confirmed' });
      }
      toast.success(t('payment.paymentConfirmed'));
      refresh();
    } catch { toast.error(t('common.error')); }
  };

  const handleRejectPayment = async (bookingId, reason) => {
    try {
      await rejectPayment(bookingId, reason, adminEmail);
      if (selectedBooking?.id === bookingId) {
        setSelectedBooking({ ...selectedBooking, paymentStatus: 'rejected', rejectedReason: reason });
      }
      toast.success(t('payment.paymentRejected'));
      refresh();
    } catch { toast.error(t('common.error')); }
  };

  const handleSendNotification = async (payload) => {
    await sendNotification(notifModal.user.id, { ...payload, type: 'order_update' });
    toast.success(t('admin.notifSent'));
  };

  const selectClass =
    'px-3 py-2 rounded-xl border border-brand/15 bg-white dark:admin-input text-xs font-bold outline-none focus:ring-2 focus:ring-brand/30 min-w-[140px]';

  const columns = [
    adminSnoColumn(t),
    { key: 'id', label: t('admin.table.orderId'), width: '9%' },
    { key: 'date', label: t('dashboard.date'), width: '11%' },
    { key: 'customer', label: t('admin.customer'), width: '16%' },
    { key: 'route', label: t('dashboard.route'), width: '16%' },
    { key: 'method', label: t('admin.paymentMethod'), width: '12%' },
    { key: 'payment', label: t('admin.paymentStatus'), width: '12%' },
    { key: 'status', label: t('dashboard.status'), width: '12%' },
    { key: 'price', label: t('dashboard.price'), width: '8%' },
    { key: 'actions', label: t('admin.table.actions'), className: 'text-end', width: '6%' },
  ];

  const paginationProps = {
    page,
    totalPages,
    from,
    to,
    total: serverTotal,
    onPageChange: setPage,
    pageSize,
    onPageSizeChange: (size) => {
      setPageSize(size);
      setPage(1);
    },
    pageSizes: PAGE_SIZES,
  };

  return (
    <div className="space-y-4 sm:space-y-6 w-full">
      <AdminPageHeader title={t('admin.nav.orders')} subtitle={t('admin.ordersSubtitle', { count: counts.all })}>
        <button
          type="button"
          onClick={() => setManualOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-primary-500 to-emerald-600 text-white text-sm font-bold shadow-lg"
        >
          <Plus className="w-4 h-4" />
          {t('payment.manualOrder')}
        </button>
      </AdminPageHeader>

      {/* WooCommerce-style top status tabs */}
      <div className="glass-card-3d p-3 sm:p-4 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <p className="text-[10px] sm:text-xs font-black uppercase tracking-wider text-brand/70 dark:text-gold/70">
            {t('admin.orders.wcStatusTabs')}
          </p>
          {activeFilterCount > 0 && (
            <button
              type="button"
              onClick={clearFilters}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 px-2.5 py-1.5 rounded-lg"
            >
              <X className="w-3.5 h-3.5" />
              {t('admin.orders.clearFilters')}
            </button>
          )}
        </div>
        <AdminFilterChips
          value={statusFilter}
          onChange={setStatusFilter}
          options={['all', 'pending', 'confirmed', 'completed', 'cancelled'].map((s) => ({
            key: s,
            label: s === 'all' ? t('admin.filterAll') : t(`admin.status.${s}`),
            count: counts[s],
            variant: STATUS_CHIP_VARIANTS[s],
          }))}
        />
        <AdminFilterChips
          label={t('admin.paymentStatus')}
          value={paymentFilter}
          onChange={setPaymentFilter}
          options={PAYMENT_FILTERS.map((s) => ({
            key: s,
            label: s === 'all' ? t('admin.filterAll') : getPaymentStatusLabel(s, lang),
            count: paymentCounts[s] ?? 0,
            variant: s === 'paid' ? 'green' : s === 'rejected' ? 'red' : s === 'refunded' ? 'gold' : 'amber',
          }))}
        />
      </div>

      <AdminFilterBox
        title={t('admin.filters')}
        search={search}
        onSearchChange={onSearchChange}
        searchPending={searchPending}
        searchPlaceholder={t('admin.searchOrders')}
        activeCount={activeFilterCount}
        defaultOpen
        filterSectionLabel={t('admin.orders.advancedFilters')}
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <label className="space-y-1.5">
            <span className="text-[10px] font-black uppercase tracking-wider text-brand/60">{t('admin.paymentMethod')}</span>
            <AdminSelect value={methodFilter} onChange={(e) => setMethodFilter(e.target.value)} className={`${selectClass} w-full`}>
              {METHOD_FILTERS.map((m) => (
                <option key={m} value={m}>
                  {m === 'all' ? t('admin.filterAll') : getPaymentMethodLabel(m, lang)}
                </option>
              ))}
            </AdminSelect>
          </label>
          <label className="space-y-1.5">
            <span className="text-[10px] font-black uppercase tracking-wider text-brand/60">{t('payment.orderSource')}</span>
            <AdminSelect value={sourceFilter} onChange={(e) => setSourceFilter(e.target.value)} className={`${selectClass} w-full`}>
              {SOURCE_FILTERS.map((s) => (
                <option key={s} value={s}>
                  {s === 'all' ? t('admin.filterAll') : t(`admin.orders.source.${s}`)}
                </option>
              ))}
            </AdminSelect>
          </label>
          <label className="space-y-1.5">
            <span className="text-[10px] font-black uppercase tracking-wider text-brand/60 inline-flex items-center gap-1">
              <ArrowUpDown className="w-3 h-3" />
              {t('admin.orders.sortBy')}
            </span>
            <AdminSelect value={sortBy} onChange={(e) => setSortBy(e.target.value)} className={`${selectClass} w-full`}>
              {SORT_OPTIONS.map((s) => (
                <option key={s} value={s}>{t(`admin.orders.sort.${s}`)}</option>
              ))}
            </AdminSelect>
          </label>
        </div>
        <p className="text-xs admin-text-muted pt-1">
          {t('admin.orders.filteredCount', { count: filtered.length, total: serverTotal })}
        </p>
      </AdminFilterBox>

      {/* Mobile cards */}
      <div className="lg:hidden space-y-3">
        {loading ? <LoadingSpinner /> : paginated.length === 0 ? (
          <div className="glass-card-3d p-12 text-center">
            <ShoppingBag className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">{t('admin.noOrders')}</p>
          </div>
        ) : paginated.map((booking) => {
          const user = usersMap[booking.userId];
          const orderId = getOrderDisplayId(booking, orderNumberMap);
          const source = booking.orderSource || (booking.paymentMethod === 'whatsapp' ? 'whatsapp' : 'website');
          const paymentStatus = booking.paymentStatus || 'pending';
          return (
            <button key={booking.id} type="button" onClick={() => {
              if (!booking._offlinePending) setSelectedBooking(booking);
            }}
              className="w-full text-start glass-card-3d glass-card-hover p-4 space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <span className="font-black admin-text-primary text-lg">
                  #{orderId}
                  {booking._offlinePending && (
                    <span className="ms-2 text-[9px] text-amber-600 uppercase">Pending sync</span>
                  )}
                </span>
                <StatusBadge status={booking.status} label={getStatusLabel(booking.status, lang)} />
              </div>
              <p className="text-sm font-semibold truncate">
                {booking.customerName || user?.displayName || user?.email || t('admin.unknownUser')}
              </p>
              <p className="text-xs text-gray-500 truncate">
                {getCityName(CITIES, booking.from, lang)} → {getCityName(CITIES, booking.to, lang)}
              </p>
              <div className="flex items-center justify-between gap-2 text-sm flex-wrap">
                <span className="font-bold text-primary-600">{booking.totalPrice || booking.price} {t('booking.sar')}</span>
                <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-full border ${PAYMENT_BADGE[paymentStatus] || PAYMENT_BADGE.pending}`}>
                  <CreditCard className="w-3 h-3" />
                  {getPaymentStatusLabel(paymentStatus, lang)}
                </span>
              </div>
              <div className="flex items-center gap-2 text-[10px] text-gray-500">
                <SourceIcon source={source} />
                <span className="capitalize">{t(`admin.orders.source.${source}`)}</span>
                <span>·</span>
                <span>{getPaymentMethodLabel(booking.paymentMethod || 'bank_transfer', lang)}</span>
              </div>
            </button>
          );
        })}
        {!loading && serverTotal > 0 && (
          <div className="glass-card-3d overflow-hidden">
            <AdminPagination {...paginationProps} />
          </div>
        )}
      </div>

      {/* Desktop WooCommerce-style full table */}
      <div className="hidden lg:block">
        <AdminDataTable
          columns={columns}
          loading={loading}
          loadingComponent={<LoadingSpinner />}
          pagination={paginationProps}
        >
          {!loading && paginated.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="p-16 text-center">
                <ShoppingBag className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">{t('admin.noOrders')}</p>
              </td>
            </tr>
          ) : paginated.map((booking, idx) => {
            const user = usersMap[booking.userId];
            const orderId = getOrderDisplayId(booking, orderNumberMap);
            const paymentStatus = booking.paymentStatus || 'pending';
            const source = booking.orderSource || (booking.paymentMethod === 'whatsapp' ? 'whatsapp' : 'website');
            return (
              <AdminTableRow
                key={booking.id}
                onClick={() => {
                  if (!booking._offlinePending) setSelectedBooking(booking);
                }}
              >
                <AdminSnoCell n={from + idx} />
                <AdminTableCell>
                  <div className="space-y-0.5">
                    <span className="font-black admin-text-primary text-sm">#{orderId}</span>
                    {booking._offlinePending && (
                      <p className="text-[9px] font-bold text-amber-600 uppercase">Pending sync</p>
                    )}
                    <p className="text-[10px] text-gray-400 inline-flex items-center gap-1">
                      <SourceIcon source={source} />
                      {t(`admin.orders.source.${source}`)}
                    </p>
                  </div>
                </AdminTableCell>
                <AdminTableCell>
                  <span className="text-xs font-medium">
                    {booking.date || formatBookingDate(booking.createdAt, lang)}
                  </span>
                  {booking.time && <p className="text-[10px] text-gray-400">{booking.time}</p>}
                </AdminTableCell>
                <AdminTableCell>
                  <p className="font-semibold truncate">
                    {booking.customerName || user?.displayName || t('admin.unknownUser')}
                  </p>
                  <p className="text-[10px] text-gray-500 truncate" dir="ltr">
                    {booking.customerEmail || user?.email || booking.customerPhone || '—'}
                  </p>
                </AdminTableCell>
                <AdminTableCell>
                  <span className="text-xs font-medium line-clamp-2 leading-tight">
                    {getCityName(CITIES, booking.from, lang)} → {getCityName(CITIES, booking.to, lang)}
                  </span>
                </AdminTableCell>
                <AdminTableCell>
                  <span className="text-xs font-semibold">
                    {getPaymentMethodLabel(booking.paymentMethod || 'bank_transfer', lang)}
                  </span>
                </AdminTableCell>
                <AdminTableCell>
                  <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-full border ${PAYMENT_BADGE[paymentStatus] || PAYMENT_BADGE.pending}`}>
                    <CreditCard className="w-3 h-3 flex-shrink-0" />
                    <span className="truncate">{getPaymentStatusLabel(paymentStatus, lang)}</span>
                  </span>
                </AdminTableCell>
                <AdminTableCell>
                  <StatusBadge status={booking.status} label={getStatusLabel(booking.status, lang)} />
                </AdminTableCell>
                <AdminTableCell>
                  <span className="font-black text-primary-600 text-sm">
                    {booking.totalPrice || booking.price} {t('booking.sar')}
                  </span>
                </AdminTableCell>
                <AdminTableCell className="text-end">
                  <AdminTableActions>
                    <AdminTableAction
                      icon={Eye}
                      variant="view"
                      label={t('admin.viewDetails')}
                      onClick={(e) => { e.stopPropagation(); setSelectedBooking(booking); }}
                    />
                  </AdminTableActions>
                </AdminTableCell>
              </AdminTableRow>
            );
          })}
        </AdminDataTable>
      </div>

      <OrderDetailModal
        open={!!selectedBooking}
        booking={selectedBooking}
        orderDisplayId={selectedBooking ? getOrderDisplayId(selectedBooking, orderNumberMap) : null}
        user={selectedBooking ? usersMap[selectedBooking.userId] : null}
        onClose={() => setSelectedBooking(null)}
        onStatusChange={handleStatusChange}
        onPaymentChange={handlePaymentChange}
        onConfirmPayment={handleConfirmPayment}
        onRejectPayment={handleRejectPayment}
        onSendNotification={(booking, user) => setNotifModal({ open: true, booking, user })}
      />

      <ManualOrderModal
        open={manualOpen}
        onClose={() => setManualOpen(false)}
        onCreated={() => refresh()}
      />

      <SendNotificationModal
        open={notifModal.open}
        booking={notifModal.booking}
        orderDisplayId={notifModal.booking ? getOrderDisplayId(notifModal.booking, orderNumberMap) : null}
        user={notifModal.user}
        onClose={() => setNotifModal({ open: false, booking: null, user: null })}
        onSend={handleSendNotification}
      />
    </div>
  );
}
