import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { MapPin, ArrowUpRight, Plane, Route, TrainFront, Clock } from 'lucide-react';
import { useSiteContent } from '../../context/SiteContentContext';
import { SERVICE_IMAGES } from '../../data/staticData';
import AppNavLink from '../ui/AppNavLink';
import PremiumSwiper from '../ui/PremiumSwiper';
import { optimizedImageUrl } from '../../utils/mediaPerf';

const CATEGORY_IMAGES = {
  airport: SERVICE_IMAGES.jeddahMakkah,
  train: SERVICE_IMAGES.trainMakkah,
  intercity: SERVICE_IMAGES.makkahMadinah,
  withinCity: SERVICE_IMAGES.taifMakkah,
  hourly: SERVICE_IMAGES.hourly,
  tours: SERVICE_IMAGES.taifMadinah,
};

const SERVICE_FILTERS = [
  { id: 'all', ar: 'الكل', en: 'All' },
  { id: 'airport', ar: 'مطارات', en: 'Airports' },
  { id: 'train', ar: 'قطار الحرمين', en: 'Train' },
  { id: 'intercity', ar: 'بين المدن', en: 'Cities' },
  { id: 'withinCity', ar: 'داخل المدينة', en: 'Within City' },
  { id: 'hourly', ar: 'بالساعة', en: 'Hourly' },
  { id: 'tours', ar: 'مزارات', en: 'Ziyarat' },
];

const FILTER_MATCHERS = {
  airport: (s) => s.category === 'airport' || /airport|مطار/i.test(`${s.title.en} ${s.title.ar}`),
  train: (s) => s.category === 'train' || /train|قطار|haramain|حرمين/i.test(`${s.title.en} ${s.title.ar}`),
  intercity: (s) => s.category === 'intercity' || /between cities|التنقل بين المدن/i.test(`${s.title.en} ${s.title.ar}`),
  withinCity: (s) => s.category === 'withinCity' || /within-city|within city|داخل المدينة/i.test(`${s.title.en} ${s.title.ar}`),
  hourly: (s) => s.category === 'hourly' || /hourly rental|استئجار بالساعة|بالساعة مع سائق/i.test(`${s.title.en} ${s.title.ar}`),
  tours: (s) => s.category === 'tours' || /ziyarat|مزارات|religious|دينية/i.test(`${s.title.en} ${s.title.ar}`),
};

const FILTER_ICONS = {
  all: MapPin,
  airport: Plane,
  train: TrainFront,
  intercity: Route,
  withinCity: MapPin,
  hourly: Clock,
  tours: MapPin,
};

const SERVICE_ICON_MAP = {
  plane: Plane,
  route: Route,
  train: TrainFront,
  clock: Clock,
  'map-pin': MapPin,
};

function resolveServiceImage(service) {
  const categoryImage = CATEGORY_IMAGES[service?.category];
  // Always use distinct category art for within-city vs hourly (CMS often duplicates).
  if (service?.category === 'withinCity' || service?.category === 'hourly') {
    return categoryImage || service?.image || '';
  }
  return service?.image || categoryImage || '';
}

