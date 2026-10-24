/**
 * DEEPSTATOR static site build.
 *   content/articles/*.md  →  dist/articles/<slug>.html
 * Run with:  npm run build
 */
import fs from 'node:fs';
import path from 'node:path';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import * as esbuild from 'esbuild';
import { site } from '../site.config';
import { BASE_TOKEN, categoriesWithCounts, loadArticles, mediaName, readPage, related, ROOT, setImageDims, type Article } from './lib/content';
import { processImages } from './lib/images';
import { escapeHtml } from './lib/text';
import { Document, setDims, type PageMeta } from './components/ui';
import { Home } from './pages/Home';
import { ArticlePage } from './pages/ArticlePage';
import { Archive } from './pages/Archive';
import { About } from './pages/About';
import { NotFound } from './pages/NotFound';

const DIST = path.join(ROOT, 'dist');
const t0 = Date.now();

function write(rel: string, content: string | Buffer) {
  const file = path.join(DIST, rel);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content);
}

function page(rel: string, el: React.ReactElement, base?: string) {
  const depth = rel.split('/').length - 1;
  const b = base ?? '../'.repeat(depth);
  const html = '<!doctype html>' + renderToStaticMarkup(el);
  write(rel, html.split(BASE_TOKEN).join(b));
}

async function main() {
  // clean html/assets but keep the image cache
  fs.rmSync(DIST, { recursive: true, force: true });
  fs.mkdirSync(DIST, { recursive: true });

  // 1. images (responsive variants, cached in .cache/images)
  const dims = await processImages(path.join(ROOT, 'content/media'), path.join(ROOT, '.cache/images'), path.join(DIST, 'images'));
  setImageDims(dims);
  setDims(dims);

  // 2. content
  const articles = loadArticles();
  const categories = categoriesWithCounts(articles);
  for (const a of articles) {
    if (a.cover && !dims[mediaName(a.cover)]) console.warn(`⚠  ${a.slug}: cover "${a.cover}" not found in content/media`);
  }

  // 3. assets
  await esbuild.build({
    entryPoints: [path.join(ROOT, 'src/client/main.ts')],
    bundle: true, minify: true, format: 'iife', target: ['es2019'], outfile: path.join(DIST, 'assets/app.js'), logLevel: 'warning',
  });
  await esbuild.build({
    entryPoints: [path.join(ROOT, 'src/styles/main.css')],
    bundle: true, minify: true, outfile: path.join(DIST, 'assets/site.css'), logLevel: 'warning',
    external: ['*.woff2', '*.woff'],
  });

  // search index — a script (not JSON) so it also works from file:// and inside sandboxed previews
  const index = articles.map((a) => ({
    s: a.slug, t: a.title, st: a.subtitle ?? '', c: a.category, tg: a.tags, x: a.excerpt, b: a.plain, n: a.number, m: a.readingMinutes,
  }));
  write('assets/search-index.js', `window.__DS_SEARCH=${JSON.stringify(index)};`);

  const cats = categories.map((c) => ({ name: c.name, count: c.count }));
  const doc = (meta: PageMeta, active: string, body: React.ReactNode) => (
    <Document meta={meta} active={active} categories={cats}>{body}</Document>
  );

  // 4. pages
  page('index.html', doc({ title: 'Независимое издание длинных текстов', description: site.description, path: 'index.html', bodyClass: 'page-home',
    jsonLd: { '@context': 'https://schema.org', '@type': 'WebSite', name: site.name, url: site.url, inLanguage: site.language, description: site.description } },
    'home', <Home articles={articles} categories={categories} />));

  page('archive.html', doc({ title: 'Архив', description: `Все тексты ${site.name}: поиск, темы и фильтры.`, path: 'archive.html', bodyClass: 'page-archive' },
    'archive', <Archive articles={articles} categories={categories} />));

  page('about.html', doc({ title: 'Об издании', description: `О проекте ${site.name} и его авторе.`, path: 'about.html', bodyClass: 'page-about' },
    'about', <About page={readPage('about')} articles={articles} categories={cats} />));

  page('404.html', doc({ title: 'Страница не найдена', description: 'Такой страницы нет.', path: '404.html', noindex: true, bodyClass: 'page-404' },
    '', <NotFound articles={articles} />), site.basePath);

  // chronological neighbours: "previous" = older, "next" = newer
  const chrono = [...articles].sort((a, b) => a.number - b.number);
  for (const a of articles) {
    const i = chrono.indexOf(a);
    const img = a.cover ? `images/${mediaName(a.cover)}-1600.jpg` : undefined;
    const jsonLd: Record<string, unknown> = {
      '@context': 'https://schema.org',
      '@type': a.academic ? 'ScholarlyArticle' : 'Article',
      headline: a.title,
      description: a.excerpt,
      inLanguage: a.language,
      author: { '@type': 'Person', name: a.author },
      publisher: { '@type': 'Organization', name: site.name },
      wordCount: a.words,
      articleSection: a.category,
      keywords: a.tags.join(', '),
      mainEntityOfPage: `${site.url}/articles/${a.slug}`,
      ...(img ? { image: `${site.url}/${img}` } : {}),
      ...(a.date ? { datePublished: a.date } : {}),
      ...(a.updated ? { dateModified: a.updated } : {}),
    };
    page(`articles/${a.slug}.html`, doc(
      { title: a.title, description: a.subtitle ? `${a.subtitle} ${a.excerpt}`.slice(0, 300) : a.excerpt, path: `articles/${a.slug}.html`, type: 'article', image: img, jsonLd, bodyClass: 'page-article' },
      'archive',
      <ArticlePage a={a} prev={chrono[i - 1]} next={chrono[i + 1]} related={related(a, articles)} />,
    ));
  }

  // 5. feeds & SEO files
  const url = (p: string) => `${site.url}/${p}`;
  const pages = ['', 'archive', 'about', ...articles.map((a) => `articles/${a.slug}`)];
  write('sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${pages
    .map((p) => {
      const a = articles.find((x) => `articles/${x.slug}` === p);
      const lm = a?.updated ?? a?.date;
      return `  <url><loc>${url(p)}</loc>${lm ? `<lastmod>${lm}</lastmod>` : ''}</url>`;
    })
    .join('\n')}\n</urlset>\n`);
  write('robots.txt', `User-agent: *\nAllow: /\n\nSitemap: ${url('sitemap.xml')}\n`);
  write('rss.xml', `<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0"><channel>\n<title>${site.name}</title>\n<link>${site.url}/</link>\n<description>${escapeHtml(site.description)}</description>\n<language>${site.language}</language>\n${articles
    .map((a) => `<item><title>${escapeHtml(a.title)}</title><link>${url(`articles/${a.slug}`)}</link><guid>${url(`articles/${a.slug}`)}</guid>${a.date ? `<pubDate>${new Date(a.date).toUTCString()}</pubDate>` : ''}<category>${escapeHtml(a.category)}</category><description>${escapeHtml(a.excerpt)}</description></item>`)
    .join('\n')}\n</channel></rss>\n`);

  // 6. static files
  fs.cpSync(path.join(ROOT, 'public'), DIST, { recursive: true });

  console.log(`✓ DEEPSTATOR: ${articles.length} articles, ${Object.keys(dims).length} images → dist/ in ${Date.now() - t0} ms`);
  if (site.url.endsWith('.example')) console.log('ℹ  site.url is still the placeholder — set SITE_URL or edit site.config.ts before deploying.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
