/**
 * Full Firestore → local JSON backup (before MySQL / Hostinger migrate).
 * Usage: node scripts/backup-firestore-full.mjs
 * Output: backups/firestore-YYYYMMDD-HHMMSS/
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, getDoc } from 'firebase/firestore';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
process.chdir(root);

function loadEnv() {
  const envPath = path.join(root, '.env');
  const env = {};
  if (!fs.existsSync(envPath)) return env;
  for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const i = t.indexOf('=');
    if (i === -1) continue;
    env[t.slice(0, i).trim()] = t.slice(i + 1).trim().replace(/^["']|["']$/g, '');
  }
  return env;
}

const env = loadEnv();
const config = {
  apiKey: env.VITE_FIREBASE_API_KEY,
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: env.VITE_FIREBASE_APP_ID,
};

if (!config.projectId || !config.apiKey) {
  console.error('Missing Firebase keys in .env');
  process.exit(1);
}

const app = initializeApp(config);
const db = getFirestore(app);

const COLLECTIONS = [
  'packages',
  'vehicles',
  'services',
  'blogs',
  'banners',
  'gallery',
  'routeCards',
  'faqs',
  'socialLinks',
  'travelReservations',
  'products',
  'bookings',
  'users',
  'priceRequests',
  'notifications',
  'activityLog',
  'chatMessages',
  'counters',
  'emailQueue',
];

function serialize(value) {
  if (value == null) return value;
  if (typeof value?.toDate === 'function') {
    try {
      return { __type: 'timestamp', value: value.toDate().toISOString() };
    } catch {
      return { __type: 'timestamp', value: null };
    }
  }
  if (Array.isArray(value)) return value.map(serialize);
  if (typeof value === 'object') {
    const out = {};
    for (const [k, v] of Object.entries(value)) out[k] = serialize(v);
    return out;
  }
  return value;
}

function collectImageUrls(node, bag, prefix = '') {
  if (node == null) return;
  if (typeof node === 'string') {
    if (/^https?:\/\//i.test(node) || node.startsWith('/images/')) {
      bag.add(node);
    }
    return;
  }
  if (Array.isArray(node)) {
    node.forEach((item, i) => collectImageUrls(item, bag, `${prefix}[${i}]`));
    return;
  }
  if (typeof node === 'object') {
    for (const [k, v] of Object.entries(node)) {
      if (/image|poster|logo|photo|url|src/i.test(k) || typeof v === 'object') {
        collectImageUrls(v, bag, `${prefix}.${k}`);
      }
    }
  }
}

async function dumpCollection(name) {
  const snap = await getDocs(collection(db, name));
  const docs = {};
  snap.forEach((d) => {
    docs[d.id] = serialize({ id: d.id, ...d.data() });
  });
  return { count: snap.size, docs };
}

const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
const outDir = path.join(root, 'backups', `firestore-${stamp}`);
fs.mkdirSync(outDir, { recursive: true });

const manifest = {
  app: 'bashayer-saudia',
  version: 1,
  createdAt: new Date().toISOString(),
  projectId: config.projectId,
  collections: {},
  siteSettings: {},
  imageUrls: [],
};

console.log('Backing up to', outDir);

for (const name of COLLECTIONS) {
  try {
    process.stdout.write(`  ${name}… `);
    const data = await dumpCollection(name);
    fs.writeFileSync(path.join(outDir, `${name}.json`), JSON.stringify(data, null, 2));
    manifest.collections[name] = data.count;
    console.log(data.count);
  } catch (err) {
    manifest.collections[name] = { error: err.code || err.message };
    console.log('ERROR', err.code || err.message);
  }
}

try {
  process.stdout.write('  siteSettings… ');
  const snap = await getDocs(collection(db, 'siteSettings'));
  const settings = {};
  snap.forEach((d) => {
    settings[d.id] = serialize({ id: d.id, ...d.data() });
  });
  fs.writeFileSync(path.join(outDir, 'siteSettings.json'), JSON.stringify({ count: snap.size, docs: settings }, null, 2));
  manifest.siteSettings = { count: snap.size, ids: Object.keys(settings) };
  console.log(snap.size);
} catch (err) {
  console.log('ERROR', err.code || err.message);
}

const imageBag = new Set();
for (const file of fs.readdirSync(outDir)) {
  if (!file.endsWith('.json')) continue;
  const raw = JSON.parse(fs.readFileSync(path.join(outDir, file), 'utf8'));
  collectImageUrls(raw, imageBag);
}
manifest.imageUrls = [...imageBag].sort();
fs.writeFileSync(path.join(outDir, 'image-urls.json'), JSON.stringify(manifest.imageUrls, null, 2));
fs.writeFileSync(path.join(outDir, 'manifest.json'), JSON.stringify(manifest, null, 2));

const latest = path.join(root, 'backups', 'LATEST.txt');
fs.writeFileSync(latest, outDir);

console.log('\nDone.');
console.log('  Folder:', outDir);
console.log('  Images:', manifest.imageUrls.length);
console.log('  Manifest:', path.join(outDir, 'manifest.json'));
