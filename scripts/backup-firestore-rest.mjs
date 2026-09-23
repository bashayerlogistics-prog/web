/**
 * Firestore REST backup (IPv4-friendly) — full dump before MySQL migrate.
 * node scripts/backup-firestore-rest.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dns from 'dns';
import http from 'http';
import https from 'https';

dns.setDefaultResultOrder('ipv4first');

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
process.chdir(root);

function loadEnv() {
  const env = {};
  const envPath = path.join(root, '.env');
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
const projectId = env.VITE_FIREBASE_PROJECT_ID;
const apiKey = env.VITE_FIREBASE_API_KEY;
if (!projectId || !apiKey) {
  console.error('Missing VITE_FIREBASE_PROJECT_ID / API_KEY in .env');
  process.exit(1);
}

const COLLECTIONS = [
  'packages', 'vehicles', 'services', 'blogs', 'banners', 'gallery',
  'routeCards', 'faqs', 'socialLinks', 'travelReservations', 'products',
  'bookings', 'users', 'priceRequests', 'notifications', 'activityLog',
  'chatMessages', 'counters', 'emailQueue', 'siteSettings',
];

function decodeValue(v) {
  if (v == null) return null;
  if ('stringValue' in v) return v.stringValue;
  if ('integerValue' in v) return Number(v.integerValue);
  if ('doubleValue' in v) return v.doubleValue;
  if ('booleanValue' in v) return v.booleanValue;
  if ('timestampValue' in v) return { __type: 'timestamp', value: v.timestampValue };
  if ('nullValue' in v) return null;
  if ('arrayValue' in v) return (v.arrayValue.values || []).map(decodeValue);
  if ('mapValue' in v) {
    const out = {};
    for (const [k, val] of Object.entries(v.mapValue.fields || {})) out[k] = decodeValue(val);
    return out;
  }
  return null;
}

function docToJson(doc) {
  const id = String(doc.name || '').split('/').pop();
  const data = {};
  for (const [k, v] of Object.entries(doc.fields || {})) data[k] = decodeValue(v);
  return { id, ...data };
}

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    const lib = url.startsWith('https') ? https : http;
    const req = lib.get(url, { family: 4, timeout: 60000 }, (res) => {
      let body = '';
      res.on('data', (c) => { body += c; });
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(body || '{}') });
        } catch (e) {
          reject(e);
        }
      });
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('timeout')); });
  });
}

async function listCollection(name) {
  const docs = {};
  let pageToken = '';
  let pages = 0;
  do {
    const qs = new URLSearchParams({
      key: apiKey,
      pageSize: '300',
    });
    if (pageToken) qs.set('pageToken', pageToken);
    const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/${name}?${qs}`;
    const { status, data } = await fetchJson(url);
    if (status !== 200) {
      throw new Error(`${name} HTTP ${status}: ${JSON.stringify(data).slice(0, 200)}`);
    }
    for (const d of data.documents || []) {
      const row = docToJson(d);
      docs[row.id] = row;
    }
    pageToken = data.nextPageToken || '';
    pages += 1;
    if (pages > 50) break;
  } while (pageToken);
  return docs;
}

function collectImageUrls(node, bag) {
  if (node == null) return;
  if (typeof node === 'string') {
    if (/^https?:\/\//i.test(node) || node.startsWith('/images/')) bag.add(node);
    return;
  }
  if (Array.isArray(node)) {
    node.forEach((item) => collectImageUrls(item, bag));
    return;
  }
  if (typeof node === 'object') {
    for (const [k, v] of Object.entries(node)) {
      if (/image|poster|logo|photo|url|src/i.test(k) || typeof v === 'object') {
        collectImageUrls(v, bag);
      }
    }
  }
}

const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
const outDir = path.join(root, 'backups', `firestore-${stamp}`);
fs.mkdirSync(outDir, { recursive: true });

const manifest = {
  app: 'bashayer-saudia',
  version: 1,
  createdAt: new Date().toISOString(),
  projectId,
  method: 'rest-ipv4',
  collections: {},
};

console.log('REST backup →', outDir);

for (const name of COLLECTIONS) {
  try {
    process.stdout.write(`  ${name}… `);
    const docs = await listCollection(name);
    const count = Object.keys(docs).length;
    fs.writeFileSync(path.join(outDir, `${name}.json`), JSON.stringify({ count, docs }, null, 2));
    manifest.collections[name] = count;
    console.log(count);
  } catch (err) {
    manifest.collections[name] = { error: String(err.message || err) };
    console.log('ERROR', err.message || err);
  }
}

const imageBag = new Set();
for (const file of fs.readdirSync(outDir)) {
  if (!file.endsWith('.json')) continue;
  collectImageUrls(JSON.parse(fs.readFileSync(path.join(outDir, file), 'utf8')), imageBag);
}
manifest.imageUrls = [...imageBag].sort();
fs.writeFileSync(path.join(outDir, 'image-urls.json'), JSON.stringify(manifest.imageUrls, null, 2));
fs.writeFileSync(path.join(outDir, 'manifest.json'), JSON.stringify(manifest, null, 2));
fs.writeFileSync(path.join(root, 'backups', 'LATEST.txt'), outDir);

console.log('\nDone. Images:', manifest.imageUrls.length);
console.log(outDir);
