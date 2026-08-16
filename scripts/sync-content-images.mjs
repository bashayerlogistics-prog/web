import { readFileSync } from 'node:fs';
import { initializeApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  getDocs,
  doc,
  updateDoc,
  serverTimestamp,
} from 'firebase/firestore';

function loadEnv() {
  const env = {};
  const raw = readFileSync(new URL('../.env', import.meta.url), 'utf8');
  for (const line of raw.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const idx = trimmed.indexOf('=');
    if (idx === -1) continue;
    env[trimmed.slice(0, idx).trim()] = trimmed.slice(idx + 1).trim();
  }
  return env;
}

const VEHICLE_IMAGES = {
  camry: 'https://cntqmlkfgwkbtnqfpczn.supabase.co/storage/v1/object/public/vehicles/vehicle-images/z90znslvxm_1783475265397.jpg',
  staria: 'https://cntqmlkfgwkbtnqfpczn.supabase.co/storage/v1/object/public/vehicles/vehicle-images/dw1q26wbfo7_1783475308467.jpg',
  taurus: 'https://cntqmlkfgwkbtnqfpczn.supabase.co/storage/v1/object/public/vehicles/vehicle-images/9bgk2wu14m_1783475317785.jpg',
  yukon: 'https://cntqmlkfgwkbtnqfpczn.supabase.co/storage/v1/object/public/vehicles/vehicle-images/xh24vco8tl_1783640399560.png',
  hiace: 'https://cntqmlkfgwkbtnqfpczn.supabase.co/storage/v1/object/public/vehicles/vehicle-images/gbjh3w70qkn_1784037284101.png',
  h1: 'https://cntqmlkfgwkbtnqfpczn.supabase.co/storage/v1/object/public/vehicles/vehicle-images/dqvo2tiwn8_1783475327721.jpg',
};

const DEFAULT_SERVICES = [
  { sortOrder: 0, titleEn: 'Airport Transfer', imageUrl: 'https://images.unsplash.com/photo-1449965408869-eaa3f722e40d?w=800&auto=format&fit=crop' },
  { sortOrder: 1, titleEn: 'Inter-City Transport', imageUrl: '/images/routes/makkah-madinah.jpg' },
  { sortOrder: 2, titleEn: 'VIP Luxury Service', imageUrl: VEHICLE_IMAGES.yukon },
  { sortOrder: 3, titleEn: 'Umrah & Ziyarah Trips', imageUrl: '/images/routes/jeddah-makkah.png' },
  { sortOrder: 4, titleEn: 'Group Transport', imageUrl: VEHICLE_IMAGES.hiace },
  { sortOrder: 5, titleEn: 'Hourly Rental', imageUrl: VEHICLE_IMAGES.camry },
];

const DEFAULT_BLOGS = [
  { sortOrder: 0, titleEn: 'Comfortable Transport Guide from Jeddah Airport to Makkah for Pilgrims', imageUrl: '/images/routes/jeddah-makkah.png' },
  { sortOrder: 1, titleEn: 'Best Vehicle Options Between Makkah and Madinah', imageUrl: '/images/routes/makkah-madinah.jpg' },
  { sortOrder: 2, titleEn: 'Important Tips for Safe Family Travel During Umrah Season', imageUrl: '/images/routes/train-haramain-clean.jpg' },
];

const env = loadEnv();

const app = initializeApp({
  apiKey: env.VITE_FIREBASE_API_KEY,
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: env.VITE_FIREBASE_APP_ID,
});

const db = getFirestore(app);

const BROKEN_IMAGE_PATTERNS = ['picsum.photos', 'placeholder'];

function isBrokenImageUrl(url) {
  if (!url) return true;
  return BROKEN_IMAGE_PATTERNS.some((pattern) => url.includes(pattern));
}

function vehicleImageForKey(vehicleKey = '') {
  const type = String(vehicleKey).split('-')[0];
  return VEHICLE_IMAGES[type] || VEHICLE_IMAGES.camry;
}

async function fetchCollection(name) {
  const snapshot = await getDocs(collection(db, name));
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
}

function findDefaultBySortOrTitle(defaults, item, titleKey = 'titleEn') {
  return defaults.find(
    (entry) =>
      entry.sortOrder === item.sortOrder ||
      (item[titleKey] && entry[titleKey] === item[titleKey]),
  );
}

async function main() {
  const [products, services, blogs] = await Promise.all([
    fetchCollection('packages'),
    fetchCollection('services'),
    fetchCollection('blogs'),
  ]);

  const result = { products: 0, services: 0, blogs: 0 };

  for (const product of products) {
    const imageUrl = vehicleImageForKey(product.vehicleKey);
    if (!imageUrl) continue;
    if (!isBrokenImageUrl(product.imageUrl) && product.imageUrl) continue;
    await updateDoc(doc(db, 'packages', product.id), {
      imageUrl,
      updatedAt: serverTimestamp(),
    });
    result.products += 1;
  }

  for (const service of services) {
    const defaults = findDefaultBySortOrTitle(DEFAULT_SERVICES, service);
    if (!defaults?.imageUrl) continue;
    const shouldUpdate =
      !service.imageUrl ||
      isBrokenImageUrl(service.imageUrl) ||
      service.imageUrl !== defaults.imageUrl;
    if (!shouldUpdate) continue;
    await updateDoc(doc(db, 'services', service.id), {
      imageUrl: defaults.imageUrl,
      updatedAt: serverTimestamp(),
    });
    result.services += 1;
  }

  for (const blog of blogs) {
    const defaults = findDefaultBySortOrTitle(DEFAULT_BLOGS, blog);
    if (!defaults?.imageUrl) continue;
    if (blog.imageUrl === defaults.imageUrl) continue;
    await updateDoc(doc(db, 'blogs', blog.id), {
      imageUrl: defaults.imageUrl,
      updatedAt: serverTimestamp(),
    });
    result.blogs += 1;
  }

  console.log('Image sync complete:', result);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
