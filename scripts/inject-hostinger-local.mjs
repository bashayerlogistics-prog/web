/**
 * Local one-shot: inject Clerk + Firebase service account into hostinger-upload PHP.
 * Usage:
 *   set CLERK_SECRET_KEY=sk_...
 *   set FIREBASE_SERVICE_ACCOUNT_FILE=C:\path\to\sa.json
 *   node scripts/inject-hostinger-local.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const upload = path.join(root, 'hostinger-upload');
const hostinger = path.join(root, 'hostinger');

const clerkSecret = String(process.env.CLERK_SECRET_KEY || '').trim();
const saPath = String(process.env.FIREBASE_SERVICE_ACCOUNT_FILE || '').trim();

if (!clerkSecret.startsWith('sk_')) {
  console.error('Set CLERK_SECRET_KEY (sk_...)');
  process.exit(1);
}
if (!saPath || !fs.existsSync(saPath)) {
  console.error('Set FIREBASE_SERVICE_ACCOUNT_FILE to a valid JSON path');
  process.exit(1);
}

const sa = JSON.parse(fs.readFileSync(saPath, 'utf8'));
const projectId = sa.project_id || '';
const clientEmail = sa.client_email || '';
const privateKey = String(sa.private_key || '').replace(/\\n/g, '\n');
if (!projectId || !clientEmail || !privateKey.includes('BEGIN')) {
  console.error('Invalid service account JSON');
  process.exit(1);
}
const pkB64 = Buffer.from(privateKey, 'utf8').toString('base64');

function inject(file, map) {
  let text = fs.readFileSync(file, 'utf8');
  for (const [needle, value] of Object.entries(map)) {
    if (!text.includes(needle)) {
      throw new Error(`missing placeholder ${needle} in ${file}`);
    }
    text = text.split(needle).join(String(value));
  }
  fs.writeFileSync(file, text);
}

const common = {
  __FIREBASE_PROJECT_ID__: projectId,
  __FIREBASE_CLIENT_EMAIL__: clientEmail,
  __FIREBASE_PRIVATE_KEY_B64__: pkB64,
};

fs.copyFileSync(path.join(hostinger, 'clerk-exchange.php'), path.join(upload, 'clerk-exchange.php'));
fs.copyFileSync(path.join(hostinger, 'moyasar-verify.php'), path.join(upload, 'moyasar-verify.php'));

inject(path.join(upload, 'clerk-exchange.php'), {
  ...common,
  __CLERK_SECRET_KEY__: clerkSecret,
});

inject(path.join(upload, 'moyasar-verify.php'), {
  ...common,
  __MOYASAR_SECRET_KEY__: process.env.MOYASAR_SECRET_KEY || '',
  __RESEND_API_KEY__: process.env.RESEND_API_KEY || '',
  __WEBHOOK_SECRET__: process.env.WEBHOOK_SECRET || '',
});

const clerk = fs.readFileSync(path.join(upload, 'clerk-exchange.php'), 'utf8');
const ok = !clerk.includes('__CLERK_SECRET_KEY__')
  && !clerk.includes('__FIREBASE_PRIVATE_KEY_B64__')
  && clerk.includes("CLERK_SECRET_KEY = 'sk_")
  && clerk.includes(projectId);

if (!ok) {
  console.error('Inject sanity failed');
  process.exit(1);
}

console.log('INJECT_OK');
console.log(`project=${projectId}`);
