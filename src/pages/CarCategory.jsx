import { useEffect, useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  BOOKING_CAR_TYPES,
  getCarDisplayName,
  getCarImage,
  getCategoryHeroImage,
  getVehicleTypeFeatures,
} from '../data/staticData';
import { buildCarCategorySections } from '../data/adminFleetServices';
import { useSiteContent } from '../context/SiteContentContext';
import CategoryHero from '../components/cars/CategoryHero';
import CategoryPackagesSection from '../components/cars/CategoryPackagesSection';

export default function CarCategory() {
  const { carId } = useParams();
  const { t, i18n } = useTranslation();
  const lang = i18n.language?.startsWith('ar') ? 'ar' : 'en';
  const { fleetRoutes, carCatalog } = useSiteContent();

  const key = String(carId || '').toLowerCase().split('-')[0];
  const valid = BOOKING_CAR_TYPES.includes(key);

  // Ensure each category opens on the hero (not leftover scroll from home/footer)
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }, [key]);

  const car = useMemo(() => {
    const fromCatalog = (carCatalog || []).find((c) => c.id === key);
    if (fromCatalog) return fromCatalog;
    return {
      id: key,
      nameEn: getCarDisplayName(key, 'en'),
      nameAr: getCarDisplayName(key, 'ar'),
      imageUrl: getCarImage(key),
      passengers: 4,
    };
  }, [carCatalog, key]);

  const sections = useMemo(
    () => (valid ? buildCarCategorySections(fleetRoutes, key) : []),
    [fleetRoutes, key, valid],
  );

  const featureMeta = getVehicleTypeFeatures(key);
  const featureChips = useMemo(() => {
    if (!featureMeta) return [];
    const chips = [];
    if (featureMeta.storage) chips.push(featureMeta.storage);
    if (Array.isArray(featureMeta.comfort)) chips.push(...featureMeta.comfort);
    return chips;
  }, [featureMeta]);

  const displayName =
    lang === 'ar'
      ? car.nameAr || getCarDisplayName(key, 'ar')
      : car.nameEn || getCarDisplayName(key, 'en');
  const totalPackages = sections.reduce((n, s) => n + (s.items?.length || 0), 0);

  if (!valid) {
    return (
      <div className="min-h-screen pt-24 pb-12 flex flex-col items-center justify-center gap-4 px-4">
        <p className="text-brand font-bold">{t('carCategories.notFound')}</p>
        <Link to="/#vehicles" className="text-gold font-bold hover:underline">
          {t('carCategories.backToCategories')}
        </Link>
      </div>
    );
  }

  const heroSubtitle = [
    `${car.passengers} ${t('fleet.passengers')}`,
    car.vip ? 'VIP' : null,
    t('carCategories.packageCount', { count: totalPackages }),
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <main className="category-page">
      <CategoryHero
        title={displayName}
        subtitle={heroSubtitle}
        imageUrl={getCategoryHeroImage(key, car.categoryHeroImageUrl || car.imageUrl)}
        scrollTarget="#category-packages"
      />

      <CategoryPackagesSection
        carId={key}
        displayName={displayName}
        sections={sections}
        featureChips={featureChips}
        totalPackages={totalPackages}
      />
    </main>
  );
}
