import fs from 'node:fs';
import path from 'node:path';
import YAML from 'yaml';
import { Marked, type Tokens } from 'marked';
import { site } from '../../site.config';
import { countWords, escapeHtml, markdownToPlain, slugify, truncate } from './text';

export const ROOT = path.resolve(import.meta.dirname, '../..');
export const ARTICLES_DIR = path.join(ROOT, 'content/articles');
export const PAGES_DIR = path.join(ROOT, 'content/pages');

export interface TocItem { id: string; text: string; depth: number }

export interface Academic {
  udc?: string;
  bbk?: string;
  authorFull?: string;
  affiliation?: string[];
  abstract?: string;
  keywords?: string[];
  en?: { title?: string; abstract?: string; keywords?: string[] };
}

export interface Article {
  slug: string;
  title: string;
  subtitle?: string;
  excerpt: string;
  category: string;
  tags: string[];
  date?: string;
  updated?: string;
  language: string;
  featured: boolean;
  draft: boolean;
  cover?: string;
  coverAlt?: string;
  author: string;
  format?: string;
  academic?: Academic;
  /** Internal ordering key: date, else the source file date. Never displayed as a publication date. */
  sortKey: string;
  html: string;
  plain: string;
  words: number;
  readingMinutes: number;
  toc: TocItem[];
  quotes: string[];
  /** 1-based chronological position in the publication — used as an issue-like number. */
  number: number;
  sourceFile?: string;
}

/** Placeholder replaced per page with the relative path to the site root ("" or "../"). */
export const BASE_TOKEN = '%%BASE%%';

/** Frontmatter is plain YAML between --- fences. */
function parseFrontmatter(raw: string): { data: Record<string, any>; body: string } {
  const m = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!m) return { data: {}, body: raw };
  return { data: YAML.parse(m[1]) ?? {}, body: m[2] };
}

export function mediaName(file: string): string {
  return path.basename(file).replace(/\.[a-z0-9]+$/i, '');
}

/** Responsive <picture> markup for an image from content/media (variants are produced by the image step). */
export function pictureHtml(file: string, alt: string, opts: { sizes?: string; eager?: boolean; className?: string; dims?: Record<string, [number, number]> } = {}): string {
  const name = mediaName(file);
  const b = `${BASE_TOKEN}images/${name}`;
  const dim = opts.dims?.[name];
  const wh = dim ? ` width="${dim[0]}" height="${dim[1]}"` : '';
  const sizes = opts.sizes ?? '(min-width: 1100px) 1100px, 100vw';
  return (
    `<picture${opts.className ? ` class="${opts.className}"` : ''}>` +
    `<source type="image/webp" srcset="${b}-800.webp 800w, ${b}-1600.webp 1600w" sizes="${sizes}">` +
    `<img src="${b}-1600.jpg" srcset="${b}-800.jpg 800w, ${b}-1600.jpg 1600w" sizes="${sizes}" alt="${escapeHtml(alt)}"${wh} ` +
    `${opts.eager ? 'fetchpriority="high"' : 'loading="lazy"'} decoding="async">` +
    `</picture>`
  );
}

let imageDims: Record<string, [number, number]> = {};
export function setImageDims(d: Record<string, [number, number]>) { imageDims = d; }

function renderMarkdown(md: string) {
  const toc: TocItem[] = [];
  const used = new Set<string>();
  const quotes: string[] = [];
  const marked = new Marked({ gfm: true, breaks: false });
  marked.use({
    renderer: {
      heading(this: any, { tokens, depth, text }: Tokens.Heading) {
        const inner = this.parser.parseInline(tokens);
        const plain = markdownToPlain(text);
        let id = slugify(plain) || `section-${toc.length + 1}`;
        while (used.has(id)) id += '-2';
        used.add(id);
        if (depth >= 2 && depth <= 4) toc.push({ id, text: plain, depth });
        const level = Math.min(Math.max(depth, 2), 4);
        return `<h${level} id="${id}"><a class="anchor" href="#${id}" aria-label="Ссылка на раздел">§</a>${inner}</h${level}>\n`;
      },
      image({ href, title, text }: Tokens.Image) {
        const pic = pictureHtml(href, text, { sizes: '(min-width: 900px) 860px, 100vw', dims: imageDims });
        const cap = title ? `<figcaption>${escapeHtml(title)}</figcaption>` : '';
        return `${pic}${cap}`;
      },
      paragraph(this: any, { tokens }: Tokens.Paragraph) {
        // a paragraph that only holds an image becomes a <figure>
        if (tokens.length === 1 && tokens[0].type === 'image') {
          return `<figure class="figure">${this.parser.parseInline(tokens)}</figure>\n`;
        }
        return `<p>${this.parser.parseInline(tokens)}</p>\n`;
      },
      blockquote(this: any, { tokens, text }: Tokens.Blockquote) {
        const plain = markdownToPlain(text);
        if (plain.length < 170) quotes.push(plain);
        return `<blockquote>${this.parser.parse(tokens)}</blockquote>\n`;
      },
      hr() {
        return `<div class="sep" role="separator" aria-hidden="true"><span></span><span></span><span></span></div>\n`;
      },
      link({ href, title, tokens }: Tokens.Link) {
        const inner = (this as any).parser.parseInline(tokens);
        const ext = /^https?:\/\//.test(href);
        return `<a href="${escapeHtml(href)}"${title ? ` title="${escapeHtml(title)}"` : ''}${ext ? ' rel="noopener" target="_blank"' : ''}>${inner}</a>`;
      },
    },
  });
  let html = marked.parse(md) as string;

  // Bibliography: an ordered list right after a "Список литературы" / "References" heading.
  html = html.replace(
    /(<h2 id="([^"]+)">(?:(?!<\/h2>).)*?(?:Список литературы|Литература|References|Источники)<\/h2>\s*)<ol>([\s\S]*?)<\/ol>/,
    (_m, head: string, _id: string, items: string) => {
      let n = 0;
      const lis = items.replace(/<li>/g, () => `<li id="ref-${++n}">`);
      return `${head}<ol class="references">${lis}</ol>`;
    },
  );
  const hasRefs = html.includes('class="references"');
  if (hasRefs) {
    // In-text citations like [5] or [1, с. 23-31] link to the bibliography.
    const [bodyPart, refPart] = splitAtRefs(html);
    html =
      bodyPart.replace(/\[(\d{1,3})((?:,[^\]<]{0,80})?)\]/g, (_m, n: string, rest: string) =>
        `<a class="cite" href="#ref-${n}" aria-label="Источник ${n}">[${n}${rest}]</a>`,
      ) + refPart;
  }
  return { html, toc, quotes };
}

