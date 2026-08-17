import {
  BETWEEN_CITIES_CARS,
  BETWEEN_CITIES_PRICE_MATRIX,
  BETWEEN_CITY_IDS,
  BETWEEN_CITY_META,
  betweenCitiesRouteTitle,
  buildBetweenCitiesRouteId,
} from './betweenCitiesPricing';
import { AIRPORT_TRANSFER_ROUTES } from './airportPricing';

export const CITIES = [
  { id: '1', ar: 'مكة', en: 'Makkah' },
  { id: '2', ar: 'جدة', en: 'Jeddah' },
  { id: '3', ar: 'الطائف', en: 'Taif' },
  { id: '4', ar: 'الرياض', en: 'Riyadh' },
  { id: '5', ar: 'المدينة المنورة', en: 'Madinah' },
];

/** Cities available for التنقل بين المدن (excludes Riyadh — not on sheet) */
export const ONE_WAY_CITIES = CITIES.filter((c) => BETWEEN_CITY_IDS.includes(c.id));

export const TIME_SLOTS = [
  '08:00', '09:00', '10:00', '11:00', '12:00', '13:00',
  '14:00', '15:00', '16:00', '17:00', '18:00', '19:00',
  '20:00', '21:00', '22:00',
];

export const HOUR_OPTIONS = [4, 8, 12];

const ROUTE_IMAGE_FALLBACK = '/images/hero-gradient.svg';
export { ROUTE_IMAGE_FALLBACK };

export const ROUTE_IMAGES = {
  jeddahMakkah: '/images/routes/jeddah-makkah.webp',
  makkahMadinah: '/images/routes/makkah-madinah.webp',
  taifMakkah: '/images/routes/taif-makkah.webp',
  madinahAirport: '/images/routes/madinah-airport.webp',
  trainMakkah: '/images/routes/train-makkah.webp',
  trainMadinah: '/images/routes/train-madinah.webp',
};

export const SERVICE_IMAGES = {
  jeddahMakkah: '/images/services/service-jeddah-makkah.webp',
  makkahMadinah: '/images/services/service-makkah-madinah.webp',
  taifMakkah: '/images/services/service-taif-makkah.webp',
  taifMadinah: '/images/services/service-taif-madinah.webp',
  trainMakkah: '/images/services/service-train-makkah.webp',
  hourly: '/images/services/service-hourly.webp',
};

export const FAQ_IMAGES = {
  booking: '/images/faq/faq-booking.webp',
  cancel: '/images/faq/faq-cancel.webp',
  cities: '/images/faq/faq-cities.webp',
  jeddahMakkah: '/images/faq/faq-jeddah-makkah.webp',
  tax: '/images/faq/faq-tax.svg',
};

/**
 * Featured Routes = our 6 SuperAdmin services (same data, same 5 cars).
 * Order matches admin: Airport · Train · City-to-City · Within City · Hourly · Ziyarat
 */
export const ROUTE_CARDS = [
  {
    id: 'airport',
    popular: true,
    category: 'airport',
    icon: 'plane',
    title: { ar: 'الاستقبال والتوديع بالمطارات', en: 'Airport Pickup & Drop-off' },
    description: {
      ar: 'استقبال عند الوصول وتوديع عند المغادرة من مطارات جدة والمدينة والطائف إلى الفنادق والمدن — تورس · كامري · ستاريا · جمس · هايس 2026.',
      en: 'Arrival pickup and departure drop-off from Jeddah, Madinah and Taif airports — Taurus · Camry · Staria · GMC · Hiace 2026.',
    },
    image: SERVICE_IMAGES.jeddahMakkah,
    imageFallback: ROUTE_IMAGE_FALLBACK,
  },
  {
    id: 'train',
    popular: true,
    category: 'train',
    icon: 'train',
    title: { ar: 'الاستقبال والتوديع بمحطات القطار', en: 'Haramain Train Station Transfers' },
    description: {
      ar: 'محطة مكة (الرصيفة)، المدينة، مطار جدة، وجدة (السليمانية) — نفس الـ 5 سيارات بأسعار الاستقبال والتوديع.',
      en: 'Makkah Al-Rusaifah, Madinah, Jeddah airport & Sulaimaniyah stations — same 5 cars with pickup & drop-off prices.',
    },
    image: SERVICE_IMAGES.trainMakkah,
    imageFallback: ROUTE_IMAGE_FALLBACK,
  },
  {
    id: 'city-to-city',
    popular: false,
    category: 'intercity',
    icon: 'route',
    title: { ar: 'التنقل بين المدن', en: 'Moving Between Cities' },
    description: {
      ar: 'رحلات ذهاب بين مكة وجدة والمدينة والطائف بسيارات تورس وكامري وستاريا وجمس وهايس 2026.',
      en: 'One-way trips between Makkah, Jeddah, Madinah and Taif in Taurus, Camry, Staria, GMC and Hiace 2026.',
    },
    image: SERVICE_IMAGES.makkahMadinah,
    imageFallback: ROUTE_IMAGE_FALLBACK,
  },
  {
    id: 'within-city',
    popular: false,
    category: 'withinCity',
    icon: 'map-pin',
    title: { ar: 'مشاوير داخل المدينة', en: 'Within-City Trips' },
    description: {
      ar: 'باقات 4 و 8 و 12 ساعة داخل جدة أو مكة أو المدينة أو الطائف — سائق خاص من وقت بداية الرحلة.',
      en: '4 / 8 / 12 hour packages within Jeddah, Makkah, Madinah or Taif — private driver from trip start.',
    },
    image: SERVICE_IMAGES.taifMakkah,
    imageFallback: ROUTE_IMAGE_FALLBACK,
  },
  {
    id: 'hourly',
    popular: false,
    category: 'hourly',
    icon: 'clock',
    title: { ar: 'استئجار بالساعة مع سائق', en: 'Hourly Rental with Driver' },
    description: {
      ar: 'باقات بالساعة بين المدن مع ذهاب وعودة — ساعات من وقت الوصول بأسعار واضحة لـ 5 سيارات.',
      en: 'Hourly packages between cities with return — hours from arrival with clear prices for 5 cars.',
    },
    image: SERVICE_IMAGES.hourly,
    imageFallback: ROUTE_IMAGE_FALLBACK,
  },
  {
    id: 'ziyarat',
    popular: false,
    category: 'tours',
    icon: 'map-pin',
    title: { ar: 'جولات المزارات الدينية', en: 'Religious Sites (Ziyarat) Tours' },
    description: {
      ar: 'جولات الطائف ومكة وجدة والمدينة (غار حراء، عرفات، قباء، أحد…) بأسعار باقات الساعة داخل المدينة — 5 سيارات.',
      en: 'Taif, Makkah, Jeddah and Madinah tours (Hira, Arafat, Quba, Uhud…) at within-city hourly prices — same 5 cars.',
    },
    image: SERVICE_IMAGES.taifMadinah,
    imageFallback: ROUTE_IMAGE_FALLBACK,
  },
];

/** Homepage services showcase — identical 6 cards as Featured Routes / SuperAdmin. */
export const SERVICES = ROUTE_CARDS.map((card, index) => ({
  id: index + 1,
  category: card.category,
  title: card.title,
  description: card.description,
  image: card.image,
  icon: card.icon,
  badge: 'primary',
  features: [],
}));

const VEHICLE_DESC = {
  ar: 'سيارة حديثة ومكيفة لنقل الحجاج والمعتمرين لضمان خصوصية عائلتك وراحتهم القصوى طوال الرحلة.',
  en: 'A modern air-conditioned vehicle for pilgrims ensuring your family privacy and maximum comfort throughout the trip.',
};

/** Bump when replacing bundled category photos so browsers drop stale cache. */
const CATEGORY_IMAGE_VERSION = '20260817';

function withCategoryImageVersion(path) {
  const base = String(path || '').split('?')[0];
  return `${base}?v=${CATEGORY_IMAGE_VERSION}`;
}

/** Local car thumbnails — reliable for admin + site (remote CDN URLs often break). */
const VEHICLE_IMAGES = {
  camry: withCategoryImageVersion('/images/categories/camry.webp'),
  staria: '/images/categories/staria.webp',
  taurus: withCategoryImageVersion('/images/categories/taurus.webp'),
  yukon: '/images/categories/yukon.webp',
  hiace: '/images/categories/hiace.webp',
  h1: '/images/categories/hiace.webp',
};

/** Wide environmental heroes for `/cars/:id` — car in scene, not fill-crop product shots. */
export const CATEGORY_HERO_IMAGES = {
  taurus: withCategoryImageVersion('/images/categories/taurus.webp'),
  camry: withCategoryImageVersion('/images/categories/camry.webp'),
  staria: '/images/categories/staria.webp',
  yukon: '/images/categories/yukon.webp',
  hiace: '/images/categories/hiace.webp',
};

export { VEHICLE_IMAGES };

/**
 * Circle framing for the bundled scene photos: `x`/`y` are the car centre inside
 * the photo (0-1) and `zoom` is the photo width relative to the circle width.
 */
const CATEGORY_CIRCLE_FOCUS = {
  taurus: { x: 0.5, y: 0.82, zoom: 2.05 },
  camry: { x: 0.5, y: 0.58, zoom: 1.65 },
  staria: { x: 0.3, y: 0.73, zoom: 2 },
  yukon: { x: 0.43, y: 0.74, zoom: 1.95 },
  hiace: { x: 0.4, y: 0.64, zoom: 2.3 },
  h1: { x: 0.4, y: 0.64, zoom: 2.3 },
};

/** Plain centre crop — used for any image we have not measured (admin uploads). */
const DEFAULT_CIRCLE_FOCUS = { x: 0.5, y: 0.5, zoom: 1.78 };

function mediaPathOnly(url) {
  return String(url || '').trim().split('?')[0];
}

