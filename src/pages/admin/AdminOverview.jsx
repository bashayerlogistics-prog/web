import { useMemo } from 'react';

import { Link } from 'react-router-dom';

import { useTranslation } from 'react-i18next';

import {

  ShoppingBag, Users, DollarSign, Clock, CheckCircle, XCircle,

  TrendingUp, RefreshCw, Sparkles, Activity, FileText, BarChart3, MessageCircle,

  ArrowRight,

} from 'lucide-react';

import { useAdminData } from '../../context/AdminDataContext';

import { formatBookingDateTime } from '../../utils/bookingHelpers';

import { getActivityLabel } from '../../utils/activityHelpers';

import { buildOrderNumberMap, getOrderDisplayId } from '../../utils/orderHelpers';

import AdminStatCard from '../../components/admin/AdminStatCard';

import AdminOrderCard from '../../components/admin/AdminOrderCard';

import AdminUserCard from '../../components/admin/AdminUserCard';

import AdminPageHeader from '../../components/admin/AdminPageHeader';

import GlassCard from '../../components/ui/GlassCard';

import MiniBarChart from '../../components/ui/MiniBarChart';

import StatusDonut from '../../components/ui/StatusDonut';

import LoadingSpinner from '../../components/ui/LoadingSpinner';



const PANEL_THEMES = {

  amber: {

    accent: 'bg-gradient-to-b from-amber-500 to-orange-500',

    header: 'bg-gradient-to-r from-amber-500/12 to-orange-500/8 dark:from-amber-500/18 dark:to-orange-500/10',

    icon: 'bg-gradient-to-br from-amber-500 to-orange-500 text-white',

    iconColor: 'text-amber-600 dark:text-amber-400',

  },

  violet: {

    accent: 'bg-gradient-to-b from-violet-500 to-purple-600',

    header: 'bg-gradient-to-r from-violet-500/12 to-purple-500/8 dark:from-violet-500/18 dark:to-purple-500/10',

    icon: 'bg-gradient-to-br from-violet-500 to-purple-600 text-white',

    iconColor: 'text-violet-600 dark:text-violet-400',

  },

  teal: {

    accent: 'bg-gradient-to-b from-teal-500 to-emerald-600',

    header: 'bg-gradient-to-r from-teal-500/12 to-emerald-500/8 dark:from-teal-500/18 dark:to-emerald-500/10',

    icon: 'bg-gradient-to-br from-teal-500 to-emerald-600 text-white',

    iconColor: 'text-teal-600 dark:text-teal-400',

  },

  cyan: {

    accent: 'bg-gradient-to-b from-cyan-500 to-teal-600',

    header: 'bg-gradient-to-r from-cyan-500/12 to-teal-500/8 dark:from-cyan-500/18 dark:to-teal-500/10',

    icon: 'bg-gradient-to-br from-cyan-500 to-teal-600 text-white',

    iconColor: 'text-cyan-600 dark:text-cyan-400',

  },

  brand: {

    accent: 'bg-gradient-to-b from-brand to-gold',

    header: 'bg-gradient-to-r from-brand/12 to-gold/8 dark:from-brand/20 dark:to-gold/12',

    icon: 'bg-gradient-to-br from-brand to-gold text-white',

    iconColor: 'text-brand dark:text-gold',

  },

};



function OverviewPanel({ theme, icon: Icon, title, badge, viewHref, viewLabel, children, scrollMax = '420px' }) {

  const t = PANEL_THEMES[theme];

  return (

    <GlassCard variant="panel" padding="p-0" hover={false} className="overflow-hidden">

      <div className={`overview-panel-header ${t.header}`}>

        <div className={`absolute inset-inline-start-0 top-0 bottom-0 w-1 ${t.accent}`} aria-hidden />

        <div className="flex items-center gap-2.5 min-w-0 ps-1">

          <span className={`overview-panel-icon ${t.icon}`}>

            <Icon className="w-4 h-4" />

          </span>

          <h2 className="font-black admin-heading text-sm sm:text-base truncate">{title}</h2>

          {badge != null && badge > 0 && (

            <span className="bg-gradient-to-r from-amber-500 to-orange-500 text-white text-xs font-bold px-2 py-0.5 rounded-full flex-shrink-0 shadow-md shadow-amber-500/30">

              {badge}

            </span>

          )}

        </div>

        {viewHref && (

          <Link to={viewHref} className="overview-view-link">

            {viewLabel}

            <ArrowRight className="w-3.5 h-3.5 rtl:rotate-180" />

          </Link>

        )}

      </div>

      <div className="overview-panel-body overview-panel-body-scroll space-y-2.5" style={{ maxHeight: scrollMax }}>

        {children}

      </div>

    </GlassCard>

  );

}



