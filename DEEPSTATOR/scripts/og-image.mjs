// Generates public/og-default.png — the social card used when a page has no cover image.
// Re-run after changing the brand:  node scripts/og-image.mjs
// Fonts are taken from your system (Manrope / Cormorant Garamond if installed, otherwise close fallbacks).
import sharp from 'sharp';

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630">
  <rect width="1200" height="630" fill="#080808"/>
  <text x="64" y="84" font-family="IBM Plex Mono, DejaVu Sans Mono, monospace" font-size="18" letter-spacing="4" fill="#888888">НЕЗАВИСИМОЕ ИЗДАНИЕ</text>
  <rect x="64" y="112" width="1072" height="1" fill="#292929"/>
  <text x="56" y="370" font-family="Manrope, Inter, sans-serif" font-weight="800" font-size="164" letter-spacing="-8" fill="#F1F0ED">DEEPSTAT</text>
  <circle cx="914" cy="313" r="56" fill="#E5242A"/>
  <text x="976" y="370" font-family="Manrope, Inter, sans-serif" font-weight="800" font-size="164" letter-spacing="-8" fill="#F1F0ED">R</text>
  <rect x="64" y="452" width="1072" height="1" fill="#292929"/>
  <text x="64" y="540" font-family="Cormorant Garamond, Lora, Georgia, serif" font-style="italic" font-size="50" fill="#F1F0ED">Глубина — <tspan fill="#E5242A">форма</tspan> несогласия.</text>
</svg>`;

await sharp(Buffer.from(svg)).png().toFile(new URL('../public/og-default.png', import.meta.url).pathname);
console.log('✓ public/og-default.png');
