/**
 * DEEPSTATOR — site configuration.
 * Everything a non-developer is likely to change lives here:
 * brand copy, URLs, navigation, categories, author and contacts.
 *
 * Copy marked "PROVISIONAL" was written as a starting point — replace it with your own.
 */

export const site = {
  name: 'DEEPSTATOR',
  /** Absolute production URL, no trailing slash. Used for canonical URLs, Open Graph, sitemap, RSS.
   *  Can also be set with the SITE_URL environment variable at build time.
   *  `.example` is a reserved placeholder domain — replace before deploying. */
  url: process.env.SITE_URL || 'https://deepstator-site-1.onrender.com',
  /** Path prefix for hosting in a sub-folder (e.g. GitHub Pages project site: '/deepstator/').
   *  Only the 404 page needs it — every other link is relative. */
  basePath: process.env.BASE_PATH || '/',
  language: 'ru',
  locale: 'ru_RU',

  /** PROVISIONAL — short line for <meta description> and social cards */
  description:
    'DEEPSTATOR — независимое издание длинных текстов: эссе о власти, обществе, экономике, науке и устройстве мира.',

  hero: {
    /** PROVISIONAL brand statement. Wrap a word in *asterisks* to set it in red italic. */
    statement: 'Глубина — *форма* несогласия.',
    /** PROVISIONAL */
    lede:
      'Независимое издание длинных текстов. Эссе, статьи и размышления о власти, обществе, экономике, науке и устройстве мира — без упрощений и без спешки.',
  },

  author: {
    /** Name as it appears on the source files ("Автор: Ричард Волков"). */
    name: 'Ричард Волков',
  },

  /** Add links to show them in the footer and on the About page, e.g.
   *  { label: 'Telegram', href: 'https://t.me/…' }. Nothing is shown while the list is empty. */
  contacts: [] as { label: string; href: string }[],

  nav: [
    { label: 'Главная', href: 'index.html', key: 'home' },
    { label: 'Архив', href: 'archive.html', key: 'archive' },
    { label: 'Об издании', href: 'about.html', key: 'about' },
  ],

  /** Categories in display order. An article's `category` must match a `name` here;
   *  unknown categories still work and are appended automatically. */
  categories: [
    { name: 'Геополитика', description: 'Мировой порядок, войны и цивилизации.' },
    { name: 'Экономика', description: 'Собственность, деньги, государство и рынок.' },
    { name: 'Общество', description: 'Управление, семья, человек и техносфера.' },
    { name: 'Философия и наука', description: 'Мировоззрение, эволюция, происхождение жизни.' },
  ],

  /** Words per minute used for reading-time estimates (Russian prose). */
  readingSpeed: 180,
  /** Archive page size before "Показать ещё". */
  archivePageSize: 12,
};

export type SiteConfig = typeof site;
