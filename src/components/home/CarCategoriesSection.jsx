import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowUpRight, Users } from 'lucide-react';
import {
  BOOKING_CAR_TYPES,
  getCarDisplayName,
  getCarImage,
  getCategoryCircleFocus,
  getLiveCarCatalog,
} from '../../data/staticData';
import { useSiteContent } from '../../context/SiteContentContext';
import { optimizedImageUrl } from '../../utils/mediaPerf';
import VehicleImage from '../ui/VehicleImage';

const CARD_IMAGE_WIDTH = 640;

export default function CarCategoriesSection() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language?.startsWith('ar') ? 'ar' : 'en';
  const { carCatalog } = useSiteContent();

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
      passengers: 4,
    });
  }, [carCatalog]);

  return (
    <section id="vehicles" className="section-padding overflow-x-clip relative">
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-10 end-0 w-72 h-72 bg-brand/5 rounded-full blur-[120px]" />
        <div className="absolute bottom-10 start-0 w-64 h-64 bg-gold/8 rounded-full blur-[100px]" />
      </div>

      <div className="section-container relative z-10">
        <div className="section-header" data-aos="fade-up">
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

        <div
          className="car-category-cards"
          data-aos="fade-up"
          data-aos-delay="80"
        >
          {cars.map((car) => {
            const name = lang === 'ar'
              ? car.nameAr || getCarDisplayName(car.id, 'ar')
              : car.nameEn || getCarDisplayName(car.id, 'en');
            const image = getCarImage(car.id);
            const focus = getCategoryCircleFocus(car.id, image);

            return (
              <Link
                key={car.id}
                to={`/cars/${car.id}`}
                className="car-category-card group"
                style={{
                  '--car-focus-x': String(focus.x),
                  '--car-focus-y': String(focus.y),
                  '--car-zoom': String(focus.zoom),
                  '--car-photo': `url("${optimizedImageUrl(image, CARD_IMAGE_WIDTH, 70)}")`,
                }}
              >
                <div className="car-category-card__visual">
                  <VehicleImage
                    src={image}
                    alt={name}
                    className="car-category-card__image"
                    imgClassName="car-category-card__photo"
                    width={CARD_IMAGE_WIDTH}
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
          })}
        </div>
      </div>
    </section>
  );
}
