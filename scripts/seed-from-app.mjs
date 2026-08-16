/**
 * Seed empty Firestore collections from app static defaults.
 * Usage: node scripts/seed-from-app.mjs
 */
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, addDoc, serverTimestamp } from 'firebase/firestore';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { getDefaultProducts, getDefaultServices, getDefaultBlogs, getDefaultRouteCards, getDefaultFaqs } from '../src/data/contentSeeds.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = join(__dirname, '..', '.env');
const env = Object.fromEntries(
  readFileSync(envPath, 'utf8')
    .split('\n')
    .filter((l) => l && !l.startsWith('#'))
    .map((l) => l.split('=').map((s) => s.trim()))
    .filter(([k]) => k),
);

const config = {
  apiKey: env.VITE_FIREBASE_API_KEY,
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: env.VITE_FIREBASE_APP_ID,
};

const app = initializeApp(config);
const db = getFirestore(app);

async function seedCollection(name, items) {
  try {
    const existing = await getDocs(collection(db, name));
    if (existing.size > 0) {
      console.log(`${name}: already has ${existing.size} docs, skipping`);
      return 0;
    }
    for (const item of items) {
      await addDoc(collection(db, name), {
        ...item,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
    console.log(`${name}: seeded ${items.length} docs`);
    return items.length;
  } catch (err) {
    console.error(`${name}: FAILED`, err.code || err.message);
    return 0;
  }
}

const results = {
  packages: await seedCollection('packages', getDefaultProducts()),
  services: await seedCollection('services', getDefaultServices()),
  blogs: await seedCollection('blogs', getDefaultBlogs()),
  routeCards: await seedCollection('routeCards', getDefaultRouteCards()),
  faqs: await seedCollection('faqs', getDefaultFaqs()),
};

console.log('Seed complete:', results);
