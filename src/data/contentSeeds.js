import {
  FLEET_ROUTES,
  ROUND_TRIP_FLEET_ROUTES,
  getCarDisplayName,
  SERVICES,
  BLOG_POSTS,
  ROUTE_CARDS,
  FAQ_ITEMS,
  SOCIAL_LINKS,
  DEFAULT_GALLERY_ITEMS,
} from './staticData';
import { HOURLY_FLEET_ROUTES } from './hourlyPricing';
import { DEFAULT_TRAVEL_RESERVATIONS } from './travelReservations';

export function getDefaultProducts() {
  const products = [];
  let sort = 0;
  for (const route of FLEET_ROUTES) {
    for (const v of route.vehicles) {
      const carKey = v.id.split('-')[0];
      products.push({
        nameEn: v.name.en,
        nameAr: v.name.ar,
        carModelEn: getCarDisplayName(carKey, 'en'),
        carModelAr: getCarDisplayName(carKey, 'ar'),
        price: v.price,
        originalPrice: v.originalPrice ?? v.price,
        imageUrl: v.image,
        descriptionEn: v.description?.en || '',
        descriptionAr: v.description?.ar || '',
        routeId: route.id,
        vehicleKey: v.id,
        passengers: v.passengers,
        vip: v.vip || false,
        badgeEn: v.badge?.en || 'Between Cities',
        badgeAr: v.badge?.ar || 'التنقل بين المدن',
        active: true,
        hidePrice: false,
        tripType: 'one_way',
        sortOrder: sort,
        type: 'fleet',
      });
      sort += 1;
    }
  }
  return products;
}

export function getDefaultRoundTripProducts() {
  const products = [];
  let sort = 1000;
  for (const route of ROUND_TRIP_FLEET_ROUTES) {
    for (const v of route.vehicles) {
      const carKey = v.id.split('-')[0];
      products.push({
        nameEn: v.name.en,
        nameAr: v.name.ar,
        carModelEn: getCarDisplayName(carKey, 'en'),
        carModelAr: getCarDisplayName(carKey, 'ar'),
        price: v.price,
        originalPrice: v.originalPrice ?? v.price,
        pickupPrice: v.pickupPrice,
        dropoffPrice: v.dropoffPrice,
        imageUrl: v.image,
        descriptionEn: v.description?.en || '',
        descriptionAr: v.description?.ar || '',
        routeId: route.id,
        vehicleKey: v.id,
        passengers: v.passengers,
        vip: v.vip || false,
        badgeEn: v.badge?.en || 'Round Trip',
        badgeAr: v.badge?.ar || 'ذهاب وعودة',
        category: v.category || 'train',
        active: true,
        hidePrice: false,
        tripType: 'round_trip',
        sortOrder: sort,
        type: 'fleet',
      });
      sort += 1;
    }
  }
  return products;
}

export function getDefaultHourlyProducts() {
  const products = [];
  let sort = 2000;
  for (const route of HOURLY_FLEET_ROUTES) {
    for (const v of route.vehicles) {
      products.push({
        nameEn: v.name.en,
        nameAr: v.name.ar,
        price: v.price,
        originalPrice: v.originalPrice ?? v.price,
        hourlyRate: v.hourlyRate,
        hours: route.hours,
        imageUrl: v.image,
        descriptionEn: v.description?.en || '',
        descriptionAr: v.description?.ar || '',
        routeId: route.id,
        vehicleKey: v.id,
        passengers: v.passengers,
        vip: v.vip || false,
        badgeEn: v.badge?.en || `${route.hours} Hours`,
        badgeAr: v.badge?.ar || `${route.hours} ساعات`,
        active: true,
        hidePrice: false,
        tripType: 'hourly',
        sortOrder: sort,
        type: 'fleet',
      });
      sort += 1;
    }
  }
  return products;
}

export function getAllDefaultProducts() {
  return [...getDefaultProducts(), ...getDefaultRoundTripProducts(), ...getDefaultHourlyProducts()];
}

export function getDefaultServices() {
  return SERVICES.map((s, index) => ({
    titleEn: s.title.en,
    titleAr: s.title.ar,
    descriptionEn: s.description.en,
    descriptionAr: s.description.ar,
    imageUrl: s.image,
    icon: s.icon || 'star',
    badge: s.badge || 'primary',
    category: s.category || '',
    features: s.features || [],
    active: true,
    sortOrder: index,
  }));
}

export function getDefaultBlogs() {
  return BLOG_POSTS.map((b, index) => ({
    serviceId: b.serviceId || b.id,
    badgeEn: b.badge?.en || '',
    badgeAr: b.badge?.ar || '',
    titleEn: b.title.en,
    titleAr: b.title.ar,
    excerptEn: b.excerpt.en,
    excerptAr: b.excerpt.ar,
    contentEn: b.content?.en || b.excerpt.en,
    contentAr: b.content?.ar || b.excerpt.ar,
    dateEn: b.date.en,
    dateAr: b.date.ar,
    imageUrl: b.image || '',
    active: true,
    sortOrder: index,
  }));
}

export function getDefaultRouteCards() {
  return ROUTE_CARDS.map((r, index) => ({
    slug: r.id,
    titleEn: r.title.en,
    titleAr: r.title.ar,
    descriptionEn: r.description.en,
    descriptionAr: r.description.ar,
    imageUrl: r.image,
    popular: r.popular ?? index < 2,
    active: true,
    sortOrder: index,
  }));
}

export function getDefaultFaqs() {
  return FAQ_ITEMS.map((f, index) => ({
    category: f.category,
    featured: f.featured ?? false,
    icon: f.icon || 'info',
    color: f.color || 'primary',
    imageUrl: f.image || '',
    questionEn: f.question.en,
    questionAr: f.question.ar,
    answerEn: f.answer.en,
    answerAr: f.answer.ar,
    active: true,
    sortOrder: index,
  }));
}

export function getDefaultSocialLinks() {
  return SOCIAL_LINKS.map((s, index) => ({
    nameEn: s.name?.en || s.name || s.platform,
    nameAr: s.name?.ar || s.name || s.platform,
    platform: s.platform || s.icon || 'custom',
    url: s.url || '',
    iconUrl: s.iconUrl || '',
    active: true,
    sortOrder: index,
  }));
}

export function getDefaultGalleryItems() {
  return DEFAULT_GALLERY_ITEMS.map(({ id, ...item }, index) => ({
    ...item,
    sortOrder: item.sortOrder ?? index,
    active: item.active ?? true,
  }));
}

export function getDefaultTravelReservations() {
  return DEFAULT_TRAVEL_RESERVATIONS.map(({ id: _id, image, title, hint, message, accent, sortOrder, active }, index) => ({
    titleEn: title?.en || '',
    titleAr: title?.ar || '',
    hintEn: hint?.en || '',
    hintAr: hint?.ar || '',
    messageEn: message?.en || '',
    messageAr: message?.ar || '',
    imageUrl: image || '',
    accent: accent || 'gold',
    sortOrder: sortOrder ?? index,
    active: active ?? true,
  }));
}
