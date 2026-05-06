const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const pngToIco = require('png-to-ico');

const root = path.join(__dirname, '..');
const src = path.join(root, 'icons', 'OnePiece-pwa-logo.png');
const out = path.join(root, 'build', 'icon.ico');

(async () => {
  const pngBuf = await sharp(src)
    .resize(256, 256, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 1 } })
    .png()
    .toBuffer();
  const ico = await pngToIco(pngBuf);
  fs.writeFileSync(out, ico);
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
