import { useMemo, useState, useCallback, useEffect, useRef, startTransition } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  ArrowLeft,
  Check,
  Info,
  LayoutGrid,
  MessageCircle,
  ShoppingCart,
  Sparkles,
  Users,
} from 'lucide-react';
import {
  getCarImage,
  getShortVehicleName,
  getVehicleSlug,
} from '../../data/staticData';
import { useCart } from '../../context/CartContext';
import AddToCartModal from '../ui/AddToCartModal';
import PremiumSwiper from '../ui/PremiumSwiper';
import VehicleImage from '../ui/VehicleImage';
import { buildWhatsAppUrl, buildVehicleWhatsAppMessage } from '../../utils/vehicleHelpers';

const BATCH_SIZE = 8;

function PackageCard({ item, carId, lang, t, priority = false }) {
  const { addItem } = useCart();
  const [modalItem, setModalItem] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [cartAdded, setCartAdded] = useState(false);

  const vehicle = item.vehicle;
  const shortName = getShortVehicleName(vehicle.id, lang);
  const slug = getVehicleSlug(vehicle.id, item.routeId);
  const routeLabel = item.routeTitle?.[lang] || item.routeTitle?.ar || '';
  const hoursLabel = item.durationHours
    ? ` · ${item.durationHours} ${t('booking.hour', { defaultValue: 'h' })}`
    : '';

  const whatsappMsg = buildVehicleWhatsAppMessage({
    lang,
    sarLabel: t('booking.sar'),
    vehicleName: shortName,
    routeTitle: routeLabel,
    price: vehicle.price,
  });

  const buildPayload = () => ({
    vehicleKey: vehicle.id,
    vehicleSlug: slug,
    routeId: item.routeId,
    vehicleName: vehicle.name,
    shortName: {
      ar: getShortVehicleName(vehicle.id, 'ar'),
      en: getShortVehicleName(vehicle.id, 'en'),
    },
    routeTitle: item.routeTitle,
    price: vehicle.price,
    image: vehicle.image,
    passengers: String(vehicle.passengers),
    durationHours: item.durationHours || undefined,
  });

  const handleAddToCart = () => {
    const payload = buildPayload();
    addItem(payload);
    setModalItem(payload);
    setCartAdded(true);
    setShowModal(true);
    window.setTimeout(() => setCartAdded(false), 700);
  };

  const discount =
    vehicle.originalPrice && vehicle.price
      ? Math.round((1 - Number(vehicle.price) / Number(vehicle.originalPrice)) * 100)
      : null;

  return (
    <>
      <AddToCartModal open={showModal} item={modalItem} onClose={() => setShowModal(false)} />
      <article className="premium-card fleet-card category-pkg-card gpu-smooth h-full group">
        <div className="fleet-card__ring" aria-hidden="true" />
        <div className="fleet-card__media">
          <VehicleImage
            src={vehicle.image || getCarImage(carId)}
            alt={shortName}
            className="fleet-card__image w-full"
            hoverZoom
            width={480}
            priority={priority}
          />
          <div className="fleet-card__media-gradient" aria-hidden="true" />
          <span className="fleet-card__passengers">
            <Users className="w-2.5 h-2.5 text-gold shrink-0" />
            {vehicle.passengers}
          </span>
          {discount > 0 && <span className="fleet-card__discount">-{discount}%</span>}
          {vehicle.price != null && !vehicle.hidePrice && (
            <div className="fleet-card__price-chip">
              <span className="fleet-card__price-current">
                {vehicle.price}
                <span className="fleet-card__price-currency">{t('booking.sar')}</span>
              </span>
            </div>
          )}
        </div>
        <div className="fleet-card__body">
          <h4 className="fleet-card__title line-clamp-2">
            {routeLabel}
            {hoursLabel}
          </h4>
          <p className="fleet-card__route">{shortName}</p>
          <div className="fleet-card__footer">
            <div className="fleet-card__actions">
              <Link
                to={`/vehicles/${slug}`}
                preventScrollReset
                className="fleet-card__btn fleet-card__btn--outline"
              >
                <Info className="w-3 h-3 shrink-0" />
                {t('fleet.details')}
              </Link>
              <button
                type="button"
                onClick={handleAddToCart}
                className={`fleet-card__btn fleet-card__btn--cart ${cartAdded ? 'fleet-card__btn--cart-added' : ''}`}
              >
                <span className="fleet-card__btn-icon">
                  {cartAdded ? <Check className="w-3 h-3" /> : <ShoppingCart className="w-3 h-3" />}
                </span>
                {t('fleet.addToCart')}
              </button>
            </div>
            <a
              href={buildWhatsAppUrl(whatsappMsg)}
              target="_blank"
              rel="noreferrer"
              className="fleet-card__whatsapp"
            >
              <MessageCircle className="w-3.5 h-3.5 fill-white shrink-0" />
              {t('fleet.bookWhatsApp')}
            </a>
          </div>
        </div>
      </article>
    </>
  );
}

