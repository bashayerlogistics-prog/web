import { startTransition } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { scrollToSection } from '../../utils/scroll';
import { prefetchRoute } from '../../utils/prefetchRoutes';

const EXTERNAL_RE = /^(https?:|tel:|mailto:|\/\/)/i;

/**
 * SPA navigation — no full page reload.
 * Supports "/", "/cart", "/#routes", "#pricing-calculator", external URLs.
 */
export default function AppNavLink({
  to,
  href,
  onClick,
  smooth = true,
  className,
  children,
  prefetch,
  ...rest
}) {
  const target = to ?? href ?? '';
  const navigate = useNavigate();
  const location = useLocation();

  const prefetchPath = prefetch ?? (target.startsWith('/') && !target.includes('#') ? target : null);

  const handlePrefetch = () => {
    if (prefetchPath) prefetchRoute(prefetchPath);
  };

  if (!target || target === '#') {
    return (
      <a href="#" className={className} onClick={onClick} {...rest}>
        {children}
      </a>
    );
  }

  if (EXTERNAL_RE.test(target)) {
    return (
      <a href={target} className={className} onClick={onClick} {...rest}>
        {children}
      </a>
    );
  }

  const goHomeAndScroll = (hash) => {
    startTransition(() => {
      navigate('/', { state: { scrollTo: hash } });
    });
  };

  if (target.startsWith('/#')) {
    const hash = target.slice(1);

    return (
      <a
        href={target}
        className={className}
        onMouseEnter={handlePrefetch}
        onFocus={handlePrefetch}
        onTouchStart={handlePrefetch}
        onClick={(e) => {
          onClick?.(e);
          if (e.defaultPrevented) return;
          e.preventDefault();

          if (location.pathname === '/') {
            scrollToSection(hash, smooth);
          } else {
            goHomeAndScroll(hash);
          }
        }}
        {...rest}
      >
        {children}
      </a>
    );
  }

  if (target.startsWith('#')) {
    return (
      <a
        href={target}
        className={className}
        onMouseEnter={handlePrefetch}
        onFocus={handlePrefetch}
        onTouchStart={handlePrefetch}
        onClick={(e) => {
          onClick?.(e);
          if (e.defaultPrevented) return;
          e.preventDefault();

          if (location.pathname === '/') {
            scrollToSection(target, smooth);
          } else {
            goHomeAndScroll(target);
          }
        }}
        {...rest}
      >
        {children}
      </a>
    );
  }

  if (target === '/') {
    return (
      <Link
        to="/"
        className={className}
        onClick={onClick}
        onMouseEnter={handlePrefetch}
        onFocus={handlePrefetch}
        onTouchStart={handlePrefetch}
        {...rest}
      >
        {children}
      </Link>
    );
  }

  return (
    <Link
      to={target}
      className={className}
      onClick={onClick}
      onMouseEnter={handlePrefetch}
      onFocus={handlePrefetch}
      onTouchStart={handlePrefetch}
      {...rest}
    >
      {children}
    </Link>
  );
}
