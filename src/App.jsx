import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import { ToastProvider } from './context/ToastContext';
import AppShell from './components/layout/AppShell';
import SecurityNotFound from './pages/SecurityNotFound';
import ProtectedRoute from './pages/ProtectedRoute';
import Home from './pages/Home';
import PublicAppShell from './components/layout/PublicAppShell';
import { BrandingProvider } from './context/BrandingContext';
import './i18n';

const clerkPubKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

const AdminAuthLayout = lazy(() => import('./context/AdminAuthLayout'));
const AdminSiteContentLayout = lazy(() => import('./context/AdminSiteContentLayout'));

const Login = lazy(() => import('./pages/Login'));
const Register = lazy(() => import('./pages/Register'));
const SSOCallback = lazy(() => import('./pages/SSOCallback'));
const ForgotPassword = lazy(() => import('./pages/ForgotPassword'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Checkout = lazy(() => import('./pages/Checkout'));
const PaymentReturn = lazy(() => import('./pages/PaymentReturn'));
const Cart = lazy(() => import('./pages/Cart'));
const VehicleDetail = lazy(() => import('./pages/VehicleDetail'));
const CarCategory = lazy(() => import('./pages/CarCategory'));
const TrackBooking = lazy(() => import('./pages/TrackBooking'));
const BookingSearch = lazy(() => import('./pages/BookingSearch'));
const AdminLogin = lazy(() => import('./pages/admin/AdminLogin'));
const AdminOverview = lazy(() => import('./pages/admin/AdminOverview'));
const AdminOrders = lazy(() => import('./pages/admin/AdminOrders'));
const AdminUsers = lazy(() => import('./pages/admin/AdminUsers'));
const AdminPriceRequests = lazy(() => import('./pages/admin/AdminPriceRequests'));
const AdminActivity = lazy(() => import('./pages/admin/AdminActivity'));
const AdminSettings = lazy(() => import('./pages/admin/AdminSettings'));
const AdminPaymentSettings = lazy(() => import('./pages/admin/AdminPaymentSettings'));
const AdminBackup = lazy(() => import('./pages/admin/AdminBackup'));
const AdminHomeFleet = lazy(() => import('./pages/admin/AdminHomeFleet'));
const AdminZiyarat = lazy(() => import('./pages/admin/AdminZiyarat'));
const AdminCars = lazy(() => import('./pages/admin/AdminCars'));
const AdminServices = lazy(() => import('./pages/admin/AdminServices'));
const AdminBlogs = lazy(() => import('./pages/admin/AdminBlogs'));
const AdminSections = lazy(() => import('./pages/admin/AdminSections'));
const AdminBanners = lazy(() => import('./pages/admin/AdminBanners'));
const AdminGallery = lazy(() => import('./pages/admin/AdminGallery'));
const AdminSocialMedia = lazy(() => import('./pages/admin/AdminSocialMedia'));
const AdminTravelReservations = lazy(() => import('./pages/admin/AdminTravelReservations'));
const AdminFooter = lazy(() => import('./pages/admin/AdminFooter'));
const AdminHero = lazy(() => import('./pages/admin/AdminHero'));
const AdminBookingForms = lazy(() => import('./pages/admin/AdminBookingForms'));
const AdminBackgrounds = lazy(() => import('./pages/admin/AdminBackgrounds'));
const AdminNotifications = lazy(() => import('./pages/admin/AdminNotifications'));
const AdminChat = lazy(() => import('./pages/admin/AdminChat'));
const AdminRoutes = lazy(() => import('./pages/admin/AdminRoutes'));
const AdminFAQ = lazy(() => import('./pages/admin/AdminFAQ'));
const Gallery = lazy(() => import('./pages/Gallery'));

function LazyRoute({ children }) {
  return (
    <Suspense
      fallback={
        <div className="min-h-[40svh] grid place-items-center" role="status" aria-label="Loading">
          <div className="h-8 w-8 rounded-full border-2 border-brand/25 border-t-gold animate-spin" />
        </div>
      }
    >
      {children}
    </Suspense>
  );
}

function AdminLazyRoute({ children }) {
  return (
    <Suspense
      fallback={
        <div className="admin-lazy-fallback" role="status" aria-label="Loading">
          <div className="admin-lazy-fallback-bar" />
        </div>
      }
    >
      {children}
    </Suspense>
  );
}

export default function App() {
  if (!clerkPubKey) {
    return (
      <div className="min-h-screen grid place-items-center p-6 text-center">
        <p className="text-red-600 font-semibold">Missing VITE_CLERK_PUBLISHABLE_KEY in .env</p>
      </div>
    );
  }

  return (
    <ThemeProvider>
      <ToastProvider>
        <BrowserRouter>
          <BrandingProvider>
            <AppShell>
            <Routes>
              <Route element={<LazyRoute><AdminAuthLayout /></LazyRoute>}>
                <Route
                  path="admin/login"
                  element={
                    <LazyRoute>
                      <AdminLogin />
                    </LazyRoute>
                  }
                />
                <Route path="admin" element={<AdminSiteContentLayout />}>
                  <Route index element={<LazyRoute><AdminOverview /></LazyRoute>} />
                  <Route path="overview" element={<Navigate to="/admin" replace />} />
                  <Route path="orders" element={<LazyRoute><AdminOrders /></LazyRoute>} />
                  <Route path="price-requests" element={<LazyRoute><AdminPriceRequests /></LazyRoute>} />
                  <Route path="users" element={<LazyRoute><AdminUsers /></LazyRoute>} />
                  <Route path="booking-forms" element={<LazyRoute><AdminBookingForms /></LazyRoute>} />
                  <Route path="fleet" element={<LazyRoute><AdminHomeFleet /></LazyRoute>} />
                  <Route path="ziyarat" element={<LazyRoute><AdminZiyarat /></LazyRoute>} />
                  <Route path="city-to-city" element={<Navigate to="/admin/fleet" replace />} />
                  <Route path="airport" element={<Navigate to="/admin/fleet" replace />} />
                  <Route path="train" element={<Navigate to="/admin/fleet" replace />} />
                  <Route path="within-city" element={<Navigate to="/admin/fleet" replace />} />
                  <Route path="hourly" element={<Navigate to="/admin/fleet" replace />} />
                  <Route path="categories" element={<LazyRoute><AdminCars /></LazyRoute>} />
                  <Route path="categories/:categoryId" element={<LazyRoute><AdminCars /></LazyRoute>} />
                  <Route path="cars" element={<LazyRoute><AdminCars /></LazyRoute>} />
                  <Route path="cars/:carId" element={<LazyRoute><AdminCars /></LazyRoute>} />
                  <Route path="products" element={<Navigate to="/admin/fleet" replace />} />
                  <Route path="round-trip" element={<Navigate to="/admin/fleet" replace />} />
                  <Route path="services" element={<LazyRoute><AdminServices /></LazyRoute>} />
                  <Route path="routes" element={<LazyRoute><AdminRoutes /></LazyRoute>} />
                  <Route path="faq" element={<LazyRoute><AdminFAQ /></LazyRoute>} />
                  <Route path="blogs" element={<LazyRoute><AdminBlogs /></LazyRoute>} />
                  <Route path="sections" element={<LazyRoute><AdminSections /></LazyRoute>} />
                  <Route path="hero" element={<LazyRoute><AdminHero /></LazyRoute>} />
                  <Route path="trip-types" element={<Navigate to="/admin/booking-forms" replace />} />
                  <Route path="booking-locations" element={<Navigate to="/admin/booking-forms" replace />} />
                  <Route path="backgrounds" element={<LazyRoute><AdminBackgrounds /></LazyRoute>} />
                  <Route path="banners" element={<LazyRoute><AdminBanners /></LazyRoute>} />
                  <Route path="gallery" element={<LazyRoute><AdminGallery /></LazyRoute>} />
                  <Route path="social" element={<LazyRoute><AdminSocialMedia /></LazyRoute>} />
                  <Route path="travel-reservations" element={<LazyRoute><AdminTravelReservations /></LazyRoute>} />
                  <Route path="footer" element={<LazyRoute><AdminFooter /></LazyRoute>} />
                  <Route path="notifications" element={<LazyRoute><AdminNotifications /></LazyRoute>} />
                  <Route path="chat" element={<LazyRoute><AdminChat /></LazyRoute>} />
                  <Route path="activity" element={<LazyRoute><AdminActivity /></LazyRoute>} />
                  <Route path="settings" element={<LazyRoute><AdminSettings /></LazyRoute>} />
                  <Route path="payment-settings" element={<LazyRoute><AdminPaymentSettings /></LazyRoute>} />
                  <Route path="backup" element={<LazyRoute><AdminBackup /></LazyRoute>} />
                  <Route path="*" element={<SecurityNotFound variant="admin" />} />
                </Route>
              </Route>

              <Route path="admins/*" element={<Navigate to="/404" replace />} />
              <Route path="adminstrator/*" element={<Navigate to="/404" replace />} />
              <Route path="admn/*" element={<Navigate to="/404" replace />} />
              <Route path="superadmin/*" element={<Navigate to="/404" replace />} />
              <Route path="super-admin/*" element={<Navigate to="/404" replace />} />
              <Route path="404" element={<SecurityNotFound />} />

              <Route element={<PublicAppShell />}>
                <Route index element={<Home />} />
                <Route path="login" element={<LazyRoute><Login /></LazyRoute>} />
                <Route path="register" element={<LazyRoute><Register /></LazyRoute>} />
                <Route path="sso-callback" element={<LazyRoute><SSOCallback /></LazyRoute>} />
                <Route path="forgot-password" element={<LazyRoute><ForgotPassword /></LazyRoute>} />
                <Route path="booking/search" element={<LazyRoute><BookingSearch /></LazyRoute>} />
                <Route
                  path="cart"
                  element={
                    <ProtectedRoute>
                      <LazyRoute><Cart /></LazyRoute>
                    </ProtectedRoute>
                  }
                />
                <Route path="vehicles/:slug" element={<LazyRoute><VehicleDetail /></LazyRoute>} />
                <Route path="cars/:carId" element={<LazyRoute><CarCategory /></LazyRoute>} />
                <Route path="gallery" element={<LazyRoute><Gallery /></LazyRoute>} />
                <Route path="track" element={
                  <ProtectedRoute>
                    <LazyRoute><TrackBooking /></LazyRoute>
                  </ProtectedRoute>
                } />
                <Route
                  path="dashboard"
                  element={
                    <ProtectedRoute>
                      <LazyRoute>
                        <Dashboard />
                      </LazyRoute>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="payment/return"
                  element={
                    <ProtectedRoute>
                      <LazyRoute><PaymentReturn /></LazyRoute>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="checkout"
                  element={
                    <ProtectedRoute>
                      <LazyRoute><Checkout /></LazyRoute>
                    </ProtectedRoute>
                  }
                />
                <Route path="*" element={<SecurityNotFound />} />
              </Route>
            </Routes>
            </AppShell>
          </BrandingProvider>
        </BrowserRouter>
      </ToastProvider>
    </ThemeProvider>
  );
}
