import { GALLERY_IMAGES, ROUTE_IMAGES } from './staticData';

/**
 * Tours of religious sites (Ziyarat).
 * Booking search uses hourly `internal` rates for Makkah / Madinah.
 * Package metadata is kept for admin/CMS; the public form searches live fleet prices.
 * Prices come from hourly rental matrix (see docs/religious-sites-tours-prices-en.md).
 */
export const RELIGIOUS_TOUR_PACKAGES = [
  {
    id: 'makkah-ziyarat-4h',
    cityId: '1',
    hours: 4,
    hourlyDest: 'internal',
    title: {
      en: 'Makkah Holy Sites — 4 Hours',
      ar: 'مزارات مكة المكرمة — 4 ساعات',
    },
    subtitle: {
      en: 'Hira Cave, Arafat, Mina & key landmarks',
      ar: 'غار حراء · عرفات · منى وأهم المعالم',
    },
    sites: {
      en: ['Cave of Hira', 'Mount Arafat', 'Mina', 'Jannat al-Mualla'],
      ar: ['غار حراء', 'جبل عرفات', 'منى', 'مقبرة المعلاة'],
    },
    image: GALLERY_IMAGES.makkah,
    priceFrom: 230,
  },
  {
    id: 'makkah-ziyarat-8h',
    cityId: '1',
    hours: 8,
    hourlyDest: 'internal',
    title: {
      en: 'Makkah Full Ziyarat — 8 Hours',
      ar: 'جولة مكة الشاملة — 8 ساعات',
    },
    subtitle: {
      en: 'Extended tour of Makkah holy sites',
      ar: 'جولة موسعة لمزارات مكة المكرمة',
    },
    sites: {
      en: ['Hira Cave', 'Arafat', 'Muzdalifah', 'Mina', 'Masjid Aisha'],
      ar: ['غار حراء', 'عرفات', 'مزدلفة', 'منى', 'مسجد عائشة'],
    },
    image: ROUTE_IMAGES.makkahMadinah,
    priceFrom: 390,
  },
  {
    id: 'madinah-ziyarat-4h',
    cityId: '5',
    hours: 4,
    hourlyDest: 'internal',
    title: {
      en: 'Madinah Holy Sites — 4 Hours',
      ar: 'مزارات المدينة المنورة — 4 ساعات',
    },
    subtitle: {
      en: 'Quba, Uhud, Qiblatain & more',
      ar: 'قباء · أحد · القبلتين وأكثر',
    },
    sites: {
      en: ['Masjid Quba', 'Mount Uhud', 'Masjid Qiblatain', 'Seven Mosques'],
      ar: ['مسجد قباء', 'جبل أحد', 'مسجد القبلتين', 'المساجد السبعة'],
    },
    image: GALLERY_IMAGES.madinah,
    priceFrom: 230,
  },
  {
    id: 'madinah-ziyarat-8h',
    cityId: '5',
    hours: 8,
    hourlyDest: 'internal',
    title: {
      en: 'Madinah Full Ziyarat — 8 Hours',
      ar: 'جولة المدينة الشاملة — 8 ساعات',
    },
    subtitle: {
      en: 'Full-day Madinah religious tour',
      ar: 'جولة يوم كامل لمزارات المدينة',
    },
    sites: {
      en: ['Quba', 'Uhud', 'Qiblatain', 'Baqi', 'Historical mosques'],
      ar: ['قباء', 'أحد', 'القبلتين', 'البقيع', 'مساجد تاريخية'],
    },
    image: ROUTE_IMAGES.trainMadinah,
    priceFrom: 390,
  },
  {
    id: 'makkah-madinah-day-12h',
    cityId: '1',
    hours: 12,
    hourlyDest: 'internal',
    title: {
      en: 'Extended Holy Sites — 12 Hours',
      ar: 'مزارات موسعة — 12 ساعة',
    },
    subtitle: {
      en: 'Long day covering major Makkah sites',
      ar: 'يوم طويل يشمل أهم مزارات مكة',
    },
    sites: {
      en: ['Full Makkah circuit', 'Flexible stops', 'Driver waits'],
      ar: ['دورة مكة الكاملة', 'توقفات مرنة', 'انتظار السائق'],
    },
    image: ROUTE_IMAGES.jeddahMakkah,
    priceFrom: 540,
  },
];