function ServiceCard({ service, lang, t }) {
  const ServiceIcon = SERVICE_ICON_MAP[service.icon] || MapPin;
  const imageSrc = resolveServiceImage(service);

  return (
    <div className="premium-card service-card-3d gpu-smooth h-full group">
      <div className="premium-card__glow" aria-hidden="true" />
      <div className="premium-card__shine" aria-hidden="true" />

      <div className="service-card-3d__image">
        {imageSrc ? (
          <>
            <img
              src={optimizedImageUrl(imageSrc, 640, 72)}
              alt={service.title[lang]}
              loading="lazy"
              decoding="async"
              sizes="(max-width: 767px) 90vw, 420px"
              width={640}
              height={360}
            />
            <div className="premium-card__image-overlay" />
          </>
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-brand to-brand-light flex items-center justify-center">
            <ServiceIcon className="w-10 h-10 text-white/50" />
          </div>
        )}
        <span className="premium-card__badge">
          <ServiceIcon className="w-3 h-3 text-gold" />
          {t('services.badge')}
        </span>
      </div>

      <div className="premium-card__content p-4 sm:p-5 flex flex-col flex-grow gap-3">
        <h3 className="text-sm sm:text-base font-black text-brand-dark leading-snug line-clamp-2">
          {service.title[lang]}
        </h3>
        <p className="text-gray-500 text-xs sm:text-sm leading-relaxed line-clamp-3 flex-grow">
          {service.description[lang]}
        </p>

        <div className="border-t border-gray-100/80 pt-4 mt-auto">
          <AppNavLink
            to="#pricing-calculator"
            className="premium-card__cta text-xs sm:text-sm font-bold text-brand hover:text-gold transition-colors inline-flex items-center gap-1.5 group/link"
          >
            <span>{t('services.bookNow')}</span>
            <ArrowUpRight className="w-4 h-4 transition-transform group-hover/link:translate-x-0.5 group-hover/link:-translate-y-0.5 rtl:rotate-180" />
          </AppNavLink>
        </div>
      </div>
    </div>
  );
}

export default function ServicesSection() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const { services } = useSiteContent();
  const [filter, setFilter] = useState('all');

  const filteredServices = useMemo(() => {
    if (filter === 'all') return services;
    const matcher = FILTER_MATCHERS[filter];
    return matcher ? services.filter(matcher) : services;
  }, [services, filter]);

  return (
    <section id="services" className="section-padding relative">
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-20 start-0 w-72 h-72 bg-gold/6 rounded-full blur-[100px]" />
        <div className="absolute bottom-10 end-0 w-64 h-64 bg-brand/5 rounded-full blur-[90px]" />
      </div>

      <div className="section-container relative z-10">
        <div className="text-center max-w-3xl mx-auto mb-8 md:mb-10" data-aos="fade-up">
          <span className="text-xs font-bold text-brand tracking-widest uppercase bg-brand/5 border border-brand/10 px-3 py-1 rounded-full">
            {t('services.badge')}
          </span>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-brand-dark mt-4 mb-3 leading-tight section-heading">
            {t('services.title1')}{' '}
            <span className="text-gold">{t('services.titleHighlight')}</span>
          </h2>
          <p className="text-xs sm:text-sm text-gray-500 leading-relaxed max-w-2xl mx-auto">{t('services.subtitle')}</p>
        </div>

        <div className="filter-chips mb-6 sm:mb-8" data-aos="fade-up" data-aos-delay="50">
          {SERVICE_FILTERS.map((f) => {
            const Icon = FILTER_ICONS[f.id] || MapPin;
            const count = f.id === 'all'
              ? services.length
              : services.filter((s) => FILTER_MATCHERS[f.id]?.(s)).length;
            return (
              <button
                key={f.id}
                type="button"
                onClick={() => setFilter(f.id)}
                className={`filter-chip inline-flex items-center gap-1.5 ${filter === f.id ? 'filter-chip--active' : ''}`}
              >
                <Icon className="w-3.5 h-3.5" />
                {f[lang] || f.ar}
                <span className="text-[10px] opacity-70">({count})</span>
              </button>
            );
          })}
        </div>

        {filteredServices.length === 0 ? (
          <p className="text-center text-gray-400 text-sm py-8" data-aos="fade-up">
            {lang === 'ar' ? 'لا توجد خدمات في هذا التصنيف' : 'No services in this category'}
          </p>
        ) : (
          <div data-aos="fade-up" data-aos-delay="80">
            <div className="block lg:hidden">
              <PremiumSwiper
                items={filteredServices}
                renderSlide={(service) => <ServiceCard service={service} lang={lang} t={t} />}
                paginationClass="services-pagination"
                swiperClass="premium-swiper premium-swiper--wide"
                autoplayDelay={4500}
                swiperKey={filter}
              />
            </div>

            <div className="hidden lg:grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5 sm:gap-6">
              {filteredServices.map((service) => (
                <ServiceCard key={service.id} service={service} lang={lang} t={t} />
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
