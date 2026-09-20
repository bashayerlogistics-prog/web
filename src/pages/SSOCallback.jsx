import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthenticateWithRedirectCallback } from '@clerk/clerk-react';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { consumeAuthRedirect, markHasAccount } from '../utils/authEntry';

/**
 * After Google OAuth, Clerk lands here.
 * Resume Firebase bridge, then go to cart (if items) or dashboard — never home.
 */
export default function SSOCallback() {
  const { user, isClerkSignedIn, syncFirebaseSession, loading } = useAuth();
  const { cartCount } = useCart();
  const navigate = useNavigate();

  const goNext = () => {
    markHasAccount();
    const target = consumeAuthRedirect('/dashboard', { cartCount });
    navigate(target, { replace: true });
  };

  useEffect(() => {
    if (!isClerkSignedIn || user || loading) return undefined;
    let cancelled = false;
    (async () => {
      try {
        await syncFirebaseSession({ authProvider: 'google' });
        if (!cancelled) goNext();
      } catch (error) {
        console.error('SSO Firebase bridge failed:', error);
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isClerkSignedIn, user, loading, syncFirebaseSession]);

  useEffect(() => {
    if (user) goNext();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  return (
    <div className="min-h-[50vh] grid place-items-center p-6">
      <div className="text-center space-y-3">
        <div className="w-10 h-10 border-4 border-brand/25 border-t-gold rounded-full animate-spin mx-auto" />
        <p className="text-sm text-gray-500">Completing Google sign-in…</p>
      </div>
      <AuthenticateWithRedirectCallback />
    </div>
  );
}