export const DEFAULT_RELIGIOUS_TOURS = {
  eyebrowEn: 'ZIYARAT & HOLY SITES',
  eyebrowAr: 'الزيارات والمزارات',
  headingEn: 'Tours of religious sites',
  headingAr: 'جولات المواقع الدينية',
  bodyEn:
    'Book Ziyarat in Taif, Makkah, Jeddah or Madinah as hourly within-city packages (4 / 8 / 12 hours). Private chauffeur, flexible stops — live prices for 5 cars.',
  bodyAr:
    'احجز المزارات في الطائف ومكة وجدة والمدينة كباقات ساعة داخل المدينة (4 / 8 / 12 ساعة). سائق خاص وتوقفات مرنة — أسعار مباشرة لـ 5 سيارات.',
  formTitleEn: 'Book your Ziyarat tour',
  formTitleAr: 'احجز جولة الزيارة',
  formSubtitleEn: 'Set city, date and car — then search our Internal hourly prices.',
  formSubtitleAr: 'حدد المدينة والتاريخ والسيارة — ثم ابحث في أسعار داخل المدينة.',
  ctaLabelEn: 'SHOW PRICE',
  ctaLabelAr: 'اعرض السعر',
  packagesLabelEn: 'Choose a tour package',
  packagesLabelAr: 'اختر باقة الجولة',
  locationLabelEn: 'CITY / BASE',
  locationLabelAr: 'المدينة / نقطة الانطلاق',
  hoursLabelEn: 'DURATION',
  hoursLabelAr: 'المدة',
  dateLabelEn: 'TOUR DATE',
  dateLabelAr: 'تاريخ الجولة',
  timeLabelEn: 'START TIME',
  timeLabelAr: 'وقت البدء',
  passengersLabelEn: 'PASSENGERS',
  passengersLabelAr: 'عدد الركاب',
  carLabelEn: 'CAR',
  carLabelAr: 'السيارة',
  carOptionEn: 'Any car — best price',
  carOptionAr: 'أي سيارة — أفضل سعر',
  currencyLabelEn: 'CURRENCY',
  currencyLabelAr: 'العملة',
  currencyOptionEn: 'Saudi Riyal (SAR)',
  currencyOptionAr: 'ريال سعودي (SAR)',
  backgroundImageUrl: ROUTE_IMAGES.makkahMadinah,
  // Classic city photos for the Ziyarat booking gallery
  cityImages: {
    makkah: '/images/gallery/ziyarat-makkah.jpg',
    madinah: '/images/gallery/ziyarat-madinah.jpg',
    jeddah: '/images/gallery/ziyarat-jeddah.jpg',
    riyadh: '/images/gallery/ziyarat-riyadh.jpg',
  },
  packages: RELIGIOUS_TOUR_PACKAGES,
};

/** Prefer fresh bundled defaults over stale `/images/gallery/*` CMS paths; keep remote uploads. */
function mergeCityImages(stored) {
  const defaults = DEFAULT_RELIGIOUS_TOURS.cityImages;
  if (!stored || typeof stored !== 'object') return { ...defaults };
  const next = { ...defaults };
  for (const key of Object.keys(defaults)) {
    const url = String(stored[key] || '').trim();
    if (!url) continue;
    if (!url.startsWith('/images/gallery/')) next[key] = url;
  }
  return next;
}

export function buildReligiousToursFromFirestore(data) {
  if (!data) return { ...DEFAULT_RELIGIOUS_TOURS, packages: [...RELIGIOUS_TOUR_PACKAGES] };
  const packages = Array.isArray(data.packages) && data.packages.length
    ? data.packages
    : RELIGIOUS_TOUR_PACKAGES;
  return {
    ...DEFAULT_RELIGIOUS_TOURS,
    ...data,
    cityImages: mergeCityImages(data.cityImages),
    packages,
  };
}
