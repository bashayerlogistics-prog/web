import { useState, useEffect, useCallback } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  MessageCircle,
  Menu,
  X,
  Phone,
  ShoppingCart,
  Home,
  Route,
  Car,
  Images,
  HelpCircle,
  Newspaper,
} from 'lucide-react';
import { useScrollHeader, useSiteHeaderHeight } from '../../hooks/useUtils';
import { CONTACT } from '../../data/staticData';
import BrandLogo from '../ui/BrandLogo';
import AppNavLink from '../ui/AppNavLink';
import NavLink3D from '../ui/NavLink3D';
import { useCart } from '../../context/CartContext';
import NavLoginButton from './NavLoginButton';
import LanguageToggle from './LanguageToggle';
import FleetCategoriesDropdown from './FleetCategoriesDropdown';

const navLinks = [
  { key: 'home', href: '/', icon: Home },
  { key: 'routes', href: '/#routes', icon: Route },
  { key: 'fleet', href: '/#vehicles', dropdown: 'fleet', icon: Car },
  { key: 'gallery', href: '/gallery', icon: Images },
  { key: 'faq', href: '/#faq', icon: HelpCircle },
  { key: 'blog', href: '/#blog', icon: Newspaper },
];

export default function Header() {
  const { t, i18n } = useTranslation();
  const location = useLocation();
  const scrolled = useScrollHeader(100, location.pathname);
  const { cartCount } = useCart();
  const [menuOpen, setMenuOpen] = useState(false);
  const useCompactLabels = i18n.language === 'ar';

  const isHome = location.pathname === '/';
  const solidHeader = !isHome || scrolled;

  const getNavLabel = useCallback((key, forceFull = false) => {
    if (!forceFull && useCompactLabels) {
      const short = t(`nav.${key}Short`, { defaultValue: '' });
      if (short) return short;
    }
    return t(`nav.${key}`);
  }, [t, useCompactLabels]);

  useSiteHeaderHeight();

  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [menuOpen]);

  return (
    <header
      id="main-header"
      className={`fixed top-0 left-0 right-0 z-[100] ${
        solidHeader ? 'header-scrolled' : 'header-hero'
      }`}
    >
      <div className="header-shell">
        <div className={`header-bar${isHome ? ' header-bar--glass' : ''}`}>
        <div className="header-bar__row flex items-center justify-between min-h-[var(--header-inner-min-h)]">
          <Link
            to="/"
            className="header-logo-link flex items-center group min-w-0 shrink pe-1"
          >
            <span className="flex lg:hidden items-center min-w-0 max-w-full">
              <BrandLogo
                variant="full"
                tone="light"
                compact
                alt={t('brand.name')}
                className="h-9 sm:h-10 min-w-0 max-w-full transition-transform group-hover:scale-[1.02]"
                loading="eager"
                decoding="sync"
              />
            </span>
            <span className="hidden lg:flex items-center shrink-0">
              <BrandLogo
                variant="full"
                tone="light"
                alt={t('brand.name')}
                className="h-8 lg:h-9 xl:h-10 max-w-[88px] lg:max-w-[105px] xl:max-w-[130px] 2xl:max-w-[160px] transition-transform group-hover:scale-[1.02]"
                loading="eager"
                decoding="sync"
              />
            </span>
          </Link>

          <nav
            className="header-nav hidden md:flex items-center flex-1 justify-center px-0.5 lg:px-1 min-w-0"
            aria-label={t('nav.menu')}
          >
            {navLinks.map((link) =>
              link.dropdown === 'fleet' ? (
                <FleetCategoriesDropdown
                  key={link.key}
                  label={getNavLabel(link.key)}
                  icon={link.icon}
                />
              ) : (
                <NavLink3D
                  key={link.key}
                  to={link.href}
                  variant="desktop"
                  icon={link.icon}
                >
                  {getNavLabel(link.key)}
                </NavLink3D>
              ),
            )}
          </nav>

          <div className="flex items-center gap-0.5 sm:gap-1 lg:gap-1 shrink-0">
            <div className="hidden md:flex items-center gap-0.5 lg:gap-1">
              <div className="header-actions-group flex items-center gap-0.5 lg:gap-1">
                <Link
                  to="/cart"
                  className="header-icon-btn"
                  aria-label="Cart"
                >
                  <ShoppingCart className="w-4 h-4" />
                  {cartCount > 0 && (
                    <span className="absolute -top-0.5 -end-0.5 min-w-4 h-4 px-1 bg-gold text-brand text-[9px] font-black rounded-full flex items-center justify-center leading-none">
                      {cartCount}
                    </span>
                  )}
                </Link>

                <LanguageToggle className="hidden 2xl:block" />
                <LanguageToggle iconOnly className="2xl:hidden" />
              </div>

              <span className="header-actions-divider hidden xl:block" aria-hidden />

              <div className="flex items-center gap-0.5 lg:gap-1">
                <NavLoginButton variant="topbar" compact />

                <a
                  href={CONTACT.whatsapp}
                  target="_blank"
                  rel="noreferrer"
                  className="header-icon-btn header-icon-btn--whatsapp hidden xl:inline-flex"
                  aria-label="WhatsApp"
                >
                  <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L0 24l6.335-1.662c1.746.953 3.71 1.458 5.704 1.459h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                  </svg>
                </a>

                <AppNavLink
                  to="#pricing-calculator"
                  className="header-cta-btn"
                >
                  <MessageCircle className="w-3.5 h-3.5 fill-brand shrink-0" />
                  <span className="truncate">{t('nav.bookNowShort')}</span>
                </AppNavLink>
              </div>
            </div>

            <div className="flex md:hidden items-center gap-1 shrink-0">
              <Link
                to="/cart"
                className="header-icon-btn header-icon-btn--mobile"
                aria-label="Cart"
              >
                <ShoppingCart className="w-[1.125rem] h-[1.125rem]" />
                {cartCount > 0 && (
                  <span className="absolute -top-0.5 -end-0.5 min-w-4 h-4 px-1 bg-gold text-brand text-[9px] font-black rounded-full flex items-center justify-center leading-none">
                    {cartCount}
                  </span>
                )}
              </Link>

              <button
                type="button"
                onClick={() => setMenuOpen(true)}
                className="header-icon-btn header-icon-btn--mobile"
                aria-label={t('nav.menu')}
                aria-expanded={menuOpen}
              >
                <Menu className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
        </div>
      </div>

      {menuOpen && (
        <div className="md:hidden fixed inset-0 z-[60]">
          <div
            className="absolute inset-0 bg-black/60 mobile-light-blur"
            onClick={() => setMenuOpen(false)}
            aria-hidden
          />
          <div
            className="absolute inset-y-0 end-0 w-full max-w-sm bg-brand-dark shadow-2xl flex flex-col animate-slide-in-end"
            role="dialog"
            aria-modal="true"
          >
            <div className="flex items-center justify-between border-b border-white/10 p-4 sm:p-5 shrink-0">
              <BrandLogo variant="full" tone="light" alt={t('brand.name')} className="h-9 max-w-[180px]" />
              <button
                type="button"
                onClick={() => setMenuOpen(false)}
                className="text-white hover:text-gold transition-colors p-2 rounded-lg hover:bg-white/10"
                aria-label="Close menu"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="flex flex-col gap-1.5 p-4 sm:p-5 overflow-y-auto flex-1">
              {navLinks.map((link) =>
                link.dropdown === 'fleet' ? (
                  <FleetCategoriesDropdown
                    key={link.key}
                    variant="mobile"
                    label={getNavLabel(link.key, true)}
                    icon={link.icon}
                    onNavigate={() => setMenuOpen(false)}
                  />
                ) : (
                  <NavLink3D
                    key={link.key}
                    to={link.href}
                    variant="mobile"
                    icon={link.icon}
                    onClick={() => setMenuOpen(false)}
                  >
                    {getNavLabel(link.key, true)}
                  </NavLink3D>
                ),
              )}
            </div>

            <div className="p-4 sm:p-5 border-t border-white/10 space-y-3 shrink-0 safe-area-pb">
              <div className="flex items-center justify-center gap-3">
                <Link
                  to="/cart"
                  onClick={() => setMenuOpen(false)}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-full border border-white/15 text-white text-sm font-semibold leading-snug hover:bg-white/8 hover:border-gold/30 transition-all"
                >
                  <ShoppingCart className="w-4 h-4" />
                  {t('cart.title')}
                  {cartCount > 0 && (
                    <span className="bg-gold text-brand text-xs font-black px-1.5 py-0.5 rounded-full leading-none">{cartCount}</span>
                  )}
                </Link>
                <LanguageToggle variant="menu" className="flex-1 max-w-[160px]" />
              </div>
              <NavLoginButton variant="topbar" className="w-full justify-center" />
              <a
                href={`tel:${CONTACT.phone}`}
                className="flex items-center justify-center gap-2 text-white border border-white/15 p-3 rounded-full hover:bg-white/8 hover:border-gold/25 transition-all font-medium text-sm leading-snug"
              >
                <Phone className="w-4 h-4 text-gold" />
                <span>{t('nav.callUs')}</span>
              </a>
              <a
                href={CONTACT.whatsapp}
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-center gap-2 text-white border border-white/15 p-3 rounded-full hover:bg-[#25D366]/10 hover:border-[#25D366]/30 transition-all font-medium text-sm leading-snug"
              >
                <svg viewBox="0 0 24 24" className="w-4 h-4 text-[#25D366]" fill="currentColor" aria-hidden>
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L0 24l6.335-1.662c1.746.953 3.71 1.458 5.704 1.459h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                </svg>
                <span>WhatsApp</span>
              </a>
              <AppNavLink
                to="#pricing-calculator"
                onClick={() => setMenuOpen(false)}
                className="header-cta-btn w-full justify-center p-3.5 text-sm"
              >
                <MessageCircle className="w-5 h-5 fill-brand" />
                <span>{t('nav.bookNow')}</span>
              </AppNavLink>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
