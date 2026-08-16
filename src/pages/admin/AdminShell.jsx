import { Navigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAdminAuth } from '../../context/AdminAuthContext';
import { isValidAdminPath } from '../../constants/adminRoutes';
import AdminLayout from '../../components/admin/AdminLayout';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import SecurityNotFound from '../SecurityNotFound';

export default function AdminShell() {
  const { pathname } = useLocation();
  const { isAdmin, loading } = useAdminAuth();
  const { t } = useTranslation();

  if (!isValidAdminPath(pathname)) {
    return <SecurityNotFound variant="admin" />;
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center admin-bg">
        <LoadingSpinner text={t('common.loading')} />
      </div>
    );
  }

  if (!isAdmin) {
    return <Navigate to="/admin/login" replace state={{ from: pathname }} />;
  }

  return <AdminLayout />;
}
