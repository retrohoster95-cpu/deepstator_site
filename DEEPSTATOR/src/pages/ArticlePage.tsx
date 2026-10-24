import React from 'react';
import { LuArrowLeft, LuArrowRight, LuArrowUpRight, LuLink, LuShare2, LuCheck, LuChevronDown } from 'react-icons/lu';
import { site } from '../../site.config';
import type { Article, TocItem } from '../lib/content';
import { pad2, plural, slugify } from '../lib/text';
import { articleHref, categoryHref, Cover, Html, href, Kicker, MetaLine } from '../components/ui';

function Toc({ items, id }: { items: TocItem[]; id: string }) {
  return (
    <ol className="toc__list" id={id}>
      {items.map((t) => (
        <li key={t.id} className={`toc__item toc__item--${t.depth}`}>
          <a href={`#${t.id}`} data-toc-link={t.id}>{t.text}</a>
        </li>
      ))}
    </ol>
  );
}

function ShareTools() {
  return (
    <div className="share" role="group" aria-label="Поделиться">
      <button type="button" className="share__btn" data-copy-link>
        <LuLink aria-hidden="true" className="i-idle" />
        <LuCheck aria-hidden="true" className="i-done" />
        <span data-label>Скопировать ссылку</span>
      </button>
      <button type="button" className="share__btn" data-share>
        <LuShare2 aria-hidden="true" />
        <span>Поделиться</span>
      </button>
      <span className="share__status sr-only" aria-live="polite" data-share-status />
    </div>
  );
}

function AcademicHeader({ a }: { a: Article }) {
  const ac = a.academic!;
  return (
    <section className="academic" aria-label="Сведения о статье">
      <dl className="academic__codes">
        {ac.udc && (<><dt>УДК</dt><dd>{ac.udc}</dd></>)}
        {ac.bbk && (<><dt>ББК</dt><dd>{ac.bbk}</dd></>)}
      </dl>
      {ac.authorFull && (
        <div className="academic__author">
          <p className="academic__name">{ac.authorFull}</p>
          {ac.affiliation?.map((l) => <p key={l}>{l}</p>)}
        </div>
      )}
      {ac.abstract && (
        <div className="academic__abstract">
          <p className="label">Аннотация</p>
          <p>{ac.abstract}</p>
        </div>
      )}
      {ac.keywords && ac.keywords.length > 0 && (
        <div className="academic__kw">
          <p className="label">Ключевые слова</p>
          <p>{ac.keywords.join(', ')}</p>
        </div>
      )}
      {ac.en && (ac.en.title || ac.en.abstract) && (
        <details className="academic__en" lang="en">
          <summary>
            <span className="label">English abstract</span>
            {ac.en.title && <span className="academic__en-title">{ac.en.title}</span>}
            <LuChevronDown aria-hidden="true" />
          </summary>
          {ac.en.abstract && <p><strong>Annotation:</strong> {ac.en.abstract}</p>}
          {ac.en.keywords && <p><strong>Keywords:</strong> {ac.en.keywords.join(', ')}</p>}
        </details>
      )}
    </section>
  );
}

export function ArticlePage({ a, prev, next, related }: { a: Article; prev?: Article; next?: Article; related: Article[] }) {
  const hasToc = a.toc.length >= 2;
  return (
    <article className="article" data-article lang={a.language}>
      <div className="progress" aria-hidden="true"><span data-progress /></div>

      <header className="article__head wrap">
        <nav className="crumbs" aria-label="Навигационная цепочка">
          <a href={href('index.html')}>{site.name}</a>
          <span aria-hidden="true">/</span>
          <a href={href('archive.html')}>Архив</a>
          <span aria-hidden="true">/</span>
          <a href={categoryHref(a.category)}>{a.category}</a>
        </nav>
        <Kicker a={a} />
        <h1 className={`article__title ${a.title.length > 60 ? 'article__title--long' : ''}`}>{a.title}</h1>
        {a.subtitle && <p className="article__subtitle">{a.subtitle}</p>}
        <div className="article__byline">
          <p className="article__author">
            <span className="label">Автор</span>
            <span>{a.author}</span>
          </p>
          <MetaLine a={a} words />
        </div>
      </header>

      {a.cover && (
        <figure className="article__cover wrap">
          <Cover a={a} eager sizes="(min-width: 1360px) 1280px, 100vw" />
        </figure>
      )}

      <div className={`article__layout wrap ${hasToc ? 'has-toc' : ''}`}>
        <aside className="article__rail" aria-label="Оглавление и действия">
          <div className="rail__sticky">
            {hasToc && (
              <nav className="toc toc--desktop" aria-labelledby="toc-title-d">
                <p className="label" id="toc-title-d">Содержание</p>
                <Toc items={a.toc} id="toc-d" />
              </nav>
            )}
            <div className="rail__meta">
              <p className="label">Текст</p>
              <p className="rail__num">№ {pad2(a.number)}</p>
              <p className="rail__line">{a.readingMinutes} мин · {a.words.toLocaleString('ru-RU')} {plural(a.words, 'слово', 'слова', 'слов')}</p>
              <p className="rail__line rail__remaining" data-remaining aria-live="off" />
            </div>
            <ShareTools />
          </div>
        </aside>

        <div className="article__main">
          {hasToc && (
            <details className="toc toc--mobile">
              <summary>
                <span className="label">Содержание</span>
                <span className="toc__count">{a.toc.length} {plural(a.toc.length, 'раздел', 'раздела', 'разделов')}</span>
                <LuChevronDown aria-hidden="true" />
              </summary>
              <Toc items={a.toc} id="toc-m" />
            </details>
          )}

          {a.academic && <AcademicHeader a={a} />}

          <Html className="prose" html={a.html} />

          <footer className="article__end">
            <div className="end-mark" aria-hidden="true"><span className="end-mark__dot" /></div>
            {a.tags.length > 0 && (
              <ul className="tags" aria-label="Теги">
                {a.tags.map((t) => (
                  <li key={t}><a href={href(`archive.html?tag=${encodeURIComponent(slugify(t))}`)}>#{t}</a></li>
                ))}
              </ul>
            )}
            <ShareTools />
          </footer>
        </div>
      </div>

      {(prev || next) && (
        <nav className="pager wrap" aria-label="Соседние тексты">
          {prev ? (
            <a className="pager__link pager__link--prev" href={articleHref(prev)} rel="prev">
              <span className="label"><LuArrowLeft aria-hidden="true" /> Предыдущий</span>
              <span className="pager__title">{prev.title}</span>
            </a>
          ) : <span />}
          {next ? (
            <a className="pager__link pager__link--next" href={articleHref(next)} rel="next">
              <span className="label">Следующий <LuArrowRight aria-hidden="true" /></span>
              <span className="pager__title">{next.title}</span>
            </a>
          ) : <span />}
        </nav>
      )}

      {related.length > 0 && (
        <section className="related wrap" aria-labelledby="related-title">
          <h2 id="related-title" className="related__title">Читать дальше</h2>
          <ul className="related__grid">
            {related.map((r) => (
              <li key={r.slug}>
                <a className="related__card" href={articleHref(r)}>
                  <span className="related__cat">{r.category}</span>
                  <span className="related__name">{r.title}</span>
                  <span className="related__meta">№ {pad2(r.number)} · {r.readingMinutes} мин <LuArrowUpRight aria-hidden="true" /></span>
                </a>
              </li>
            ))}
          </ul>
        </section>
      )}
    </article>
  );
}
