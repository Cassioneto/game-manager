// One-off script used to (re)generate the Game Manager app icon assets.
// Run with: node scripts/generate-icon.js
// Safe to delete after running - it only writes into assets/ and android/.../mipmap-*.

const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const BLUE = '#0066CC';
const WHITE = '#FFFFFF';

// Gamepad glyph, designed on a 1024x1024 canvas, kept within the adaptive-icon
// "safe zone" (a centered circle of ~66% diameter) so it also works as the
// foreground/monochrome layers of an Android adaptive icon.
const GAMEPAD_SHAPE = `
  <rect x="182" y="372" width="660" height="280" rx="140" fill="${WHITE}"/>
  <rect x="342" y="452" width="40" height="120" fill="{HOLE}"/>
  <rect x="302" y="492" width="120" height="40" fill="{HOLE}"/>
  <circle cx="682" cy="452" r="28" fill="{HOLE}"/>
  <circle cx="682" cy="572" r="28" fill="{HOLE}"/>
  <circle cx="622" cy="512" r="28" fill="{HOLE}"/>
  <circle cx="742" cy="512" r="28" fill="{HOLE}"/>
`;

function svg({ background, hole }) {
  const bg = background ? `<rect width="1024" height="1024" fill="${background}"/>` : '';
  return `
    <svg width="1024" height="1024" viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg">
      ${bg}
      ${GAMEPAD_SHAPE.replace(/\{HOLE\}/g, hole)}
    </svg>
  `;
}

const ROOT = path.resolve(__dirname, '..');

async function buffer(svgString) {
  return sharp(Buffer.from(svgString)).png().toBuffer();
}

async function main() {
  // Master renders (1024x1024)
  const iconBuf = await buffer(svg({ background: BLUE, hole: BLUE })); // opaque icon (bg + glyph, holes show bg color)
  const foregroundBuf = await buffer(svg({ background: null, hole: 'rgba(0,0,0,0)' })); // transparent bg, holes punched through
  const backgroundOnlyBuf = await sharp({
    create: { width: 1024, height: 1024, channels: 4, background: BLUE },
  })
    .png()
    .toBuffer();
  const roundMaskSvg = `<svg width="1024" height="1024"><circle cx="512" cy="512" r="512" fill="#fff"/></svg>`;
  const roundBuf = await sharp(iconBuf)
    .composite([{ input: Buffer.from(roundMaskSvg), blend: 'dest-in' }])
    .png()
    .toBuffer();

  // --- assets/ (source of truth for Expo config) ---
  const assets = path.join(ROOT, 'assets');
  await sharp(iconBuf).resize(1024, 1024).toFile(path.join(assets, 'icon.png'));
  await sharp(foregroundBuf).resize(1024, 1024).toFile(path.join(assets, 'splash-icon.png'));
  await sharp(iconBuf).resize(48, 48).toFile(path.join(assets, 'favicon.png'));
  await sharp(foregroundBuf).resize(512, 512).toFile(path.join(assets, 'android-icon-foreground.png'));
  await sharp(backgroundOnlyBuf).resize(512, 512).toFile(path.join(assets, 'android-icon-background.png'));
  await sharp(foregroundBuf).resize(432, 432).toFile(path.join(assets, 'android-icon-monochrome.png'));

  // --- android/ native resources (so an already-generated native project
  // picks up the new icon immediately, without needing `expo prebuild --clean`) ---
  const densities = {
    mdpi: { legacy: 48, adaptive: 108 },
    hdpi: { legacy: 72, adaptive: 162 },
    xhdpi: { legacy: 96, adaptive: 216 },
    xxhdpi: { legacy: 144, adaptive: 324 },
    xxxhdpi: { legacy: 192, adaptive: 432 },
  };
  const resDir = path.join(ROOT, 'android', 'app', 'src', 'main', 'res');

  for (const [density, sizes] of Object.entries(densities)) {
    const dir = path.join(resDir, `mipmap-${density}`);
    if (!fs.existsSync(dir)) continue;

    await sharp(iconBuf).resize(sizes.legacy, sizes.legacy).webp().toFile(path.join(dir, 'ic_launcher.webp'));
    await sharp(roundBuf).resize(sizes.legacy, sizes.legacy).webp().toFile(path.join(dir, 'ic_launcher_round.webp'));
    await sharp(backgroundOnlyBuf)
      .resize(sizes.adaptive, sizes.adaptive)
      .webp()
      .toFile(path.join(dir, 'ic_launcher_background.webp'));
    await sharp(foregroundBuf)
      .resize(sizes.adaptive, sizes.adaptive)
      .webp()
      .toFile(path.join(dir, 'ic_launcher_foreground.webp'));
    await sharp(foregroundBuf)
      .resize(sizes.adaptive, sizes.adaptive)
      .webp()
      .toFile(path.join(dir, 'ic_launcher_monochrome.webp'));
  }

  console.log('Icon assets regenerated.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
