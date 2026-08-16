import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

/** RTL/LTR direction for Swiper — syncs with Arabic/English. */
export function useSwiperDirection() {
  const { i18n } = useTranslation();

  return useMemo(
    () => i18n.language === 'ar' || document.documentElement.dir === 'rtl',
    [i18n.language],
  );
}

export const MOBILE_SWIPER_DEFAULTS = {
  slidesPerView: 1,
  centeredSlides: false,
  centeredSlidesBounds: false,
  spaceBetween: 16,
};
