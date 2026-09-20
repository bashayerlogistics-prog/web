import fs from 'fs';
import path from 'path';
import { createWriteStream } from 'fs';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
process.chdir(projectRoot);

const require = createRequire(import.meta.url);
const { ZipArchive } = require('archiver');

const SOURCE = 'hostinger-upload';
const OUT = 'hostinger-upload.zip';

if (!fs.existsSync(SOURCE)) {
  console.error('Missing', SOURCE);
  process.exit(1);
}

if (fs.existsSync(OUT)) fs.unlinkSync(OUT);

const out = createWriteStream(OUT);
const archive = new ZipArchive({ zlib: { level: 9 } });

archive.on('error', (err) => {
  console.error(err);
  process.exit(1);
});

const done = new Promise((resolve, reject) => {
  out.on('close', () => {
    console.log('ZIP_OK', archive.pointer(), 'bytes');
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

walk(SOURCE);
await archive.finalize();
await done;

// Sanity: no backslash entry names
const { execSync } = await import('child_process');
try {
  const listing = execSync(`powershell -NoProfile -Command "Add-Type -AssemblyName System.IO.Compression.FileSystem; [IO.Compression.ZipFile]::OpenRead('${OUT}').Entries | Select-Object -First 8 -ExpandProperty FullName"`, {
    encoding: 'utf8',
  });
  console.log('Sample entries:\n' + listing);
  if (listing.includes('\\')) {
    console.error('BAD_ZIP: backslash paths detected');
    process.exit(1);
  }
  console.log('PATHS_OK');
} catch (e) {
  console.warn('Could not verify zip entries:', e.message);
}
