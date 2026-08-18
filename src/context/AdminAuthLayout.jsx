import { Suspense } from 'react';
import { Outlet } from 'react-router-dom';
import { AdminAuthProvider } from './AdminAuthContext';

export default function AdminAuthLayout() {
  return (
    <AdminAuthProvider>
      <Suspense
        fallback={
          <div className="min-h-[40svh] grid place-items-center" role="status" aria-label="Loading">
            <div className="h-8 w-8 rounded-full border-2 border-brand/25 border-t-gold animate-spin" />
          </div>
        }
      >
        <Outlet />
      </Suspense>
    </AdminAuthProvider>
  );
}
