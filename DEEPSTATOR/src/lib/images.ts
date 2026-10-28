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

/** Author portraits from content/authors:
 *  <name>-160|480.(webp|jpg)  — square, cropped around `focus` (face position in %) for avatars;
 *  <name>-portrait.(webp|jpg) — 4:5 portrait, 900px wide, for author pages. */
export async function processAuthorPhotos(srcDir: string, cacheDir: string, outDir: string, focus: Record<string, [number, number]> = {}): Promise<string[]> {
  if (!fs.existsSync(srcDir)) return [];
  fs.mkdirSync(cacheDir, { recursive: true });
  fs.mkdirSync(outDir, { recursive: true });
  const done: string[] = [];
  let sharp: any = null;
  for (const f of fs.readdirSync(srcDir).filter((x) => /\.(jpe?g|png|webp)$/i.test(x))) {
    const name = f.replace(/\.[a-z0-9]+$/i, '');
    const src = path.join(srcDir, f);
    const fx = focus[f] ?? focus[name];
    const sig = JSON.stringify(fx ?? null);
    const outs = [...[160, 480].flatMap((w) => [`${name}-${w}.webp`, `${name}-${w}.jpg`]), `${name}-portrait.webp`, `${name}-portrait.jpg`];
    const stamp = path.join(cacheDir, `${name}.stamp`);
    const fresh = fs.existsSync(stamp) && fs.readFileSync(stamp, 'utf8') === `${fs.statSync(src).mtimeMs}|${sig}` && outs.every((o) => fs.existsSync(path.join(cacheDir, o)));
    if (!fresh) {
      sharp ??= (await import('sharp')).default;
      const meta = await sharp(src).rotate().metadata();
      const W = meta.width!, H = meta.height!;
      // a cut-out portrait (transparent background) is placed on the brand backdrop:
      // near-black field with the red "O" of the wordmark behind the head
      let input: any = src;
      if (meta.hasAlpha) {
        const hx = ((fx?.[0] ?? 50) / 100) * W, hy = ((fx?.[1] ?? 35) / 100) * H, r = Math.round(Math.min(W, H) * 0.26);
        const bg = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}"><rect width="100%" height="100%" fill="#101010"/><circle cx="${hx}" cy="${hy}" r="${r}" fill="#E5242A"/></svg>`);
        input = await sharp(bg).composite([{ input: await sharp(src).rotate().toBuffer() }]).png().toBuffer();
      }
      // square around the face
      const side = Math.round(Math.min(W, H) * (fx ? 0.62 : 1));
      const cx = fx ? (fx[0] / 100) * W : W / 2, cy = fx ? (fx[1] / 100) * H : H / 2;
      const left = Math.max(0, Math.min(W - side, Math.round(cx - side / 2)));
      const top = Math.max(0, Math.min(H - side, Math.round(cy - side * 0.45)));
      for (const w of [160, 480]) {
        const pipe = () => sharp(input).rotate().extract({ left, top, width: side, height: side }).resize(w, w);
        await pipe().webp({ quality: 82 }).toFile(path.join(cacheDir, `${name}-${w}.webp`));
        await pipe().jpeg({ quality: 84, mozjpeg: true }).toFile(path.join(cacheDir, `${name}-${w}.jpg`));
      }
      const por = () => sharp(input).rotate().resize(900, 1125, { fit: 'cover', position: meta.hasAlpha ? 'centre' : 'attention' });
      await por().webp({ quality: 82 }).toFile(path.join(cacheDir, `${name}-portrait.webp`));
      await por().jpeg({ quality: 84, mozjpeg: true }).toFile(path.join(cacheDir, `${name}-portrait.jpg`));
      fs.writeFileSync(stamp, `${fs.statSync(src).mtimeMs}|${sig}`);
      console.log(`  author photo: ${f}`);
    }
    for (const o of outs) fs.copyFileSync(path.join(cacheDir, o), path.join(outDir, o));
    done.push(name);
  }
  return done;
}
