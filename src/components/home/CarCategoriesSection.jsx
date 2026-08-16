import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowUpRight, Users } from 'lucide-react';
import {
  BOOKING_CAR_TYPES,
  getCarDisplayName,
  getCarImage,
  getLiveCarCatalog,
} from '../../data/staticData';
import { useSiteContent } from '../../context/SiteContentContext';
import VehicleImage from '../ui/VehicleImage';

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
          className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4 md:gap-5"
          data-aos="fade-up"
          data-aos-delay="80"
        >
          {cars.map((car) => {
            const name = lang === 'ar'
              ? car.nameAr || getCarDisplayName(car.id, 'ar')
              : car.nameEn || getCarDisplayName(car.id, 'en');
            const image = car.imageUrl || getCarImage(car.id);

            return (
              <Link
                key={car.id}
                to={`/cars/${car.id}`}
                className="premium-card fleet-card fleet-card--dark gpu-smooth group flex flex-col h-full"
              >
                <div className="fleet-card__ring" aria-hidden="true" />
                <div className="fleet-card__media">
                  <VehicleImage
                    src={image}
                    alt={name}
                    className="fleet-card__image w-full"
                    hoverZoom
                  />
                  <div className="fleet-card__media-gradient" aria-hidden="true" />
                  <span className="fleet-card__passengers">
                    <Users className="w-2.5 h-2.5 text-gold shrink-0" />
                    {car.passengers}
                  </span>
                </div>
                <div className="fleet-card__body flex-1 flex flex-col">
                  <span className="fleet-card__category">
                    {t('carCategories.categoryLabel')}
                  </span>
                  <h3 className="fleet-card__title">{name}</h3>
                  <p className="fleet-card__route line-clamp-2">
                    {t('carCategories.cardHint')}
                  </p>
                  <span className="mt-auto inline-flex items-center gap-1 text-xs font-bold text-white/85 group-hover:text-gold transition-colors pt-2">
                    {t('carCategories.viewAll')}
                    <ArrowUpRight className="w-3.5 h-3.5 shrink-0" />
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