function isFirebaseStorageUrl(url) {
  return /firebasestorage\.googleapis\.com|storage\.googleapis\.com/i.test(String(url || ''));
}

/**
 * Prefer bundled `/images/categories/*` art over stale third-party CMS links.
 * Keep Firebase Storage / other local `/images/...` admin uploads.
 */
export function preferBundledCarImage(carKey, candidateUrl) {
  const key = String(carKey || '').split('-')[0].toLowerCase();
  const local = CATEGORY_HERO_IMAGES[key] || VEHICLE_IMAGES[key] || VEHICLE_IMAGES.camry;
  const live = String(candidateUrl || '').trim();
  if (!live) return local;
  if (live.startsWith('/')) {
    const livePath = mediaPathOnly(live);
    const localPath = mediaPathOnly(local);
    // Old CMS path without cache-bust → use versioned bundled file
    if (livePath === localPath) return local;
    return live;
  }
  if (isFirebaseStorageUrl(live)) return live;
  return local;
}

export function getCategoryCircleFocus(carKey, imageUrl) {
  const key = String(carKey || '').split('-')[0].toLowerCase();
  const focus = CATEGORY_CIRCLE_FOCUS[key];
  if (!focus) return DEFAULT_CIRCLE_FOCUS;
  const bundled = CATEGORY_HERO_IMAGES[key] || VEHICLE_IMAGES[key];
  const url = String(imageUrl || '').trim();
  if (url && bundled && mediaPathOnly(url) !== mediaPathOnly(bundled)) {
    return DEFAULT_CIRCLE_FOCUS;
  }
  return focus;
}

export function getCategoryHeroImage(carKey, candidateUrl = '') {
  const key = String(carKey || '').split('-')[0].toLowerCase();
  return preferBundledCarImage(key, candidateUrl);
}

export const SHORT_NAMES = {
  camry: { ar: 'كامري 2026', en: 'Toyota Camry 2026' },
  staria: { ar: 'ستاريا 2026', en: 'Hyundai Staria 2026' },
  taurus: { ar: 'تورس 2026', en: 'Ford Taurus 2026' },
  yukon: { ar: 'جمس 2026', en: 'GMC 2026' },
  hiace: { ar: 'هايس 2026', en: 'Toyota Hiace 2026' },
  h1: { ar: 'اتش ون H1', en: 'Hyundai H1' },
};

/**
 * Gallery stills — local WebP (small KB). Pair with GALLERY_FULL_IMAGES for lightbox.
 */
export const GALLERY_IMAGES = {
  makkah: '/images/gallery/makkah.webp',
  madinah: '/images/gallery/madinah.webp',
  quba: '/images/gallery/quba.webp',
  uhud: '/images/gallery/uhud.webp',
  jeddah: '/images/gallery/jeddah.webp',
  riyadh: '/images/gallery/riyadh.webp',
  dammam: '/images/gallery/riyadh.webp',
  airport: '/images/gallery/airport.webp',
  market: '/images/gallery/airport-tarmac.jpg',
  highway: ROUTE_IMAGES.makkahMadinah,
  train: ROUTE_IMAGES.trainMakkah,
  bus: VEHICLE_IMAGES.hiace,
};

/** Larger lightbox variants (still compressed WebP). */
export const GALLERY_FULL_IMAGES = {
  makkah: '/images/gallery/makkah-full.webp',
  madinah: '/images/gallery/madinah-full.webp',
  quba: '/images/gallery/quba-full.webp',
  uhud: '/images/gallery/uhud-full.webp',
};

const OW_CAR_META = {
  taurus: { passengers: 4, vip: false },
  camry: { passengers: 4, vip: false },
  staria: { passengers: 7, vip: false },
  yukon: { passengers: 7, vip: true },
  hiace: { passengers: 10, vip: false },
};

const OW_DESC = {
  ar: 'التنقل بين المدن — رحلة باتجاه واحد بسيارة حديثة مع سائق.',
  en: 'Moving between cities — one-way trip in a modern car with driver.',
};

function buildBetweenCitiesVehicle(carKey, fromId, toId, price) {
  const meta = OW_CAR_META[carKey];
  const title = betweenCitiesRouteTitle(fromId, toId);
  const short = SHORT_NAMES[carKey] || { ar: carKey, en: carKey };
  return {
    id: `${carKey}-ow${fromId}${toId}`,
    name: {
      ar: `${short.ar} — ${title.ar}`,
      en: `${short.en} — ${title.en}`,
    },
    image: VEHICLE_IMAGES[carKey] || VEHICLE_IMAGES.camry,
    passengers: meta.passengers,
    badge: { ar: 'التنقل بين المدن', en: 'Between Cities' },
    brandTag: { ar: 'بشاير العطاء', en: 'Bashayer Logistics' },
    price,
    originalPrice: price,
    vip: meta.vip,
    hidePrice: false,
    tripType: 'one_way',
    description: OW_DESC,
  };
}

/** One Way — التنقل بين المدن (sheet prices, 5 cars, directed routes) */
export const FLEET_ROUTES = Object.keys(BETWEEN_CITIES_PRICE_MATRIX).map((pair) => {
  const [fromId, toId] = pair.split('-');
  const prices = BETWEEN_CITIES_PRICE_MATRIX[pair];
  return {
    id: buildBetweenCitiesRouteId(fromId, toId),
    title: betweenCitiesRouteTitle(fromId, toId),
    cityFrom: String(fromId),
    cityTo: String(toId),
    tripType: 'one_way',
    vehicles: BETWEEN_CITIES_CARS.map((car) =>
      buildBetweenCitiesVehicle(car, fromId, toId, prices[car] ?? 0),
    ),
  };
});

const jeddahMakkahVehicles =
  FLEET_ROUTES.find((r) => r.id === 'ow-2-1')?.vehicles || FLEET_ROUTES[0]?.vehicles || [];

/** Shared booking / instant-price form options — 5 default cars with 2026 model year */
export const BOOKING_PASSENGER_OPTIONS = [2, 4];
export const BOOKING_CAR_TYPES = ['taurus', 'camry', 'staria', 'yukon', 'hiace'];
export const DEFAULT_BOOKING_PASSENGERS = BOOKING_PASSENGER_OPTIONS[0];
export const DEFAULT_BOOKING_CAR_TYPE = 'camry';
export const DEFAULT_BOOKING_FROM = '2';
export const DEFAULT_BOOKING_TO = '1';

/** Live SuperAdmin car catalog (Firestore `vehicles`) — overlays SHORT_NAMES / VEHICLE_IMAGES. */
let LIVE_CAR_CATALOG = {};

const CAR_PASSENGERS = {
  taurus: 4,
  camry: 4,
  staria: 7,
  yukon: 7,
  hiace: 10,
};

export function getDefaultCarCatalog() {
  return BOOKING_CAR_TYPES.map((id, index) => ({
    id,
    nameEn: SHORT_NAMES[id]?.en || id,
    nameAr: SHORT_NAMES[id]?.ar || id,
    modelEn: SHORT_NAMES[id]?.en || id,
    modelAr: SHORT_NAMES[id]?.ar || id,
    imageUrl: VEHICLE_IMAGES[id] || VEHICLE_IMAGES.camry,
    passengers: CAR_PASSENGERS[id] || 4,
    vip: id === 'yukon',
    sortOrder: index,
    active: true,
    forms: { booking: true, instantPrice: true, religiousTours: true },
  }));
}

export function setLiveCarCatalog(cars = []) {
  const map = {};
  (cars || []).forEach((car) => {
    const id = String(car?.id || car?.key || '').trim();
    if (!id) return;
    map[id] = {
      id,
      nameEn: car.nameEn || car.modelEn || SHORT_NAMES[id]?.en || id,
      nameAr: car.nameAr || car.modelAr || SHORT_NAMES[id]?.ar || id,
      modelEn: car.modelEn || car.nameEn || SHORT_NAMES[id]?.en || id,
      modelAr: car.modelAr || car.nameAr || SHORT_NAMES[id]?.ar || id,
      imageUrl: preferBundledCarImage(id, car.imageUrl),
      categoryHeroImageUrl: preferBundledCarImage(
        id,
        car.categoryHeroImageUrl || car.imageUrl,
      ),
      passengers: Number(car.passengers) || CAR_PASSENGERS[id] || 4,
      vip: Boolean(car.vip ?? id === 'yukon'),
      sortOrder: Number.isFinite(Number(car.sortOrder)) ? Number(car.sortOrder) : 0,
      active: car.active !== false,
      forms: car.forms || { booking: true, instantPrice: true, religiousTours: true },
      updatedAt: car.updatedAt || null,
    };
  });
  LIVE_CAR_CATALOG = map;
}

/** Ordered catalog for booking forms — SuperAdmin vehicles overlay defaults; inactive kept for admin. */
export function getLiveCarCatalog() {
  const defaults = getDefaultCarCatalog();
  const byId = new Map(defaults.map((c) => [c.id, { ...c }]));

  Object.values(LIVE_CAR_CATALOG).forEach((live) => {
    const base = byId.get(live.id) || {
      id: live.id,
      nameEn: live.nameEn,
      nameAr: live.nameAr,
      modelEn: live.modelEn,
      modelAr: live.modelAr,
      imageUrl: live.imageUrl,
      passengers: live.passengers,
      vip: live.vip,
      sortOrder: live.sortOrder,
      active: true,
    };
    byId.set(live.id, {
      ...base,
      ...live,
      id: live.id,
    });
  });

  const ordered = BOOKING_CAR_TYPES
    .map((id) => byId.get(id))
    .filter(Boolean);
  const extras = [...byId.values()]
    .filter((c) => !BOOKING_CAR_TYPES.includes(c.id))
    .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
  return [...ordered, ...extras];
}

