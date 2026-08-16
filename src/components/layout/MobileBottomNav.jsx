import { useState, useEffect, useCallback } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Home,
  Menu,
  CalendarCheck,
  MapPin,
  X,
  Car,
  Route,
  HelpCircle,
  User,
  LogIn,
  MessageCircle,
  Newspaper,
  Images,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { CONTACT, getCarDisplayName } from '../../data/staticData';
import AppNavLink from '../ui/AppNavLink';

function NavItem({ active, onClick, href, icon: Icon, label, center = false }) {
  const className = [
    'mobile-bottom-nav__item',
    center ? 'mobile-bottom-nav__item--center' : '',
    active ? 'mobile-bottom-nav__item--active' : '',
  ].filter(Boolean).join(' ');

  const content = (
    <>
      {center ? (
        <span className="mobile-bottom-nav__fab" aria-hidden="true">
          <Icon className="mobile-bottom-nav__fab-icon" />
        </span>
      ) : (
        <Icon className="mobile-bottom-nav__icon" aria-hidden="true" />
      )}
      <span className="mobile-bottom-nav__label">{label}</span>
    </>
  );

  if (href) {
    if (href.startsWith('/#')) {
      return (
        <AppNavLink to={href} className={className} aria-current={active ? 'page' : undefined}>
          {content}
        </AppNavLink>
      );
    }
    return (
      <Link to={href} className={className} aria-current={active ? 'page' : undefined}>
        {content}
      </Link>
    );
  }

  return (
    <button type="button" onClick={onClick} className={className} aria-expanded={active} aria-label={label}>
      {content}
    </button>
  );
}

export default function MobileBottomNav() {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const isRtl = i18n.language === 'ar';

  const isPathActive = useCallback((path) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname === path || location.pathname.startsWith(`${path}/`);
  }, [location.pathname]);

  const isHashActive = useCallback((hash) => {
    if (location.pathname !== '/') return false;
    return location.hash === hash || (!location.hash && hash === '#pricing-calculator' && false);
  }, [location.hash, location.pathname]);

  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname, location.hash]);

  useEffect(() => {
    if (!menuOpen) return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [menuOpen]);

  if (location.pathname.startsWith('/admin')) return null;

  const accountHref = user ? '/dashboard' : '/login';
  const accountLabel = user ? t('nav.dashboardShort') : t('nav.loginShort');

  const moreLinks = [
    { key: 'routes', href: '/#routes', icon: Route },
    { key: 'fleet', href: '/#vehicles', icon: Car },
    { key: 'gallery', href: '/gallery', icon: Images },
    { key: 'faq', href: '/#faq', icon: HelpCircle },
    { key: 'blog', href: '/#blog', icon: Newspaper },
  ];

  const carCategoryLinks = [
    { id: 'taurus', href: '/cars/taurus' },
    { id: 'camry', href: '/cars/camry' },
    { id: 'staria', href: '/cars/staria' },
    { id: 'yukon', href: '/cars/yukon' },
    { id: 'hiace', href: '/cars/hiace' },
  ];

  return (
    <>
      {menuOpen && (
        <div className="mobile-bottom-nav__sheet-root" role="dialog" aria-modal="true" aria-label={t('nav.menu')}>
          <button
            type="button"
            className="mobile-bottom-nav__sheet-backdrop"
            onClick={() => setMenuOpen(false)}
            aria-label={t('common.close')}
          />
          <div className="mobile-bottom-nav__sheet" dir={isRtl ? 'rtl' : 'ltr'}>
            <div className="mobile-bottom-nav__sheet-header">
              <h3 className="mobile-bottom-nav__sheet-title">{t('nav.menu')}</h3>
              <button
                type="button"
                onClick={() => setMenuOpen(false)}
                className="mobile-bottom-nav__sheet-close"
                aria-label={t('common.close')}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mobile-bottom-nav__sheet-grid">
              {moreLinks.map((link) => (
                <AppNavLink
                  key={link.key}
                  to={link.href}
                  onClick={() => setMenuOpen(false)}
                  className="mobile-bottom-nav__sheet-link"
                >
                  <link.icon className="w-5 h-5 shrink-0 text-gold" aria-hidden="true" />
                  <span>{t(`nav.${link.key}Short`, { defaultValue: t(`nav.${link.key}`) })}</span>
                </AppNavLink>
              ))}
            </div>

            <div className="mobile-bottom-nav__sheet-cats px-4 pb-3">
              <p className="text-[10px] font-black uppercase tracking-wider text-white/45 mb-2">
                {t('nav.fleet')}
              </p>
              <div className="grid grid-cols-2 gap-2">
                {carCategoryLinks.map((car) => (
                  <Link
                    key={car.id}
                    to={car.href}
                    onClick={() => setMenuOpen(false)}
                    className={`mobile-bottom-nav__sheet-link text-sm ${
                      isPathActive(car.href) ? 'mobile-bottom-nav__sheet-link--active' : ''
                    }`}
                  >
                    <Car className="w-4 h-4 shrink-0 text-gold" aria-hidden="true" />
                    <span className="truncate">
                      {getCarDisplayName(car.id, i18n.language?.startsWith('ar') ? 'ar' : 'en')}
                    </span>
                  </Link>
                ))}
              </div>
            </div>

            <div className="mobile-bottom-nav__sheet-footer">
              <Link
                to={accountHref}
                onClick={() => setMenuOpen(false)}
                className="mobile-bottom-nav__sheet-action mobile-bottom-nav__sheet-action--brand"
              >
                {user ? <User className="w-5 h-5 shrink-0" /> : <LogIn className="w-5 h-5 shrink-0" />}
                <span>{accountLabel}</span>
              </Link>
              <a
                href={CONTACT.whatsapp}
                target="_blank"
                rel="noreferrer"
                onClick={() => setMenuOpen(false)}
                className="mobile-bottom-nav__sheet-action mobile-bottom-nav__sheet-action--whatsapp"
              >
                <MessageCircle className="w-5 h-5 shrink-0" />
                <span>{t('howToBook.whatsapp')}</span>
              </a>
            </div>
          </div>
        </div>
      )}

      <nav
        className="mobile-bottom-nav"
        dir={isRtl ? 'rtl' : 'ltr'}
        aria-label={t('nav.menu')}
      >
        <div className="mobile-bottom-nav__bar">
          <NavItem
            href="/"
            icon={Home}
            label={t('nav.homeShort')}
            active={isPathActive('/')}
          />
          <NavItem
            icon={Menu}
            label={t('nav.more')}
            active={menuOpen}
            onClick={() => setMenuOpen((v) => !v)}
          />
          <NavItem
            href="/#pricing-calculator"
            icon={CalendarCheck}
            label={t('nav.bookNowShort')}
            center
            active={isHashActive('#pricing-calculator')}
          />
          <NavItem
            href="/track"
            icon={MapPin}
            label={t('nav.trackShort')}
            active={isPathActive('/track')}
          />
          <NavItem
            href={accountHref}
            icon={user ? User : LogIn}
            label={accountLabel}
            active={isPathActive(accountHref)}
          />
        </div>
      </nav>
    </>
  );
}
