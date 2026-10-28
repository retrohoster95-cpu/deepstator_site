// Renders PNG/ICO favicons from public/favicon.svg.  Re-run after changing the SVG:  node scripts/favicons.mjs
import sharp from 'sharp';
import fs from 'node:fs';
const dir = new URL('../public/', import.meta.url).pathname;
const svg = fs.readFileSync(dir + 'favicon.svg');
const png = (s) => sharp(svg, { density: 72 * (s / 64) * 4 }).resize(s, s).png().toBuffer();
fs.writeFileSync(dir + 'apple-touch-icon.png', await png(180));
fs.writeFileSync(dir + 'icon-192.png', await png(192));
fs.writeFileSync(dir + 'icon-512.png', await png(512));
// favicon.ico with 16, 32 and 48 px PNG images
const sizes = [16, 32, 48];
const imgs = await Promise.all(sizes.map(png));
const head = Buffer.alloc(6 + 16 * sizes.length);
head.writeUInt16LE(0, 0); head.writeUInt16LE(1, 2); head.writeUInt16LE(sizes.length, 4);
let off = head.length;
sizes.forEach((s, i) => {
  const e = 6 + i * 16;
  head.writeUInt8(s, e); head.writeUInt8(s, e + 1); head.writeUInt8(0, e + 2); head.writeUInt8(0, e + 3);
  head.writeUInt16LE(1, e + 4); head.writeUInt16LE(32, e + 6);
  head.writeUInt32LE(imgs[i].length, e + 8); head.writeUInt32LE(off, e + 12);
  off += imgs[i].length;
});
fs.writeFileSync(dir + 'favicon.ico', Buffer.concat([head, ...imgs]));
fs.writeFileSync(dir + 'site.webmanifest', JSON.stringify({
  name: 'DEEPSTATOR', short_name: 'DEEPSTATOR', start_url: './index.html', display: 'standalone',
  background_color: '#080808', theme_color: '#080808',
  icons: [{ src: 'icon-192.png', sizes: '192x192', type: 'image/png' }, { src: 'icon-512.png', sizes: '512x512', type: 'image/png' }],
}, null, 2));
console.log('✓ favicons');