export function getCarCatalogEntry(carKey) {
  const key = String(carKey || '').split('-')[0];
  return LIVE_CAR_CATALOG[key] || getDefaultCarCatalog().find((c) => c.id === key) || null;
}

export function getCarDisplayName(carKey, lang = 'ar') {
  const key = String(carKey || '').split('-')[0];
  const live = LIVE_CAR_CATALOG[key];
  if (live) {
    if (lang === 'ar') return live.nameAr || live.nameEn || key;
    return live.nameEn || live.nameAr || key;
  }
  return SHORT_NAMES[key]?.[lang] || SHORT_NAMES[key]?.en || key;
}

function isUsableImageUrl(url) {
  const value = String(url || '').trim();
  if (!value) return false;
  // Prefer local + https; skip known-dead remote vehicle CDN paths when local exists.
  if (value.startsWith('/')) return true;
  if (value.includes('supabase.co/storage') && value.includes('vehicle-images')) return false;
  return /^https?:\/\//i.test(value);
}

export function getCarImage(carKey) {
  const key = String(carKey || '').split('-')[0];
  const live = LIVE_CAR_CATALOG[key]?.imageUrl;
  if (isUsableImageUrl(live)) return preferBundledCarImage(key, live);
  return preferBundledCarImage(key, '');
}

/** Resolve product/car thumb with local fallback for admin tables. */
export function resolveCarThumb(carKey, productImageUrl) {
  const key = String(carKey || '').split('-')[0];
  if (isUsableImageUrl(productImageUrl)) {
    return preferBundledCarImage(key, productImageUrl);
  }
  return getCarImage(key);
}

/**
 * Round-trip pickup/dropoff — airports + train stations
 * الاستقبال والتوديع بالمطارات + الاستقبال والتوديع بمحطات القطار
 */
export const ROUND_TRIP_CARS = ['taurus', 'camry', 'staria', 'yukon', 'hiace'];

const RT_CAR_META = {
  taurus: { nameAr: SHORT_NAMES.taurus.ar, nameEn: SHORT_NAMES.taurus.en, passengers: 4, vip: false },
  camry: { nameAr: SHORT_NAMES.camry.ar, nameEn: SHORT_NAMES.camry.en, passengers: 4, vip: false },
  staria: { nameAr: SHORT_NAMES.staria.ar, nameEn: SHORT_NAMES.staria.en, passengers: 7, vip: false },
  yukon: { nameAr: SHORT_NAMES.yukon.ar, nameEn: SHORT_NAMES.yukon.en, passengers: 7, vip: true },
  hiace: { nameAr: SHORT_NAMES.hiace.ar, nameEn: SHORT_NAMES.hiace.en, passengers: 10, vip: false },
};

/** Train station routes only (الاستقبال والتوديع بمحطات القطار) */
export const ROUND_TRIP_TRAIN_ONLY = [
  {
    id: 'rt-train-makkah',
    title: { ar: 'محطة مكة (الرصيفة) ↔ فندق مكة', en: 'Makkah Train Station (Al-Rusaifah) ↔ Makkah Hotel' },
    pickupLabel: { ar: 'محطة مكة (الرصيفة) ← (إلى فندقك في مكة)', en: 'Makkah Train Station → Your Makkah Hotel' },
    dropoffLabel: { ar: '(مكة) ← محطة مكة (الرصيفة)', en: 'Your Makkah Hotel → Makkah Train Station' },
    cityFrom: '1',
    cityTo: '1',
    category: 'train',
    prices: {
      taurus: { pickup: 150, dropoff: 150 },
      camry: { pickup: 130, dropoff: 130 },
      staria: { pickup: 200, dropoff: 200 },
      yukon: { pickup: 250, dropoff: 250 },
      hiace: { pickup: 250, dropoff: 250 },
    },
  },
  {
    id: 'rt-train-madinah',
    title: { ar: 'محطة المدينة ↔ فندق المدينة', en: 'Madinah Train Station ↔ Madinah Hotel' },
    pickupLabel: { ar: 'محطة المدينة ← (إلى فندقك في المدينة)', en: 'Madinah Train Station → Your Madinah Hotel' },
    dropoffLabel: { ar: '(المدينة) ← محطة المدينة', en: 'Your Madinah Hotel → Madinah Train Station' },
    cityFrom: '5',
    cityTo: '5',
    category: 'train',
    prices: {
      taurus: { pickup: 150, dropoff: 150 },
      camry: { pickup: 130, dropoff: 130 },
      staria: { pickup: 200, dropoff: 200 },
      yukon: { pickup: 250, dropoff: 250 },
      hiace: { pickup: 250, dropoff: 250 },
    },
  },
  {
    id: 'rt-train-jeddah-airport',
    title: { ar: 'محطة مطار الملك عبدالعزيز (جدة) ↔ جدة', en: 'King Abdulaziz Airport Train Station (Jeddah) ↔ Jeddah' },
    pickupLabel: { ar: 'محطة مطار الملك عبدالعزيز (جدة) (إلى وجهتك في جدة)', en: 'Jeddah Airport Train Station → Your Jeddah Destination' },
    dropoffLabel: { ar: 'جدة ← محطة مطار الملك عبدالعزيز (جدة)', en: 'Your Jeddah Destination → Jeddah Airport Train Station' },
    cityFrom: '2',
    cityTo: '2',
    category: 'train',
    prices: {
      taurus: { pickup: 150, dropoff: 150 },
      camry: { pickup: 130, dropoff: 130 },
      staria: { pickup: 180, dropoff: 180 },
      yukon: { pickup: 250, dropoff: 250 },
      hiace: { pickup: 250, dropoff: 250 },
    },
  },
  {
    id: 'rt-jeddah-makkah',
    title: { ar: 'محطة جدة (السليمانية) ↔ مكة', en: 'Jeddah Train Station (Sulaimaniyah) ↔ Makkah' },
    pickupLabel: { ar: 'محطة جدة (السليمانية) (إلى مكة)', en: 'Jeddah Train Station (Sulaimaniyah) → Makkah' },
    dropoffLabel: { ar: 'مكة ← محطة جدة (السليمانية)', en: 'Makkah → Jeddah Train Station (Sulaimaniyah)' },
    cityFrom: '2',
    cityTo: '1',
    category: 'train',
    prices: {
      taurus: { pickup: 250, dropoff: 250 },
      camry: { pickup: 230, dropoff: 230 },
      staria: { pickup: 280, dropoff: 280 },
      yukon: { pickup: 430, dropoff: 430 },
      hiace: { pickup: 400, dropoff: 400 },
    },
  },
  {
    id: 'rt-jeddah-taif',
    title: { ar: 'محطة جدة (السليمانية) ↔ الطائف', en: 'Jeddah Train Station (Sulaimaniyah) ↔ Taif' },
    pickupLabel: { ar: 'محطة جدة (السليمانية) (إلى الطائف)', en: 'Jeddah Train Station (Sulaimaniyah) → Taif' },
    dropoffLabel: { ar: 'الطائف ← محطة جدة (السليمانية)', en: 'Taif → Jeddah Train Station (Sulaimaniyah)' },
    cityFrom: '2',
    cityTo: '3',
    category: 'train',
    prices: {
      taurus: { pickup: 380, dropoff: 380 },
      camry: { pickup: 350, dropoff: 350 },
      staria: { pickup: 460, dropoff: 460 },
      yukon: { pickup: 750, dropoff: 750 },
      hiace: { pickup: 550, dropoff: 550 },
    },
  },
];

/** All round-trip routes: airports first, then train stations */
export const ROUND_TRIP_TRAIN_STATIONS = [...AIRPORT_TRANSFER_ROUTES, ...ROUND_TRIP_TRAIN_ONLY];

export const DEFAULT_ROUND_TRIP_ROUTE = 'rt-jeddah-makkah';

export function getRoundTripStation(routeId) {
  return ROUND_TRIP_TRAIN_STATIONS.find((s) => s.id === routeId)
    || ROUND_TRIP_TRAIN_STATIONS.find((s) => s.id === DEFAULT_ROUND_TRIP_ROUTE);
}

/** From dropdown = الاستقبال (عند الوصول) — Airport / Train prefix */
export function getRoundTripPickupOptions(lang = 'ar') {
  return ROUND_TRIP_TRAIN_STATIONS.map((s) => {
    const prefix = s.category === 'airport'
      ? (lang === 'ar' ? 'مطار · ' : 'Airport · ')
      : (lang === 'ar' ? 'محطة · ' : 'Train · ');
    const base = s.pickupLabel?.[lang] || s.pickupLabel?.ar || s.title[lang] || s.title.ar;
    return { id: s.id, label: `${prefix}${base}`, category: s.category || 'train' };
  });
}

/** To dropdown = التوديع (عند المغادرة) — Airport / Train prefix */
export function getRoundTripDropoffOptions(lang = 'ar') {
  return ROUND_TRIP_TRAIN_STATIONS.map((s) => {
    const prefix = s.category === 'airport'
      ? (lang === 'ar' ? 'مطار · ' : 'Airport · ')
      : (lang === 'ar' ? 'محطة · ' : 'Train · ');
    const base = s.dropoffLabel?.[lang] || s.dropoffLabel?.ar || s.title[lang] || s.title.ar;
    return { id: s.id, label: `${prefix}${base}`, category: s.category || 'train' };
  });
}

const RT_ROUTE_SUFFIX = {
  'rt-airport-jeddah-hotels': 'rt-ajh',
  'rt-airport-jeddah-madinah': 'rt-ajd',
  'rt-airport-jeddah-makkah': 'rt-ajm',
  'rt-airport-madinah-makkah': 'rt-amm',
  'rt-airport-madinah-jeddah': 'rt-amd',
  'rt-airport-taif-makkah': 'rt-atm',
  'rt-train-makkah': 'rt-mk',
  'rt-train-madinah': 'rt-md',
  'rt-train-jeddah-airport': 'rt-ja',
  'rt-jeddah-makkah': 'rt-jm',
  'rt-jeddah-taif': 'rt-jt',
};

