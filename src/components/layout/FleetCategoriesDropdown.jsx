import { useState, useRef, useEffect, useMemo } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ChevronDown } from 'lucide-react';
import {
  BOOKING_CAR_TYPES,
  getCarDisplayName,
  getCarImage,
  getLiveCarCatalog,
} from '../../data/staticData';
import { useSiteContent } from '../../context/SiteContentContext';
import AppNavLink from '../ui/AppNavLink';

export default function FleetCategoriesDropdown({
  variant = 'desktop',
  label,
  icon: Icon,
  onNavigate,
}) {
  const { t, i18n } = useTranslation();
  const location = useLocation();
  const { carCatalog } = useSiteContent();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const lang = i18n.language?.startsWith('ar') ? 'ar' : 'en';
  const isMobile = variant === 'mobile';

  const cars = useMemo(() => {
    const live = (carCatalog?.length ? carCatalog : getLiveCarCatalog()).filter(
      (c) => c.active !== false,
    );
    const byId = new Map(live.map((c) => [c.id, c]));
    return BOOKING_CAR_TYPES.map((id) => byId.get(id) || {
      id,
      nameEn: getCarDisplayName(id, 'en'),
      nameAr: getCarDisplayName(id, 'ar'),
      imageUrl: getCarImage(id),
    });
  }, [carCatalog]);

  const carActive = location.pathname.startsWith('/cars/');

  useEffect(() => {
    setOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!open || isMobile) return undefined;
    const handleClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    const handleKey = (e) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleKey);
    };
  }, [open, isMobile]);

  const closeAndNavigate = () => {
    setOpen(false);
    onNavigate?.();
    // Instant top — avoids landing on leftover home/footer scroll before route paint
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  };

  if (isMobile) {
    return (
      <div className="header-fleet-dd header-fleet-dd--mobile">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className={`header-fleet-dd__mobile-trigger ${open || carActive ? 'header-fleet-dd__mobile-trigger--open' : ''}`}
          aria-expanded={open}
        >
          <span className="header-fleet-dd__mobile-label">
            {Icon ? <Icon className="nav-link-3d__icon" aria-hidden strokeWidth={2.25} /> : null}
            <span>{label}</span>
          </span>
          <ChevronDown className={`w-4 h-4 transition-transform ${open ? 'rotate-180' : ''}`} />
        </button>
        {open && (
          <div className="header-fleet-dd__mobile-list">
            <AppNavLink
              to="/#vehicles"
              onClick={closeAndNavigate}
              className="header-fleet-dd__mobile-item"
            >
              {t('nav.allCategories')}
            </AppNavLink>
            {cars.map((car) => {
              const name =
                lang === 'ar'
                  ? car.nameAr || getCarDisplayName(car.id, 'ar')
                  : car.nameEn || getCarDisplayName(car.id, 'en');
              const active = location.pathname === `/cars/${car.id}`;
              return (
                <Link
                  key={car.id}
                  to={`/cars/${car.id}`}
                  onClick={closeAndNavigate}
                  className={`header-fleet-dd__mobile-item ${active ? 'header-fleet-dd__mobile-item--active' : ''}`}
                >
                  <img
                    src={car.imageUrl || getCarImage(car.id)}
                    alt=""
                    className="header-fleet-dd__thumb"
                  />
                  <span>{name}</span>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  return (
    <div ref={ref} className="header-nav-more header-fleet-dd">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`nav-link-3d nav-link-3d--desktop header-nav-more__trigger header-fleet-dd__trigger ${
          open || carActive ? 'header-nav-more__trigger--open header-fleet-dd__trigger--open' : ''
        }`}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={label}
      >
        <span className="nav-link-3d__inner header-fleet-dd__trigger-inner">
          {Icon ? <Icon className="nav-link-3d__icon" aria-hidden strokeWidth={2.25} /> : null}
          <span className="nav-link-3d__text">{label}</span>
          <ChevronDown
            className={`header-fleet-dd__chevron ${open ? 'header-fleet-dd__chevron--open' : ''}`}
            strokeWidth={2.5}
            aria-hidden
          />
        </span>
      </button>

      {open && (
        <div className="header-nav-more__panel header-fleet-dd__panel" role="menu">
          <AppNavLink
            to="/#vehicles"
            onClick={closeAndNavigate}
            className="header-nav-more__item header-fleet-dd__item"
            role="menuitem"
          >
            {t('nav.allCategories')}
          </AppNavLink>
          <div className="header-fleet-dd__divider" aria-hidden />
          {cars.map((car) => {
            const name =
              lang === 'ar'
                ? car.nameAr || getCarDisplayName(car.id, 'ar')
                : car.nameEn || getCarDisplayName(car.id, 'en');
            const active = location.pathname === `/cars/${car.id}`;
            return (
              <Link
                key={car.id}
                to={`/cars/${car.id}`}
                onClick={closeAndNavigate}
                role="menuitem"
                className={`header-nav-more__item header-fleet-dd__item ${
                  active ? 'header-fleet-dd__item--active' : ''
                }`}
              >
                <img
                  src={car.imageUrl || getCarImage(car.id)}
                  alt=""
                  className="header-fleet-dd__thumb"
                />
                <span className="truncate">{name}</span>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
