import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { LogIn, User, UserPlus } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';
import {
  getAccountEntryPath,
  hasReturningAccount,
  setAuthRedirect,
} from '../../utils/authEntry';

/**
 * Guest → login/register.
 * Signed-in → profile → /dashboard.
 * `signedInOnly` → nothing for guests (mobile/desktop profile slot).
 * `guestOnly` → nothing when signed in (login/register pill).
 * `asIcon` → cart-style icon button so profile never clips after login.
 */
export default function NavLoginButton({
  variant = 'topbar',
  compact = false,
  className = '',
  onClick,
  asIcon = false,
  signedInOnly = false,
  guestOnly = false,
}) {
  const { t } = useTranslation();
  const { user, isClerkSignedIn, loading } = useAuth();
  const { cartCount } = useCart();
  const signedIn = Boolean(user || isClerkSignedIn);
  const returning = hasReturningAccount();
  const postAuthPath = cartCount > 0 ? '/cart' : '/dashboard';

  if (signedInOnly && !signedIn) return null;
  if (guestOnly && signedIn) return null;

  if (signedIn) {
    if (asIcon) {
      return (
        <Link
          to="/dashboard"
          onClick={onClick}
          className={`header-icon-btn ${className}`.trim()}
          aria-label={t('nav.dashboard')}
          title={t('nav.dashboard')}
          aria-busy={loading ? 'true' : undefined}
        >
          <User className="w-[1.125rem] h-[1.125rem]" strokeWidth={2.25} />
        </Link>
      );
    }

    return (
      <Link
        to="/dashboard"
        onClick={onClick}
        className={`nav-login-btn group nav-login-btn--topbar ${compact ? 'nav-login-btn--compact' : ''} ${className}`.trim()}
        aria-label={t('nav.dashboard')}
        aria-busy={loading ? 'true' : undefined}
      >
        <span className="nav-login-btn__icon">
          <User className="w-3.5 h-3.5" strokeWidth={2.5} />
        </span>
        <span className="nav-login-btn__text">{compact ? t('nav.dashboardShort') : t('nav.dashboard')}</span>
        <span className="nav-login-btn__glow" aria-hidden />
      </Link>
    );
  }

  const to = getAccountEntryPath();
  const Icon = returning ? LogIn : UserPlus;
  const label = returning
    ? (compact ? t('nav.loginShort') : t('nav.login'))
    : t('nav.register');

  const rememberRedirect = () => {
    setAuthRedirect(postAuthPath);
    onClick?.();
  };

  if (asIcon) {
    return (
      <Link
        to={to}
        state={{ from: { pathname: postAuthPath } }}
        onClick={rememberRedirect}
        className={`header-icon-btn ${className}`.trim()}
        aria-label={label}
        title={label}
      >
        <Icon className="w-[1.125rem] h-[1.125rem]" strokeWidth={2.25} />
      </Link>
    );
  }

  const base = 'nav-login-btn group';
  const variantClass = variant === 'topbar' ? 'nav-login-btn--topbar' : 'nav-login-btn--header';
  const compactClass = compact ? 'nav-login-btn--compact' : '';

  return (
    <Link
      to={to}
      state={{ from: { pathname: postAuthPath } }}
      onClick={rememberRedirect}
      className={`${base} ${variantClass} ${compactClass} ${className}`}
    >
      <span className="nav-login-btn__icon">
        <Icon className="w-3.5 h-3.5" strokeWidth={2.5} />
      </span>
      <span className="nav-login-btn__text">{label}</span>
      <span className="nav-login-btn__glow" aria-hidden />
    </Link>
  );
}
