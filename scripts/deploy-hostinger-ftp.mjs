/**
 * One-shot FTPS deploy of hostinger-upload/ to Hostinger.
 * Credentials via env only — never commit passwords.
 *
 *   set HOSTINGER_FTP_HOST=ftp.example.com
 *   set HOSTINGER_FTP_USER=...
 *   set HOSTINGER_FTP_PASSWORD=...
 *   set HOSTINGER_FTP_DIR=./   (optional; default ./)
 *   node scripts/deploy-hostinger-ftp.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const ftp = require('basic-ftp');

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const localDir = path.join(root, 'hostinger-upload');

const host = process.env.HOSTINGER_FTP_HOST?.trim();
const user = process.env.HOSTINGER_FTP_USER?.trim();
const password = process.env.HOSTINGER_FTP_PASSWORD;
const remoteDir = (process.env.HOSTINGER_FTP_DIR || './').trim() || './';

if (!host || !user || !password) {
  console.error('Missing HOSTINGER_FTP_HOST / HOSTINGER_FTP_USER / HOSTINGER_FTP_PASSWORD');
  process.exit(1);
}

if (!fs.existsSync(localDir)) {
  console.error('Missing hostinger-upload/ — run npm run hostinger first');
  process.exit(1);
}

const client = new ftp.Client(120_000);
client.ftp.verbose = false;

try {
  console.log('Connecting FTPS…', host);
  await client.access({
    host,
    user,
    password,
    secure: true,
    secureOptions: { rejectUnauthorized: false },
  });

  console.log('Remote cwd before:', await client.pwd());
  if (remoteDir && remoteDir !== './' && remoteDir !== '.') {
    await client.ensureDir(remoteDir);
    await client.cd(remoteDir);
  }
  console.log('Uploading', localDir, '→', await client.pwd());
  await client.uploadFromDir(localDir);
  console.log('DEPLOY_OK');
} catch (err) {
  console.error('DEPLOY_FAIL', err?.message || err);
  process.exit(1);
} finally {
  client.close();
}