function buildRoundTripVehicle(carKey, station, prices) {
  const meta = RT_CAR_META[carKey];
  const suffix = RT_ROUTE_SUFFIX[station.id] || station.id.replace(/^rt-/, 'rt-');
  const roundTrip = prices.pickup + prices.dropoff;
  const isAirport = station.category === 'airport';
  return {
    id: `${carKey}-${suffix}`,
    name: {
      ar: `${meta.nameAr} — ${station.title.ar}`,
      en: `${meta.nameEn} — ${station.title.en}`,
    },
    image: VEHICLE_IMAGES[carKey] || VEHICLE_IMAGES.camry,
    passengers: meta.passengers,
    badge: isAirport
      ? { ar: 'مطار — استقبال وتوديع', en: 'Airport Pickup & Drop-off' }
      : { ar: 'محطة قطار — ذهاب وعودة', en: 'Train Station Round Trip' },
    brandTag: { ar: 'بشاير العطاء', en: 'Bashayer Logistics' },
    price: roundTrip,
    originalPrice: roundTrip,
    pickupPrice: prices.pickup,
    dropoffPrice: prices.dropoff,
    vip: meta.vip,
    hidePrice: false,
    tripType: 'round_trip',
    category: station.category || 'train',
    description: VEHICLE_DESC,
  };
}

export const ROUND_TRIP_FLEET_ROUTES = ROUND_TRIP_TRAIN_STATIONS.map((station) => ({
  id: station.id,
  title: station.title,
  pickupLabel: station.pickupLabel,
  dropoffLabel: station.dropoffLabel,
  tripType: 'round_trip',
  category: station.category || 'train',
  vehicles: ROUND_TRIP_CARS.map((carKey) =>
    buildRoundTripVehicle(carKey, station, station.prices[carKey]),
  ),
}));

export function getRoundTripRouteForCities(from, to) {
  const pair = `${from}-${to}`;
  const reverse = `${to}-${from}`;
  const matchIn = (list) => {
    for (const station of list) {
      const fwd = `${station.cityFrom}-${station.cityTo}`;
      const rev = `${station.cityTo}-${station.cityFrom}`;
      if (pair === fwd || pair === rev || reverse === fwd || reverse === rev) {
        return station.id;
      }
    }
    return null;
  };
  // Prefer train stations for ambiguous city pairs; airports when only airport matches
  return matchIn(ROUND_TRIP_TRAIN_ONLY) || matchIn(AIRPORT_TRANSFER_ROUTES) || 'rt-jeddah-makkah';
}

export function getVehiclesForRoundTripRoute(routeId) {
  const route = ROUND_TRIP_FLEET_ROUTES.find((r) => r.id === routeId);
  return route?.vehicles || ROUND_TRIP_FLEET_ROUTES.find((r) => r.id === 'rt-jeddah-makkah')?.vehicles || [];
}

export const FLEET_VEHICLES = jeddahMakkahVehicles.map((v, index) => ({
  id: index + 1,
  key: v.id,
  name: SHORT_NAMES[v.id.split('-')[0]] || v.name,
  fullName: v.name,
  image: v.image,
  passengers: v.passengers,
  price: v.price,
  originalPrice: v.originalPrice,
  badge: v.badge,
  description: v.description,
}));

export function getVehiclesForRoute(routeId = 'ow-2-1') {
  const route = FLEET_ROUTES.find((r) => r.id === routeId);
  return route?.vehicles || FLEET_ROUTES.find((r) => r.id === 'ow-2-1')?.vehicles || FLEET_ROUTES[0]?.vehicles || [];
}

export function getRouteLabel(routeId, lang = 'ar') {
  const fleetRoute = FLEET_ROUTES.find((r) => r.id === routeId);
  if (fleetRoute) return fleetRoute.title[lang] || fleetRoute.title.ar;
  const card = ROUTE_CARDS.find((r) => r.id === routeId);
  if (card) return card.title[lang] || card.title.ar;
  return routeId;
}

export function findVehicleById(vehicleId) {
  const id = String(vehicleId);
  const numeric = FLEET_VEHICLES.find((v) => v.id === Number(vehicleId));
  if (numeric) return numeric;
  for (const route of FLEET_ROUTES) {
    const match = route.vehicles.find((v) => v.id === id);
    if (match) {
      const short = FLEET_VEHICLES.find((v) => v.key === match.id);
      return short ? { ...match, name: short.name, id: short.id } : match;
    }
  }
  return FLEET_VEHICLES[0];
}

export const ROUTE_SEARCH_OPTIONS = ROUTE_CARDS.map((r) => ({
  id: r.id,
  label: r.title,
}));

export const PASSENGER_OPTIONS = [
  { value: '1', ar: 'شخص واحد', en: '1 person' },
  { value: '2', ar: 'شخصين (2)', en: '2 people' },
  { value: '3', ar: '3 أشخاص', en: '3 people' },
  { value: '4', ar: '4 أشخاص', en: '4 people' },
  { value: '5', ar: '5 أشخاص', en: '5 people' },
  { value: '6', ar: '6 أشخاص', en: '6 people' },
  { value: '7', ar: '7 أشخاص (عائلية)', en: '7 people (family)' },
  { value: '8', ar: '8 أشخاص', en: '8 people' },
  { value: '9', ar: '9 أشخاص', en: '9 people' },
  { value: '10', ar: '10 أشخاص فأكثر', en: '10+ people' },
];

const CAR_STAT_SHORT = {
  taurus: { ar: 'تورس', en: 'Taurus' },
  camry: { ar: 'كامري', en: 'Camry' },
  staria: { ar: 'ستاريا', en: 'Staria' },
  yukon: { ar: 'جمس', en: 'GMC' },
  hiace: { ar: 'هايس', en: 'Hiace' },
};

const SERVICE_STAT_SHORT = {
  airport: { ar: 'مطار', en: 'Airport' },
  train: { ar: 'قطار', en: 'Train' },
  intercity: { ar: 'مدن', en: 'Cities' },
  withinCity: { ar: 'داخل', en: 'Within' },
  hourly: { ar: 'ساعة', en: 'Hourly' },
  tours: { ar: 'مزارات', en: 'Ziyarat' },
};

const CORE_CITY_ORDER = ['1', '5', '2', '3']; // Makkah · Madinah · Jeddah · Taif

function uniqueFleetCarKeys(fleetRoutes) {
  const keys = new Set();
  for (const route of fleetRoutes || []) {
    for (const vehicle of route.vehicles || []) {
      const key = String(vehicle.id || vehicle.vehicleKey || '').split('-')[0];
      if (key && CAR_STAT_SHORT[key]) keys.add(key);
    }
  }
  if (keys.size) return BOOKING_CAR_TYPES.filter((k) => keys.has(k));
  return [...BOOKING_CAR_TYPES];
}

function joinStatLabels(items, lang) {
  return items.map((item) => item[lang] || item.en || item.ar).filter(Boolean).join(' · ');
}

/** Homepage trust stats — counts/names derived from live fleet + services when available. */
export function buildHomeStats({ services, fleetRoutes } = {}) {
  const carKeys = uniqueFleetCarKeys(fleetRoutes);
  const carLabels = carKeys.map((key) => CAR_STAT_SHORT[key]).filter(Boolean);

  const cityMeta = CORE_CITY_ORDER
    .map((id) => BETWEEN_CITY_META[id] || BETWEEN_CITY_META[Number(id)])
    .filter(Boolean);
  const cityLabels = cityMeta.map((c) => ({ ar: c.ar, en: c.en }));

  const serviceSource = services?.length ? services : SERVICES;
  const serviceLabels = serviceSource.map((service) => {
    const short = SERVICE_STAT_SHORT[service.category];
    if (short) return short;
    return {
      ar: service.title?.ar?.split(' ')[0] || '',
      en: service.title?.en?.split(' ')[0] || '',
    };
  }).filter((l) => l.ar || l.en);

  const carCount = carKeys.length;
  const cityCount = cityLabels.length || ONE_WAY_CITIES.length;
  const serviceCount = serviceLabels.length || SERVICES.length;

  return [
    { value: '4.8/5', label: { ar: 'تقييم العملاء', en: 'Customer Rating' }, desc: { ar: 'تميز معترف به من عملائنا', en: 'Recognized excellence from our clients' } },
    { value: '24/7', label: { ar: 'خدمة متواصلة', en: '24/7 Service' }, desc: { ar: 'متاحون في أي وقت تحتاجونا', en: 'Available whenever you need us' } },
    { value: '5+', label: { ar: 'سنوات خبرة', en: 'Years Experience' }, desc: { ar: 'خبرة طويلة في خدمة النقل', en: 'Long experience in transport services' } },
    {
      value: String(carCount),
      label: { ar: 'سيارة حديثة', en: 'Modern Vehicles' },
      desc: { ar: 'مركبات معقمة ومجهزة بالكامل', en: 'Fully equipped sanitized vehicles' },
    },
    { value: '100%', label: { ar: 'نقل آمن', en: 'Safe Transport' }, desc: { ar: 'تأمين شامل متوافق مع الأنظمة', en: 'Full insurance compliant with regulations' } },
    {
      value: String(cityCount),
      label: { ar: 'مدن رئيسية', en: 'Core Cities' },
      desc: {
        ar: joinStatLabels(cityLabels, 'ar') || 'مكة · المدينة · جدة · الطائف',
        en: joinStatLabels(cityLabels, 'en') || 'Makkah · Madinah · Jeddah · Taif',
      },
    },
    {
      value: String(carCount),
      label: { ar: 'سيارات 2026', en: '2026 Cars' },
      desc: {
        ar: joinStatLabels(carLabels, 'ar') || 'تورس · كامري · ستاريا · جمس · هايس',
        en: joinStatLabels(carLabels, 'en') || 'Taurus · Camry · Staria · GMC · Hiace',
      },
    },
    {
      value: String(serviceCount),
      label: { ar: 'أنواع الخدمات', en: 'Service Types' },
      desc: {
        ar: joinStatLabels(serviceLabels, 'ar') || 'مطار · قطار · مدن · داخل · ساعة · مزارات',
        en: joinStatLabels(serviceLabels, 'en') || 'Airport · Train · Cities · Within · Hourly · Ziyarat',
      },
    },
  ];
}

