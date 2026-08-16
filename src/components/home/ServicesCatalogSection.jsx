import { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  MessageCircle,
  Sparkles,
  Plane,
  Route,
  Clock,
  Compass,
  LayoutGrid,
  Headphones,
  ArrowUpRight,
  TrainFront,
  MapPin,
} from 'lucide-react';
import { CONTACT, ROUTE_CARDS, SERVICE_IMAGES, ROUTE_IMAGE_FALLBACK } from '../../data/staticData';
import { useSiteContent } from '../../context/SiteContentContext';
import PremiumSwiper from '../ui/PremiumSwiper';

const CATEGORY_META = {
  airport: {
    icon: Plane,
    gradient: 'catalog-card--airport',
    chip: 'catalog-card__chip--airport',
  },
  train: {
    icon: TrainFront,
    gradient: 'catalog-card--airport',
    chip: 'catalog-card__chip--airport',
  },
  intercity: {
    icon: Route,
    gradient: 'catalog-card--cities',
    chip: 'catalog-card__chip--cities',
  },
  withinCity: {
    icon: MapPin,
    gradient: 'catalog-card--hourly',
    chip: 'catalog-card__chip--hourly',
  },
  hourly: {
    icon: Clock,
    gradient: 'catalog-card--hourly',
    chip: 'catalog-card__chip--hourly',
  },
  tours: {
    icon: Compass,
    gradient: 'catalog-card--tours',
    chip: 'catalog-card__chip--tours',
  },
};

const FILTER_ICONS = {
  all: LayoutGrid,
  airport: Plane,
  train: TrainFront,
  intercity: Route,
  withinCity: MapPin,
  hourly: Clock,
  tours: Compass,
};

const categoryLabel = {
  airport: { ar: 'مطارات', en: 'Airports' },
  train: { ar: 'قطار الحرمين', en: 'Train' },
  intercity: { ar: 'بين المدن', en: 'Cities' },
  withinCity: { ar: 'داخل المدينة', en: 'Within City' },
  hourly: { ar: 'بالساعة', en: 'Hourly' },
  tours: { ar: 'مزارات', en: 'Ziyarat' },
};

const CATEGORY_FALLBACK_IMAGES = {
  airport: SERVICE_IMAGES.jeddahMakkah,
  train: SERVICE_IMAGES.trainMakkah,
  intercity: SERVICE_IMAGES.makkahMadinah,
  withinCity: SERVICE_IMAGES.taifMakkah,
  hourly: SERVICE_IMAGES.hourly,
  tours: SERVICE_IMAGES.taifMadinah,
};

const routeImageMap = Object.fromEntries(
  ROUTE_CARDS.map((card) => [card.id, { image: card.image, fallback: card.imageFallback }]),
);

function resolveCatalogImage(item) {
  // Force distinct art for within-city vs hourly (CMS often reuses one photo).
  if (item?.category === 'withinCity' || item?.category === 'hourly') {
    const categoryImage = CATEGORY_FALLBACK_IMAGES[item.category];
    if (categoryImage) {
      return { image: categoryImage, fallback: item.imageFallback || ROUTE_IMAGE_FALLBACK };
    }
  }
  if (item?.image) {
    return { image: item.image, fallback: item.imageFallback || ROUTE_IMAGE_FALLBACK };
  }
  if (routeImageMap[item?.id]) return routeImageMap[item.id];
  const categoryImage = CATEGORY_FALLBACK_IMAGES[item?.category];
  if (categoryImage) {
    return { image: categoryImage, fallback: ROUTE_IMAGE_FALLBACK };
  }
  return { image: ROUTE_IMAGE_FALLBACK, fallback: ROUTE_IMAGE_FALLBACK };
}

function CatalogCard({ item, lang, t, brokenImages, onImageError }) {
  const meta = CATEGORY_META[item.category] || CATEGORY_META.intercity;
  const CategoryIcon = meta.icon;
  const routeMedia = resolveCatalogImage(item);
  const imageBroken = brokenImages.has(item.id);
  const imageSrc = imageBroken ? routeMedia.fallback : routeMedia.image;
  const showFallbackIcon = imageBroken && (!routeMedia.fallback || routeMedia.fallback === ROUTE_IMAGE_FALLBACK);

  return (
    <article className={`premium-card catalog-card gpu-smooth h-full group ${meta.gradient}`}>
      <div className="premium-card__glow" aria-hidden="true" />
      <div className="premium-card__shine" aria-hidden="true" />
      <div className="catalog-card__ring" aria-hidden="true" />

      <div className="catalog-card__media">
        {!showFallbackIcon ? (
          <img
            src={imageSrc}
            alt={item.title[lang]}
            loading="lazy"
            decoding="async"
            width={900}
            height={506}
            onError={() => onImageError(item.id)}
          />
        ) : (
          <div className="catalog-card__media-fallback" aria-hidden="true">
            <CategoryIcon className="catalog-card__media-icon" />
          </div>
        )}
        <div className="catalog-card__media-overlay" aria-hidden="true" />
        <div className="catalog-card__media-shine" aria-hidden="true" />

        <span className={`catalog-card__chip ${meta.chip}`}>
          <CategoryIcon className="w-3 h-3 shrink-0" />
          {categoryLabel[item.category]?.[lang] || item.category}
        </span>

        {item.priceFrom != null && (
          <div className="catalog-card__price-float">
            <span className="catalog-card__price-label">{t('catalog.priceFrom')}</span>
            <span className="catalog-card__price-value">
              {item.priceFrom}
              <span className="catalog-card__price-currency">{t('booking.sar')}</span>
            </span>
          </div>
        )}
      </div>

      <div className="catalog-card__body">
        <h4 className="catalog-card__title">{item.title[lang]}</h4>
        <p className="catalog-card__desc">{item.description[lang]}</p>

        <div className="catalog-card__footer">
          {item.priceFrom == null && (
            <p className="catalog-card__inquiry">
              <Sparkles className="w-3 h-3 text-gold shrink-0" />
              {t('catalog.whatsappInquiry')}
            </p>
          )}

          <a
            href={CONTACT.whatsapp}
            target="_blank"
            rel="noreferrer"
            className="catalog-card__whatsapp"
          >
            <MessageCircle className="w-4 h-4 fill-white shrink-0" />
            <span>{t('catalog.bookWhatsApp')}</span>
            <ArrowUpRight className="catalog-card__whatsapp-arrow w-3.5 h-3.5 shrink-0" />
          </a>
        </div>
      </div>
    </article>
  );
}

