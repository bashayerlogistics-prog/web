import { useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

const SEG_TO_KEY = {
  '': 'overview',
  overview: 'overview',
  'booking-forms': 'bookingForms',
  orders: 'orders',
  users: 'users',
  'price-requests': 'priceRequests',
  chat: 'chat',
  notifications: 'notifications',
  activity: 'activity',
  categories: 'categories',
  cars: 'cars',
  fleet: 'homeFleet',
  'city-to-city': 'cityToCity',
  airport: 'airport',
  train: 'train',
  'within-city': 'withinCity',
  hourly: 'hourly',
  ziyarat: 'ziyaratImages',
  services: 'services',
  routes: 'routes',
  faq: 'faq',
  blogs: 'blogs',
  banners: 'banners',
  gallery: 'gallery',
  social: 'social',
  footer: 'footer',
  'payment-settings': 'paymentSettings',
  hero: 'hero',
  'travel-reservations': 'travelReservations',
  backgrounds: 'backgrounds',
  sections: 'sections',
  settings: 'settings',
  backup: 'backup',
};

export function resolveAdminPagePurposeKey(pathname) {
  const normalized = String(pathname || '').replace(/\/+$/, '') || '/admin';
  if (normalized === '/admin') return 'overview';
  if (!normalized.startsWith('/admin/')) return null;
  const rest = normalized.slice('/admin/'.length);
  const [seg, second] = rest.split('/').filter(Boolean);
  if (!seg) return 'overview';
  if (seg === 'categories' && second) return 'categoryDetail';
  if (seg === 'cars' && second) return 'carDetail';
  return SEG_TO_KEY[seg] || seg;
}

export function useAdminPagePurpose(overrideKey) {
  const { pathname } = useLocation();
  const { t } = useTranslation();
  const key = overrideKey || resolveAdminPagePurposeKey(pathname);
  return useMemo(() => {
    if (!key) return '';
    return t(`admin.pagePurpose.${key}`, '');
  }, [key, t]);
}