export const HOME_STATS = buildHomeStats();

/**
 * Homepage blogs = 6 SuperAdmin service guides (same order & headings).
 * City to City · Airport · Train · Within City · Hourly · Ziyarat
 */
const BLOG_SERVICE_GUIDES = [
  {
    serviceId: 'cityToCity',
    routeCardId: 'city-to-city',
    badge: { ar: 'التنقل بين المدن', en: 'City to City' },
    title: { ar: 'التنقل بين المدن', en: 'City to City' },
    date: { ar: '١٣ أغسطس ٢٠٢٦', en: 'Aug 13, 2026' },
    image: 'https://i.ibb.co/wFH4TqcQ/2026-08-17-T104137-138.jpg',
  },
  {
    serviceId: 'airport',
    routeCardId: 'airport',
    badge: { ar: 'المطارات', en: 'Airport' },
    title: { ar: 'المطارات', en: 'Airport' },
    date: { ar: '١٢ أغسطس ٢٠٢٦', en: 'Aug 12, 2026' },
    image: 'https://i.ibb.co/Xx747nYp/2026-08-17-T095138-387.jpg',
  },
  {
    serviceId: 'train',
    routeCardId: 'train',
    badge: { ar: 'محطات القطار', en: 'Train' },
    title: { ar: 'محطات القطار', en: 'Train' },
    date: { ar: '١١ أغسطس ٢٠٢٦', en: 'Aug 11, 2026' },
    image: 'https://i.ibb.co/pjRz32r6/2026-08-17-T085037-319.jpg',
  },
  {
    serviceId: 'withinCity',
    routeCardId: 'within-city',
    badge: { ar: 'داخل المدينة', en: 'Within City' },
    title: { ar: 'داخل المدينة', en: 'Within City' },
    date: { ar: '١٠ أغسطس ٢٠٢٦', en: 'Aug 10, 2026' },
    image: 'https://i.ibb.co/svNvpbDQ/2026-08-17-T115255-169.jpg',
  },
  {
    serviceId: 'hourly',
    routeCardId: 'hourly',
    badge: { ar: 'بالساعة', en: 'Hourly' },
    title: { ar: 'بالساعة', en: 'Hourly' },
    date: { ar: '٩ أغسطس ٢٠٢٦', en: 'Aug 9, 2026' },
    image: 'https://i.ibb.co/sp2qjPkz/2026-08-17-T110153-915.jpg',
  },
  {
    serviceId: 'ziyarat',
    routeCardId: 'ziyarat',
    badge: { ar: 'الزيارات', en: 'Ziyarat' },
    title: { ar: 'الزيارات', en: 'Ziyarat' },
    date: { ar: '٨ أغسطس ٢٠٢٦', en: 'Aug 8, 2026' },
    image: 'https://i.ibb.co/wr0nP8DT/2026-08-17-T115852-816.jpg',
  },
];

export const BLOG_POSTS = BLOG_SERVICE_GUIDES.map((guide) => {
  const card = ROUTE_CARDS.find((c) => c.id === guide.routeCardId) || ROUTE_CARDS[0];
  return {
    id: guide.serviceId,
    serviceId: guide.serviceId,
    badge: guide.badge,
    date: guide.date,
    title: guide.title,
    excerpt: card.description,
    content: card.description,
    image: guide.image || card.image,
  };
});

/** Catalog = same 6 services as Featured Routes (sheet min priceFrom, 5 cars). */
/** Exactly 6 catalog cards — one per filter (matches Six Ways / SuperAdmin services). */
export const SERVICE_CATALOG = [
  {
    id: 'airport',
    category: 'airport',
    title: ROUTE_CARDS[0].title,
    description: ROUTE_CARDS[0].description,
    image: ROUTE_CARDS[0].image,
    imageFallback: ROUTE_CARDS[0].imageFallback,
    priceFrom: 150,
  },
  {
    id: 'train',
    category: 'train',
    title: ROUTE_CARDS[1].title,
    description: ROUTE_CARDS[1].description,
    image: ROUTE_CARDS[1].image,
    imageFallback: ROUTE_CARDS[1].imageFallback,
    priceFrom: 130,
  },
  {
    id: 'city-to-city',
    category: 'intercity',
    title: ROUTE_CARDS[2].title,
    description: ROUTE_CARDS[2].description,
    image: ROUTE_CARDS[2].image,
    imageFallback: ROUTE_CARDS[2].imageFallback,
    priceFrom: 230,
  },
  {
    id: 'within-city',
    category: 'withinCity',
    title: ROUTE_CARDS[3].title,
    description: ROUTE_CARDS[3].description,
    image: ROUTE_CARDS[3].image,
    imageFallback: ROUTE_CARDS[3].imageFallback,
    priceFrom: 230,
  },
  {
    id: 'hourly',
    category: 'hourly',
    title: ROUTE_CARDS[4].title,
    description: ROUTE_CARDS[4].description,
    image: ROUTE_CARDS[4].image,
    imageFallback: ROUTE_CARDS[4].imageFallback,
    priceFrom: 280,
  },
  {
    id: 'ziyarat',
    category: 'tours',
    title: ROUTE_CARDS[5].title,
    description: ROUTE_CARDS[5].description,
    image: ROUTE_CARDS[5].image,
    imageFallback: ROUTE_CARDS[5].imageFallback,
    priceFrom: 230,
  },
];

export const SERVICE_CATALOG_FILTERS = [
  { id: 'all', ar: 'كل الخدمات', en: 'All Services' },
  { id: 'airport', ar: 'مطارات', en: 'Airports' },
  { id: 'train', ar: 'قطار الحرمين', en: 'Train' },
  { id: 'intercity', ar: 'بين المدن', en: 'Cities' },
  { id: 'withinCity', ar: 'داخل المدينة', en: 'Within City' },
  { id: 'hourly', ar: 'بالساعة', en: 'Hourly' },
  { id: 'tours', ar: 'مزارات', en: 'Ziyarat' },
];

/** Canonical Six Ways categories — one card each in filters / SuperAdmin. */
export const SERVICE_CATEGORIES = [
  'airport',
  'train',
  'intercity',
  'withinCity',
  'hourly',
  'tours',
];

export const ROUTES = [
  {
    id: 1,
    from: { ar: 'جدة', en: 'Jeddah', icon: 'plane' },
    to: { ar: 'مكة المكرمة', en: 'Makkah', icon: 'kaaba' },
    distance: 85,
    duration: '1:00',
    tripsPerDay: 50,
    price: 230,
    popular: true,
    gradient: 'from-blue-500 via-secondary-500 to-yellow-500',
    fromColor: 'blue',
    toColor: 'yellow',
  },
  {
    id: 2,
    from: { ar: 'جدة', en: 'Jeddah', icon: 'plane' },
    to: { ar: 'المدينة المنورة', en: 'Madinah', icon: 'mosque' },
    distance: 420,
    duration: '4:30',
    tripsPerDay: 30,
    price: 450,
    popular: false,
    gradient: 'from-blue-500 via-secondary-500 to-green-500',
    fromColor: 'blue',
    toColor: 'green',
  },
  {
    id: 3,
    from: { ar: 'مكة المكرمة', en: 'Makkah', icon: 'kaaba' },
    to: { ar: 'المدينة المنورة', en: 'Madinah', icon: 'mosque' },
    distance: 450,
    duration: '4:45',
    tripsPerDay: 40,
    price: 450,
    popular: false,
    gradient: 'from-yellow-500 via-secondary-500 to-green-500',
    fromColor: 'yellow',
    toColor: 'green',
  },
];

export const BOOKING_STEPS = [
  {
    number: '01',
    color: 'secondary',
    icon: 'calendar',
    title: { ar: 'حدد التاريخ', en: 'Choose Date' },
    description: { ar: 'اختر تاريخ ووقت الرحلة، وحدد مكان الاستلام والتوصيل', en: 'Choose trip date and time, and specify pickup and drop-off locations' },
    tags: [
      { ar: 'تقويم مرن', en: 'Flexible calendar' },
      { ar: 'حجز مسبق', en: 'Advance booking' },
      { ar: 'خدمة 24/7', en: '24/7 service' },
    ],
    tip: { ar: 'يمكنك الحجز قبل 6 أشهر أو في نفس اليوم', en: 'You can book up to 6 months in advance or same day' },
  },
  {
    number: '02',
    color: 'primary',
    icon: 'car',
    title: { ar: 'اختر السيارة', en: 'Choose Vehicle' },
    description: { ar: 'تصفح أسطولنا المتنوع واختر السيارة التي تناسب احتياجاتك', en: 'Browse our diverse fleet and choose the vehicle that suits your needs' },
    tags: [
      { ar: 'سيارات متنوعة', en: 'Various vehicles' },
      { ar: 'صور حقيقية', en: 'Real photos' },
      { ar: 'مواصفات كاملة', en: 'Full specifications' },
    ],
    tip: { ar: 'نوفر سيارات اقتصادية، عائلية، VIP، وحافلات', en: 'We offer economy, family, VIP cars and buses' },
  },
  {
    number: '03',
    color: 'blue',
    icon: 'credit-card',
    title: { ar: 'أكد الحجز', en: 'Confirm Booking' },
    description: { ar: 'أدخل بياناتك وأكد الحجز عبر الدفع الآمن أو عند الوصول', en: 'Enter your details and confirm booking via secure payment or on arrival' },
    tags: [
      { ar: 'دفع آمن', en: 'Secure payment' },
      { ar: 'تأكيد فوري', en: 'Instant confirmation' },
      { ar: 'فاتورة إلكترونية', en: 'E-invoice' },
    ],
    tip: { ar: 'نقبل النقدي، البطاقات، و Apple Pay', en: 'We accept cash, cards, and Apple Pay' },
  },
  {
    number: '04',
    color: 'green',
    icon: 'check',
    title: { ar: 'استمتع برحلتك', en: 'Enjoy Your Trip' },
    description: { ar: 'سيصل سائقنا في الموعد المحدد لرحلة آمنة ومريحة', en: 'Our driver will arrive on time for a safe and comfortable trip' },
    tags: [
      { ar: 'وصول في الموعد', en: 'On-time arrival' },
      { ar: 'سائق محترف', en: 'Professional driver' },
      { ar: 'راحة تامة', en: 'Full comfort' },
    ],
    tip: { ar: 'ستتلقى تأكيداً مع تفاصيل السائق', en: 'You will receive confirmation with driver details' },
  },
];

