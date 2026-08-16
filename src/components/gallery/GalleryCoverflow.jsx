import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { EffectCoverflow, Autoplay } from 'swiper/modules';
import { useSiteContent } from '../../context/SiteContentContext';
import { useSwiperDirection } from '../../hooks/useSwiperDirection';
import { filterPlacesGalleryItems } from '../../utils/galleryPlaces';
import { galleryCardSrc } from '../../utils/mediaPerf';
import { HERO_IMAGE_MOBILE } from '../../data/staticData';
import { scrollToSection } from '../../utils/scroll';
import 'swiper/css';
import 'swiper/css/effect-coverflow';

const COVERFLOW_DESKTOP = {
  rotate: 28,
  stretch: 0,
  depth: 160,
  modifier: 1,
  slideShadows: false,
};

const COVERFLOW_MOBILE = {
  rotate: 18,
  stretch: -2,
  depth: 120,
  modifier: 1,
  slideShadows: false,
};

const MOBILE_QUERY = '(max-width: 767px)';

function useIsMobileCover() {
  const [isMobile, setIsMobile] = useState(
    () => typeof window !== 'undefined' && window.matchMedia(MOBILE_QUERY).matches,
  );

  useEffect(() => {
    const media = window.matchMedia(MOBILE_QUERY);
    const onChange = (event) => setIsMobile(event.matches);
    onChange(media);
    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  }, []);

  return isMobile;
}

export default function GalleryCoverflow() {
  const { t, i18n } = useTranslation();
  const { galleryItems } = useSiteContent();
  const lang = i18n.language;
  const isRtl = useSwiperDirection();
  const isMobile = useIsMobileCover();
  const swiperRef = useRef(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [brokenIds, setBrokenIds] = useState(() => new Set());

  const items = useMemo(() => {
    const pool = filterPlacesGalleryItems(galleryItems?.length ? galleryItems : []);
    return pool.slice(0, 10);
  }, [galleryItems]);

  const active = items[activeIndex] || items[0];
  const activeTitle = active
    ? (lang === 'ar' ? (active.titleAr || active.titleEn) : (active.titleEn || active.titleAr))
    : t('gallery.coverTitle');

  const speed = isMobile ? 220 : 280;
  const autoplayDelay = isMobile ? 1600 : 2200;

  const onSlideClick = useCallback((index) => {
    const swiper = swiperRef.current;
    if (!swiper || swiper.destroyed) return;
    if (typeof swiper.slideToLoop === 'function' && swiper.params.loop) {
      swiper.slideToLoop(index, speed);
    } else {
      swiper.slideTo(index, speed);
    }
  }, [speed]);

  const markBroken = useCallback((id) => {
    setBrokenIds((prev) => {
      if (prev.has(id)) return prev;
      const next = new Set(prev);
      next.add(id);
      return next;
    });
  }, []);

  if (!items.length) {
    return (
      <section className="gallery-cover" id="gallery-cover" aria-labelledby="gallery-cover-title">
        <header className="gallery-cover__intro">
          <p className="gallery-cover__eyebrow">{t('gallery.eyebrow')}</p>
          <h2 id="gallery-cover-title" className="gallery-cover__heading">
            {t('gallery.coverTitle')}
          </h2>
          <p className="gallery-cover__lead">{t('gallery.empty')}</p>
        </header>
      </section>
    );
  }

  return (
    <section className="gallery-cover" id="gallery-cover" aria-labelledby="gallery-cover-title">
      <div className="gallery-cover__glow" aria-hidden />

      <header className="gallery-cover__intro">
        <p className="gallery-cover__eyebrow">{t('gallery.eyebrow')}</p>
        <h2 id="gallery-cover-title" className="gallery-cover__heading">
          {t('gallery.coverTitle')}
        </h2>
        <p className="gallery-cover__lead">
          <a
            href="#gallery-collage"
            className="gallery-cover__lead-link"
            onClick={(e) => {
              e.preventDefault();
              scrollToSection('#gallery-collage', true, { force: true });
            }}
          >
            {t('gallery.coverLead')}
          </a>
        </p>
      </header>

      <div className="gallery-cover__stage">
        <button
          type="button"
          className="gallery-cover__nav gallery-cover__nav--prev"
          aria-label={t('gallery.prev')}
          onClick={() => swiperRef.current?.slidePrev(speed)}
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <button
          type="button"
          className="gallery-cover__nav gallery-cover__nav--next"
          aria-label={t('gallery.next')}
          onClick={() => swiperRef.current?.slideNext(speed)}
        >
          <ChevronRight className="w-5 h-5" />
        </button>

        <Swiper
          key={`${isRtl ? 'rtl' : 'ltr'}-${isMobile ? 'm' : 'd'}`}
          dir={isRtl ? 'rtl' : 'ltr'}
          modules={[EffectCoverflow, Autoplay]}
          effect="coverflow"
          coverflowEffect={isMobile ? COVERFLOW_MOBILE : COVERFLOW_DESKTOP}
          grabCursor
          centeredSlides
          slidesPerView="auto"
          spaceBetween={isMobile ? -12 : 8}
          loop={items.length > 4}
          speed={speed}
          watchSlidesProgress
          autoplay={{
            delay: autoplayDelay,
            disableOnInteraction: false,
            pauseOnMouseEnter: true,
          }}
          onSwiper={(swiper) => { swiperRef.current = swiper; }}
          onSlideChange={(swiper) => setActiveIndex(swiper.realIndex)}
          className="gallery-cover__swiper"
        >
          {items.map((item, index) => {
            const title = lang === 'ar' ? (item.titleAr || item.titleEn) : (item.titleEn || item.titleAr);
            const src = brokenIds.has(item.id)
              ? HERO_IMAGE_MOBILE
              : (galleryCardSrc(item, index < 2 ? 560 : 400) || HERO_IMAGE_MOBILE);

            return (
              <SwiperSlide key={item.id} className="gallery-cover__slide">
                <div className="gallery-cover__card">
                  <button
                    type="button"
                    className="gallery-cover__media-btn"
                    onClick={() => onSlideClick(index)}
                    aria-label={title}
                  >
                    <img
                      src={src}
                      alt={title}
                      className="gallery-cover__img"
                      loading={index < 2 ? 'eager' : 'lazy'}
                      decoding="async"
                      fetchPriority={index === 0 ? 'high' : 'auto'}
                      width={400}
                      height={400}
                      onError={() => markBroken(item.id)}
                    />
                  </button>
                  <button
                    type="button"
                    className="gallery-cover__caption gallery-cover__caption--link"
                    onClick={() => onSlideClick(index)}
                  >
                    <span className="gallery-cover__caption-title">{title}</span>
                  </button>
                </div>
              </SwiperSlide>
            );
          })}
        </Swiper>
      </div>

      <p className="gallery-cover__active" aria-live="polite">
        {activeTitle}
      </p>
    </section>
  );
}