export default function AdminOverview() {

  const { t, i18n } = useTranslation();

  const lang = i18n.language;

  const { stats, usersMap, bookings, loading, refresh, lastRefresh } = useAdminData();

  const orderNumberMap = useMemo(() => buildOrderNumberMap(bookings), [bookings]);



  const activityLabel = (item) => getActivityLabel(item, t);



  const statCards = [

    { icon: ShoppingBag, label: t('admin.stats.totalOrders'), value: stats.totalOrders, gradient: 'from-blue-500 to-indigo-600', href: '/admin/orders' },

    { icon: Clock, label: t('admin.stats.pendingOrders'), value: stats.pending, gradient: 'from-amber-500 to-orange-500', href: '/admin/orders', badge: stats.pending },

    { icon: Sparkles, label: t('admin.stats.newOrders'), value: stats.newOrders, gradient: 'from-violet-500 to-purple-600', href: '/admin/orders' },

    { icon: CheckCircle, label: t('admin.stats.confirmed'), value: stats.confirmed, gradient: 'from-emerald-500 to-green-600', href: '/admin/orders' },

    { icon: Users, label: t('admin.stats.totalUsers'), value: stats.totalUsers, gradient: 'from-cyan-500 to-teal-600', href: '/admin/users' },

    { icon: TrendingUp, label: t('admin.stats.newUsers'), value: stats.newUsers, gradient: 'from-pink-500 to-rose-500', href: '/admin/users' },

    { icon: DollarSign, label: t('admin.stats.totalRevenue'), value: stats.revenue, suffix: t('booking.sar'), gradient: 'from-gold-500 to-yellow-600' },

    { icon: FileText, label: t('admin.stats.priceRequests'), value: stats.priceRequests, gradient: 'from-indigo-500 to-blue-600', href: '/admin/price-requests' },

    { icon: MessageCircle, label: t('admin.nav.chat'), value: stats.chatUnread, gradient: 'from-teal-500 to-emerald-600', href: '/admin/chat', badge: stats.chatUnread },

  ];



  const orderChartData = [

    { label: t('admin.status.pending'), value: stats.pending, gradient: 'from-amber-400 to-orange-500' },

    { label: t('admin.status.confirmed'), value: stats.confirmed, gradient: 'from-emerald-400 to-green-500' },

    { label: t('admin.status.completed'), value: stats.completed, gradient: 'from-blue-400 to-cyan-500' },

    { label: t('admin.status.cancelled'), value: stats.cancelled, gradient: 'from-red-400 to-rose-500' },

  ];



  const donutSegments = [

    { label: 'pending', value: stats.pending, color: '#f59e0b' },

    { label: 'confirmed', value: stats.confirmed, color: '#10b981' },

    { label: 'completed', value: stats.completed, color: '#3b82f6' },

    { label: 'cancelled', value: stats.cancelled, color: '#ef4444' },

  ];



  const statusMiniCards = [

    { label: t('admin.status.pending'), value: stats.pending, icon: Clock, bg: 'bg-gradient-to-br from-amber-500/15 to-orange-500/10 dark:from-amber-500/20 dark:to-orange-500/12', border: 'border-amber-500/20 dark:border-amber-500/25', iconBg: 'bg-gradient-to-br from-amber-500 to-orange-500 text-white' },

    { label: t('admin.status.confirmed'), value: stats.confirmed, icon: CheckCircle, bg: 'bg-gradient-to-br from-emerald-500/15 to-green-500/10 dark:from-emerald-500/20 dark:to-green-500/12', border: 'border-emerald-500/20 dark:border-emerald-500/25', iconBg: 'bg-gradient-to-br from-emerald-500 to-green-600 text-white' },

    { label: t('admin.status.completed'), value: stats.completed, icon: CheckCircle, bg: 'bg-gradient-to-br from-blue-500/15 to-cyan-500/10 dark:from-blue-500/20 dark:to-cyan-500/12', border: 'border-blue-500/20 dark:border-blue-500/25', iconBg: 'bg-gradient-to-br from-blue-500 to-cyan-500 text-white' },

    { label: t('admin.status.cancelled'), value: stats.cancelled, icon: XCircle, bg: 'bg-gradient-to-br from-red-500/15 to-rose-500/10 dark:from-red-500/20 dark:to-rose-500/12', border: 'border-red-500/20 dark:border-red-500/25', iconBg: 'bg-gradient-to-br from-red-500 to-rose-500 text-white' },

  ];



  return (

    <div className="space-y-6 md:space-y-8">

      <AdminPageHeader title={t('admin.nav.overview')} subtitle={t('admin.overviewSubtitle')}>

        <button

          type="button"

          onClick={refresh}

          disabled={loading}

          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl admin-btn-primary text-white text-sm font-bold hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-60 shadow-lg shadow-brand/20"

        >

          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />

          {t('admin.refresh')}

          {lastRefresh && (

            <span className="text-xs text-white/80 font-normal hidden md:inline">

              {lastRefresh.toLocaleTimeString(lang === 'ar' ? 'ar-SA' : 'en-US', { hour: '2-digit', minute: '2-digit' })}

            </span>

          )}

        </button>

      </AdminPageHeader>



      {loading ? (

        <LoadingSpinner text={t('common.loading')} />

      ) : (

        <>

          {/* Stats grid */}

          <section>

            <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-4">

              {statCards.map((card) => (

                <AdminStatCard key={card.label} {...card} />

              ))}

            </div>

          </section>



          {/* Charts */}

          <section className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">

            <GlassCard className="lg:col-span-2 chart-card-3d">

              <div className="flex items-center gap-3 mb-5 sm:mb-6 relative z-10">

                <span className="overview-panel-icon bg-gradient-to-br from-brand to-gold text-white">

                  <BarChart3 className="w-4 h-4" />

                </span>

                <div>

                  <h2 className="font-black admin-heading text-base sm:text-lg leading-tight">{t('admin.charts.ordersOverview')}</h2>

                  <p className="text-xs admin-text-muted mt-0.5">{t('admin.overviewSubtitle')}</p>

                </div>

              </div>

              <MiniBarChart data={orderChartData} height={180} />

            </GlassCard>



            <GlassCard className="chart-card-3d">

              <h2 className="font-black admin-heading text-base sm:text-lg mb-4 sm:mb-5 relative z-10">{t('admin.charts.statusBreakdown')}</h2>

              <div className="flex flex-col items-center gap-4 sm:gap-5 relative z-10">

                <StatusDonut segments={donutSegments} size={148} centerLabel={t('admin.charts.total') || 'Total'} />

                <div className="grid grid-cols-2 gap-2 w-full">

                  {donutSegments.map((s) => (

                    <div key={s.label} className="overview-legend-chip">

                      <span className="w-2.5 h-2.5 rounded-full flex-shrink-0 ring-2 ring-white/50 dark:ring-black/20" style={{ background: s.color, boxShadow: `0 0 8px ${s.color}66` }} />

                      <span className="admin-text-muted capitalize truncate text-xs font-medium">{t(`admin.status.${s.label}`)}</span>

                      <span className="font-black ms-auto admin-heading text-sm">{s.value}</span>

                    </div>

                  ))}

                </div>

              </div>

            </GlassCard>

          </section>



          {/* Orders panels */}

          <section className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">

            <OverviewPanel

              theme="amber"

              icon={Clock}

              title={t('admin.pendingOrders')}

              badge={stats.pending}

              viewHref="/admin/orders"

              viewLabel={t('admin.viewAll')}

            >

              {stats.pendingList.length === 0 ? (

                <p className="overview-empty">{t('admin.noPending')}</p>

              ) : stats.pendingList.map((b) => (

                <AdminOrderCard key={b.id} booking={b} user={usersMap[b.userId]} compact orderDisplayId={getOrderDisplayId(b, orderNumberMap)} />

              ))}

            </OverviewPanel>



            <OverviewPanel

              theme="violet"

              icon={Sparkles}

              title={t('admin.stats.newOrders')}

              viewHref="/admin/orders"

              viewLabel={t('admin.viewAll')}

            >

              {stats.newOrdersList.length === 0 ? (

                <p className="overview-empty">{t('admin.noNewOrders')}</p>

              ) : stats.newOrdersList.map((b) => (

                <AdminOrderCard key={b.id} booking={b} user={usersMap[b.userId]} compact orderDisplayId={getOrderDisplayId(b, orderNumberMap)} />

              ))}

            </OverviewPanel>

          </section>



          {/* Chat, users, activity */}

          <section className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-6">

            <OverviewPanel

              theme="teal"

              icon={MessageCircle}

              title={t('admin.chat.title')}

              badge={stats.chatUnread}

              viewHref="/admin/chat"

              viewLabel={t('admin.viewAll')}

              scrollMax="360px"

            >

              <p className="overview-empty mb-3">{t('admin.chat.noMessages')}</p>
              <Link
                to="/admin/chat"
                className="inline-flex items-center gap-2 text-sm font-bold text-teal-600 hover:text-teal-700"
              >
                {t('admin.viewAll')}
                <ArrowRight className="w-4 h-4" />
              </Link>

            </OverviewPanel>



            <OverviewPanel

              theme="cyan"

              icon={Users}

              title={t('admin.recentUsers')}

              viewHref="/admin/users"

              viewLabel={t('admin.viewAll')}

              scrollMax="360px"

            >

              {stats.recentUsers.length === 0 ? (

                <p className="overview-empty">{t('admin.noUsers')}</p>

              ) : stats.recentUsers.map((u) => (

                <AdminUserCard key={u.id} user={u} bookingCount={bookings.filter((b) => b.userId === u.id).length} />

              ))}

            </OverviewPanel>



            <OverviewPanel

              theme="brand"

              icon={Activity}

              title={t('admin.recentActivity')}

              viewHref="/admin/activity"

              viewLabel={t('admin.viewAll')}

              scrollMax="360px"

            >

              {stats.recentActivity.length === 0 ? (

                <p className="overview-empty">{t('admin.noActivity')}</p>

              ) : (

                <div className="divide-y divide-gray-100/60 dark:divide-white/5 -mx-5 -my-4">

                  {stats.recentActivity.map((item) => (

                    <div key={item.id} className="overview-activity-item">

                      <div className="flex items-center gap-2.5 min-w-0">

                        <span className="overview-activity-dot bg-gradient-to-r from-brand to-gold text-brand" />

                        <span className="text-sm font-semibold admin-heading truncate">{activityLabel(item)}</span>

                      </div>

                      <span className="text-xs admin-text-muted whitespace-nowrap font-medium">{formatBookingDateTime(item.createdAt, lang)}</span>

                    </div>

                  ))}

                </div>

              )}

            </OverviewPanel>

          </section>



          {/* Status summary mini cards */}

          <section className="grid grid-cols-2 sm:grid-cols-4 gap-3 md:gap-4">

            {statusMiniCards.map(({ label, value, icon: Icon, bg, border, iconBg }) => (

              <div key={label} className={`overview-status-mini ${bg} border ${border}`}>

                <div className="flex items-center gap-3">

                  <span className={`overview-status-mini-icon ${iconBg}`}>

                    <Icon className="w-4 h-4" />

                  </span>

                  <div className="min-w-0">

                    <p className="text-xl sm:text-2xl font-black admin-heading overview-stat-value">{value}</p>

                    <p className="text-[10px] sm:text-xs admin-text-muted font-semibold truncate mt-0.5">{label}</p>

                  </div>

                </div>

              </div>

            ))}

          </section>

        </>

      )}

    </div>

  );

}


