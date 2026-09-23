import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
process.chdir(root);

const upload = path.join(root, 'hostinger-upload');
const dist = path.join(root, 'dist');
const hostinger = path.join(root, 'hostinger');

if (!fs.existsSync(dist)) {
  console.error('dist/ missing — run npm run build first');
  process.exit(1);
}

const keepFiles = ['.htaccess', '_redirects', 'resend-send.php', 'moyasar-verify.php', 'clerk-exchange.php'];
const backup = {};
for (const name of keepFiles) {
  const fromUpload = path.join(upload, name);
  const fromHostinger = path.join(hostinger, name);
  if (fs.existsSync(fromUpload)) backup[name] = fs.readFileSync(fromUpload);
  else if (fs.existsSync(fromHostinger)) backup[name] = fs.readFileSync(fromHostinger);
}

fs.rmSync(upload, { recursive: true, force: true });
fs.mkdirSync(upload, { recursive: true });

function copyRecursive(src, dest) {
  const stat = fs.statSync(src);
  if (stat.isDirectory()) {
    fs.mkdirSync(dest, { recursive: true });
    for (const entry of fs.readdirSync(src)) {
      copyRecursive(path.join(src, entry), path.join(dest, entry));
    }
  } else {
    fs.copyFileSync(src, dest);
  }
}

copyRecursive(dist, upload);

for (const name of keepFiles) {
  if (backup[name]) {
    fs.writeFileSync(path.join(upload, name), backup[name]);
  } else {
    const fromHostinger = path.join(hostinger, name);
    if (fs.existsSync(fromHostinger)) {
      fs.copyFileSync(fromHostinger, path.join(upload, name));
    }
  }
}

/*
 * Prefer hostinger/ PHP templates only when upload backup is missing or still
 * has placeholders. Never wipe an already-injected clerk/moyasar bridge.
 */
for (const php of ['resend-send.php', 'moyasar-verify.php', 'clerk-exchange.php']) {
  const src = path.join(hostinger, php);
  const dest = path.join(upload, php);
  if (!fs.existsSync(src)) continue;

  const existing = backup[php] ? backup[php].toString('utf8') : '';
  const alreadyInjected = existing
    && !existing.includes('__CLERK_SECRET_KEY__')
    && !existing.includes('__MOYASAR_SECRET_KEY__')
    && !existing.includes('__FIREBASE_PRIVATE_KEY_B64__')
    && (existing.includes("CLERK_SECRET_KEY = 'sk_")
      || existing.includes("MOYASAR_SECRET_KEY = 'sk_")
      || existing.includes('FIREBASE_PRIVATE_KEY_B64'));

  if (alreadyInjected) {
    fs.writeFileSync(dest, backup[php]);
    continue;
  }
  fs.copyFileSync(src, dest);
}

// MySQL CMS API (schema lives in hostinger/sql; config.php is server-only)
const apiSrc = path.join(hostinger, 'api');
const apiDest = path.join(upload, 'api');
if (fs.existsSync(apiSrc)) {
  fs.mkdirSync(apiDest, { recursive: true });
  for (const entry of fs.readdirSync(apiSrc)) {
    if (entry === 'config.php') continue; // never overwrite live secrets
    copyRecursive(path.join(apiSrc, entry), path.join(apiDest, entry));
  }
}

const assets = fs.readdirSync(path.join(upload, 'assets'));
const checks = {
  index: fs.existsSync(path.join(upload, 'index.html')),
  htaccess: fs.existsSync(path.join(upload, '.htaccess')),
  assetsJs: assets.filter((f) => f.endsWith('.js')).length,
  adminOrders: assets.some((f) => f.startsWith('AdminOrders-')),
  addToCart: assets.some((f) => f.includes('SuccessModal') || f.includes('AddToCart') || f.includes('FleetSection')),
  instantPrice: assets.some((f) => f.startsWith('InstantPriceSection-')),
  login: assets.some((f) => f.startsWith('Login-')),
  orderHelpers: assets.some((f) => f.startsWith('orderHelpers-')),
};

console.log('HOSTINGER_UPLOAD_READY');
console.log(JSON.stringify(checks, null, 2));
