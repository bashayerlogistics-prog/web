import AppNavLink from './AppNavLink';

/**
 * Header nav link with fast GPU 3D hover — desktop pill + mobile row variants.
 */
export default function NavLink3D({
  to,
  children,
  onClick,
  variant = 'desktop',
  icon: Icon,
  className = '',
}) {
  const variantClass = variant === 'mobile' ? 'nav-link-3d--mobile' : 'nav-link-3d--desktop';

  return (
    <AppNavLink
      to={to}
      onClick={onClick}
      className={`nav-link-3d ${variantClass} ${className}`.trim()}
    >
      <span className="nav-link-3d__inner">
        {Icon ? <Icon className="nav-link-3d__icon" aria-hidden strokeWidth={2.25} /> : null}
        <span className="nav-link-3d__text">{children}</span>
        <span className="nav-link-3d__depth" aria-hidden="true">{children}</span>
      </span>
    </AppNavLink>
  );
}
