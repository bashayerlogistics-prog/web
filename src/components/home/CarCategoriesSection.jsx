import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowUpRight, Users } from 'lucide-react';
import {
  BOOKING_CAR_TYPES,
  getCarDisplayName,
  getCarImage,
  getCategoryCircleFocus,
} from '../../data/staticData';
import { useSiteContent } from '../../context/SiteContentContext';
import { optimizedImageUrl } from '../../utils/mediaPerf';
import { APP_CACHE_BUILD } from '../../utils/siteContentRefresh';
import VehicleImage from '../ui/VehicleImage';

/** Circle max ~11.5rem — no need for 640w downloads. */
const CARD_IMAGE_WIDTH = 360;

function CategoryCard({ car, lang, t, priority = false }) {
  const name = lang === 'ar'
    ? car.nameAr || getCarDisplayName(car.id, 'ar')
    : car.nameEn || getCarDisplayName(car.id, 'en');
  // Live SuperAdmin CMS only — never flash bundled /images/categories/* on cold start.
  const image = car.imageUrl || getCarImage(car.id);
  const focus = getCategoryCircleFocus(car.id, image);
  const bust = String(car.updatedAt?.seconds || car.updatedAt || APP_CACHE_BUILD);
  const photoUrl = optimizedImageUrl(image, CARD_IMAGE_WIDTH, 68, bust);

  return (
    <Link
      to={`/cars/${car.id}`}
      className="car-category-card group"
      style={{
        '--car-focus-x': String(focus.x),
        '--car-focus-y': String(focus.y),
        '--car-zoom': String(focus.zoom),
        '--car-photo': `url("${photoUrl}")`,
      }}
    >
      <div className="car-category-card__visual">
        <VehicleImage
          src={image}
          alt={name}
          className="car-category-card__image"
          imgClassName="car-category-card__photo"
          width={CARD_IMAGE_WIDTH}
          priority={priority}
          cacheKey={bust}
        />
        <span className="car-category-card__shade" aria-hidden="true" />
        <span className="car-category-card__passengers">
          <Users className="w-3 h-3 shrink-0" />
          {car.passengers}
        </span>
        <span className="car-category-card__hover">
          {t('carCategories.viewAll')}
          <ArrowUpRight className="w-4 h-4 shrink-0 rtl:rotate-[-90deg]" />
        </span>
      </div>
      <h3 className="car-category-card__title">{name}</h3>
      <span className="car-category-card__hint">{t('carCategories.cardHint')}</span>
    </Link>
  );
}

export default function CarCategoriesSection() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language?.startsWith('ar') ? 'ar' : 'en';
  const { carCatalog, fleetHydrated } = useSiteContent();

  // Live Firestore catalog only — never paint getDefaultCarCatalog (old WebP flash).
  const cars = useMemo(() => {
    if (!fleetHydrated) return [];
    const live = (Array.isArray(carCatalog) ? carCatalog : []).filter(
      (c) => c.active !== false,
    );
    if (!live.length) return [];
    const byId = new Map(live.map((c) => [c.id, c]));
    return BOOKING_CAR_TYPES.map((id) => byId.get(id)).filter(Boolean);
  }, [carCatalog, fleetHydrated]);

  if (!fleetHydrated) {
    return (
      <section id="vehicles" className="section-padding" aria-busy="true">
        <div className="section-container">
          <div className="car-category-cards">
            {BOOKING_CAR_TYPES.map((id) => (
              <div
                key={id}
                className="rounded-full aspect-square max-w-[11.5rem] mx-auto w-full bg-gray-100/80 animate-pulse"
              />
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (!cars.length) return null;

  return (
    <section id="vehicles" className="section-padding overflow-x-clip relative">
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-10 end-0 w-72 h-72 bg-brand/5 rounded-full blur-[120px]" />
        <div className="absolute bottom-10 start-0 w-64 h-64 bg-gold/8 rounded-full blur-[100px]" />
      </div>

      <div className="section-container relative z-10">
        <div className="section-header">
          <span className="text-xs font-bold text-brand tracking-widest uppercase bg-brand/5 border border-brand/10 px-3 py-1 rounded-full">
            {t('carCategories.badge')}
          </span>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-brand mt-2 section-heading">
            {t('carCategories.title')}
          </h2>
          <p className="text-gray-500 text-xs sm:text-sm max-w-xl mt-1">
            {t('carCategories.subtitle')}
          </p>
        </div>

        <div className="car-category-cards">
          {cars.map((car, index) => (
            <CategoryCard
              key={`${car.id}-${car.updatedAt?.seconds || car.updatedAt || car.imageUrl || ''}`}
              car={car}
              lang={lang}
              t={t}
              priority={index < 3}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
