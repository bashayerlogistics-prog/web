import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  LayoutDashboard, ShoppingBag, Users, Activity, Settings,
  LogOut, Sun, Moon, Languages, Menu, RefreshCw, X, Search,
  Package, Image, Bell, ChevronRight, ChevronDown, FileText, Briefcase, ToggleLeft, Monitor, MessageCircle,
  Map, HelpCircle, Share2, Images, Clock, Landmark, Plane, TrainFront, MapPin, Car, Tags, DatabaseBackup, CreditCard,
} from 'lucide-react';
import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useAdminAuth } from '../../context/AdminAuthContext';
import { useAdminData } from '../../context/AdminDataContext';
import { AdminDataProvider } from '../../context/AdminDataContext';
import { useTheme } from '../../context/ThemeContext';
import { setLanguage } from '../../i18n';
import BrandLogo from '../ui/BrandLogo';
import AdminPageSearch from './AdminPageSearch';

/** Grouped sidebar — categories / cars / products / services stay separate */
const navGroups = [
  {
    id: 'main',
    labelKey: 'admin.nav.groupMain',
    items: [
      { to: '/admin', icon: LayoutDashboard, labelKey: 'admin.nav.overview', end: true },
      { to: '/admin/orders', icon: ShoppingBag, labelKey: 'admin.nav.orders', badgeKey: 'pending' },
      { to: '/admin/users', icon: Users, labelKey: 'admin.nav.users' },
      { to: '/admin/price-requests', icon: FileText, labelKey: 'admin.nav.yourPrice', badgeKey: 'priceRequests' },
      { to: '/admin/chat', icon: MessageCircle, labelKey: 'admin.nav.chat', badgeKey: 'chatUnread' },
      { to: '/admin/notifications', icon: Bell, labelKey: 'admin.nav.notifications' },
      { to: '/admin/activity', icon: Activity, labelKey: 'admin.nav.activity' },
    ],
  },
  {
    id: 'categories',
    labelKey: 'admin.nav.groupCategories',
    items: [
      { to: '/admin/categories', icon: Tags, labelKey: 'admin.nav.categories', end: true },
      { to: '/admin/categories/taurus', icon: Car, labelKey: 'admin.nav.carTaurus' },
      { to: '/admin/categories/camry', icon: Car, labelKey: 'admin.nav.carCamry' },
      { to: '/admin/categories/staria', icon: Car, labelKey: 'admin.nav.carStaria' },
      { to: '/admin/categories/yukon', icon: Car, labelKey: 'admin.nav.carYukon' },
      { to: '/admin/categories/hiace', icon: Car, labelKey: 'admin.nav.carHiace' },
    ],
  },
  {
    id: 'cars',
    labelKey: 'admin.nav.groupCars',
    items: [
      { to: '/admin/cars', icon: Car, labelKey: 'admin.nav.cars', end: true },
      { to: '/admin/cars/taurus', icon: Car, labelKey: 'admin.nav.carTaurus' },
      { to: '/admin/cars/camry', icon: Car, labelKey: 'admin.nav.carCamry' },
      { to: '/admin/cars/staria', icon: Car, labelKey: 'admin.nav.carStaria' },
      { to: '/admin/cars/yukon', icon: Car, labelKey: 'admin.nav.carYukon' },
      { to: '/admin/cars/hiace', icon: Car, labelKey: 'admin.nav.carHiace' },
    ],
  },
  {
    id: 'products',
    labelKey: 'admin.nav.groupProducts',
    items: [
      { to: '/admin/city-to-city', icon: MapPin, labelKey: 'admin.nav.cityToCity' },
      { to: '/admin/airport', icon: Plane, labelKey: 'admin.nav.airport' },
      { to: '/admin/train', icon: TrainFront, labelKey: 'admin.nav.train' },
      { to: '/admin/within-city', icon: Package, labelKey: 'admin.nav.withinCity' },
      { to: '/admin/hourly', icon: Clock, labelKey: 'admin.nav.hourly' },
      { to: '/admin/ziyarat', icon: Landmark, labelKey: 'admin.nav.ziyarat' },
    ],
  },
  {
    id: 'services',
    labelKey: 'admin.nav.groupServices',
    items: [
      { to: '/admin/services', icon: Briefcase, labelKey: 'admin.nav.services' },
      { to: '/admin/routes', icon: Map, labelKey: 'admin.nav.routes' },
      { to: '/admin/faq', icon: HelpCircle, labelKey: 'admin.nav.faq' },
    ],
  },
  {
    id: 'blog',
    labelKey: 'admin.nav.groupBlog',
    items: [
      { to: '/admin/blogs', icon: FileText, labelKey: 'admin.nav.blogs' },
      { to: '/admin/banners', icon: Image, labelKey: 'admin.nav.banners' },
      { to: '/admin/gallery', icon: Images, labelKey: 'admin.nav.gallery' },
      { to: '/admin/social', icon: Share2, labelKey: 'admin.nav.social' },
    ],
  },
  {
    id: 'settings',
    labelKey: 'admin.nav.groupSettings',
    items: [
      { to: '/admin/payment-settings', icon: CreditCard, labelKey: 'admin.nav.paymentSettings' },
      { to: '/admin/hero', icon: Monitor, labelKey: 'admin.nav.hero' },
      { to: '/admin/backgrounds', icon: Images, labelKey: 'admin.nav.backgrounds' },
      { to: '/admin/sections', icon: ToggleLeft, labelKey: 'admin.nav.sections' },
      { to: '/admin/settings', icon: Settings, labelKey: 'admin.nav.settings' },
      { to: '/admin/backup', icon: DatabaseBackup, labelKey: 'admin.nav.backup' },
    ],
  },
];

