/**
 * Download remote CMS images (ImgBB / Supabase / etc.) into hostinger-upload/uploads/cms
 * and write a URL rewrite map for MySQL import.
 *
 * node scripts/download-cms-images.mjs
 */
import fs from 'fs';
import path from 'path';
import https from 'https';
import http from 'http';
import dns from 'dns';
import { fileURLToPath } from 'url';
import crypto from 'crypto';

dns.setDefaultResultOrder('ipv4first');

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const latest = fs.readFileSync(path.join(root, 'backups', 'LATEST.txt'), 'utf8').trim();
const urls = JSON.parse(fs.readFileSync(path.join(latest, 'image-urls.json'), 'utf8'));

const outDir = path.join(root, 'hostinger-upload', 'uploads', 'cms', 'migrated');
fs.mkdirSync(outDir, { recursive: true });

const rewrite = {};
const remote = urls.filter((u) => /^https?:\/\//i.test(u) && !/wa\.me|facebook|instagram|snapchat|tiktok|x\.com/i.test(u));

function download(url, dest) {
  return new Promise((resolve, reject) => {
    const lib = url.startsWith('https') ? https : http;
    const req = lib.get(url, { family: 4, timeout: 60000, headers: { 'User-Agent': 'bashayer-migrate/1' } }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        download(res.headers.location, dest).then(resolve, reject);
        return;
      }
      if (res.statusCode !== 200) {
        reject(new Error(`HTTP ${res.statusCode}`));
        return;
      }
      const file = fs.createWriteStream(dest);
      res.pipe(file);
      file.on('finish', () => file.close(() => resolve()));
      file.on('error', reject);
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('timeout')); });
  });
}

function extFromUrl(url) {
  const clean = url.split('?')[0];
  const m = clean.match(/\.(jpe?g|png|webp|gif)$/i);
  return m ? m[1].toLowerCase().replace('jpeg', 'jpg') : 'jpg';
}

console.log('Downloading', remote.length, 'remote images →', outDir);

let ok = 0;
let fail = 0;
for (const url of remote) {
  const hash = crypto.createHash('sha1').update(url).digest('hex').slice(0, 12);
  const ext = extFromUrl(url);
  const file = `${hash}.${ext}`;
  const dest = path.join(outDir, file);
  const publicUrl = `/uploads/cms/migrated/${file}`;
  try {
    if (!fs.existsSync(dest)) {
      process.stdout.write(`  ${url.slice(0, 60)}… `);
      await download(url, dest);
      console.log('ok');
    } else {
      console.log('  skip (exists)', file);
    }
    rewrite[url] = publicUrl;
    ok += 1;
  } catch (err) {
    console.log('FAIL', err.message);
    fail += 1;
  }
}

const mapPath = path.join(latest, 'image-rewrite-map.json');
fs.writeFileSync(mapPath, JSON.stringify(rewrite, null, 2));
fs.writeFileSync(path.join(root, 'hostinger-upload', 'uploads', 'cms', 'image-rewrite-map.json'), JSON.stringify(rewrite, null, 2));

console.log('\nDone. ok=', ok, 'fail=', fail);
console.log('Rewrite map:', mapPath);