export const TESTIMONIALS = [
  {
    id: 1,
    name: { ar: 'أحمد محمد الغامدي', en: 'Ahmed Mohammed Al-Ghamdi' },
    location: { ar: 'الرياض، السعودية', en: 'Riyadh, Saudi Arabia' },
    role: { ar: 'مدير شركة', en: 'Company Manager' },
    rating: 5,
    text: { ar: 'تجربة رائعة مع بشاير العطاء! السائق كان محترفاً جداً والسيارة نظيفة ومريحة. وصلنا في الموعد المحدد بدون أي تأخير.', en: 'Amazing experience with Bashayer Al-Ataa! The driver was very professional and the car was clean and comfortable. We arrived on time without any delay.' },
    route: { ar: 'نقل من مطار جدة إلى مكة المكرمة', en: 'Jeddah Airport to Makkah transfer' },
    date: { ar: '14 ديسمبر 2025', en: 'December 14, 2025' },
    verified: true,
  },
  {
    id: 2,
    name: { ar: 'محمد عبدالغفار', en: 'Mohammed Abdulghaffar' },
    location: { ar: 'مكة', en: 'Makkah' },
    role: { ar: 'عميل متميز', en: 'Premium Customer' },
    rating: 5,
    text: { ar: 'ماشاء الله عليهم تعامل راقي جدا', en: 'Mashallah, very classy treatment' },
    route: { ar: 'نقل بين مكة والمدينة', en: 'Makkah to Madinah transfer' },
    date: { ar: '11 يناير 2026', en: 'January 11, 2026' },
    verified: false,
  },
  {
    id: 3,
    name: { ar: 'فاطمة عبدالله السيد', en: 'Fatima Abdullah Al-Sayed' },
    location: { ar: 'المدينة المنورة، السعودية', en: 'Madinah, Saudi Arabia' },
    role: { ar: 'ربة منزل', en: 'Homemaker' },
    rating: 5,
    text: { ar: 'كانت رحلة العمرة مريحة جداً بفضل خدماتكم المميزة. السائق كان ملتزماً بالمواعيد ومتعاوناً. السيارة فاخرة ونظيفة. شكراً لكم على هذه التجربة الرائعة.', en: 'The Umrah trip was very comfortable thanks to your excellent services. The driver was punctual and cooperative. The car was luxurious and clean. Thank you for this wonderful experience.' },
    route: { ar: 'رحلة عمرة - مكة والمدينة', en: 'Umrah trip - Makkah and Madinah' },
    date: { ar: '09 ديسمبر 2025', en: 'December 9, 2025' },
    verified: true,
  },
  {
    id: 4,
    name: { ar: 'خالد سعد العتيبي', en: 'Khalid Saad Al-Otaibi' },
    location: { ar: 'جدة، السعودية', en: 'Jeddah, Saudi Arabia' },
    role: { ar: 'موظف', en: 'Employee' },
    rating: 5,
    text: { ar: 'استخدمت خدماتهم عدة مرات ولم يخذلوني أبداً. دائماً في الموعد، السيارات نظيفة، والأسعار معقولة جداً.', en: 'I have used their services several times and they never let me down. Always on time, clean cars, and very reasonable prices.' },
    route: { ar: 'تنقلات يومية في مكة', en: 'Daily trips in Makkah' },
    date: { ar: '07 ديسمبر 2025', en: 'December 7, 2025' },
    verified: true,
  },
  {
    id: 5,
    name: { ar: 'نورة محمد الشهري', en: 'Noura Mohammed Al-Shahri' },
    location: { ar: 'الدمام، السعودية', en: 'Dammam, Saudi Arabia' },
    role: { ar: 'معلمة', en: 'Teacher' },
    rating: 4,
    text: { ar: 'حجزت لعائلتي سيارة كبيرة للتنقل بين مكة والمدينة. كانت الرحلة مريحة جداً والسائق متعاون ويعرف الطرق جيداً.', en: 'I booked a large car for my family to travel between Makkah and Madinah. The trip was very comfortable and the driver was cooperative and knew the routes well.' },
    route: { ar: 'نقل عائلي - مكة إلى المدينة', en: 'Family transfer - Makkah to Madinah' },
    date: { ar: '04 ديسمبر 2025', en: 'December 4, 2025' },
    verified: true,
  },
];

export const FAQ_ITEMS = [
  { id: 1, category: 'booking', featured: true, icon: 'calendar', color: 'primary', image: FAQ_IMAGES.booking, question: { ar: 'كيف يمكنني حجز رحلة؟', en: 'How can I book a trip?' }, answer: { ar: 'اختر نوع الحجز من النموذج: التنقل بين المدن، ذهاب وعودة (مطارات وقطارات)، بالساعة (داخل المدينة والمزارات)، أو رحلتك بسعرك — ثم ابحث واحجز. أو تواصل عبر واتساب على مدار الساعة.', en: 'Choose a booking type: Moving Between Cities, Round Trip (airports & trains), Hourly (within city & Ziyarat), or Your Price — then search and book. Or contact us on WhatsApp 24/7.' } },
  { id: 2, category: 'booking', featured: false, icon: 'calendar', color: 'primary', question: { ar: 'ما هي طرق الدفع المتاحة؟', en: 'What payment methods are available?' }, answer: { ar: 'نقبل جميع طرق الدفع: نقداً للسائق، تحويل بنكي، بطاقات الائتمان (فيزا/ماستركارد)، Apple Pay، و STC Pay.', en: 'We accept all payment methods: cash to driver, bank transfer, credit cards (Visa/Mastercard), Apple Pay, and STC Pay.' } },
  { id: 3, category: 'booking', featured: true, icon: 'calendar', color: 'primary', image: FAQ_IMAGES.cancel, question: { ar: 'هل يمكنني إلغاء أو تعديل الحجز؟', en: 'Can I cancel or modify my booking?' }, answer: { ar: 'نعم، يمكنك إلغاء أو تعديل حجزك مجاناً قبل موعد الرحلة بـ 24 ساعة.', en: 'Yes, you can cancel or modify your booking free of charge 24 hours before the trip.' } },
  { id: 4, category: 'services', featured: true, icon: 'concierge', color: 'secondary', image: FAQ_IMAGES.cities, question: { ar: 'ما هي الخدمات والمدن التي تغطونها؟', en: 'Which services and cities do you cover?' }, answer: { ar: 'نغطي مكة والمدينة وجدة والطائف: استقبال المطارات، محطات قطار الحرمين، التنقل بين المدن، مشاوير داخل المدينة، استئجار 4/8/12 ساعة، وجولات المزارات — بـ 5 سيارات 2026.', en: 'We cover Makkah, Madinah, Jeddah and Taif: airport reception, Haramain train stations, moving between cities, within-city trips, 4/8/12 hour rental, and Ziyarat tours — with five 2026 cars.' } },
  { id: 5, category: 'trips', featured: true, icon: 'route', color: 'blue', image: FAQ_IMAGES.jeddahMakkah, question: { ar: 'كم سعر مطار جدة إلى مكة أو التنقل بين المدن؟', en: 'What is the price from Jeddah Airport to Makkah or between cities?' }, answer: { ar: 'الأسعار حسب السيارة والمسار — مثال: كامري مطار جدة→مكة استقبال 250 / توديع 230، والتنقل مكة↔جدة من 230. استخدم نموذج السعر الفوري لعرض السعر المباشر.', en: 'Prices depend on car and route — e.g. Camry Jeddah Airport→Makkah pickup 250 / drop-off 230, and Makkah↔Jeddah from 230. Use Instant Price for the live quote.' } },
  { id: 6, category: 'general', featured: true, icon: 'info', color: 'green', image: FAQ_IMAGES.tax, question: { ar: 'هل الأسعار تشمل الضريبة؟', en: 'Do prices include tax?' }, answer: { ar: 'نعم، الأسعار المعروضة نهائية وتشمل الضرائب ورسوم الطريق وأجرة السائق — بدون إضافة ضريبة منفصلة عند الدفع. لطلبات مخصصة استخدم «رحلتك بسعرك».', en: 'Yes. Displayed prices are final and include taxes, road tolls, and driver fees — no separate tax is added at checkout. Use Your Price for custom quotes.' } },
];

