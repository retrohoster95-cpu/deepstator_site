import React from 'react';
import { LuSearch, LuArrowUpRight } from 'react-icons/lu';
import { site } from '../../site.config';
import type { Article } from '../lib/content';
import { pad2, plural, slugify } from '../lib/text';
import { articleHref, Cover } from '../components/ui';

type Cat = { name: string; slug: string; count: number };

export function Archive({ articles, categories }: { articles: Article[]; categories: Cat[] }) {
  const n = articles.length;
  const tags = Array.from(new Set(articles.flatMap((a) => a.tags)));
  return (
    <div className="archive wrap" data-archive data-page-size={site.archivePageSize}>
      <header className="page-head">
        <p className="label"><span className="dot" aria-hidden="true" /> Архив</p>
        <h1 className="page-head__title">Все тексты</h1>
        <p className="page-head__lede">
          {n} {plural(n, 'публикация', 'публикации', 'публикаций')}. Поиск работает по заголовкам, темам, тегам и полному тексту статей.
        </p>
      </header>

      <form className="filters" role="search" aria-label="Фильтры архива" data-filters>
        <div className="filters__search">
          <LuSearch aria-hidden="true" />
          <label htmlFor="archive-q" className="sr-only">Поиск по архиву</label>
          <input id="archive-q" name="q" type="search" placeholder="Поиск по архиву" autoComplete="off" data-filter-q />
        </div>

        <fieldset className="filters__cats">
          <legend className="sr-only">Тема</legend>
          <label className="chip">
            <input type="radio" name="category" value="" defaultChecked data-filter-cat />
            <span>Все <sup>{n}</sup></span>
          </label>
          {categories.filter((c) => c.count > 0).map((c) => (
            <label className="chip" key={c.slug}>
              <input type="radio" name="category" value={c.slug} data-filter-cat />
              <span>{c.name} <sup>{c.count}</sup></span>
            </label>
          ))}
        </fieldset>

        <div className="filters__row">
          <label className="toggle">
            <input type="checkbox" name="featured" data-filter-featured />
            <span className="toggle__box" aria-hidden="true" />
            <span>Только избранное</span>
          </label>
          <label className="select">
            <span className="label">Порядок</span>
            <select name="sort" data-filter-sort defaultValue="new">
              <option value="new">Сначала новые</option>
              <option value="old">Сначала ранние</option>
              <option value="title">По названию</option>
            </select>
          </label>
        </div>

        <div className="filters__tag" data-tag-row hidden>
          <span className="label">Тег</span>
          <span className="filters__tag-name" data-tag-name />
          <button type="button" className="chip chip--btn" data-tag-clear>Сбросить тег ×</button>
        </div>
        <script
          type="application/json"
          id="tag-names"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(Object.fromEntries(tags.map((t) => [slugify(t), t]))) }}
        />
      </form>

      <p className="archive__count" aria-live="polite" data-count>
        Показано {n} из {n}
      </p>

      <ol className="archive__list" data-list>
        {articles.map((a) => (
          <li
            key={a.slug}
            className="row"
            data-item
            data-slug={a.slug}
            data-category={slugify(a.category)}
            data-tags={a.tags.map(slugify).join('|')}
            data-featured={a.featured ? '1' : '0'}
            data-sort={a.sortKey}
            data-title={a.title}
            data-text={`${a.title} ${a.subtitle ?? ''} ${a.category} ${a.tags.join(' ')} ${a.excerpt}`.toLowerCase()}
          >
            <a className="row__link" href={articleHref(a)}>
              <span className="row__num" aria-hidden="true">{pad2(a.number)}</span>
              <span className="row__body">
                <span className="row__kicker">
                  <span className="row__cat">{a.category}</span>
                  {a.featured && <span className="row__flag">Избранное</span>}
                  {a.format && <span>{a.format}</span>}
                </span>
                <span className="row__title" data-hl-title>{a.title}</span>
                <span className="row__excerpt" data-hl-excerpt>{a.subtitle ?? a.excerpt}</span>
                <span className="row__snippet" data-snippet hidden />
                <span className="row__meta">{a.readingMinutes} мин чтения · {a.words.toLocaleString('ru-RU')} {plural(a.words, 'слово', 'слова', 'слов')}</span>
              </span>
              {a.cover ? <Cover a={a} className="row__media cover" sizes="200px" /> : <span className="row__media row__media--empty" aria-hidden="true"><span>{pad2(a.number)}</span></span>}
              <LuArrowUpRight className="row__icon" aria-hidden="true" />
            </a>
          </li>
        ))}
      </ol>

      <div className="archive__empty" data-empty hidden>
        <p className="archive__empty-mark" aria-hidden="true">∅</p>
        <h2>Ничего не найдено</h2>
        <p>Попробуйте другую формулировку или снимите фильтры.</p>
        <button type="button" className="btn" data-reset>Сбросить фильтры</button>
      </div>

      <div className="archive__more">
        <button type="button" className="btn" data-more hidden>Показать ещё</button>
      </div>
    </div>
  );
}
