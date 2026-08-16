import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { LogIn, LayoutDashboard } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export default function NavLoginButton({ variant = 'topbar', compact = false, className = '' }) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const to = user ? '/dashboard' : '/login';
  const Icon = user ? LayoutDashboard : LogIn;
  const label = user
    ? (compact ? t('nav.dashboardShort') : t('nav.dashboard'))
    : (compact ? t('nav.loginShort') : t('nav.login'));

  const base = 'nav-login-btn group';
  const variantClass = variant === 'topbar' ? 'nav-login-btn--topbar' : 'nav-login-btn--header';
  const compactClass = compact ? 'nav-login-btn--compact' : '';

  return (
    <Link to={to} className={`${base} ${variantClass} ${compactClass} ${className}`}>
      <span className="nav-login-btn__icon">
        <Icon className="w-3.5 h-3.5" strokeWidth={2.5} />
      </span>
      <span className="nav-login-btn__text">{label}</span>
      <span className="nav-login-btn__glow" aria-hidden />
    </Link>
  );
}
