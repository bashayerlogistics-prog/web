/** Homepage “Plan Your Journey With Ease” WhatsApp reservation cards. */

export const TRAVEL_RESERVATION_ACCENTS = [
  { id: 'hotel', rgb: '213, 160, 39' },
  { id: 'flight', rgb: '62, 15, 119' },
  { id: 'train', rgb: '20, 138, 72' },
  { id: 'gold', rgb: '184, 134, 11' },
  { id: 'brand', rgb: '15, 76, 58' },
  { id: 'teal', rgb: '13, 148, 136' },
  { id: 'rose', rgb: '190, 48, 88' },
  { id: 'blue', rgb: '37, 99, 235' },
];

export const DEFAULT_TRAVEL_RESERVATIONS = [
  {
    id: 'hotel',
    image: '/images/services/travel-hotel-modern.png',
    title: { en: 'Hotel Reservations', ar: 'حجوزات الفنادق' },
    hint: { en: 'Find and book your perfect stay', ar: 'ابحث واحجز إقامتك المثالية' },
    message: {
      en: 'Hello, I would like help with a hotel reservation.',
      ar: 'مرحباً، أود المساعدة في حجز فندق.',
    },
    accent: 'hotel',
    sortOrder: 0,
    active: true,
  },
  {
    id: 'flight',
    image: '/images/services/travel-flight-modern.png',
    title: { en: 'Flight Reservations', ar: 'حجوزات الطيران' },
    hint: { en: 'Domestic and international flights', ar: 'رحلات داخلية ودولية' },
    message: {
      en: 'Hello, I would like help with a flight reservation.',
      ar: 'مرحباً، أود المساعدة في حجز رحلة طيران.',
    },
    accent: 'flight',
    sortOrder: 1,
    active: true,
  },
  {
    id: 'train',
    image: '/images/services/travel-train-modern.png',
    title: { en: 'Train Ticket Reservations', ar: 'حجوزات تذاكر القطار' },
    hint: { en: 'Fast and convenient train tickets', ar: 'تذاكر قطار سريعة ومريحة' },
    message: {
      en: 'Hello, I would like help booking a train ticket.',
      ar: 'مرحباً، أود المساعدة في حجز تذكرة قطار.',
    },
    accent: 'train',
    sortOrder: 2,
    active: true,
  },
  {
    id: 'bus',
    image: '/images/services/travel-bus-modern.png',
    title: { en: 'Bus Reservations', ar: 'حجوزات الباصات' },
    hint: { en: 'Comfortable intercity bus tickets', ar: 'تذاكر باصات مريحة بين المدن' },
    message: {
      en: 'Hello, I would like help with a bus reservation.',
      ar: 'مرحباً، أود المساعدة في حجز باص.',
    },
    accent: 'teal',
    sortOrder: 3,
    active: true,
  },
  {
    id: 'nusuk',
    image: '/images/services/travel-nusuk-modern.png',
    title: { en: 'Nusuk Reservations', ar: 'حجوزات نسك' },
    hint: { en: 'Umrah & Hajj booking assistance', ar: 'مساعدة في حجوزات العمرة والحج' },
    message: {
      en: 'Hello, I would like help with a Nusuk reservation.',
      ar: 'مرحباً، أود المساعدة في حجوزات نسك.',
    },
    accent: 'brand',
    sortOrder: 4,
    active: true,
  },
];

const ACCENT_IDS = new Set(TRAVEL_RESERVATION_ACCENTS.map((a) => a.id));

export function normalizeTravelAccent(value) {
  const raw = String(value || '')
    .replace(/^travel-reservation--/, '')
    .trim()
    .toLowerCase();
  return ACCENT_IDS.has(raw) ? raw : 'gold';
}

export function travelAccentClass(accent) {
  return `travel-reservation--${normalizeTravelAccent(accent)}`;
}

export function buildTravelReservationsFromFirestore(items) {
  if (!Array.isArray(items) || items.length === 0) {
    return DEFAULT_TRAVEL_RESERVATIONS.map((item) => ({
      ...item,
      accent: normalizeTravelAccent(item.accent),
    }));
  }

  return items
    .map((item, index) => ({
      id: item.id || `travel-${index}`,
      image: item.imageUrl || item.image || '',
      title: {
        en: item.titleEn || item.title?.en || '',
        ar: item.titleAr || item.title?.ar || '',
      },
      hint: {
        en: item.hintEn || item.hint?.en || '',
        ar: item.hintAr || item.hint?.ar || '',
      },
      message: {
        en: item.messageEn || item.message?.en || '',
        ar: item.messageAr || item.message?.ar || '',
      },
      accent: normalizeTravelAccent(item.accent),
      sortOrder: item.sortOrder ?? index,
      active: item.active !== false,
    }))
    .filter((item) => item.active !== false)
    .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
}
