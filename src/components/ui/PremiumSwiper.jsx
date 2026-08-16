import { useEffect, useMemo, useRef, useState } from 'react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Pagination, Autoplay, EffectCoverflow, Navigation } from 'swiper/modules';
import { MOBILE_SWIPER_DEFAULTS, useSwiperDirection } from '../../hooks/useSwiperDirection';
import 'swiper/css';
import 'swiper/css/pagination';
import 'swiper/css/navigation';
import 'swiper/css/effect-coverflow';

const DEFAULT_COVERFLOW = {
  rotate: 8,
  stretch: 0,
  depth: 80,
  modifier: 1,
  slideShadows: false,
};

const MOBILE_QUERY = '(max-width: 1023px)';

function useIsMobile() {
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

function useInView(ref) {
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;

    const observer = new IntersectionObserver(
      ([entry]) => setInView(entry.isIntersecting),
      { threshold: 0.15, rootMargin: '40px' },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [ref]);

  return inView;
}

/**
 * Premium carousel — centered slide on mobile (AR/EN), coverflow on desktop.
 * RTL flips update the existing Swiper (no remount) so language switch stays smooth.
 */
export default function PremiumSwiper({
  items,
  renderSlide,
  paginationClass,
  className = '',
  swiperClass = 'premium-swiper',
  autoplayDelay = 4500,
  coverflow = DEFAULT_COVERFLOW,
  breakpoints,
  swiperKey,
  effect = 'coverflow',
  speed = 700,
  loop = false,
  centeredSlides = true,
  spaceBetween = 16,
  mobileSlidesPerView,
  showNavigation = false,
  navigationPrevClass = '',
  navigationNextClass = '',
  showPagination = true,
}) {
  const isMobile = useIsMobile();
  const isRtl = useSwiperDirection();
  const wrapRef = useRef(null);
  const swiperRef = useRef(null);
  const inView = useInView(wrapRef);

  const effectiveEffect = isMobile ? 'slide' : effect;
  const effectiveSpeed = isMobile ? 400 : speed;
  const autoplayEnabled = inView && (items?.length ?? 0) > 1;
  const canLoop = loop && items.length > 1 && !isMobile;

  const modules = useMemo(() => {
    const list = [Autoplay];
    if (showPagination && paginationClass) list.push(Pagination);
    if (showNavigation) list.push(Navigation);
    if (effectiveEffect === 'coverflow') list.push(EffectCoverflow);
    return list;
  }, [effectiveEffect, showNavigation, showPagination, paginationClass]);

  useEffect(() => {
    const swiper = swiperRef.current;
    if (!swiper || swiper.destroyed) return;
    const dir = isRtl ? 'rtl' : 'ltr';
    if (swiper.params.direction === 'horizontal' && typeof swiper.changeLanguageDirection === 'function') {
      if (swiper.rtlTranslate !== isRtl) {
        swiper.changeLanguageDirection(dir);
      }
    }
  }, [isRtl]);

  useEffect(() => {
    if (!inView || !swiperRef.current) return;
    const id = requestAnimationFrame(() => {
      swiperRef.current?.update();
    });
    return () => cancelAnimationFrame(id);
  }, [inView, items?.length, swiperKey]);

  useEffect(() => {
    const onResize = () => {
      swiperRef.current?.update();
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  if (!items?.length) return null;

  const navigation = showNavigation && navigationPrevClass && navigationNextClass
    ? { prevEl: `.${navigationPrevClass}`, nextEl: `.${navigationNextClass}` }
    : undefined;

  const mobileLayout = isMobile
    ? {
        slidesPerView: mobileSlidesPerView ?? MOBILE_SWIPER_DEFAULTS.slidesPerView,
        slidesPerGroup: 1,
        centeredSlides: MOBILE_SWIPER_DEFAULTS.centeredSlides,
        centeredSlidesBounds: MOBILE_SWIPER_DEFAULTS.centeredSlidesBounds,
        spaceBetween: MOBILE_SWIPER_DEFAULTS.spaceBetween,
        roundLengths: true,
      }
    : {
        slidesPerView: 'auto',
        centeredSlides,
        spaceBetween,
      };

  return (
    <div
      ref={wrapRef}
      className={`premium-swiper-wrap mobile-swiper-wrap${isMobile ? ' premium-swiper-wrap--mobile-center' : ''} ${className}`.trim()}
      dir={isRtl ? 'rtl' : 'ltr'}
    >
      <Swiper
        key={`${swiperKey}-${isMobile ? 'm' : 'd'}`}
        dir={isRtl ? 'rtl' : 'ltr'}
        modules={modules}
        effect={effectiveEffect === 'coverflow' ? 'coverflow' : undefined}
        speed={effectiveSpeed}
        loop={canLoop}
        grabCursor
        watchOverflow
        {...mobileLayout}
        coverflowEffect={effectiveEffect === 'coverflow' ? coverflow : undefined}
        autoplay={autoplayEnabled ? {
          delay: isMobile ? autoplayDelay + 1000 : autoplayDelay,
          disableOnInteraction: false,
          pauseOnMouseEnter: true,
        } : false}
        pagination={showPagination && paginationClass
          ? { el: `.${paginationClass}`, clickable: true }
          : undefined}
        navigation={navigation}
        breakpoints={isMobile ? undefined : breakpoints}
        onSwiper={(swiper) => { swiperRef.current = swiper; }}
        className={`${swiperClass} section-swiper`}
        watchSlidesProgress={!isMobile}
      >
        {items.map((item, index) => (
          <SwiperSlide key={item.id ?? index}>
            {renderSlide(item, index)}
          </SwiperSlide>
        ))}
      </Swiper>
      {showPagination && paginationClass && (
        <div className={`${paginationClass} premium-pagination flex items-center justify-center gap-2 mt-5`} />
      )}
    </div>
  );
}