export default function ServicesCatalogSection() {
  const { t, i18n } = useTranslation();
  const { serviceCatalog, serviceCatalogFilters } = useSiteContent();
  const lang = i18n.language;
  const [filter, setFilter] = useState('all');
  const [brokenImages, setBrokenImages] = useState(() => new Set());

  const handleImageError = useCallback((itemId) => {
    setBrokenImages((prev) => {
      if (prev.has(itemId)) return prev;
      const next = new Set(prev);
      next.add(itemId);
      return next;
    });
  }, []);

  const items = useMemo(
    () => (filter === 'all' ? serviceCatalog : serviceCatalog.filter((s) => s.category === filter)),
    [serviceCatalog, filter],
  );

  const renderCard = (item) => (
    <CatalogCard
      item={item}
      lang={lang}
      t={t}
      brokenImages={brokenImages}
      onImageError={handleImageError}
    />
  );

  return (
    <section id="services-catalog" className="section-padding catalog-section relative">
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-24 start-0 w-96 h-96 bg-brand/5 rounded-full blur-[140px]" />
        <div className="absolute bottom-0 end-0 w-80 h-80 bg-gold/8 rounded-full blur-[120px]" />
        <div className="absolute top-1/3 end-1/4 w-64 h-64 bg-emerald-500/4 rounded-full blur-[100px]" />
      </div>

      <div className="section-container relative z-10">
        <div className="section-header catalog-section__header" data-aos="fade-up">
          <span className="catalog-section__badge">{t('catalog.badge')}</span>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-brand-dark mt-3 section-heading">
            {t('catalog.title1')}{' '}
            <span className="catalog-section__title-highlight">{t('catalog.titleHighlight')}</span>
          </h2>
          <p className="text-gray-500 text-xs sm:text-sm max-w-2xl mt-2 leading-relaxed">
            {t('catalog.subtitle')}
          </p>

          <div className="catalog-section__stats" aria-hidden="true">
            <span className="catalog-section__stat">
              <LayoutGrid className="w-3.5 h-3.5 text-gold" />
              {serviceCatalog.length} {lang === 'ar' ? 'خدمات' : 'Services'}
            </span>
            <span className="catalog-section__stat">
              <Headphones className="w-3.5 h-3.5 text-brand" />
              {lang === 'ar' ? 'دعم 24/7' : '24/7 Support'}
            </span>
            <span className="catalog-section__stat">
              <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
              {lang === 'ar' ? 'حجز فوري واتساب' : 'Instant WhatsApp'}
            </span>
          </div>
        </div>

        <div className="filter-chips catalog-section__filters mb-6 sm:mb-8" data-aos="fade-up" data-aos-delay="50">
          {serviceCatalogFilters.map((f) => {
            const Icon = FILTER_ICONS[f.id] || LayoutGrid;
            const count = f.id === 'all'
              ? serviceCatalog.length
              : serviceCatalog.filter((s) => s.category === f.id).length;

            return (
              <button
                key={f.id}
                type="button"
                onClick={() => setFilter(f.id)}
                className={`filter-chip catalog-filter-chip inline-flex items-center gap-1.5 ${filter === f.id ? 'filter-chip--active' : ''}`}
              >
                <Icon className="w-3.5 h-3.5 shrink-0" />
                <span>{f[lang] || f.ar}</span>
                <span className="catalog-filter-chip__count">{count}</span>
              </button>
            );
          })}
        </div>

        {items.length === 0 ? (
          <div className="catalog-section__empty" data-aos="fade-up" data-aos-delay="80">
            <Compass className="w-10 h-10 text-brand/30 mb-3" />
            <p className="text-gray-500 text-sm font-medium">
              {lang === 'ar' ? 'لا توجد خدمات في هذا التصنيف حالياً' : 'No services in this category yet'}
            </p>
          </div>
        ) : (
          <>
            <div className="block lg:hidden" data-aos="fade-up" data-aos-delay="80">
              <PremiumSwiper
                items={items}
                renderSlide={renderCard}
                paginationClass="catalog-pagination"
                swiperClass="premium-swiper premium-swiper--catalog"
                autoplayDelay={4200}
                swiperKey={filter}
              />
            </div>

            <div
              className="hidden lg:grid grid-cols-2 xl:grid-cols-3 gap-5 sm:gap-6"
              data-aos="fade-up"
              data-aos-delay="80"
            >
              {items.map((item) => (
                <div key={item.id}>{renderCard(item)}</div>
              ))}
            </div>
          </>
        )}
      </div>
    </section>
  );
}
