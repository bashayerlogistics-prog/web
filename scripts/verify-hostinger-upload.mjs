import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const upload = path.join(root, 'hostinger-upload');
const assets = path.join(upload, 'assets');

if (!fs.existsSync(upload) || !fs.existsSync(assets)) {
  console.error('hostinger-upload missing');
  process.exit(1);
}

const files = fs.readdirSync(assets);
const want = [
  'AdminOrders',
  'InstantPriceSection',
  'Login',
  'orderHelpers',
  'FleetSection',
  'PremiumSwiper',
  'Cart',
  'Checkout',
  'SuccessModal',
  'CarCategoriesSection',
  'TravelReservationsSection',
];

let ok = true;
for (const w of want) {
  const hit = files.find((f) => f.startsWith(`${w}-`));
  console.log(`${w}: ${hit || 'MISSING'}`);
  if (!hit) ok = false;
}

const idx = fs.readFileSync(path.join(upload, 'index.html'), 'utf8');
const css = idx.match(/index-[A-Za-z0-9_-]+\.css/)?.[0];
const js = idx.match(/index-[A-Za-z0-9_-]+\.js/)?.[0];
console.log('index css:', css || 'MISSING');
console.log('index js:', js || 'MISSING');
console.log('.htaccess', fs.existsSync(path.join(upload, '.htaccess')));
console.log('_redirects', fs.existsSync(path.join(upload, '_redirects')));
console.log('resend-send.php', fs.existsSync(path.join(upload, 'resend-send.php')));
console.log('moyasar-verify.php', fs.existsSync(path.join(upload, 'moyasar-verify.php')));
console.log('clerk-exchange.php', fs.existsSync(path.join(upload, 'clerk-exchange.php')));
console.log('images', fs.existsSync(path.join(upload, 'images')));

// Grep built chunks for key fix markers
const orderHelpersFile = files.find((f) => f.startsWith('orderHelpers-'));
if (orderHelpersFile) {
  const body = fs.readFileSync(path.join(assets, orderHelpersFile), 'utf8');
  console.log('resolveOrderCustomer:', body.includes('resolveOrderCustomer') || body.includes('customerPhone'));
}

const adminOrdersFile = files.find((f) => f.startsWith('AdminOrders-'));
if (adminOrdersFile) {
  const body = fs.readFileSync(path.join(assets, adminOrdersFile), 'utf8');
  console.log('AdminOrders customer helpers:', body.includes('resolveOrderCustomer') || body.includes('customerPhone'));
}

const cssFile = files.find((f) => f.startsWith('index-') && f.endsWith('.css'));
if (cssFile) {
  const body = fs.readFileSync(path.join(assets, cssFile), 'utf8');
  console.log('mobile UX css present:', body.includes('Mobile UX') || body.includes('touch-action:manipulation') || body.includes('touch-action: manipulation'));
}

if (!ok || !css || !js) process.exit(1);
console.log('VERIFY_OK');
