import { useState, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronLeft, ChevronRight, MapPin, ArrowUpRight } from 'lucide-react';
import { useSiteContent } from '../../context/SiteContentContext';
import AppNavLink from '../ui/AppNavLink';
import PremiumSwiper from '../ui/PremiumSwiper';
import { optimizedImageUrl } from '../../utils/mediaPerf';

function RouteCard({ route, lang, t, brokenImages, onImageError }) {
  const isPopular = route.popular;
  const popularWords = t('routes.mostPopular').split(' ');

  return (
    <div className="premium-card dest-card dest-card--overlay dest-card--modern gpu-smooth h-full min-h-[280px] sm:min-h-[340px] group">
      <div className="premium-card__glow" aria-hidden="true" />
      <div className="premium-card__shine" aria-hidden="true" />
      <div className="dest-card__border-ring" aria-hidden="true" />

      <span
        className={`dest-card__popular-ring${isPopular ? '' : ' dest-card__popular-ring--icon-only'}`}
        aria-label={isPopular ? t('routes.mostPopular') : route.title[lang]}
      >
        <MapPin className="dest-card__popular-ring-icon" />
        {isPopular && (
          <span className="dest-card__popular-ring-text">
            {popularWords.map((word, i) => (
              <span key={i}>{word}</span>
            ))}
          </span>
        )}
      </span>

      <div className="dest-card__media">
        <img
          src={
            brokenImages.has(route.id)
              ? route.imageFallback
              : optimizedImageUrl(route.image, 640, 72)
          }
          alt={route.title[lang]}
          loading="lazy"
          decoding="async"
          sizes="(max-width: 767px) 90vw, 420px"
          width={640}
          height={360}
          onError={() => onImageError(route.id)}
        />
        <div className="dest-card__gradient" />
        <div className="dest-card__vignette" aria-hidden="true" />
      </div>

      <div className="dest-card__body">
        <div className="dest-card__content">
          <h4 className="dest-card__title">
            {route.title[lang]}
          </h4>
          <p className="dest-card__desc">
            {route.description[lang]}
          </p>
          <div className="dest-card__actions">
            <AppNavLink
              to="#pricing-calculator"
              className="dest-card__cta premium-card__cta"
            >
              <span className="dest-card__cta-text">{t('routes.book')}</span>
              <ArrowUpRight className="dest-card__cta-icon" />
            </AppNavLink>
            <AppNavLink
              to="#vehicles"
              className="dest-card__details group/details"
            >
              <span>{t('routes.details')}</span>
              <span className="dest-card__details-line" aria-hidden="true" />
            </AppNavLink>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function RoutesSection() {
  const { t, i18n } = useTranslation();
  const { services, routeCards } = useSiteContent();
  const lang = i18n.language;
  const [brokenImages, setBrokenImages] = useState(() => new Set());

  /** Same 6 SuperAdmin services as Services section (fallback: routeCards). */
  const cards = useMemo(() => {
    if (services?.length) {
      return services.map((s, i) => ({
        id: s.category || String(s.id),
        popular: i < 2,
        title: s.title,
        description: s.description,
        image: s.image || '/images/hero-gradient.svg',
        imageFallback: '/images/hero-gradient.svg',
      }));
    }
    return routeCards;
  }, [services, routeCards]);

  const handleImageError = useCallback((routeId) => {
    setBrokenImages((prev) => {
      if (prev.has(routeId)) return prev;
      const next = new Set(prev);
      next.add(routeId);
      return next;
    });
  }, []);

  const renderCard = (route) => (
    <RouteCard
      route={route}
      lang={lang}
      t={t}
      brokenImages={brokenImages}
      onImageError={handleImageError}
    />
  );

  const swiperCommon = {
    items: cards,
    renderSlide: renderCard,
    autoplayDelay: 4200,
    speed: 900,
    loop: cards.length > 1,
  };

  return (
    <section id="routes" className="section-padding routes-section overflow-x-clip relative">
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-16 end-0 w-80 h-80 bg-brand/6 rounded-full blur-[120px]" />
        <div className="absolute bottom-0 start-0 w-72 h-72 bg-gold/8 rounded-full blur-[100px]" />
        <div className="absolute top-1/2 start-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-brand/3 rounded-full blur-[160px]" />
      </div>

      <div className="section-container relative z-10">
        <div className="section-header routes-section__header" data-aos="fade-up">
          <span className="routes-section__badge">
            {t('routes.badge')}
          </span>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-brand-dark mt-3 section-heading">
            {t('routes.title1')}{' '}
            <span className="routes-section__title-highlight">{t('routes.titleHighlight')}</span>
          </h2>
          <p className="text-gray-500 text-xs sm:text-sm max-w-xl mt-2 leading-relaxed">{t('routes.subtitle')}</p>
        </div>

        {/* Mobile & tablet: 3D coverflow carousel */}
        <div className="block lg:hidden routes-carousel-wrap" data-aos="fade-up" data-aos-delay="80">
          <PremiumSwiper
            {...swiperCommon}
            paginationClass="routes-pagination"
            swiperClass="premium-swiper premium-swiper--routes"
          />
        </div>

        {/* Desktop: auto slide carousel with gold side navigation */}
        <div className="hidden lg:block routes-carousel-wrap routes-carousel-wrap--desktop" data-aos="fade-up" data-aos-delay="80">
          <button
            type="button"
            className="routes-swiper-nav routes-swiper-nav--prev routes-swiper-prev"
            aria-label="Previous"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            type="button"
            className="routes-swiper-nav routes-swiper-nav--next routes-swiper-next"
            aria-label="Next"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
          <PremiumSwiper
            {...swiperCommon}
            effect="slide"
            centeredSlides={false}
            spaceBetween={24}
            showNavigation
            showPagination={false}
            navigationPrevClass="routes-swiper-prev"
            navigationNextClass="routes-swiper-next"
            swiperClass="premium-swiper premium-swiper--routes premium-swiper--routes-desktop"
          />
        </div>
      </div>
    </section>
  );
}
