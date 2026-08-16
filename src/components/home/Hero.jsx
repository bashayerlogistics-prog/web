import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { ShieldCheck, MapPin, Calendar } from 'lucide-react';
import {
  HERO_GRADIENT,
  HERO_IMAGE,
  HERO_IMAGE_MOBILE,
  HERO_IMAGE_FALLBACK,
  HERO_IMAGE_MOBILE_FALLBACK,
} from '../../data/staticData';
import { useSiteContent } from '../../context/SiteContentContext';
import { optimizedImageUrl } from '../../utils/mediaPerf';
import AppNavLink from '../ui/AppNavLink';

export default function Hero({ withBookingOverlap = false }) {
  const { t, i18n } = useTranslation();
  const { hero } = useSiteContent();
  const lang = i18n.language;

  const gradientUrl = hero?.gradientUrl || HERO_GRADIENT;
  const imageUrl = optimizedImageUrl(hero?.imageUrl || HERO_IMAGE, 1280, 75);
  const imageMobileUrl = optimizedImageUrl(
    hero?.imageMobileUrl || hero?.imageUrl || HERO_IMAGE_MOBILE,
    768,
    72,
  );

  const title = (lang === 'ar' && hero?.titleAr) ? hero.titleAr : (hero?.titleEn || t('hero.title'));
  const subtitle = (lang === 'ar' && hero?.subtitleAr) ? hero.subtitleAr : (hero?.subtitleEn || t('hero.subtitle'));
  const badgeLicensed = (lang === 'ar' && hero?.badgeLicensedAr)
    ? hero.badgeLicensedAr
    : (hero?.badgeLicensedEn || t('hero.badgeLicensed'));
  const badgeCities = (lang === 'ar' && hero?.badgeCitiesAr)
    ? hero.badgeCitiesAr
    : (hero?.badgeCitiesEn || t('hero.badgeCities'));

  const handlePhotoError = useCallback((e) => {
    const img = e.currentTarget;
    if (img.dataset.fallback === 'jpg') {
      img.src = HERO_IMAGE_FALLBACK;
      return;
    }
    if (!img.dataset.fallback) {
      img.dataset.fallback = 'jpg';
      img.src = img.dataset.mobile === '1' ? HERO_IMAGE_MOBILE_FALLBACK : HERO_IMAGE_FALLBACK;
    }
  }, []);

  return (
    <section
      id="hero"
      className={`hero-section relative min-h-[78svh] h-[88svh] max-h-[960px] overflow-visible bg-brand-dark${
        withBookingOverlap ? ' hero-section--booking-overlap' : ''
      }`}
    >
      <div className="hero-section__media absolute inset-0 z-0 overflow-hidden">
        {gradientUrl && (
          <img
            src={gradientUrl}
            alt=""
            aria-hidden
            className="absolute inset-0 w-full h-full object-cover object-center opacity-30"
            loading="lazy"
            decoding="async"
            fetchPriority="low"
          />
        )}

        <picture>
          <source media="(max-width: 767px)" srcSet={imageMobileUrl} type="image/webp" />
          <source media="(min-width: 768px)" srcSet={imageUrl} type="image/webp" />
          <img
            src={imageUrl}
            alt={t('hero.imageAlt')}
            data-mobile="0"
            onError={handlePhotoError}
            className="hero-section__photo absolute inset-0 w-full h-full object-cover object-[center_32%] scale-105 animate-hero-kenburns"
            loading="eager"
            fetchPriority="high"
            decoding="sync"
            sizes="100vw"
            width={1600}
            height={900}
          />
        </picture>

        <div className="hero-section__overlay absolute inset-0 z-10" aria-hidden />
      </div>

      <div className="hero-content pointer-events-none">
        <div className="section-container">
          <div className="hero-section__panel pointer-events-auto">
            <div className="hero-section__badges">
              <span className="hero-section__badge hero-section__badge--gold">
                <ShieldCheck className="hero-section__badge-icon shrink-0" aria-hidden />
                <span>{badgeLicensed}</span>
              </span>
              <span className="hero-section__badge hero-section__badge--glass">
                <MapPin className="hero-section__badge-icon text-gold shrink-0" aria-hidden />
                <span>{badgeCities}</span>
              </span>
            </div>

            <h1 className="hero-section__title">
              {title}
            </h1>

            <p className="hero-section__subtitle">
              {subtitle}
            </p>

            <div className="hero-section__actions">
              <AppNavLink
                to="#pricing-calculator"
                className="hero-section__cta hero-section__cta--primary"
              >
                {t('hero.ctaBook')}
              </AppNavLink>
              <AppNavLink
                to="#pricing-calculator"
                className="hero-section__cta hero-section__cta--ghost"
              >
                <Calendar className="hero-section__cta-icon text-gold shrink-0" aria-hidden />
                <span>{t('hero.ctaPrice')}</span>
              </AppNavLink>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
