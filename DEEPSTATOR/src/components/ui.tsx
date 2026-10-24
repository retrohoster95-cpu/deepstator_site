import React from 'react';
import { LuArrowUpRight, LuSearch, LuMenu, LuX, LuArrowUp, LuCornerDownLeft, LuBookmark, LuShuffle, LuKeyboard } from 'react-icons/lu';
import { site } from '../../site.config';
import { BASE_TOKEN, pictureHtml, type Article, type Author } from '../lib/content';
import { formatDate, pad2, plural, slugify } from '../lib/text';

/** All internal links are relative; BASE_TOKEN is swapped for "" or "../" when a page is written. */
export const href = (p: string) => `${BASE_TOKEN}${p}`;
export const articleHref = (a: Article) => href(`articles/${a.slug}.html`);
export const categoryHref = (name: string) => href(`archive.html?category=${encodeURIComponent(slugify(name))}`);

let dims: Record<string, [number, number]> = {};
export function setDims(d: Record<string, [number, number]>) { dims = d; }

export function Html({ html, as: Tag = 'div', className }: { html: string; as?: any; className?: string }) {
  return <Tag className={className} dangerouslySetInnerHTML={{ __html: html }} />;
}

/** Statement copy: *word* → red italic emphasis. */
export function Statement({ text }: { text: string }) {
  const parts = text.split(/(\*[^*]+\*)/g);
  return (
    <>
      {parts.map((p, i) => (p.startsWith('*') && p.endsWith('*') ? <em key={i}>{p.slice(1, -1)}</em> : <React.Fragment key={i}>{p}</React.Fragment>))}
    </>
  );
}

export function Wordmark({ size = 'md' }: { size?: 'md' | 'xl' }) {
  return (
    <span className={`wordmark wordmark--${size}`} data-fit={size === 'xl' ? '' : undefined}>
      <span className="sr-only">{site.name}</span>
      <span aria-hidden="true">DEEPSTAT</span>
      <span className="wordmark__o" aria-hidden="true" />
      <span aria-hidden="true">R</span>
    </span>
  );
}

export function Cover({ a, sizes, eager, className = 'cover' }: { a: Article; sizes?: string; eager?: boolean; className?: string }) {
  if (!a.cover) return null;
  return <Html className={className} html={pictureHtml(a.cover, a.coverAlt || '', { sizes, eager, dims })} />;
}

/** Round author portrait; falls back to initials when there is no photo. */
export function Avatar({ author, size = 40, eager = false }: { author: Author; size?: number; eager?: boolean }) {
  const initials = author.name.split(/\s+/).map((w) => w[0]).slice(0, 2).join('');
  if (!author.photo) return <span className="avatar avatar--initials" style={{ width: size, height: size }} aria-hidden="true">{initials}</span>;
  const n = author.photo.replace(/\.[a-z0-9]+$/i, '');
  const big = size > 80 ? 480 : 160;
  const b = href(`images/authors/${n}-${big}`);
  return (
    <picture className="avatar" style={{ width: size, height: size }}>
      <source type="image/webp" srcSet={`${b}.webp`} />
      <img src={`${b}.jpg`} alt="" width={size} height={size} loading={eager ? undefined : 'lazy'} decoding="async" />
    </picture>
  );
}

export function AuthorChip({ a, size = 28, link = true }: { a: Article; size?: number; link?: boolean }) {
  const inner = (<><Avatar author={a.authorInfo} size={size} /><span className="author-chip__name">{a.author}</span></>);
  return link
    ? <a className="author-chip" href={href(`archive.html?author=${encodeURIComponent(a.authorInfo.id)}`)}>{inner}</a>
    : <span className="author-chip">{inner}</span>;
}