const allNavItems = navGroups.flatMap((g) => g.items);

function pathMatchesItem(pathname, item) {
  if (item.end) return pathname === item.to;
  return pathname === item.to || pathname.startsWith(`${item.to}/`);
}

function normalizeSearch(text) {
  return String(text || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u064B-\u065F]/g, '')
    .trim();
}

function AdminLayoutInner() {
  const { t, i18n } = useTranslation();
  const { logout, adminUser } = useAdminAuth();
  const { refresh, loading, stats, error } = useAdminData();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [pageQuery, setPageQuery] = useState('');
  const pageSearchRef = useRef(null);

  const focusPageSearch = useCallback(() => {
    setSidebarOpen(true);
    requestAnimationFrame(() => {
      pageSearchRef.current?.focus();
      pageSearchRef.current?.select?.();
    });
  }, []);

  const activeGroupId = useMemo(() => {
    const hit = navGroups.find((g) =>
      g.items.some((item) => pathMatchesItem(location.pathname, item)),
    );
    return hit?.id || 'main';
  }, [location.pathname]);

  const [openGroups, setOpenGroups] = useState(() => new Set(['main', 'categories', 'cars', 'products']));

  useEffect(() => {
    setOpenGroups((prev) => {
      if (prev.has(activeGroupId)) return prev;
      const next = new Set(prev);
      next.add(activeGroupId);
      return next;
    });
  }, [activeGroupId]);

  useEffect(() => {
    document.documentElement.classList.add('admin-shell-active');
    return () => document.documentElement.classList.remove('admin-shell-active');
  }, []);

  const handleLogout = async () => {
    await logout();
    navigate('/admin/login');
  };

  const toggleLang = () => {
    setSidebarOpen(false);
    setLanguage(i18n.language === 'ar' ? 'en' : 'ar');
  };

  const toggleGroup = (id) => {
    setOpenGroups((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const currentNav = useMemo(() => {
    const hits = allNavItems.filter((item) => pathMatchesItem(location.pathname, item));
    hits.sort((a, b) => b.to.length - a.to.length);
    return hits[0];
  }, [location.pathname]);
  const pageTitle = currentNav ? t(currentNav.labelKey) : t('admin.title');

  const searchablePages = useMemo(
    () =>
      navGroups.flatMap((group) =>
        group.items.map((item) => ({
          ...item,
          groupId: group.id,
          groupLabel: t(group.labelKey),
          label: t(item.labelKey),
        })),
      ),
    [t, i18n.language],
  );

  const filteredPages = useMemo(() => {
    const q = normalizeSearch(pageQuery);
    if (!q) return null;
    return searchablePages.filter((page) => {
      const haystack = normalizeSearch(
        `${page.label} ${page.groupLabel} ${page.to} ${page.to.replace(/\//g, ' ')}`,
      );
      return haystack.includes(q) || q.split(/\s+/).every((part) => haystack.includes(part));
    });
  }, [pageQuery, searchablePages]);

  const getBadge = (item) => {
    if (item.badgeKey === 'pending' && stats.pending > 0) return stats.pending;
    if (item.badgeKey === 'priceRequests' && stats.priceRequests > 0) return stats.priceRequests;
    if (item.badgeKey === 'chatUnread' && stats.chatUnread > 0) return stats.chatUnread;
    return null;
  };

  const groupBadge = (group) => {
    let total = 0;
    for (const item of group.items) {
      const b = getBadge(item);
      if (b != null) total += b;
    }
    return total > 0 ? total : null;
  };

  const linkClass = ({ isActive }) =>
    `relative flex items-center gap-3 px-3 py-2.5 rounded-xl font-semibold transition-[color,background-color,box-shadow] duration-150 ease-out group ${
      isActive
        ? 'glass-sidebar-nav-active bg-gradient-to-r from-brand to-brand-dark text-white shadow-lg shadow-brand/25'
        : 'admin-nav-inactive text-gray-500 dark:text-white/80 hover:bg-brand/5 dark:hover:bg-gold/5 hover:text-brand dark:hover:text-gold'
    }`;

  return (
    <div className="h-screen max-h-[100dvh] admin-bg flex overflow-hidden">
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-dark-900/70 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-hidden
        />
      )}

      <aside
        className={`glass-sidebar z-50 w-[min(100vw-3rem,18rem)] sm:w-72 shrink-0 flex flex-col h-full overflow-hidden
          fixed inset-y-0 start-0
          transition-transform duration-300 ease-out
          ${sidebarOpen ? 'translate-x-0' : 'max-lg:-translate-x-full max-lg:rtl:translate-x-full'}
          lg:relative lg:translate-x-0 lg:transition-none`}
      >
        <div className="flex-shrink-0 p-4 sm:p-5 border-b border-brand/10 bg-gradient-to-br from-brand/5 to-gold/5">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl overflow-hidden ring-2 ring-brand/20 shadow-md flex-shrink-0 flex items-center justify-center bg-white/80 dark:bg-brand/20">
                <BrandLogo variant="badge" tone="auto" alt="" className="w-full h-full object-contain p-1" />
              </div>
              <div className="min-w-0">
                <h1 className="text-sm font-black shimmer-text leading-tight truncate">{t('brand.name')}</h1>
                <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gold-light truncate">
                  {t('admin.title')} · {adminUser?.username}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden p-2 rounded-xl hover:bg-white/60 dark:hover:bg-primary-500/10 flex-shrink-0"
              aria-label="Close menu"
            >
              <X className="w-5 h-5 text-gray-600" />
            </button>
          </div>
          {stats.pending > 0 && (
            <div className="mt-3 admin-pending-badge rounded-xl !p-2.5 flex items-center gap-2 text-xs font-bold">
              <span className="w-2 h-2 bg-amber-500 rounded-full animate-pulse flex-shrink-0" />
              <span className="truncate">{stats.pending} {t('admin.stats.pendingOrders')}</span>
            </div>
          )}
          <div className="mt-3">
            <AdminPageSearch
              value={pageQuery}
              onChange={setPageQuery}
              inputRef={pageSearchRef}
              onSubmitFirst={() => {
                if (filteredPages?.length) {
                  navigate(filteredPages[0].to);
                  setPageQuery('');
                  setSidebarOpen(false);
                }
              }}
            />
          </div>
        </div>

        <nav className="admin-sidebar-nav flex-1 min-h-0 p-3 sm:p-4 space-y-3 overflow-y-auto overscroll-contain">
          {filteredPages ? (
            <div className="space-y-1">
              <p className="px-2.5 text-[10px] font-black uppercase tracking-wide text-gray-400 dark:text-white/40">
                {filteredPages.length > 0
                  ? t('admin.pageSearchResults', { count: filteredPages.length })
                  : t('admin.pageSearchNoResults', { query: pageQuery.trim() })}
              </p>
              {filteredPages.map((item) => {
                const { to, icon: Icon, end, label, groupLabel } = item;
                const badge = getBadge(item);
                const active = pathMatchesItem(location.pathname, item);
                return (
                  <NavLink
                    key={to}
                    to={to}
                    end={end}
                    className={linkClass}
                    onClick={() => {
                      setSidebarOpen(false);
                      setPageQuery('');
                    }}
                  >
                    <span
                      className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors ${
                        active ? 'bg-white/20' : 'bg-brand/10 group-hover:bg-brand/15'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                    </span>
                    <span className="flex-1 min-w-0">
                      <span className="block truncate text-sm">{label}</span>
                      <span className={`block truncate text-[10px] font-medium ${active ? 'text-white/70' : 'text-gray-400 dark:text-white/40'}`}>
                        {groupLabel}
                      </span>
                    </span>
                    {badge != null && (
                      <span className="min-w-[22px] h-[22px] px-1.5 rounded-full bg-amber-500 text-white text-[10px] font-black flex items-center justify-center">
                        {badge}
                      </span>
                    )}
                    <ChevronRight className="w-3.5 h-3.5 opacity-40 lg:hidden flex-shrink-0 rtl:rotate-180" />
                  </NavLink>
                );
              })}
            </div>
          ) : (
            navGroups.map((group) => {
              const isOpen = openGroups.has(group.id);
              const gBadge = groupBadge(group);
              const isActiveGroup = group.id === activeGroupId;
              return (
                <div key={group.id} className="space-y-1">
                  <button
                    type="button"
                    onClick={() => toggleGroup(group.id)}
                    className={`w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-sm font-black uppercase tracking-wide transition-colors ${
                      isActiveGroup
                        ? 'text-brand dark:text-gold bg-brand/5 dark:bg-gold/5'
                        : 'text-gray-400 dark:text-white/50 hover:text-brand dark:hover:text-gold hover:bg-brand/5'
                    }`}
                    aria-expanded={isOpen}
                  >
                    <span className="flex-1 text-start truncate">{t(group.labelKey)}</span>
                    {gBadge != null && (
                      <span className="min-w-[18px] h-[18px] px-1 rounded-full bg-amber-500 text-white text-[9px] font-black flex items-center justify-center">
                        {gBadge}
                      </span>
                    )}
                    <ChevronDown
                      className={`w-3.5 h-3.5 opacity-60 transition-transform duration-200 ${isOpen ? 'rotate-0' : '-rotate-90 rtl:rotate-90'}`}
                    />
                  </button>

                  {isOpen && (
                    <div className="space-y-0.5 ps-0.5">
                      {group.items.map((item) => {
                        const { to, icon: Icon, labelKey, end } = item;
                        const badge = getBadge(item);
                        const active = pathMatchesItem(location.pathname, item);
                        return (
                          <NavLink
                            key={to}
                            to={to}
                            end={end}
                            className={linkClass}
                            onClick={() => setSidebarOpen(false)}
                          >
                            <span
                              className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors ${
                                active ? 'bg-white/20' : 'bg-brand/10 group-hover:bg-brand/15'
                              }`}
                            >
                              <Icon className="w-4 h-4" />
                            </span>
                            <span className="flex-1 truncate text-sm">{t(labelKey)}</span>
                            {badge != null && (
                              <span className="min-w-[22px] h-[22px] px-1.5 rounded-full bg-amber-500 text-white text-[10px] font-black flex items-center justify-center">
                                {badge}
                              </span>
                            )}
                            <ChevronRight className="w-3.5 h-3.5 opacity-40 lg:hidden flex-shrink-0 rtl:rotate-180" />
                          </NavLink>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </nav>

        <div className="flex-shrink-0 p-3 sm:p-4 border-t border-primary-500/10 space-y-1 pb-safe">
          {[
            { onClick: toggleLang, icon: Languages, label: t('nav.english') },
            { onClick: toggleTheme, icon: theme === 'dark' ? Sun : Moon, label: theme === 'dark' ? t('admin.theme.light') : t('admin.theme.dark') },
            { onClick: handleLogout, icon: LogOut, label: t('auth.logout'), danger: true },
          ].map(({ onClick, icon: Icon, label, danger }) => (
            <button
              key={label}
              type="button"
              onClick={onClick}
              className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors duration-150 ${
                danger
                  ? 'text-red-500 hover:bg-red-50 dark:hover:bg-red-50'
                  : 'text-gray-500 hover:bg-brand/5 hover:text-brand'
              }`}
            >
              <Icon className="w-5 h-5 flex-shrink-0" />
              <span className="truncate">{label}</span>
            </button>
          ))}
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden w-full">
        <header className="glass-header sticky top-0 z-30 px-3 sm:px-4 py-3 flex items-center justify-between gap-2 sm:gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              className="admin-header-btn p-2 lg:hidden flex-shrink-0"
              aria-label="Open menu"
            >
              <Menu className="w-5 h-5 sm:w-6 sm:h-6" />
            </button>
            <div className="min-w-0 lg:hidden">
              <p className="text-[10px] admin-text-muted font-semibold uppercase tracking-wide truncate">{t('admin.title')}</p>
              <p className="text-sm font-black text-brand dark:text-gold truncate">{pageTitle}</p>
            </div>
            <div className="hidden lg:block text-sm admin-text-muted">
              {t('admin.welcomeBack')}, <span className="font-bold text-brand dark:text-gold">{adminUser?.username}</span>
            </div>
          </div>
          <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
            <button
              type="button"
              onClick={focusPageSearch}
              className="admin-header-btn p-2 sm:p-2.5"
              title={t('admin.pageSearchOpen')}
              aria-label={t('admin.pageSearchOpen')}
            >
              <Search className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
            <button
              type="button"
              onClick={() => refresh({ force: true })}
              disabled={loading}
              className="admin-header-btn p-2 sm:p-2.5 disabled:opacity-50"
              title={t('admin.refresh')}
            >
              <RefreshCw className={`w-4 h-4 sm:w-5 sm:h-5 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button type="button" onClick={toggleLang} className="hidden sm:flex admin-header-btn p-2.5">
              <Languages className="w-5 h-5" />
            </button>
            <button type="button" onClick={toggleTheme} className="admin-header-btn p-2 sm:p-2.5">
              {theme === 'dark' ? <Sun className="w-4 h-4 sm:w-5 sm:h-5 text-amber-400" /> : <Moon className="w-4 h-4 sm:w-5 sm:h-5" />}
            </button>
          </div>
        </header>

        <main className="flex-1 min-h-0 p-3 sm:p-4 md:p-6 lg:p-8 admin-scroll admin-page-content">
          {error && (
            <div className="mb-4 px-4 py-3 rounded-xl bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-sm font-medium">
              {t('admin.dataError')}
            </div>
          )}
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default function AdminLayout() {
  return (
    <AdminDataProvider>
      <AdminLayoutInner />
    </AdminDataProvider>
  );
}
