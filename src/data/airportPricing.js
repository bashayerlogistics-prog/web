/**
 * الاستقبال والتوديع بالمطارات — Airport pickup (arrival) & drop-off (departure)
 * Cars: Taurus · Camry · Staria · GMC (yukon) · Hiace — all 2026
 * Currency: SAR
 */

export const AIRPORT_CARS = ['taurus', 'camry', 'staria', 'yukon', 'hiace'];

/**
 * Airport transfer routes with directed pickup / drop-off prices per car.
 * Round-trip package price in the app = pickup + dropoff.
 */
export const AIRPORT_TRANSFER_ROUTES = [
  {
    id: 'rt-airport-jeddah-hotels',
    title: {
      ar: 'مطار جدة ↔ فنادق جدة',
      en: 'Jeddah Airport ↔ Jeddah Hotels',
    },
    pickupLabel: {
      ar: 'مطار جدة إلى فنادق جدة',
      en: 'Jeddah Airport → Jeddah Hotels',
    },
    dropoffLabel: {
      ar: 'فنادق جدة إلى مطار جدة',
      en: 'Jeddah Hotels → Jeddah Airport',
    },
    cityFrom: '2',
    cityTo: '2',
    category: 'airport',
    prices: {
      taurus: { pickup: 200, dropoff: 180 },
      camry: { pickup: 180, dropoff: 150 },
      staria: { pickup: 230, dropoff: 200 },
      yukon: { pickup: 280, dropoff: 280 },
      hiace: { pickup: 350, dropoff: 350 },
    },
  },
  {
    id: 'rt-airport-jeddah-madinah',
    title: {
      ar: 'مطار جدة ↔ المدينة المنورة',
      en: 'Jeddah Airport ↔ Madinah',
    },
    pickupLabel: {
      ar: 'مطار جدة إلى المدينة',
      en: 'Jeddah Airport → Madinah',
    },
    dropoffLabel: {
      ar: 'المدينة إلى مطار جدة',
      en: 'Madinah → Jeddah Airport',
    },
    cityFrom: '2',
    cityTo: '5',
    category: 'airport',
    prices: {
      taurus: { pickup: 550, dropoff: 500 },
      camry: { pickup: 500, dropoff: 450 },
      staria: { pickup: 700, dropoff: 680 },
      yukon: { pickup: 850, dropoff: 850 },
      hiace: { pickup: 850, dropoff: 850 },
    },
  },
  {
    id: 'rt-airport-jeddah-makkah',
    title: {
      ar: 'مطار جدة ↔ مكة المكرمة',
      en: 'Jeddah Airport ↔ Makkah',
    },
    pickupLabel: {
      ar: 'مطار جدة إلى مكة',
      en: 'Jeddah Airport → Makkah',
    },
    dropoffLabel: {
      ar: 'مكة إلى مطار جدة',
      en: 'Makkah → Jeddah Airport',
    },
    cityFrom: '2',
    cityTo: '1',
    category: 'airport',
    prices: {
      taurus: { pickup: 280, dropoff: 250 },
      camry: { pickup: 250, dropoff: 230 },
      staria: { pickup: 330, dropoff: 290 },
      yukon: { pickup: 450, dropoff: 450 },
      hiace: { pickup: 430, dropoff: 430 },
    },
  },
  {
    id: 'rt-airport-madinah-makkah',
    title: {
      ar: 'مطار المدينة ↔ مكة المكرمة',
      en: 'Madinah Airport ↔ Makkah',
    },
    pickupLabel: {
      ar: 'مطار المدينة إلى مكة',
      en: 'Madinah Airport → Makkah',
    },
    dropoffLabel: {
      ar: 'مكة إلى مطار المدينة',
      en: 'Makkah → Madinah Airport',
    },
    cityFrom: '5',
    cityTo: '1',
    category: 'airport',
    prices: {
      taurus: { pickup: 550, dropoff: 500 },
      camry: { pickup: 500, dropoff: 450 },
      staria: { pickup: 700, dropoff: 680 },
      yukon: { pickup: 850, dropoff: 850 },
      hiace: { pickup: 850, dropoff: 850 },
    },
  },
  {
    id: 'rt-airport-madinah-jeddah',
    title: {
      ar: 'مطار المدينة ↔ جدة',
      en: 'Madinah Airport ↔ Jeddah',
    },
    pickupLabel: {
      ar: 'مطار المدينة إلى جدة',
      en: 'Madinah Airport → Jeddah',
    },
    dropoffLabel: {
      ar: 'جدة إلى مطار المدينة',
      en: 'Jeddah → Madinah Airport',
    },
    cityFrom: '5',
    cityTo: '2',
    category: 'airport',
    prices: {
      taurus: { pickup: 550, dropoff: 500 },
      camry: { pickup: 500, dropoff: 450 },
      staria: { pickup: 700, dropoff: 680 },
      yukon: { pickup: 850, dropoff: 850 },
      hiace: { pickup: 850, dropoff: 850 },
    },
  },
  {
    id: 'rt-airport-taif-makkah',
    title: {
      ar: 'مطار الطائف ↔ مكة المكرمة',
      en: 'Taif Airport ↔ Makkah',
    },
    pickupLabel: {
      ar: 'من مطار الطائف إلى مكة',
      en: 'Taif Airport → Makkah',
    },
    dropoffLabel: {
      ar: 'من مكة إلى مطار الطائف',
      en: 'Makkah → Taif Airport',
    },
    cityFrom: '3',
    cityTo: '1',
    category: 'airport',
    prices: {
      taurus: { pickup: 280, dropoff: 250 },
      camry: { pickup: 250, dropoff: 250 },
      staria: { pickup: 350, dropoff: 300 },
      yukon: { pickup: 480, dropoff: 480 },
      hiace: { pickup: 480, dropoff: 480 },
    },
  },
];
