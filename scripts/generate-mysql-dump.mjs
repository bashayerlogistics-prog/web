/**
 * Build a phpMyAdmin-ready .sql dump from the Firestore backup + image rewrite map.
 * No MySQL connection required — upload the file in Hostinger phpMyAdmin.
 *
 * node scripts/generate-mysql-dump.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
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

function esc(value) {
  if (value === null || value === undefined) return 'NULL';
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  if (typeof value === 'boolean') return value ? '1' : '0';
  const s = String(value)
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "\\'")
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r');
  return `'${s}'`;
}

function loadDocs(name) {
  const file = path.join(latest, `${name}.json`);
  if (!fs.existsSync(file)) return {};
  return JSON.parse(fs.readFileSync(file, 'utf8')).docs || {};
}

const schema = fs.readFileSync(path.join(root, 'hostinger', 'sql', 'schema.sql'), 'utf8');
const lines = [];
lines.push('-- Bashayer CMS dump — generated ' + new Date().toISOString());
lines.push('-- Import in Hostinger phpMyAdmin into database u540543003_bashayer');
lines.push('SET NAMES utf8mb4;');
lines.push('SET FOREIGN_KEY_CHECKS=0;');
lines.push(schema);
lines.push('');

// Vehicles
const vehicles = loadDocs('vehicles');
for (const [id, doc] of Object.entries(vehicles)) {
  const d = deepRewrite(doc);
  lines.push(
    `INSERT INTO vehicles (id, name_en, name_ar, model_en, model_ar, image_url, passengers, vip, sort_order, active, forms_json, data_json) VALUES (`
    + [
      esc(id),
      esc(d.nameEn || ''),
      esc(d.nameAr || ''),
      esc(d.modelEn || d.nameEn || ''),
      esc(d.modelAr || d.nameAr || ''),
      esc(mapUrl(d.imageUrl || '')),
      Number(d.passengers) || 4,
      d.vip ? 1 : 0,
      Number(d.sortOrder) || 0,
      d.active === false ? 0 : 1,
      esc(JSON.stringify(d.forms || {})),
      esc(JSON.stringify(d)),
    ].join(', ')
    + ') ON DUPLICATE KEY UPDATE name_en=VALUES(name_en), name_ar=VALUES(name_ar), image_url=VALUES(image_url), data_json=VALUES(data_json);',
  );
}
lines.push(`-- vehicles: ${Object.keys(vehicles).length}`);

// Packages
const packages = loadDocs('packages');
let p = 0;
for (const [id, doc] of Object.entries(packages)) {
  const d = deepRewrite(doc);
  const vehicleKey = String(d.vehicleKey || id).split('-')[0];
  lines.push(
    `INSERT INTO packages (id, route_id, vehicle_key, fleet_service_id, trip_type, booking_form_id, name_en, name_ar, image_url, price, original_price, pickup_price, dropoff_price, hourly_rate, hours, passengers, hide_price, active, sort_order, data_json) VALUES (`
    + [
      esc(id),
      esc(d.routeId || ''),
      esc(vehicleKey),
      esc(d.fleetServiceId || ''),
      esc(d.tripType || ''),
      esc(d.bookingFormId || ''),
      esc(d.nameEn || ''),
      esc(d.nameAr || ''),
      esc(mapUrl(d.imageUrl || '')),
      d.price == null ? 'NULL' : Number(d.price),
      d.originalPrice == null ? 'NULL' : Number(d.originalPrice),
      d.pickupPrice == null ? 'NULL' : Number(d.pickupPrice),
      d.dropoffPrice == null ? 'NULL' : Number(d.dropoffPrice),
      d.hourlyRate == null ? 'NULL' : Number(d.hourlyRate),
      d.hours == null ? 'NULL' : Number(d.hours),
      d.passengers == null ? 'NULL' : Number(d.passengers),
      d.hidePrice ? 1 : 0,
      d.active === false ? 0 : 1,
      Number(d.sortOrder) || 0,
      esc(JSON.stringify(d)),
    ].join(', ')
    + ') ON DUPLICATE KEY UPDATE image_url=VALUES(image_url), price=VALUES(price), data_json=VALUES(data_json);',
  );
  p += 1;
}
lines.push(`-- packages: ${p}`);

const collections = [
  'services', 'blogs', 'banners', 'gallery', 'routeCards',
  'faqs', 'socialLinks', 'travelReservations', 'products',
];
for (const name of collections) {
  const docs = loadDocs(name);
  for (const [id, doc] of Object.entries(docs)) {
    const d = deepRewrite(doc);
    lines.push(
      `INSERT INTO content_rows (collection, id, active, sort_order, data_json) VALUES (`
      + [
        esc(name),
        esc(id),
        d.active === false ? 0 : 1,
        Number(d.sortOrder) || 0,
        esc(JSON.stringify(d)),
      ].join(', ')
      + ') ON DUPLICATE KEY UPDATE data_json=VALUES(data_json), active=VALUES(active);',
    );
  }
  lines.push(`-- ${name}: ${Object.keys(docs).length}`);
}

const settings = loadDocs('siteSettings');
for (const [id, doc] of Object.entries(settings)) {
  const d = deepRewrite(doc);
  const { id: _ignore, ...rest } = d;
  lines.push(
    `INSERT INTO site_settings (id, data_json) VALUES (${esc(id)}, ${esc(JSON.stringify(rest))})`
    + ' ON DUPLICATE KEY UPDATE data_json=VALUES(data_json);',
  );
}
lines.push(`-- siteSettings: ${Object.keys(settings).length}`);
lines.push('UPDATE content_revision SET revision = revision + 1 WHERE id = 1;');
lines.push('SET FOREIGN_KEY_CHECKS=1;');

const outDir = path.join(root, 'backups');
const outFile = path.join(outDir, 'bashayer-mysql-import.sql');
fs.writeFileSync(outFile, lines.join('\n'), 'utf8');
const mb = (fs.statSync(outFile).size / (1024 * 1024)).toFixed(2);
console.log('Wrote', outFile);
console.log('Size:', mb, 'MB');
console.log('Vehicles:', Object.keys(vehicles).length, '| Packages:', p);