export const SOCIAL_LINKS = [
  {
    id: 'facebook',
    name: { en: 'Facebook', ar: 'فيسبوك' },
    platform: 'facebook',
    url: 'https://www.facebook.com/',
    iconUrl: '',
    icon: 'facebook',
  },
  {
    id: 'youtube',
    name: { en: 'YouTube', ar: 'يوتيوب' },
    platform: 'youtube',
    url: 'https://www.youtube.com/',
    iconUrl: '',
    icon: 'youtube',
  },
  {
    id: 'tiktok',
    name: { en: 'TikTok', ar: 'تيك توك' },
    platform: 'tiktok',
    url: 'https://www.tiktok.com/@',
    iconUrl: '',
    icon: 'tiktok',
  },
  {
    id: 'snapchat',
    name: { en: 'Snapchat', ar: 'سناب شات' },
    platform: 'snapchat',
    url: 'https://www.snapchat.com/add/',
    iconUrl: '',
    icon: 'snapchat',
  },
];

const PLACEHOLDER_SOCIAL_HOSTS = {
  twitter: ['twitter.com', 'www.twitter.com', 'x.com', 'www.x.com'],
  instagram: ['instagram.com', 'www.instagram.com'],
};

function socialPlatformKey(link) {
  const key = String(link?.platform || link?.icon || link?.id || '').toLowerCase();
  return key === 'x' ? 'twitter' : key;
}

/** Hide leftover Twitter / Instagram homepage seeds until Superadmin adds a real profile URL. */
export function isPlaceholderSocialUrl(platform, url) {
  const key = String(platform || '').toLowerCase() === 'x' ? 'twitter' : String(platform || '').toLowerCase();
  const hosts = PLACEHOLDER_SOCIAL_HOSTS[key];
  if (!hosts) return false;
  const raw = String(url || '').trim();
  if (!raw) return true;
  try {
    const parsed = new URL(raw);
    const path = parsed.pathname.replace(/\/+$/, '');
    return hosts.includes(parsed.hostname.toLowerCase()) && !path;
  } catch {
    return true;
  }
}

/** Keep live CMS links, drop placeholder Insta/Twitter, then append missing defaults. */
export function mergeSocialLinks(live, defaults = SOCIAL_LINKS) {
  const source = Array.isArray(live) && live.length ? live : [...defaults];
  const visible = source.filter((item) => !isPlaceholderSocialUrl(socialPlatformKey(item), item.url));
  const base = visible.length ? visible : [...defaults];
  const seen = new Set(base.map(socialPlatformKey).filter(Boolean));
  const extra = defaults.filter((item) => {
    const key = socialPlatformKey(item);
    return key && !seen.has(key);
  });
  return extra.length ? [...base, ...extra] : base;
}

export const CONTACT = {
  phone: '+966577469103',
  email: 'bashayer.logistics@gmail.com',
  whatsapp: 'https://wa.me/+966577469103',
  commercialReg: '4031282293',
  knownNumber: '316288',
};

export const BRAND = {
  name: { ar: 'شركة بشاير العطاء للنقل البري', en: 'Bashayer Al-Ataa Land Transport Company' },
  shortName: { ar: 'بشاير العطاء', en: 'Bashayer Al-Ataa' },
  tagline: { ar: 'للنقل البري', en: 'Land Transport' },
  email: 'bashayer.logistics@gmail.com',
};

export const LOGO_URL = '/images/logo.svg';
export const LOGO_LIGHT_URL = '/images/logo-light.svg';
export const LOGO_BADGE_URL = '/images/logo-badge.svg';
export const LOGO_BADGE_LIGHT_URL = '/images/logo-badge-light.svg';
export const HERO_GRADIENT = '/images/hero-gradient.svg';
export const HERO_IMAGE = '/images/hero-desktop.webp';
export const HERO_IMAGE_MOBILE = '/images/hero-mobile.webp';
export const HERO_IMAGE_FALLBACK = '/images/hero-desktop.jpg';
export const HERO_IMAGE_MOBILE_FALLBACK = '/images/hero-mobile.jpg';
export const HERO_VIDEO =
  'https://videos.pexels.com/video-files/3045163/3045163-sd_640_360_25fps.mp4';

/** Gallery page — keep media light (SD only; UHD blanks the page on slow networks). */
export const GALLERY_HERO_VIDEO =
  'https://videos.pexels.com/video-files/3045163/3045163-sd_640_360_25fps.mp4';
export const GALLERY_HERO_POSTER = HERO_IMAGE;
export const GALLERY_HERO_POSTER_MOBILE = HERO_IMAGE_MOBILE;

export const DEFAULT_GALLERY_ITEMS = [
  {
    id: 'g1',
    titleEn: 'Makkah Al-Mukarramah',
    titleAr: 'مكة المكرمة',
    subtitleEn: 'Sacred city transfers · Hotel & Haram area',
    subtitleAr: 'تنقلات المدينة المقدسة · الفندق ومنطقة الحرم',
    locationEn: 'Makkah',
    locationAr: 'مكة',
    category: 'city',
    mediaType: 'image',
    imageUrl: GALLERY_IMAGES.makkah,
    videoUrl: '',
    posterUrl: GALLERY_IMAGES.makkah,
    metaEn: 'Haram · VIP',
    metaAr: 'الحرم · VIP',
    sortOrder: 0,
    active: true,
  },
  {
    id: 'g2',
    titleEn: 'Madinah Al-Munawwarah',
    titleAr: 'المدينة المنورة',
    subtitleEn: 'Comfortable rides near the Prophets Mosque',
    subtitleAr: 'رحلات مريحة قرب المسجد النبوي',
    locationEn: 'Madinah',
    locationAr: 'المدينة',
    category: 'city',
    mediaType: 'image',
    imageUrl: GALLERY_IMAGES.madinah,
    videoUrl: '',
    posterUrl: GALLERY_IMAGES.madinah,
    metaEn: 'Central · Safe',
    metaAr: 'وسط · آمن',
    sortOrder: 1,
    active: true,
  },
  {
    id: 'g3',
    titleEn: 'Jeddah City & Airport Gate',
    titleAr: 'جدة · المدينة والمطار',
    subtitleEn: 'City hotels, Corniche stops, and airport pickup',
    subtitleAr: 'فنادق المدينة ومحطات الكورنيش واستقبال المطار',
    locationEn: 'Jeddah',
    locationAr: 'جدة',
    category: 'city',
    mediaType: 'image',
    imageUrl: GALLERY_IMAGES.jeddah,
    videoUrl: '',
    posterUrl: GALLERY_IMAGES.jeddah,
    metaEn: 'City · Airport',
    metaAr: 'مدينة · مطار',
    sortOrder: 2,
    active: true,
  },
  {
    id: 'g4',
    titleEn: 'Jeddah Airport Arrival',
    titleAr: 'وصول مطار جدة',
    subtitleEn: 'King Abdulaziz International · Name-board pickup',
    subtitleAr: 'مطار الملك عبدالعزيز الدولي · استقبال بالاسم',
    locationEn: 'Jeddah Airport',
    locationAr: 'مطار جدة',
    category: 'airport',
    mediaType: 'image',
    imageUrl: ROUTE_IMAGES.jeddahMakkah,
    videoUrl: '',
    posterUrl: ROUTE_IMAGES.jeddahMakkah,
    metaEn: '85km · VIP pickup',
    metaAr: '85 كم · استقبال VIP',
    sortOrder: 3,
    active: true,
  },
  {
    id: 'g5',
    titleEn: 'Madinah Airport Transfer',
    titleAr: 'نقل مطار المدينة',
    subtitleEn: 'Airport to hotel / Haram area',
    subtitleAr: 'من المطار إلى الفندق / منطقة الحرم',
    locationEn: 'Madinah Airport',
    locationAr: 'مطار المدينة',
    category: 'airport',
    mediaType: 'image',
    imageUrl: ROUTE_IMAGES.madinahAirport,
    videoUrl: '',
    posterUrl: ROUTE_IMAGES.madinahAirport,
    metaEn: 'Pickup · Drop-off',
    metaAr: 'استقبال · توصيل',
    sortOrder: 4,
    active: true,
  },
  {
    id: 'g6',
    titleEn: 'Saudi Cities Network',
    titleAr: 'شبكة المدن السعودية',
    subtitleEn: 'Makkah · Madinah · Jeddah connected rides',
    subtitleAr: 'رحلات تربط مكة والمدينة وجدة',
    locationEn: 'Saudi Cities',
    locationAr: 'مدن السعودية',
    category: 'city',
    mediaType: 'image',
    imageUrl: GALLERY_IMAGES.riyadh,
    videoUrl: '',
    posterUrl: GALLERY_IMAGES.riyadh,
    metaEn: 'Inter-city',
    metaAr: 'بين المدن',
    sortOrder: 5,
    active: true,
  },
  {
    id: 'g7',
    titleEn: 'Airport Stop Moments',
    titleAr: 'محطات المطار',
    subtitleEn: 'Smooth curb-side pickup & drop-off',
    subtitleAr: 'استقبال وتوصيل سلس عند الرصيف',
    locationEn: 'Airports',
    locationAr: 'المطارات',
    category: 'airport',
    mediaType: 'image',
    imageUrl: GALLERY_IMAGES.airport,
    videoUrl: '',
    posterUrl: GALLERY_IMAGES.airport,
    metaEn: 'Stop · On-time',
    metaAr: 'محطة · في الوقت',
    sortOrder: 6,
    active: true,
  },
  {
    id: 'g9',
    titleEn: 'Markets & City Stops',
    titleAr: 'الأسواق ومحطات المدينة',
    subtitleEn: 'Souqs, shopping districts, and city hubs',
    subtitleAr: 'أسواق ومناطق تسوق ومحاور المدينة',
    locationEn: 'Markets',
    locationAr: 'الأسواق',
    category: 'market',
    mediaType: 'image',
    imageUrl: GALLERY_IMAGES.market,
    videoUrl: '',
    posterUrl: GALLERY_IMAGES.market,
    metaEn: 'Souq · City stop',
    metaAr: 'سوق · محطة',
    sortOrder: 7,
    active: true,
  },
  {
    id: 'g10',
    titleEn: 'Makkah to Madinah',
    titleAr: 'مكة إلى المدينة',
    subtitleEn: 'Between the Two Holy Mosques',
    subtitleAr: 'بين الحرمين الشريفين',
    locationEn: 'Haramain',
    locationAr: 'الحرمين',
    category: 'route',
    mediaType: 'image',
    imageUrl: ROUTE_IMAGES.makkahMadinah,
    videoUrl: '',
    posterUrl: ROUTE_IMAGES.makkahMadinah,
    metaEn: '450km · Comfort',
    metaAr: '450 كم · راحة',
    sortOrder: 8,
    active: true,
  },
  {
    id: 'g11',
    titleEn: 'Taif Mountain Road',
    titleAr: 'طريق الطائف الجبلي',
    subtitleEn: 'Taif Airport to Makkah',
    subtitleAr: 'مطار الطائف إلى مكة',
    locationEn: 'Taif',
    locationAr: 'الطائف',
    category: 'route',
    mediaType: 'image',
    imageUrl: ROUTE_IMAGES.taifMakkah,
    videoUrl: '',
    posterUrl: ROUTE_IMAGES.taifMakkah,
    metaEn: 'Scenic · Safe',
    metaAr: 'منظر · آمن',
    sortOrder: 9,
    active: true,
  },
  {
    id: 'g12',
    titleEn: 'Haramain Train Stop',
    titleAr: 'محطة قطار الحرمين',
    subtitleEn: 'Station pickup to hotel — Makkah & Madinah',
    subtitleAr: 'من المحطة إلى الفندق — مكة والمدينة',
    locationEn: 'Train',
    locationAr: 'القطار',
    category: 'airport',
    mediaType: 'image',
    imageUrl: ROUTE_IMAGES.trainMakkah,
    videoUrl: '',
    posterUrl: ROUTE_IMAGES.trainMakkah,
    metaEn: 'Station · Hotel',
    metaAr: 'محطة · فندق',
    sortOrder: 10,
    active: true,
  },
];