export function Kicker({ a, number = true }: { a: Article; number?: boolean }) {
  return (
    <p className="kicker">
      {number && <span className="kicker__num">№&nbsp;{pad2(a.number)}</span>}
      <a className="kicker__cat" href={categoryHref(a.category)}>{a.category}</a>
      {a.format && <span>{a.format}</span>}
    </p>
  );
}

export function MetaLine({ a, words = false }: { a: Article; words?: boolean }) {
  return (
    <p className="meta">
      {a.date && <time dateTime={a.date}>{formatDate(a.date)}</time>}
      <span>{a.readingMinutes}&nbsp;мин чтения</span>
      {words && <span>{a.words.toLocaleString('ru-RU')}&nbsp;{plural(a.words, 'слово', 'слова', 'слов')}</span>}
    </p>
  );
}

function Header({ active }: { active: string }) {
  return (
    <header className="site-header">
      <a className="skip" href="#main">Перейти к содержанию</a>
      <div className="site-header__inner wrap">
        <a className="site-header__brand" href={href('index.html')} aria-label={`${site.name} — на главную`}>
          <Wordmark />
        </a>
        <nav className="site-nav" aria-label="Основная навигация" id="site-nav">
          <ul>
            {site.nav.map((n) => (
              <li key={n.key}>
                <a href={href(n.href)} aria-current={active === n.key ? 'page' : undefined}>{n.label}</a>
              </li>
            ))}
          </ul>
        </nav>
        <div className="site-header__tools">
          <button className="icon-btn" type="button" data-random title="Случайный текст (R)">
            <LuShuffle aria-hidden="true" />
            <span className="sr-only">Случайный текст</span>
          </button>
          <a className="icon-btn icon-btn--saved" href={href('archive.html?status=saved')} title="Сохранённые тексты">
            <LuBookmark aria-hidden="true" />
            <span className="sr-only">Сохранённые тексты</span>
            <span className="icon-btn__badge" data-saved-count hidden />
          </a>
          <button className="search-trigger" type="button" data-search-open aria-haspopup="dialog" aria-controls="search">
            <LuSearch aria-hidden="true" />
            <span className="search-trigger__label">Поиск</span>
            <kbd className="search-trigger__kbd" data-kbd>Ctrl K</kbd>
          </button>
          <button className="menu-toggle" type="button" aria-expanded="false" aria-controls="mobile-menu" data-menu-toggle>
            <LuMenu aria-hidden="true" className="i-open" />
            <LuX aria-hidden="true" className="i-close" />
            <span className="sr-only">Меню</span>
          </button>
        </div>
      </div>
      <div className="mobile-menu" id="mobile-menu" hidden>
        <nav aria-label="Мобильная навигация" className="wrap">
          <ul>
            {site.nav.map((n, i) => (
              <li key={n.key}>
                <a href={href(n.href)} aria-current={active === n.key ? 'page' : undefined}>
                  <span className="mobile-menu__num">{pad2(i + 1)}</span>
                  {n.label}
                </a>
              </li>
            ))}
            <li>
              <button type="button" data-search-open>
                <span className="mobile-menu__num">{pad2(site.nav.length + 1)}</span>Поиск
              </button>
            </li>
            <li>
              <a href={href('archive.html?status=saved')}>
                <span className="mobile-menu__num">{pad2(site.nav.length + 2)}</span>Сохранённое
              </a>
            </li>
            <li>
              <button type="button" data-random>
                <span className="mobile-menu__num">{pad2(site.nav.length + 3)}</span>Случайный текст
              </button>
            </li>
          </ul>
        </nav>
      </div>
    </header>
  );
}

