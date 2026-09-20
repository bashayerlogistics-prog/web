import { useEffect, useRef, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { getAccountEntryPath, setAuthRedirect } from '../utils/authEntry';

const CLERK_BRIDGE_GRACE_MS = 10000;

/**
 * Wait for Firebase user when Clerk session exists — avoids mobile bounce
 * login → dashboard → login before sync finishes.
 */
export default function ProtectedRoute({ children }) {
  const { user, loading, isClerkSignedIn, syncFirebaseSession } = useAuth();
  const location = useLocation();
  const { t, i18n } = useTranslation();
  const [graceExpired, setGraceExpired] = useState(false);
  const retryRef = useRef(false);

  useEffect(() => {
    if (user || !isClerkSignedIn || loading) {
      setGraceExpired(false);
      return undefined;
    }
    const timer = window.setTimeout(() => setGraceExpired(true), CLERK_BRIDGE_GRACE_MS);
    return () => window.clearTimeout(timer);
  }, [user, isClerkSignedIn, loading]);

  useEffect(() => {
    if (!isClerkSignedIn || user || loading || retryRef.current) return undefined;
    retryRef.current = true;
    let cancelled = false;
    (async () => {
      try {
        await syncFirebaseSession({
          authProvider: 'clerk_email',
          language: i18n.language,
        });
      } catch (error) {
        if (!cancelled) {
          console.error('ProtectedRoute bridge retry failed:', error);
          retryRef.current = false;
        }
      }
    })();
    return () => { cancelled = true; };
  }, [isClerkSignedIn, user, loading, syncFirebaseSession, i18n.language]);

  useEffect(() => {
    if (user || loading) return;
    const fromPath = `${location.pathname}${location.search || ''}`;
    setAuthRedirect(fromPath);
  }, [user, loading, location.pathname, location.search]);

  if (loading || (isClerkSignedIn && !user && !graceExpired)) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-gray-500">{t('common.loading')}</p>
        </div>
      </div>
    );
  }

  if (!user) {
    const to = isClerkSignedIn ? '/login' : getAccountEntryPath();
    return <Navigate to={to} state={{ from: location }} replace />;
  }

  return children;
}