export const DEFAULT_GALLERY_HERO = {
  titleEn: 'Our Gallery',
  titleAr: 'معرض الصور',
  subtitleEn: 'Makkah · Madinah · Jeddah · Airports · Bus & train stops',
  subtitleAr: 'مكة · المدينة · جدة · المطارات · محطات الحافلات والقطار',
  videoUrl: GALLERY_HERO_VIDEO,
  posterUrl: GALLERY_HERO_POSTER,
  posterMobileUrl: GALLERY_HERO_POSTER_MOBILE,
  /** Image-first hero — video is optional and must stay SD/light. */
  showVideo: false,
};

export const ROUTE_SLUGS = {
  'jeddah-makkah': 'jeddah-airport-to-makkah',
  'train-makkah': 'train-makkah-to-hotel',
  'train-madinah': 'train-madinah-to-hotel',
};

export const ROUTE_SUFFIX = {
  'jeddah-makkah': 'jm',
  'train-makkah': 'tm',
  'train-madinah': 'td',
};

export const PICKUP_LOCATIONS = [
  { id: 'jeddah-airport', label: { ar: 'مطار الملك عبدالعزيز بجدة', en: 'King Abdulaziz Airport in Jeddah' } },
  { id: 'makkah', label: { ar: 'مكة المكرمة (الفندق / الحرم)', en: 'Makkah Al-Mukarramah (Hotel / Haram)' } },
  { id: 'madinah', label: { ar: 'المدينة المنورة (الفندق / الحرم)', en: 'Madinah (Hotel / Haram)' } },
  { id: 'jeddah-city', label: { ar: 'جدة (داخل المدينة)', en: 'Jeddah (City)' } },
];

export const DESTINATION_LOCATIONS = [
  { id: 'makkah', label: { ar: 'مكة المكرمة (الفندق / الحرم)', en: 'Makkah Al-Mukarramah (Hotel / Haram)' } },
  { id: 'madinah', label: { ar: 'المدينة المنورة (الفندق / الحرم)', en: 'Madinah (Hotel / Haram)' } },
  { id: 'jeddah-airport', label: { ar: 'مطار الملك عبدالعزيز بجدة', en: 'King Abdulaziz Airport in Jeddah' } },
  { id: 'jeddah-city', label: { ar: 'جدة (داخل المدينة)', en: 'Jeddah (City)' } },
];

export const VEHICLE_TYPE_FEATURES = {
  camry: {
    storage: { ar: 'سعة تخزينية جيدة', en: 'Good storage capacity' },
    comfort: [
      { ar: 'تكييف ممتاز', en: 'Excellent air conditioning' },
      { ar: 'عزل صوتي', en: 'Sound insulation' },
      { ar: 'سائق خاص', en: 'Private driver' },
    ],
  },
  staria: {
    storage: { ar: 'سعة تخزينية ممتازة', en: 'Excellent storage capacity' },
    comfort: [
      { ar: 'تكييف ممتاز', en: 'Excellent air conditioning' },
      { ar: 'عزل صوتي متطور', en: 'Advanced sound insulation' },
      { ar: 'شاشات أمامية', en: 'Front screens' },
      { ar: 'سائق خاص', en: 'Private driver' },
    ],
  },
  taurus: {
    storage: { ar: 'سعة تخزينية ممتازة', en: 'Excellent storage capacity' },
    comfort: [
      { ar: 'تكييف ممتاز', en: 'Excellent air conditioning' },
      { ar: 'عزل صوتي متطور', en: 'Advanced sound insulation' },
      { ar: 'شاشات أمامية', en: 'Front screens' },
      { ar: 'سائق خاص', en: 'Private driver' },
    ],
  },
  yukon: {
    storage: { ar: 'سعة تخزينية VIP', en: 'VIP storage capacity' },
    comfort: [
      { ar: 'تكييف ممتاز', en: 'Excellent air conditioning' },
      { ar: 'عزل صوتي متطور', en: 'Advanced sound insulation' },
      { ar: 'مقاعد فاخرة', en: 'Luxury seats' },
      { ar: 'سائق خاص', en: 'Private driver' },
    ],
  },
  hiace: {
    storage: { ar: 'سعة تخزينية كبيرة', en: 'Large storage capacity' },
    comfort: [
      { ar: 'تكييف ممتاز', en: 'Excellent air conditioning' },
      { ar: 'مقاعد مريحة', en: 'Comfortable seats' },
      { ar: 'سائق خاص', en: 'Private driver' },
    ],
  },
  h1: {
    storage: { ar: 'سعة تخزينية جيدة', en: 'Good storage capacity' },
    comfort: [
      { ar: 'تكييف ممتاز', en: 'Excellent air conditioning' },
      { ar: 'عزل صوتي', en: 'Sound insulation' },
      { ar: 'سائق خاص', en: 'Private driver' },
    ],
  },
};

export const VEHICLE_ROUTE_PRICES = [
  { title: { ar: 'مطار جدة → مكة', en: 'Jeddah Airport → Makkah' }, price: 250, routeId: 'rt-airport-jeddah-makkah' },
  { title: { ar: 'مكة → المدينة', en: 'Makkah → Madinah' }, price: 450, routeId: 'ow-1-5' },
  { title: { ar: 'مطار الطائف → مكة', en: 'Taif Airport → Makkah' }, price: 250, routeId: 'rt-airport-taif-makkah' },
  { title: { ar: 'مطار المدينة → المدينة', en: 'Madinah Airport → City' }, price: 150, routeId: 'rt-airport-madinah-jeddah' },
  { title: { ar: 'من مكة إلى جدة', en: 'Makkah to Jeddah' }, price: 230, routeId: 'ow-1-2' },
  { title: { ar: 'من جدة إلى المدينة', en: 'Jeddah to Madinah' }, price: 450, routeId: 'ow-2-5' },
  { title: { ar: 'محطة مكة → فندق', en: 'Makkah Train → Hotel' }, price: 130, routeId: 'rt-train-makkah' },
  { title: { ar: 'محطة المدينة → فندق', en: 'Madinah Train → Hotel' }, price: 130, routeId: 'rt-train-madinah' },
  { title: { ar: '4 ساعات داخل جدة', en: '4-Hour Within Jeddah' }, price: 280, routeId: 'hr-4-jeddah-internal' },
  { title: { ar: '4 ساعات داخل مكة', en: '4-Hour Within Makkah' }, price: 280, routeId: 'hr-4-mecca-internal' },
];

export function getVehicleSlug(vehicleKey, routeId) {
  const type = vehicleKey.split('-')[0];
  const routeSlug = ROUTE_SLUGS[routeId] || routeId;
  return `${type}-${routeSlug}`;
}

export function findVehicleBySlug(slug) {
  for (const [routeId, routeSlug] of Object.entries(ROUTE_SLUGS)) {
    if (slug.endsWith(routeSlug)) {
      const type = slug.slice(0, -(routeSlug.length + 1));
      const suffix = ROUTE_SUFFIX[routeId];
      if (!suffix) continue;
      const vehicleKey = `${type}-${suffix}`;
      const route = FLEET_ROUTES.find((r) => r.id === routeId);
      const vehicle = route?.vehicles.find((v) => v.id === vehicleKey);
      if (vehicle) {
        const short = FLEET_VEHICLES.find((v) => v.key === vehicleKey);
        return {
          vehicle,
          route,
          routeId,
          shortName: short?.name || { ar: vehicle.name.ar.split(' ').slice(0, 3).join(' '), en: SHORT_NAMES[type]?.en || type },
        };
      }
    }
  }
  return null;
}

export function getShortVehicleName(vehicleKey, lang = 'ar') {
  return getCarDisplayName(vehicleKey, lang);
}

export function getVehicleTypeFeatures(vehicleKey) {
  const type = vehicleKey.split('-')[0];
  return VEHICLE_TYPE_FEATURES[type] || VEHICLE_TYPE_FEATURES.camry;
}
