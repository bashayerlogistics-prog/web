import { useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronDown } from 'lucide-react';
import { HERO_IMAGE_FALLBACK } from '../../data/staticData';
import BrandLogo from '../ui/BrandLogo';
import { lightenMediaUrl, optimizedImageUrl } from '../../utils/mediaPerf';
import { scrollToSection } from '../../utils/scroll';

/**
 * Full-bleed cinematic hero — same structure / CSS as GalleryHero.
 * Media + title come from SuperAdmin car catalog (image + names).
 */
export default function CategoryHero({
  title,
  subtitle,
  imageUrl,
  scrollTarget = '#category-packages',
}) {
  const { t } = useTranslation();

  const { desktopSrc, mobileSrc } = useMemo(() => {
    const raw = lightenMediaUrl(imageUrl) || imageUrl || HERO_IMAGE_FALLBACK;
    return {
      desktopSrc: optimizedImageUrl(raw, 1280, 72) || raw,
      mobileSrc: optimizedImageUrl(raw, 768, 68) || raw,
    };
  }, [imageUrl]);

  const handlePosterError = useCallback((e) => {
    const img = e.currentTarget;
    if (img.dataset.fallback) return;
    img.dataset.fallback = '1';
    img.src = HERO_IMAGE_FALLBACK;
    img.removeAttribute('srcset');
  }, []);

  const scrollToPackages = useCallback(
    (e) => {
      e.preventDefault();
      scrollToSection(scrollTarget, true);
    },
    [scrollTarget],
  );

  return (
    <section className="gallery-hero category-hero" aria-label={title}>
      <div className="gallery-hero__media" aria-hidden>
        <picture>
          <source media="(max-width: 767px)" srcSet={mobileSrc} />
          <img
            className="gallery-hero__poster category-hero__poster"
            src={desktopSrc}
            alt=""
            decoding="async"
            fetchPriority="high"
            width={1280}
            height={720}
            sizes="100vw"
            onError={handlePosterError}
          />
        </picture>
        <div className="gallery-hero__overlay" />
      </div>

      <div className="gallery-hero__content">
        <div className="gallery-hero__brand">
          <BrandLogo tone="light" className="gallery-hero__logo" />
        </div>
        <h1 className="gallery-hero__title">
          <a href={scrollTarget} className="gallery-hero__title-link" onClick={scrollToPackages}>
            {title}
          </a>
        </h1>
        {subtitle ? (
          <p className="gallery-hero__subtitle">
            <a href={scrollTarget} className="gallery-hero__subtitle-link" onClick={scrollToPackages}>
              {subtitle}
            </a>
          </p>
        ) : null}
        <a
          href={scrollTarget}
          className="gallery-hero__scroll"
          aria-label={t('carCategories.scrollToPackages')}
          onClick={scrollToPackages}
        >
          <ChevronDown className="w-6 h-6" />
        </a>
      </div>

      <div className="gallery-hero__wave" aria-hidden>
        <svg
          className="gallery-hero__wave-svg"
          viewBox="0 0 1440 120"
          preserveAspectRatio="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            className="gallery-hero__wave-fill category-hero__wave-fill"
            d="M0,72 C240,120 480,20 720,56 C960,92 1200,110 1440,48 L1440,120 L0,120 Z"
          />
          <path
            className="gallery-hero__wave-stroke"
            d="M0,72 C240,120 480,20 720,56 C960,92 1200,110 1440,48"
            fill="none"
          />
        </svg>
      </div>
    </section>
  );
}