function splitAtRefs(html: string): [string, string] {
  const i = html.indexOf('<ol class="references">');
  const h = html.lastIndexOf('<h2', i);
  return [html.slice(0, h), html.slice(h)];
}

function asDate(v: unknown): string | undefined {
  if (!v) return undefined;
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  const s = String(v).trim();
  return /^\d{4}-\d{2}-\d{2}/.test(s) ? s.slice(0, 10) : undefined;
}

export function loadArticles(): Article[] {
  const files = fs.readdirSync(ARTICLES_DIR).filter((f) => /\.mdx?$/.test(f) && !f.startsWith('_'));
  const list: Article[] = [];
  for (const file of files) {
    const raw = fs.readFileSync(path.join(ARTICLES_DIR, file), 'utf8');
    const { data, body } = parseFrontmatter(raw);
    if (data.draft === true) continue;
    if (!data.title) {
      console.warn(`⚠  ${file}: no title — skipped`);
      continue;
    }
    const slug = data.slug ? String(data.slug) : file.replace(/\.mdx?$/, '');
    const { html, toc, quotes } = renderMarkdown(body);
    const plain = markdownToPlain(body);
    const words = countWords(plain);
    const firstPara = markdownToPlain(body.split(/\n\s*\n/).find((p) => p.trim() && !/^(#|>|!\[|---)/.test(p.trim())) ?? '');
    const date = asDate(data.date);
    list.push({
      slug,
      title: String(data.title),
      subtitle: data.subtitle ? String(data.subtitle) : undefined,
      excerpt: truncate(String(data.excerpt ?? data.academic?.abstract ?? firstPara), 260),
      category: data.category ? String(data.category) : 'Без рубрики',
      tags: Array.isArray(data.tags) ? data.tags.map(String) : [],
      date,
      updated: asDate(data.updated),
      language: data.language ?? site.language,
      featured: data.featured === true,
      draft: false,
      cover: data.cover || undefined,
      coverAlt: data.coverAlt || '',
      author: data.author ?? site.author.name,
      format: data.format,
      academic: data.academic,
      sortKey: date ?? asDate(data.source?.fileDate) ?? '0000-00-00',
      html,
      plain,
      words,
      readingMinutes: Math.max(1, Math.round(words / site.readingSpeed)),
      toc,
      quotes,
      number: 0,
      sourceFile: data.source?.file,
    });
  }
  // chronological numbering (oldest = 01), then newest first
  list.sort((a, b) => a.sortKey.localeCompare(b.sortKey) || a.title.localeCompare(b.title, 'ru'));
  list.forEach((a, i) => (a.number = i + 1));
  return list.reverse();
}

export function categoriesWithCounts(articles: Article[]) {
  const known = site.categories.map((c) => ({ ...c, slug: slugify(c.name), count: 0 }));
  for (const a of articles) {
    let c = known.find((k) => k.name === a.category);
    if (!c) known.push((c = { name: a.category, description: '', slug: slugify(a.category), count: 0 }));
    c.count++;
  }
  return known;
}

/** Related articles: shared category and tags, newest first as a tie-breaker. */
export function related(a: Article, all: Article[], n = 3): Article[] {
  return all
    .filter((b) => b.slug !== a.slug)
    .map((b) => ({ b, s: (b.category === a.category ? 3 : 0) + b.tags.filter((t) => a.tags.includes(t)).length }))
    .sort((x, y) => y.s - x.s || y.b.sortKey.localeCompare(x.b.sortKey))
    .slice(0, n)
    .map((x) => x.b);
}

export function readPage(name: string): { data: Record<string, any>; html: string } | null {
  const file = path.join(PAGES_DIR, `${name}.md`);
  if (!fs.existsSync(file)) return null;
  const { data, body } = parseFrontmatter(fs.readFileSync(file, 'utf8'));
  const marked = new Marked({ gfm: true });
  return { data, html: marked.parse(body) as string };
}