function Footer({ categories }: { categories: { name: string; count: number }[] }) {
  const year = new Date().getFullYear();
  return (
    <footer className="site-footer">
      <div className="wrap">
        <div className="site-footer__mark">
          <Wordmark size="xl" />
        </div>
        <div className="site-footer__grid">
          <div>
            <p className="label">Издание</p>
            <p className="site-footer__about">{site.description}</p>
          </div>
          <nav aria-label="Разделы">
            <p className="label">Разделы</p>
            <ul>
              {site.nav.map((n) => <li key={n.key}><a href={href(n.href)}>{n.label}</a></li>)}
              <li><a href={href('archive.html?status=saved')}>Сохранённое</a></li>
              <li><button type="button" className="footer-btn" data-random>Случайный текст</button></li>
              <li><a href={href('rss.xml')}>RSS</a></li>
            </ul>
          </nav>
          <nav aria-label="Темы">
            <p className="label">Темы</p>
            <ul>
              {categories.filter((c) => c.count > 0).map((c) => <li key={c.name}><a href={categoryHref(c.name)}>{c.name}</a></li>)}
            </ul>
          </nav>
          {site.contacts.length > 0 && (
            <nav aria-label="Контакты">
              <p className="label">Связь</p>
              <ul>
                {site.contacts.map((c) => <li key={c.href}><a href={c.href} rel="noopener" target="_blank">{c.label} <LuArrowUpRight aria-hidden="true" /></a></li>)}
              </ul>
            </nav>
          )}
        </div>
        <div className="site-footer__base">
          <span>© {year} {site.name}</span>
          <span>Тексты — {site.author.name}</span>
          <button type="button" className="to-top-link" data-shortcuts-open><LuKeyboard aria-hidden="true" /> Горячие клавиши</button>
          <a href="#top" className="to-top-link">Наверх <LuArrowUp aria-hidden="true" /></a>
        </div>
      </div>
    </footer>
  );
}

function SearchDialog() {
  return (
    <div className="search" id="search" role="dialog" aria-modal="true" aria-labelledby="search-title" hidden>
      <div className="search__backdrop" data-search-close />
      <div className="search__panel">
        <h2 id="search-title" className="sr-only">Поиск по изданию</h2>
        <div className="search__field">
          <LuSearch aria-hidden="true" />
          <input
            id="search-input"
            type="search"
            placeholder="Искать в заголовках, темах и текстах…"
            autoComplete="off"
            spellCheck={false}
            aria-controls="search-results"
            aria-describedby="search-status"
            role="combobox"
            aria-expanded="true"
            aria-autocomplete="list"
          />
          <button type="button" className="search__close" data-search-close aria-label="Закрыть поиск">
            <kbd>Esc</kbd>
          </button>
        </div>
        <p className="search__status" id="search-status" aria-live="polite" />
        <ul className="search__results" id="search-results" role="listbox" aria-label="Результаты поиска" />
        <div className="search__foot" aria-hidden="true">
          <span><kbd>↑</kbd><kbd>↓</kbd> выбор</span>
          <span><kbd><LuCornerDownLeft /></kbd> открыть</span>
          <span><kbd>Esc</kbd> закрыть</span>
        </div>
      </div>
    </div>
  );
}

function ShortcutsDialog() {
  const rows: [string[], string][] = [
    [['Ctrl', 'K'], 'Поиск по изданию'],
    [['/'], 'Поиск по изданию'],
    [['R'], 'Случайный текст'],
    [['G', 'H'], 'На главную'],
    [['G', 'A'], 'В архив'],
    [['['], 'Предыдущий текст (в статье)'],
    [[']'], 'Следующий текст (в статье)'],
    [['B'], 'Сохранить или убрать текст (в статье)'],
    [['A'], 'Настройки чтения (в статье)'],
    [['T'], 'Наверх страницы'],
    [['?'], 'Эта справка'],
  ];
  return (
    <dialog className="dlg" id="shortcuts" aria-labelledby="shortcuts-title">
      <div className="dlg__head">
        <h2 id="shortcuts-title" className="dlg__title">Горячие клавиши</h2>
        <button type="button" className="dlg__close" data-dialog-close aria-label="Закрыть"><LuX aria-hidden="true" /></button>
      </div>
      <dl className="keys">
        {rows.map(([k, d], i) => (
          <div key={i}>
            <dt>{k.map((x, j) => <kbd key={j}>{x}</kbd>)}</dt>
            <dd>{d}</dd>
          </div>
        ))}
      </dl>
    </dialog>
  );
}