/**
 * Modern packages block after CategoryHero — sticky filters, mobile swiper, fast grid.
 */
export default function CategoryPackagesSection({
  carId,
  displayName,
  sections,
  featureChips,
  totalPackages,
}) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language?.startsWith('ar') ? 'ar' : 'en';
  const [filter, setFilter] = useState('all');
  const [visibleCount, setVisibleCount] = useState(BATCH_SIZE);
  const sentinelRef = useRef(null);

  const onFilter = useCallback((id) => {
    startTransition(() => {
      setFilter(id);
      setVisibleCount(BATCH_SIZE);
    });
  }, []);

  const visibleSections = useMemo(() => {
    if (filter === 'all') return sections;
    return sections.filter((s) => s.id === filter);
  }, [sections, filter]);

  const flatItems = useMemo(
    () =>
      visibleSections.flatMap((section) =>
        (section.items || []).map((item) => {
          const id = `${section.id}-${item.routeId}-${item.vehicle.id}-${item.durationHours || 0}`;
          return { ...item, id, _sectionId: section.id };
        }),
      ),
    [visibleSections],
  );

  useEffect(() => {
    setVisibleCount(BATCH_SIZE);
  }, [carId, filter, sections]);

  const desktopItems = useMemo(
    () => flatItems.slice(0, visibleCount),
    [flatItems, visibleCount],
  );
  const hasMoreDesktop = visibleCount < flatItems.length;

  useEffect(() => {
    if (!hasMoreDesktop) return undefined;
    const node = sentinelRef.current;
    if (!node) return undefined;

    const io = new IntersectionObserver(
      (entries) => {
        if (!entries.some((e) => e.isIntersecting)) return;
        startTransition(() => {
          setVisibleCount((n) => Math.min(n + BATCH_SIZE, flatItems.length));
        });
      },
      { rootMargin: '320px 0px' },
    );
    io.observe(node);
    return () => io.disconnect();
  }, [hasMoreDesktop, flatItems.length, visibleCount]);

  const desktopBySection = useMemo(() => {
    const map = new Map();
    desktopItems.forEach((item) => {
      const list = map.get(item._sectionId) || [];
      list.push(item);
      map.set(item._sectionId, list);
    });
    return visibleSections
      .map((section) => ({
        section,
        items: map.get(section.id) || [],
      }))
      .filter((row) => row.items.length > 0);
  }, [desktopItems, visibleSections]);

  const renderCard = (item, index = 0) => (
    <PackageCard item={item} carId={carId} lang={lang} t={t} priority={index < 2} />
  );

  return (
    <section id="category-packages" className="category-packages" aria-labelledby="category-packages-title">
      <div className="category-packages__glow" aria-hidden />
      <div className="category-packages__glow category-packages__glow--gold" aria-hidden />

      <div className="category-packages__inner">
        <header className="category-packages__header">
          <div className="category-packages__header-top">
            <Link to="/#vehicles" className="category-packages__back">
              <ArrowLeft className="w-3.5 h-3.5" />
              {t('carCategories.backToCategories')}
            </Link>

            <div className="category-packages__stats" aria-hidden>
              <span className="category-packages__stat">
                <LayoutGrid className="w-3.5 h-3.5 text-gold" />
                {t('carCategories.packageCount', { count: totalPackages })}
              </span>
              <span className="category-packages__stat">
                <Sparkles className="w-3.5 h-3.5 text-brand" />
                {displayName}
              </span>
            </div>
          </div>

          <h2 id="category-packages-title" className="category-packages__title">
            {t('carCategories.packagesTitle', { name: displayName })}
          </h2>
          <p className="category-packages__lead">
            {t('carCategories.packagesLead')}
          </p>

          {featureChips.length > 0 && (
            <ul className="category-packages__chips">
              {featureChips.slice(0, 6).map((f) => (
                <li key={f.en || f.ar} className="category-packages__chip">
                  {f[lang] || f.en || f.ar}
                </li>
              ))}
            </ul>
          )}
        </header>

        {sections.length > 0 && (
          <div className="filter-chips category-packages__filters" role="tablist" aria-label={t('carCategories.filterLabel')}>
            <button
              type="button"
              role="tab"
              aria-selected={filter === 'all'}
              onClick={() => onFilter('all')}
              className={`filter-chip category-pkg-filter ${filter === 'all' ? 'filter-chip--active' : ''}`}
            >
              <LayoutGrid className="w-3.5 h-3.5 shrink-0" />
              <span>{t('carCategories.filterAll')}</span>
              <span className="category-pkg-filter__count">{totalPackages}</span>
            </button>
            {sections.map((section) => (
              <button
                key={section.id}
                type="button"
                role="tab"
                aria-selected={filter === section.id}
                onClick={() => onFilter(section.id)}
                className={`filter-chip category-pkg-filter ${filter === section.id ? 'filter-chip--active' : ''}`}
              >
                <span>{section.title[lang] || section.title.ar}</span>
                <span className="category-pkg-filter__count">{section.items?.length || 0}</span>
              </button>
            ))}
          </div>
        )}

        {!sections.length && (
          <p className="category-packages__empty">{t('carCategories.noPackages')}</p>
        )}

        {sections.length > 0 && flatItems.length === 0 && (
          <div className="category-packages__empty-box">
            <Sparkles className="w-9 h-9 text-brand/25 mb-2" />
            <p>{t('carCategories.noPackages')}</p>
          </div>
        )}

        {flatItems.length > 0 && (
          <>
            {/* Mobile / tablet: centered swiper */}
            <div className="block lg:hidden category-packages__swiper">
              <PremiumSwiper
                items={flatItems}
                renderSlide={(item, index) => renderCard(item, index)}
                paginationClass="category-pkg-pagination"
                swiperClass="premium-swiper premium-swiper--fleet"
                autoplayDelay={3800}
                swiperKey={`${carId}-${filter}`}
                effect="slide"
                speed={420}
              />
            </div>

            {/* Desktop: progressive sectioned grid */}
            <div className="hidden lg:block space-y-10">
              {desktopBySection.map(({ section, items }) => (
                <div key={section.id} className="category-packages__group">
                  <div className="category-packages__group-head">
                    <h3 className="category-packages__group-title">
                      <span className="category-packages__group-bar" aria-hidden />
                      {section.title[lang] || section.title.ar}
                    </h3>
                    <p className="category-packages__group-meta">
                      {t('carCategories.sectionCount', { count: section.items.length })}
                    </p>
                  </div>
                  <div className="category-packages__grid">
                    {items.map((item, index) => (
                      <PackageCard
                        key={item.id}
                        item={item}
                        carId={carId}
                        lang={lang}
                        t={t}
                        priority={index < 2}
                      />
                    ))}
                  </div>
                </div>
              ))}

              {hasMoreDesktop && (
                <div ref={sentinelRef} className="category-packages__sentinel" aria-hidden>
                  <span className="category-packages__loading">…</span>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </section>
  );
}
