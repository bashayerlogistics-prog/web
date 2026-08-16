/**
 * Sync Internal (Ziyarat / within-city) package prices in Firestore.
 * Usage: node scripts/sync-ziyarat-prices.mjs
 *
 * Route ids: hr-{hours}-{city}-internal
 * Cars: taurus | camry | staria | yukon | hiace (vehicleKey prefix)
 */
import { initializeApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  getDocs,
  updateDoc,
  doc,
  serverTimestamp,
} from 'firebase/firestore';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = join(__dirname, '..', '.env');
const env = Object.fromEntries(
  readFileSync(envPath, 'utf8')
    .split('\n')
    .filter((l) => l && !l.startsWith('#'))
    .map((l) => {
      const i = l.indexOf('=');
      if (i < 0) return null;
      return [l.slice(0, i).trim(), l.slice(i + 1).trim()];
    })
    .filter(Boolean),
);

/** Sheet: جولات مزارات دينية — 4h exact; 8/12 scaled */
const PRICES = {
  4: {
    taif: { taurus: 550, camry: 500, staria: 600, yukon: 780, hiace: 800 },
    mecca: { taurus: 250, camry: 230, staria: 330, yukon: 450, hiace: 450 },
    jeddah: { taurus: 250, camry: 230, staria: 330, yukon: 450, hiace: 450 },
    medina: { taurus: 250, camry: 230, staria: 330, yukon: 450, hiace: 450 },
  },
  8: {
    taif: { taurus: 960, camry: 860, staria: 1070, yukon: 1420, hiace: 1450 },
    mecca: { taurus: 440, camry: 390, staria: 590, yukon: 820, hiace: 820 },
    jeddah: { taurus: 440, camry: 390, staria: 590, yukon: 820, hiace: 820 },
    medina: { taurus: 440, camry: 390, staria: 590, yukon: 820, hiace: 820 },
  },
  12: {
    taif: { taurus: 1340, camry: 1180, staria: 1520, yukon: 2040, hiace: 2070 },
    mecca: { taurus: 610, camry: 540, staria: 830, yukon: 1170, hiace: 1170 },
    jeddah: { taurus: 610, camry: 540, staria: 830, yukon: 1170, hiace: 1170 },
    medina: { taurus: 610, camry: 540, staria: 830, yukon: 1170, hiace: 1170 },
  },
};

const app = initializeApp({
  apiKey: env.VITE_FIREBASE_API_KEY,
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: env.VITE_FIREBASE_APP_ID,
});
const db = getFirestore(app);

function parseInternal(routeId) {
  const m = String(routeId || '').match(/^hr-(\d+)-(taif|mecca|jeddah|medina)-internal$/);
  if (!m) return null;
  return { hours: Number(m[1]), city: m[2] };
}

function carOf(vehicleKey) {
  return String(vehicleKey || '').split('-')[0];
}

const snap = await getDocs(collection(db, 'packages'));
let updated = 0;
let skipped = 0;

for (const d of snap.docs) {
  const data = d.data();
  const parsed = parseInternal(data.routeId);
  if (!parsed) {
    skipped += 1;
    continue;
  }
  const car = carOf(data.vehicleKey);
  const price = PRICES[parsed.hours]?.[parsed.city]?.[car];
  if (price == null) {
    skipped += 1;
    continue;
  }
  if (Number(data.price) === price && Number(data.originalPrice ?? data.price) === price) {
    skipped += 1;
    continue;
  }
  await updateDoc(doc(db, 'packages', d.id), {
    price,
    originalPrice: price,
    updatedAt: serverTimestamp(),
  });
  updated += 1;
  console.log(`updated ${data.routeId} ${car} → ${price}`);
}

console.log(`Done. updated=${updated} skipped=${skipped}`);