export interface PageMeta {
  title: string;
  description: string;
  path: string; // e.g. "articles/x.html"
  type?: 'website' | 'article';
  image?: string; // root-relative path, e.g. "images/x-1600.jpg"
  jsonLd?: object;
  noindex?: boolean;
  bodyClass?: string;
  /** absolute prefix used for asset links on pages served from arbitrary paths (404) */
}

export function Document({ meta, active, categories, catalogue, children }: { meta: PageMeta; active: string; categories: { name: string; count: number }[]; catalogue: object[]; children: React.ReactNode }) {
  const canonical = `${site.url}/${meta.path === 'index.html' ? '' : meta.path}`;
  const image = `${site.url}/${meta.image ?? 'og-default.png'}`;
  const fullTitle = meta.path === 'index.html' ? `${site.name} — ${meta.title}` : `${meta.title} — ${site.name}`;
  return (
    <html lang={site.language} id="top">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <title>{fullTitle}</title>
        <meta name="description" content={meta.description} />
        {meta.noindex ? <meta name="robots" content="noindex" /> : <link rel="canonical" href={canonical} />}
        <meta name="theme-color" content="#080808" />
        <meta name="color-scheme" content="dark" />
        <meta property="og:site_name" content={site.name} />
        <meta property="og:locale" content={site.locale} />
        <meta property="og:type" content={meta.type ?? 'website'} />
        <meta property="og:title" content={meta.title} />
        <meta property="og:description" content={meta.description} />
        <meta property="og:url" content={canonical} />
        <meta property="og:image" content={image} />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={meta.title} />
        <meta name="twitter:description" content={meta.description} />
        <meta name="twitter:image" content={image} />
        <link rel="icon" href={href('favicon.svg')} type="image/svg+xml" />
        <link rel="alternate" type="application/rss+xml" title={site.name} href={href('rss.xml')} />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,500;0,600;0,700;1,500;1,600&family=IBM+Plex+Mono:wght@400;500&family=Manrope:wght@400;500;600;700;800&display=swap"
        />
        <link rel="stylesheet" href={href('assets/site.css')} />
        {meta.jsonLd && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(meta.jsonLd) }} />}
        <script dangerouslySetInnerHTML={{ __html: `document.documentElement.classList.add('js');window.__DS_BASE=${JSON.stringify(BASE_TOKEN)};try{var p=JSON.parse(localStorage.getItem('ds:reader')||'{}'),d=document.documentElement;for(var k in p)d.setAttribute('data-r-'+k,p[k])}catch(e){}` }} />
        <script defer src={href('assets/app.js')} />
      </head>
      <body className={meta.bodyClass}>
        <div className="grain" aria-hidden="true" />
        <Header active={active} />
        <main id="main" tabIndex={-1}>{children}</main>
        <Footer categories={categories} />
        <SearchDialog />
        <ShortcutsDialog />
        <div className="toasts" aria-live="polite" aria-atomic="false" data-toasts />
        <script type="application/json" id="ds-catalogue" dangerouslySetInnerHTML={{ __html: JSON.stringify(catalogue) }} />
        <button type="button" className="back-to-top" data-back-to-top aria-label="Вернуться наверх" hidden>
          <LuArrowUp aria-hidden="true" />
        </button>
      </body>
    </html>
  );
}

export function SectionHead({ index, title, aside, id }: { index: string; title: string; aside?: React.ReactNode; id?: string }) {
  return (
    <div className="section-head">
      <span className="section-head__index">{index}</span>
      <h2 className="section-head__title" id={id}>{title}</h2>
      {aside && <div className="section-head__aside">{aside}</div>}
    </div>
  );
}
