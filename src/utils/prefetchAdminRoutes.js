const prefetched = new Set();

const ADMIN_ROUTE_LOADERS = {
  '/admin': () => import('../pages/admin/AdminOverview'),
  '/admin/booking-forms': () => import('../pages/admin/AdminBookingForms'),
  '/admin/fleet': () => import('../pages/admin/AdminHomeFleet'),
  '/admin/ziyarat': () => import('../pages/admin/AdminZiyarat'),
  '/admin/orders': () => import('../pages/admin/AdminOrders'),
  '/admin/users': () => import('../pages/admin/AdminUsers'),
  '/admin/price-requests': () => import('../pages/admin/AdminPriceRequests'),
  '/admin/chat': () => import('../pages/admin/AdminChat'),
  '/admin/notifications': () => import('../pages/admin/AdminNotifications'),
  '/admin/activity': () => import('../pages/admin/AdminActivity'),
  '/admin/categories': () => import('../pages/admin/AdminCars'),
  '/admin/cars': () => import('../pages/admin/AdminCars'),
  '/admin/services': () => import('../pages/admin/AdminServices'),
  '/admin/routes': () => import('../pages/admin/AdminRoutes'),
  '/admin/faq': () => import('../pages/admin/AdminFAQ'),
  '/admin/blogs': () => import('../pages/admin/AdminBlogs'),
  '/admin/banners': () => import('../pages/admin/AdminBanners'),
  '/admin/gallery': () => import('../pages/admin/AdminGallery'),
  '/admin/social': () => import('../pages/admin/AdminSocialMedia'),
  '/admin/footer': () => import('../pages/admin/AdminFooter'),
  '/admin/payment-settings': () => import('../pages/admin/AdminPaymentSettings'),
  '/admin/hero': () => import('../pages/admin/AdminHero'),
  '/admin/travel-reservations': () => import('../pages/admin/AdminTravelReservations'),
  '/admin/backgrounds': () => import('../pages/admin/AdminBackgrounds'),
  '/admin/sections': () => import('../pages/admin/AdminSections'),
  '/admin/settings': () => import('../pages/admin/AdminSettings'),
  '/admin/backup': () => import('../pages/admin/AdminBackup'),
};

const WARM_ROUTES = [
  '/admin',
  '/admin/booking-forms',
  '/admin/fleet',
  '/admin/orders',
  '/admin/cars',
  '/admin/settings',
];

function loaderFor(path) {
  if (ADMIN_ROUTE_LOADERS[path]) return ADMIN_ROUTE_LOADERS[path];
  if (path.startsWith('/admin/categories/')) return ADMIN_ROUTE_LOADERS['/admin/categories'];
  if (path.startsWith('/admin/cars/')) return ADMIN_ROUTE_LOADERS['/admin/cars'];
  return null;
}

export function prefetchAdminRoute(path) {
  const loader = loaderFor(path);
  if (!loader || prefetched.has(path)) return;
  prefetched.add(path);
  loader().catch(() => {
    prefetched.delete(path);
  });
}

export function warmAdminRoutes() {
  WARM_ROUTES.forEach((path) => prefetchAdminRoute(path));
}
