const fs = require('fs');
const path = require('path');
const archiver = require('archiver');

const root = path.join(__dirname, '..');
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const outDir = path.join(root, 'release');
const outFile = path.join(outDir, `your-one-pace-web-${pkg.version}.zip`);

if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

const output = fs.createWriteStream(outFile);
const archive = archiver('zip', { zlib: { level: 9 } });

output.on('close', () => {
  process.stdout.write(`Wrote ${outFile} (${archive.pointer()} bytes)\n`);
});

archive.on('warning', (err) => {
  if (err.code !== 'ENOENT') throw err;
});

archive.on('error', (err) => {
  throw err;
});

archive.pipe(output);

const entries = [
  'index.html',
  'index.css',
  'app.js',
  'data.js',
  'manifest.json',
  'sw.js',
  'icons/pwa-512.png'
];

for (const rel of entries) {
  const abs = path.join(root, rel);
  if (!fs.existsSync(abs)) {
    throw new Error(`Missing file for zip: ${rel}`);
  }
  archive.file(abs, { name: rel });
}

archive.finalize();
