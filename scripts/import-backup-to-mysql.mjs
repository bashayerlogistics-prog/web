/**
 * Import Firestore backup JSON → Hostinger MySQL.
 * Needs env: MYSQL_HOST MYSQL_DATABASE MYSQL_USER MYSQL_PASSWORD
 *
 * node scripts/import-backup-to-mysql.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createConnection } from 'mysql2/promise';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function loadEnv() {
  const env = { ...process.env };
  const envPath = path.join(root, '.env');
  if (fs.existsSync(envPath)) {
    for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
      const t = line.trim();
      if (!t || t.startsWith('#')) continue;
      const i = t.indexOf('=');
      if (i === -1) continue;
      const k = t.slice(0, i).trim();
      const v = t.slice(i + 1).trim().replace(/^["']|["']$/g, '');
      if (!(k in env) || env[k] === '') env[k] = v;
    }
  }
  return env;
}

const env = loadEnv();
const host = env.MYSQL_HOST || env.VITE_MYSQL_HOST;
const database = env.MYSQL_DATABASE || env.VITE_MYSQL_DATABASE;
const user = env.MYSQL_USER || env.VITE_MYSQL_USER;
const password = env.MYSQL_PASSWORD || env.VITE_MYSQL_PASSWORD;

if (!host || !database || !user) {
  console.error(`
Missing MySQL credentials. Add to .env:

MYSQL_HOST=localhost
MYSQL_DATABASE=uXXXX_bashayer
MYSQL_USER=uXXXX_bashayer
MYSQL_PASSWORD=your_password

(Hostinger hPanel → Databases → MySQL)
`);
  process.exit(1);
}

const latest = fs.readFileSync(path.join(root, 'backups', 'LATEST.txt'), 'utf8').trim();
const rewritePath = path.join(latest, 'image-rewrite-map.json');
const rewrite = fs.existsSync(rewritePath)
  ? JSON.parse(fs.readFileSync(rewritePath, 'utf8'))
  : {};

function mapUrl(url) {
  if (!url || typeof url !== 'string') return url || '';
  return rewrite[url] || url;
}

function deepRewrite(node) {
  if (node == null) return node;
  if (typeof node === 'string') return mapUrl(node);
  if (Array.isArray(node)) return node.map(deepRewrite);
  if (typeof node === 'object') {
    const out = {};
    for (const [k, v] of Object.entries(node)) out[k] = deepRewrite(v);
    return out;
  }
  return node;
}

function loadDocs(name) {
  const file = path.join(latest, `${name}.json`);
  if (!fs.existsSync(file)) return {};
  const raw = JSON.parse(fs.readFileSync(file, 'utf8'));
  return raw.docs || {};
}

const conn = await createConnection({
  host,
  user,
  password,
  database,
  charset: 'utf8mb4',
  multipleStatements: true,
});

console.log('Connected to', host, database);
console.log('Backup:', latest);

const schema = fs.readFileSync(path.join(root, 'hostinger', 'sql', 'schema.sql'), 'utf8');
await conn.query(schema);
console.log('Schema OK');

// Vehicles
const vehicles = loadDocs('vehicles');
for (const [id, doc] of Object.entries(vehicles)) {
  const d = deepRewrite(doc);
  await conn.execute(
    `INSERT INTO vehicles
      (id, name_en, name_ar, model_en, model_ar, image_url, passengers, vip, sort_order, active, forms_json, data_json)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?)
     ON DUPLICATE KEY UPDATE
      name_en=VALUES(name_en), name_ar=VALUES(name_ar), model_en=VALUES(model_en), model_ar=VALUES(model_ar),
      image_url=VALUES(image_url), passengers=VALUES(passengers), vip=VALUES(vip), sort_order=VALUES(sort_order),
      active=VALUES(active), forms_json=VALUES(forms_json), data_json=VALUES(data_json)`,
    [
      id,
      d.nameEn || '',
      d.nameAr || '',
      d.modelEn || d.nameEn || '',
      d.modelAr || d.nameAr || '',
      mapUrl(d.imageUrl || ''),
      Number(d.passengers) || 4,
      d.vip ? 1 : 0,
      Number(d.sortOrder) || 0,
      d.active === false ? 0 : 1,
      JSON.stringify(d.forms || {}),
      JSON.stringify(d),
    ],
  );
}
console.log('vehicles:', Object.keys(vehicles).length);

// Packages
const packages = loadDocs('packages');
let p = 0;
for (const [id, doc] of Object.entries(packages)) {
  const d = deepRewrite(doc);
  const vehicleKey = String(d.vehicleKey || id).split('-')[0];
  await conn.execute(
    `INSERT INTO packages
      (id, route_id, vehicle_key, fleet_service_id, trip_type, booking_form_id,
       name_en, name_ar, image_url, price, original_price, pickup_price, dropoff_price,
       hourly_rate, hours, passengers, hide_price, active, sort_order, data_json)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
     ON DUPLICATE KEY UPDATE
      route_id=VALUES(route_id), vehicle_key=VALUES(vehicle_key), fleet_service_id=VALUES(fleet_service_id),
      trip_type=VALUES(trip_type), name_en=VALUES(name_en), name_ar=VALUES(name_ar),
      image_url=VALUES(image_url), price=VALUES(price), original_price=VALUES(original_price),
      pickup_price=VALUES(pickup_price), dropoff_price=VALUES(dropoff_price), active=VALUES(active),
      data_json=VALUES(data_json)`,
    [
      id,
      d.routeId || '',
      vehicleKey,
      d.fleetServiceId || '',
      d.tripType || '',
      d.bookingFormId || '',
      d.nameEn || '',
      d.nameAr || '',
      mapUrl(d.imageUrl || ''),
      d.price ?? null,
      d.originalPrice ?? null,
      d.pickupPrice ?? null,
      d.dropoffPrice ?? null,
      d.hourlyRate ?? null,
      d.hours ?? null,
      d.passengers ?? null,
      d.hidePrice ? 1 : 0,
      d.active === false ? 0 : 1,
      Number(d.sortOrder) || 0,
      JSON.stringify(d),
    ],
  );
  p += 1;
  if (p % 100 === 0) console.log('  packages…', p);
}
console.log('packages:', p);

// Content collections
const collections = [
  'services', 'blogs', 'banners', 'gallery', 'routeCards',
  'faqs', 'socialLinks', 'travelReservations', 'products',
];
for (const name of collections) {
  const docs = loadDocs(name);
  for (const [id, doc] of Object.entries(docs)) {
    const d = deepRewrite(doc);
    await conn.execute(
      `INSERT INTO content_rows (collection, id, active, sort_order, data_json)
       VALUES (?,?,?,?,?)
       ON DUPLICATE KEY UPDATE active=VALUES(active), sort_order=VALUES(sort_order), data_json=VALUES(data_json)`,
      [
        name,
        id,
        d.active === false ? 0 : 1,
        Number(d.sortOrder) || 0,
        JSON.stringify(d),
      ],
    );
  }
  console.log(name + ':', Object.keys(docs).length);
}

// site settings
const settings = loadDocs('siteSettings');
for (const [id, doc] of Object.entries(settings)) {
  const d = deepRewrite(doc);
  const { id: _id, ...rest } = d;
  await conn.execute(
    `INSERT INTO site_settings (id, data_json) VALUES (?,?)
     ON DUPLICATE KEY UPDATE data_json=VALUES(data_json)`,
    [id, JSON.stringify(rest)],
  );
}
console.log('siteSettings:', Object.keys(settings).length);

await conn.execute('UPDATE content_revision SET revision = revision + 1 WHERE id = 1');
await conn.end();
console.log('\nImport complete.');
