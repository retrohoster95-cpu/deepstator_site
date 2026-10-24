import fs from 'node:fs';
import path from 'node:path';

const WIDTHS = [800, 1600];

/**
 * Turns every image in content/media into responsive variants:
 *   <name>-800.webp, <name>-1600.webp, <name>-800.jpg, <name>-1600.jpg
 * Results are cached by source mtime, so only new or changed images are processed.
 * Returns the intrinsic size of the 1600px variant for each image (used for width/height attributes).
 */
export async function processImages(srcDir: string, cacheDir: string, outDir: string): Promise<Record<string, [number, number]>> {
  const dims: Record<string, [number, number]> = {};
  if (!fs.existsSync(srcDir)) return dims;
  fs.mkdirSync(cacheDir, { recursive: true });
  fs.mkdirSync(outDir, { recursive: true });
  const manifestFile = path.join(cacheDir, 'manifest.json');
  const manifest: Record<string, { mtime: number; w: number; h: number }> = fs.existsSync(manifestFile)
    ? JSON.parse(fs.readFileSync(manifestFile, 'utf8'))
    : {};

  let sharp: any = null;
  const files = fs.readdirSync(srcDir).filter((f) => /\.(jpe?g|png|webp|avif)$/i.test(f));
  for (const f of files) {
    const name = f.replace(/\.[a-z0-9]+$/i, '');
    const src = path.join(srcDir, f);
    const mtime = fs.statSync(src).mtimeMs;
    const cached = manifest[name];
    const outputs = WIDTHS.flatMap((w) => [`${name}-${w}.webp`, `${name}-${w}.jpg`]);
    const fresh = cached && cached.mtime === mtime && outputs.every((o) => fs.existsSync(path.join(cacheDir, o)));
    if (!fresh) {
      sharp ??= (await import('sharp')).default;
      const meta = await sharp(src).metadata();
      for (const w of WIDTHS) {
        const pipeline = () => sharp(src).rotate().resize({ width: Math.min(w, meta.width ?? w), withoutEnlargement: true });
        await pipeline().webp({ quality: 78 }).toFile(path.join(cacheDir, `${name}-${w}.webp`));
        await pipeline().jpeg({ quality: 80, progressive: true, mozjpeg: true }).toFile(path.join(cacheDir, `${name}-${w}.jpg`));
      }
      const big = await sharp(path.join(cacheDir, `${name}-1600.jpg`)).metadata();
      manifest[name] = { mtime, w: big.width, h: big.height };
      console.log(`  image: ${f}`);
    }
    for (const o of outputs) fs.copyFileSync(path.join(cacheDir, o), path.join(outDir, o));
    dims[name] = [manifest[name].w, manifest[name].h];
  }
  fs.writeFileSync(manifestFile, JSON.stringify(manifest, null, 2));
  return dims;
}
