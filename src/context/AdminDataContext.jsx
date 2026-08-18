import { createContext, useContext, useEffect, useState, useCallback, useMemo, useRef, startTransition } from 'react';
import { useLocation } from 'react-router-dom';
import { useAdminAuth } from './AdminAuthContext';
import {
  getAllUsers,
  getActivityLog,
  getAllPriceRequests,
  getBookingStatsCounts,
  getRecentBookingsForCounts,
  subscribeToBookingsPage,
} from '../firebase/admin';

const AdminDataContext = createContext(null);

function tsMillis(ts) {
  if (!ts) return 0;
  return ts.toMillis?.() ?? ts.seconds * 1000 ?? 0;
}

const EMPTY_BOOKING_COUNTS = {
  all: 0,
  pending: 0,
  confirmed: 0,
  completed: 0,
  cancelled: 0,
  payment: {
    all: 0,
    pending: 0,
    proof_submitted: 0,
    paid: 0,
    rejected: 0,
    refunded: 0,
  },
};

const BOOKING_STATS_CACHE_KEY = 'bashayer-admin-booking-stats-v2';
const BOOKING_STATS_TTL_MS = 15 * 60_000;

function statsStorage() {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function readBookingStatsCache() {
  try {
    const raw = statsStorage()?.getItem(BOOKING_STATS_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed?.value || Date.now() - (parsed.at || 0) > BOOKING_STATS_TTL_MS) return null;
    return parsed.value;
  } catch {
    return null;
  }
}

function writeBookingStatsCache(value) {
  try {
    statsStorage()?.setItem(BOOKING_STATS_CACHE_KEY, JSON.stringify({ at: Date.now(), value }));
  } catch {
    // ignore quota errors
  }
}

const cachedStatsOnBoot = readBookingStatsCache();

export function AdminDataProvider({ children }) {
  const { isAdmin } = useAdminAuth();
  const { pathname } = useLocation();
  const isOverview = pathname === '/admin' || pathname === '/admin/';
  const isOrders = pathname.startsWith('/admin/orders');
  const isUsers = pathname.startsWith('/admin/users');
  const isActivityPage = pathname.startsWith('/admin/activity');
  const needsUsers = isOverview || isUsers || isOrders;
  const needsActivity = isActivityPage;
  const needsOverviewActivity = isOverview;
  // Price-request list only when that page opens — Overview shows a link, not a full dump.
  const needsPriceRequests = pathname.startsWith('/admin/price-requests');
  // Counts are expensive aggregations — only Overview + Orders need them.
  const needsBookingStats = isOverview || isOrders;
  // Overview uses a live listener; Users page needs a bounded booking sample.
  const needsRecentBookings = isUsers;
  const needsAnyAdminData = needsUsers || needsActivity || needsOverviewActivity
    || needsPriceRequests || needsBookingStats || needsRecentBookings;

  const [bookings, setBookings] = useState([]);
  const [bookingCounts, setBookingCounts] = useState(cachedStatsOnBoot || EMPTY_BOOKING_COUNTS);
  const [users, setUsers] = useState([]);
  const [activity, setActivity] = useState([]);
  const [priceRequests, setPriceRequests] = useState([]);
  const [chatUnread, setChatUnread] = useState(0);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [lastRefresh, setLastRefresh] = useState(null);
  const hasLoadedRef = useRef(false);
  const loadedKeysRef = useRef({
    users: false,
    usersLimit: 0,
    activity: false,
    activityPage: false,
    priceRequests: false,
    bookingStats: false,
    recentBookings: false,
  });
  const bookingStatsCacheRef = useRef(
    cachedStatsOnBoot ? { at: Date.now(), value: cachedStatsOnBoot } : { at: 0, value: null },
  );

  const refresh = useCallback(async (opts = {}) => {
    if (!isAdmin) return;
    const force = opts.force === true;
    const silent = opts.silent ?? hasLoadedRef.current;
    setError(null);

    const keys = loadedKeysRef.current;
    const usersLimitNeeded = isUsers ? 150 : (isOverview ? 15 : 40);
    const fetchUsers = needsUsers && (
      force
      || !keys.users
      || keys.usersLimit < usersLimitNeeded
    );
    // Activity page needs a fuller window; re-fetch when opening it after a small Overview sample.
    const fetchPriceRequests = needsPriceRequests && (force || !keys.priceRequests);
    const statsFresh =
      bookingStatsCacheRef.current.value
      && (Date.now() - bookingStatsCacheRef.current.at) < BOOKING_STATS_TTL_MS;
    const fetchBookingStats = needsBookingStats && (force || !statsFresh);
    const fetchRecent = needsRecentBookings && (force || !keys.recentBookings);

    if (!force && !fetchUsers && !fetchPriceRequests && !fetchBookingStats && !fetchRecent) {
      setLoading(false);
      setRefreshing(false);
      return;
    }

    const blockUi = !silent && (
      (isUsers && fetchUsers)
      || (isOverview && fetchBookingStats)
    );
    if (blockUi) setLoading(true);
    else setRefreshing(true);

    const [usersResult, priceRequestsResult, countsResult, recentResult] = await Promise.allSettled([
      fetchUsers ? getAllUsers(isUsers ? 150 : (isOverview ? 15 : 40)) : Promise.resolve(null),
      fetchPriceRequests ? getAllPriceRequests(40) : Promise.resolve(null),
      fetchBookingStats
        ? getBookingStatsCounts({ includePayment: isOrders })
        : Promise.resolve(bookingStatsCacheRef.current.value || EMPTY_BOOKING_COUNTS),
      fetchRecent ? getRecentBookingsForCounts(isUsers ? 100 : 40) : Promise.resolve(null),
    ]);

    const failures = [];

    startTransition(() => {
      if (fetchUsers) {
        if (usersResult.status === 'fulfilled' && usersResult.value != null) {
          setUsers(usersResult.value.filter((x) => x.role !== 'superadmin'));
          keys.users = true;
          keys.usersLimit = usersLimitNeeded;
        } else if (usersResult.status === 'rejected') {
          failures.push('users');
          setUsers([]);
          console.error('Admin users load failed:', usersResult.reason);
        }
      }

      if (fetchPriceRequests) {
        if (priceRequestsResult.status === 'fulfilled' && priceRequestsResult.value != null) {
          setPriceRequests(priceRequestsResult.value);
          keys.priceRequests = true;
        } else if (priceRequestsResult.status === 'rejected') {
          setPriceRequests([]);
        }
      }

      if (countsResult.status === 'fulfilled' && countsResult.value != null) {
        const nextCounts = countsResult.value || EMPTY_BOOKING_COUNTS;
        setBookingCounts(nextCounts);
        if (fetchBookingStats) {
          bookingStatsCacheRef.current = { at: Date.now(), value: nextCounts };
          writeBookingStatsCache(nextCounts);
          keys.bookingStats = true;
        }
      }

      if (fetchRecent) {
        if (recentResult.status === 'fulfilled' && recentResult.value != null) {
          setBookings(recentResult.value);
          keys.recentBookings = true;
        } else if (recentResult.status === 'rejected' && needsRecentBookings) {
          failures.push('bookings');
          setBookings([]);
          console.error('Admin bookings load failed:', recentResult.reason);
        }
      }

      if (failures.length > 0) {
        const rejectedCode = [usersResult, recentResult]
          .filter((result) => result.status === 'rejected')
          .map((result) => result.reason?.code)
          .find(Boolean);
        setError(rejectedCode === 'permission-denied' ? 'permission-denied' : 'load-failed');
      } else {
        setLastRefresh(new Date());
      }
    });

    hasLoadedRef.current = true;
    setLoading(false);
    setRefreshing(false);
  }, [
    isAdmin,
    needsUsers,
    needsPriceRequests,
    needsBookingStats,
    needsRecentBookings,
    isUsers,
    isOrders,
    isOverview,
  ]);

  // Activity log — deferred on Overview so stats/orders paint first.
  useEffect(() => {
    if (!isAdmin || (!needsActivity && !needsOverviewActivity)) return undefined;

    const keys = loadedKeysRef.current;
    const limit = isActivityPage ? 100 : 40;
    const delayMs = isOverview && !isActivityPage ? 250 : 0;

    const load = () => {
      getActivityLog(limit)
        .then((items) => {
          startTransition(() => {
            setActivity(items);
            keys.activity = true;
            if (isActivityPage) keys.activityPage = true;
          });
        })
        .catch((err) => console.warn('Admin activity load failed:', err?.code || err?.message));
    };

    if (delayMs) {
      const timerId = window.setTimeout(load, delayMs);
      return () => window.clearTimeout(timerId);
    }
    load();
    return undefined;
  }, [isAdmin, needsActivity, needsOverviewActivity, isActivityPage, pathname]);

  // Overview: live newest orders so they keep arriving without full-collection reads.
  useEffect(() => {
    if (!isAdmin || !isOverview) return undefined;
    const unsub = subscribeToBookingsPage(
      { pageSize: 20 },
      ({ items }) => {
        startTransition(() => {
          setBookings(items);
          setLoading(false);
        });
      },
      (err) => console.warn('Overview bookings live failed:', err.code || err.message),
    );
    return unsub;
  }, [isAdmin, isOverview]);

  // Orders table paints from its own listener; hydrate user names in the background.
  useEffect(() => {
    if (!isAdmin || !isOrders || loadedKeysRef.current.users) return undefined;
    const timerId = window.setTimeout(() => {
      getAllUsers(40)
        .then((items) => {
          loadedKeysRef.current.users = true;
          loadedKeysRef.current.usersLimit = 40;
          startTransition(() => {
            setUsers((items || []).filter((x) => x.role !== 'superadmin'));
          });
        })
        .catch((err) => console.warn('Admin order users load failed:', err?.code || err?.message));
    }, 350);
    return () => window.clearTimeout(timerId);
  }, [isAdmin, isOrders]);

  useEffect(() => {
    if (!isAdmin) {
      setLoading(false);
      setRefreshing(false);
      setBookings([]);
      setBookingCounts(EMPTY_BOOKING_COUNTS);
      setUsers([]);
      setActivity([]);
      setPriceRequests([]);
      setChatUnread(0);
      hasLoadedRef.current = false;
      loadedKeysRef.current = {
        users: false,
        usersLimit: 0,
        activity: false,
        activityPage: false,
        priceRequests: false,
        bookingStats: false,
        recentBookings: false,
      };
      bookingStatsCacheRef.current = { at: 0, value: null };
      return;
    }

    if (!needsAnyAdminData) {
      setLoading(false);
      setRefreshing(false);
      return undefined;
    }

    const run = () => refresh({ silent: hasLoadedRef.current });
    const statsCached = Boolean(
      bookingStatsCacheRef.current.value
      && (Date.now() - bookingStatsCacheRef.current.at) < BOOKING_STATS_TTL_MS,
    );

    if (isOverview && statsCached) {
      setLoading(false);
      let idleId;
      let timeoutId;
      if (typeof window.requestIdleCallback === 'function') {
        idleId = window.requestIdleCallback(run, { timeout: 1500 });
      } else {
        timeoutId = window.setTimeout(run, 120);
      }
      return () => {
        if (idleId != null) window.cancelIdleCallback(idleId);
        if (timeoutId != null) window.clearTimeout(timeoutId);
      };
    }

    run();
    return undefined;
  }, [isAdmin, pathname, refresh, isOverview, needsAnyAdminData]);

  const usersMap = useMemo(() => {
    const map = {};
    users.forEach((u) => { map[u.id] = u; });
    return map;
  }, [users]);

  const stats = useMemo(() => {
    const now = Date.now();
    const dayAgo = now - 24 * 60 * 60 * 1000;
    const pending = bookings.filter((b) => b.status === 'pending');
    const newOrders = bookings.filter((b) => tsMillis(b.createdAt) > dayAgo);
    const revenue = bookings
      .filter((b) => b.status === 'completed' || b.status === 'confirmed')
      .reduce((s, b) => s + (Number(b.totalPrice || b.price) || 0), 0);
    const newUsers = users.filter((u) => {
      const d = u.createdAt?.toDate?.() ?? (u.createdAt ? new Date(u.createdAt) : null);
      return d && d.getTime() > dayAgo;
    });
    return {
      totalOrders: bookingCounts.all,
      pending: bookingCounts.pending,
      confirmed: bookingCounts.confirmed,
      completed: bookingCounts.completed,
      cancelled: bookingCounts.cancelled,
      newOrders: newOrders.length,
      totalUsers: users.length,
      newUsers: newUsers.length,
      revenue,
      priceRequests: priceRequests.length,
      chatUnread,
      pendingList: pending.slice(0, 8),
      newOrdersList: [...bookings].sort((a, b) => tsMillis(b.createdAt) - tsMillis(a.createdAt)).slice(0, 5),
      recentUsers: [...users].sort((a, b) => tsMillis(b.createdAt) - tsMillis(a.createdAt)).slice(0, 5),
      recentActivity: activity.slice(0, 8),
      bookingCounts,
    };
  }, [bookings, users, activity, priceRequests, chatUnread, bookingCounts]);

  const value = useMemo(() => ({
    bookings,
    bookingCounts,
    users,
    usersMap,
    activity,
    priceRequests,
    stats,
    loading,
    refreshing,
    error,
    canLoad: isAdmin,
    refresh,
    lastRefresh,
  }), [
    bookings,
    bookingCounts,
    users,
    usersMap,
    activity,
    priceRequests,
    stats,
    loading,
    refreshing,
    error,
    isAdmin,
    refresh,
    lastRefresh,
  ]);

  return (
    <AdminDataContext.Provider value={value}>
      {children}
    </AdminDataContext.Provider>
  );
}

export function useAdminData() {
  const ctx = useContext(AdminDataContext);
  if (!ctx) throw new Error('useAdminData must be used within AdminDataProvider');
  return ctx;
}
