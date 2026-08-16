/** Whitelisted super-admin child paths (no trailing slashes). */
export const ADMIN_CHILD_ROUTES = new Set([
  'orders',
  'price-requests',
  'users',
  'city-to-city',
  'airport',
  'train',
  'within-city',
  'hourly',
  'ziyarat',
  'categories',
  'cars',
  'products', // legacy → redirect
  'round-trip', // legacy → redirect
  'services',
  'routes',
  'faq',
  'blogs',
  'sections',
  'hero',
  'backgrounds',
  'banners',
  'gallery',
  'social',
  'notifications',
  'chat',
  'activity',
  'settings',
  'payment-settings',
  'backup',
]);

export function isValidAdminPath(pathname) {
  if (!pathname) return false;
  const normalized = pathname.replace(/\/+$/, '') || '/';
  if (normalized === '/admin') return true;
  if (!normalized.startsWith('/admin/')) return false;
  const child = normalized.slice('/admin/'.length).split('/').filter(Boolean)[0];
  if (!child) return true;
  return ADMIN_CHILD_ROUTES.has(child);
}

/** Common mistyped admin URLs → security 404 */
export const ADMIN_TYPO_PATHS = [
  '/admins',
  '/admins/*',
  '/adminstrator',
  '/adminstrator/*',
  '/adminstrator/*',
  '/admn',
  '/admn/*',
  '/superadmin',
  '/superadmin/*',
  '/super-admin',
  '/super-admin/*',
];
