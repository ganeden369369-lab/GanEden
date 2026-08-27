// Build app icon set from the lotus in assets/brand/mentor-logo.jpg
const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const SRC = 'C:/Users/Liran Asia/Documents/Projects/gan-eden/assets/brand/mentor-logo.jpg';
const OUT = 'C:/Users/Liran Asia/Documents/Projects/gan-eden/assets/icon';
fs.mkdirSync(OUT, { recursive: true });

// Lotus bounding box in the 1440px source (with a little margin)
const BOX = { left: 470, top: 600, width: 200, height: 105 };
const SIZE = 1024;

const gradientSvg = (w, h) => `
<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#8E5E4E"/>
      <stop offset="55%" stop-color="#B98577"/>
      <stop offset="100%" stop-color="#E3B4B0"/>
    </linearGradient>
  </defs>
  <rect width="100%" height="100%" fill="url(#g)"/>
</svg>`;

const bgSvg = (s) => `
<svg xmlns="http://www.w3.org/2000/svg" width="${s}" height="${s}">
  <defs>
    <radialGradient id="bg" cx="50%" cy="38%" r="75%">
      <stop offset="0%" stop-color="#FFF7F4"/>
      <stop offset="100%" stop-color="#F6E3DF"/>
    </radialGradient>
  </defs>
  <rect width="100%" height="100%" fill="url(#bg)"/>
</svg>`;

async function lotusMask(targetWidth) {
  const scale = targetWidth / BOX.width;
  const mask = await sharp(SRC)
    .extract(BOX)
    .resize(Math.round(BOX.width * scale), Math.round(BOX.height * scale), { kernel: 'lanczos3' })
    .toColourspace('b-w')
    .blur(scale * 0.35)
    .linear(-4, 235 * 4)   // ink (dark) -> 255, paper (white) -> 0
    .toBuffer();
  const meta = await sharp(mask).metadata();
  return { mask, width: meta.width, height: meta.height };
}

async function lotusRgba(targetWidth) {
  const { mask, width, height } = await lotusMask(targetWidth);
  const grad = await sharp(Buffer.from(gradientSvg(width, height))).removeAlpha().png().toBuffer();
  const rgba = await sharp(grad)
    .joinChannel(mask)
    .png()
    .toBuffer();
  return { rgba, width, height };
}

async function compose(size, lotusWidthRatio, outFile, withBg, yRatio = 0.5) {
  const { rgba, width, height } = await lotusRgba(Math.round(size * lotusWidthRatio));
  const base = withBg
    ? sharp(Buffer.from(bgSvg(size)))
    : sharp({ create: { width: size, height: size, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } });
  await base
    .composite([{ input: rgba, left: Math.round((size - width) / 2), top: Math.round(size * yRatio - height / 2) }])
    .png()
    .toFile(path.join(OUT, outFile));
  console.log('wrote', outFile);
}

(async () => {
  await compose(SIZE, 0.74, 'icon.png', true, 0.5);                 // iOS / generic
  await compose(SIZE, 0.44, 'adaptive-icon-foreground.png', false, 0.5); // Android (safe zone)
  await compose(SIZE, 0.9, 'lotus-mark.png', false, 0.5);          // transparent mark
  await compose(1024, 0.36, 'splash-icon.png', false, 0.5);         // Expo splash
  fs.writeFileSync(path.join(OUT, 'adaptive-icon-background.txt'), '#F6E3DF\n');
})();
