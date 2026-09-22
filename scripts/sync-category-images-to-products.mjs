/**
 * Force-copy category/car catalog images onto every matching fleet product.
 * Usage: node scripts/sync-category-images-to-products.mjs
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { initializeApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  getDocs,
  doc,
  writeBatch,
  setDoc,
  serverTimestamp,
  increment,
} from 'firebase/firestore';

const __dirname = dirname(fileURLToPath(import.meta.url));

function loadEnv() {
  const env = {};
  const raw = readFileSync(join(__dirname, '..', '.env'), 'utf8');
  for (const line of raw.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const idx = trimmed.indexOf('=');
    if (idx === -1) continue;
    env[trimmed.slice(0, idx).trim()] = trimmed.slice(idx + 1).trim();
  }
  return env;
}

/** Bundled category art — used when a vehicles/{id} doc has no imageUrl yet. */
const FALLBACK_CATEGORY_IMAGES = {
  taurus: '/images/categories/taurus.webp?v=20260817',
  camry: '/images/categories/camry.webp?v=20260817',
  staria: '/images/categories/staria.webp',
  yukon: '/images/categories/yukon.webp',
  hiace: '/images/categories/hiace.webp',
  h1: '/images/categories/hiace.webp',
};

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

async function fetchAll(name) {
  const snap = await getDocs(collection(db, name));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

function carKeyOf(product) {
  return String(product.vehicleKey || product.carKey || '')
    .split('-')[0]
    .trim()
    .toLowerCase();
}

async function main() {
  const [cars, products] = await Promise.all([
    fetchAll('vehicles'),
    fetchAll('packages'),
  ]);

  const imageByCar = new Map();
  Object.entries(FALLBACK_CATEGORY_IMAGES).forEach(([id, url]) => {
    imageByCar.set(id, url);
  });
  cars.forEach((car) => {
    const id = String(car.id || '').trim().toLowerCase();
    const url = String(car.imageUrl || '').trim();
    if (id && url) imageByCar.set(id, url);
  });

  console.log('Category images:', Object.fromEntries(imageByCar));

  const pending = [];
  for (const product of products) {
    const carKey = carKeyOf(product);
    if (!carKey) continue;
    const imageUrl = imageByCar.get(carKey);
    if (!imageUrl) continue;
    if (String(product.imageUrl || '').trim() === imageUrl) continue;
    pending.push({ id: product.id, carKey, imageUrl, name: product.nameEn || product.nameAr || product.id });
  }

  console.log(`Packages to update: ${pending.length} / ${products.length}`);

  const BATCH = 400;
  let updated = 0;
  for (let i = 0; i < pending.length; i += BATCH) {
    const slice = pending.slice(i, i + BATCH);
    const batch = writeBatch(db);
    slice.forEach((item) => {
      batch.update(doc(db, 'packages', item.id), {
        imageUrl: item.imageUrl,
        updatedAt: serverTimestamp(),
      });
    });
    await batch.commit();
    updated += slice.length;
    console.log(`  committed ${updated}/${pending.length}`);
  }

  await setDoc(
    doc(db, 'siteSettings', 'contentRevision'),
    { rev: increment(1), updatedAt: serverTimestamp() },
    { merge: true },
  );

  const sample = pending.slice(0, 8).map((p) => `${p.carKey}: ${p.name}`);
  console.log('Done.', { cars: imageByCar.size, updated, sample });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
