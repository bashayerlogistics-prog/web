import { Suspense } from 'react';
import { Outlet } from 'react-router-dom';
import { AdminAuthProvider } from './AdminAuthContext';
import { SiteContentProvider } from './SiteContentContext';

export default function AdminAuthLayout() {
  return (
    <AdminAuthProvider>
      <SiteContentProvider>
        <Suspense
          fallback={
            <div className="admin-lazy-fallback" role="status" aria-label="Loading">
              <div className="admin-lazy-fallback-bar" />
            </div>
          }
        >
          <Outlet />
        </Suspense>
      </SiteContentProvider>
    </AdminAuthProvider>
  );
}
