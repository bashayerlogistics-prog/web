import { Navigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAdminAuth } from '../../context/AdminAuthContext';
import LoadingSpinner from '../../components/ui/LoadingSpinner';

export default function AdminProtectedRoute({ children }) {
  const { isAdmin, loading } = useAdminAuth();
  const { t } = useTranslation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center admin-bg">
        <LoadingSpinner text={t('common.loading')} />
      </div>
    );
  }

  if (!isAdmin) {
    return <Navigate to="/admin/login" replace />;
  }

  return children;
}
