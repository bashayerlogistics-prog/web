const prefetched = new Set();

const ROUTE_LOADERS = {
  '/login': () => import('../pages/Login'),
  '/register': () => import('../pages/Register'),
  '/forgot-password': () => import('../pages/ForgotPassword'),
  '/cart': () => import('../pages/Cart'),
  '/track': () => import('../pages/TrackBooking'),
  '/dashboard': () => import('../pages/Dashboard'),
  '/checkout': () => import('../pages/Checkout'),
  '/booking/search': () => import('../pages/BookingSearch'),
  '/vehicles': () => import('../pages/VehicleDetail'),
  '/cars': () => import('../pages/CarCategory'),
  '/gallery': () => import('../pages/Gallery'),
};

export function prefetchRoute(path) {
  const loader = ROUTE_LOADERS[path];
  if (!loader || prefetched.has(path)) return;

  prefetched.add(path);
  loader();
}
