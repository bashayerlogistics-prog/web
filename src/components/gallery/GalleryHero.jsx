import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronDown } from 'lucide-react';
import { useSiteContent } from '../../context/SiteContentContext';
import {
  GALLERY_HERO_VIDEO,
  GALLERY_HERO_POSTER,
  GALLERY_HERO_POSTER_MOBILE,
  HERO_IMAGE_FALLBACK,
} from '../../data/staticData';
import BrandLogo from '../ui/BrandLogo';
import { lightenMediaUrl } from '../../utils/mediaPerf';
import { scrollToSection } from '../../utils/scroll';

export default function GalleryHero() {
  const { t, i18n } = useTranslation();
  const { galleryHero } = useSiteContent();
  const lang = i18n.language;
  const [videoFailed, setVideoFailed] = useState(false);

  const title = (lang === 'ar' && galleryHero?.titleAr)
    ? galleryHero.titleAr
    : (galleryHero?.titleEn || t('gallery.heroTitle'));
  const subtitle = (lang === 'ar' && galleryHero?.subtitleAr)
    ? galleryHero.subtitleAr
    : (galleryHero?.subtitleEn || t('gallery.heroSubtitle'));

  const videoUrl = lightenMediaUrl(galleryHero?.videoUrl || GALLERY_HERO_VIDEO);
  const posterUrl = lightenMediaUrl(galleryHero?.posterUrl || GALLERY_HERO_POSTER) || GALLERY_HERO_POSTER;
  const posterMobile = lightenMediaUrl(
    galleryHero?.posterMobileUrl || galleryHero?.posterUrl || GALLERY_HERO_POSTER_MOBILE,
  ) || GALLERY_HERO_POSTER_MOBILE;
  const showVideo = galleryHero?.showVideo === true && Boolean(videoUrl) && !videoFailed;

  const handlePosterError = useCallback((e) => {
    const img = e.currentTarget;
    if (img.dataset.fallback) return;
    img.dataset.fallback = '1';
    img.src = HERO_IMAGE_FALLBACK;
  }, []);

  const scrollToCover = useCallback((e) => {
    e.preventDefault();
    scrollToSection('#gallery-cover', true, { force: true });
  }, []);

  const scrollToCollage = useCallback((e) => {
    e.preventDefault();
    scrollToSection('#gallery-collage', true, { force: true });
  }, []);

  return (
    <section className="gallery-hero" aria-label={title}>
      <div className="gallery-hero__media" aria-hidden={!showVideo}>
        {showVideo ? (
          <video
            className="gallery-hero__video"
            src={videoUrl}
            poster={posterUrl}
            autoPlay
            muted
            loop
            playsInline
            preload="none"
            onError={() => setVideoFailed(true)}
          />
        ) : (
          <picture>
            <source media="(max-width: 767px)" srcSet={posterMobile} type="image/webp" />
            <source media="(min-width: 768px)" srcSet={posterUrl} type="image/webp" />
            <img
              className="gallery-hero__poster"
              src={posterUrl}
              alt=""
              decoding="async"
              fetchPriority="high"
              width={1920}
              height={800}
              onError={handlePosterError}
            />
          </picture>
        )}
        <div className="gallery-hero__overlay" />
      </div>

      <div className="gallery-hero__content">
        <div className="gallery-hero__brand">
          <BrandLogo tone="light" className="gallery-hero__logo" />
        </div>
        <h1 className="gallery-hero__title">
          <a href="#gallery-cover" className="gallery-hero__title-link" onClick={scrollToCover}>
            {title}
          </a>
        </h1>
        <p className="gallery-hero__subtitle">
          <a href="#gallery-collage" className="gallery-hero__subtitle-link" onClick={scrollToCollage}>
            {subtitle}
          </a>
        </p>
        <a
          href="#gallery-cover"
          className="gallery-hero__scroll"
          aria-label={t('gallery.scrollToGallery')}
          onClick={scrollToCover}
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
            className="gallery-hero__wave-fill"
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
