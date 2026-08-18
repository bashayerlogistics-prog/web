import fs from 'fs';
import path from 'path';
import { createWriteStream } from 'fs';
import { createRequire } from 'module';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
process.chdir(projectRoot);

execSync('npm install archiver --no-save --silent', { stdio: 'inherit' });
const require = createRequire(import.meta.url);
const { ZipArchive } = require('archiver');

if (fs.existsSync('hostinger-upload.zip')) fs.unlinkSync('hostinger-upload.zip');
fs.copyFileSync('hostinger/resend-send.php', 'dist/resend-send.php');
fs.copyFileSync('hostinger/moyasar-verify.php', 'dist/moyasar-verify.php');

const out = createWriteStream('hostinger-upload.zip');
const archive = new ZipArchive({ zlib: { level: 9 } });

archive.on('error', (err) => {
  console.error(err);
  process.exit(1);
});

const done = new Promise((resolve, reject) => {
  out.on('close', () => {
    console.log('OK', archive.pointer(), 'bytes');
    resolve();
  });
  out.on('error', reject);
});

archive.pipe(out);

// Forward-slash entry names so Linux Hostinger creates real folders
function walk(dir, base = '') {
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name);
    const rel = base ? `${base}/${name}` : name;
    if (fs.statSync(full).isDirectory()) {
      walk(full, rel);
    } else {
      archive.file(full, { name: rel.replace(/\\/g, '/') });
    }
  }
}

walk('dist');
await archive.finalize();
await done;
