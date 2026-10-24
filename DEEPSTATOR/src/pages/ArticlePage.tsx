import React from 'react';
import { LuArrowLeft, LuArrowRight, LuArrowUpRight, LuLink, LuShare2, LuCheck, LuChevronDown, LuBookmark, LuBookmarkCheck, LuType, LuListTree, LuX, LuQuote, LuCopy } from 'react-icons/lu';
import { site } from '../../site.config';
import type { Article, TocItem } from '../lib/content';
import { pad2, plural, slugify } from '../lib/text';
import { articleHref, Avatar, categoryHref, Cover, Html, href, Kicker, MetaLine } from '../components/ui';

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

function SaveButton({ compact = false }: { compact?: boolean }) {
  return (
    <button type="button" className={`share__btn save-btn ${compact ? 'save-btn--compact' : ''}`} data-save aria-pressed="false">
      <LuBookmark aria-hidden="true" className="i-idle" />
      <LuBookmarkCheck aria-hidden="true" className="i-done" />
      <span data-save-label>Сохранить</span>
    </button>
  );
}

function Seg({ name, label, options }: { name: string; label: string; options: [string, string][] }) {
  return (
    <fieldset className="seg">
      <legend className="label">{label}</legend>
      <div className="seg__row">
        {options.map(([v, t]) => (
          <label key={v} className="seg__opt">
            <input type="radio" name={`r-${name}`} value={v} data-reader={name} />
            <span>{t}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

function ReaderDialog() {
  return (
    <dialog className="dlg" id="reader" aria-labelledby="reader-title">
      <div className="dlg__head">
        <h2 id="reader-title" className="dlg__title">Настройки чтения</h2>
        <button type="button" className="dlg__close" data-dialog-close aria-label="Закрыть"><LuX aria-hidden="true" /></button>
      </div>
      <div className="reader">
        <Seg name="size" label="Размер текста" options={[['s', 'A−'], ['m', 'A'], ['l', 'A+'], ['xl', 'A++']]} />
        <Seg name="font" label="Шрифт текста" options={[['sans', 'Гротеск'], ['serif', 'Антиква']]} />
        <Seg name="width" label="Ширина колонки" options={[['narrow', 'Узкая'], ['normal', 'Обычная'], ['wide', 'Широкая']]} />
        <Seg name="theme" label="Фон" options={[['dark', 'Тёмный'], ['paper', 'Бумага']]} />
        <p className="reader__preview" aria-hidden="true">Глубина — форма несогласия. Так будет выглядеть текст статьи.</p>
        <button type="button" className="btn" data-reader-reset>Сбросить настройки</button>
      </div>
    </dialog>
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

export function ArticlePage({ a, prev, next, related, authorTexts }: { a: Article; prev?: Article; next?: Article; related: Article[]; authorTexts: number }) {
  const hasToc = a.toc.length >= 2;
  return (
    <article className="article" data-article data-slug={a.slug} lang={a.language}
      data-prev={prev ? `${prev.slug}.html` : undefined} data-next={next ? `${next.slug}.html` : undefined}>
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
          <a className="article__author" href={href(`archive.html?author=${encodeURIComponent(a.authorInfo.id)}`)}>
            <Avatar author={a.authorInfo} size={56} eager />
            <span className="article__author-text">
              <span className="label">Автор</span>
              <span className="article__author-name" data-author-name>{a.author}</span>
            </span>
          </a>
          <MetaLine a={a} words />
        </div>
        <div className="article__actions" role="group" aria-label="Действия с текстом">
          <SaveButton />
          <button type="button" className="share__btn" data-reader-open>
            <LuType aria-hidden="true" /><span>Настройки чтения</span>
          </button>
          <button type="button" className="share__btn" data-share>
            <LuShare2 aria-hidden="true" /><span>Поделиться</span>
          </button>
          <span className="article__status" data-read-status />
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
            <div className="rail__tools">
              <SaveButton />
              <button type="button" className="share__btn" data-reader-open><LuType aria-hidden="true" /><span>Настройки чтения</span></button>
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
            <aside className="author-card" aria-label="Об авторе">
              <Avatar author={a.authorInfo} size={88} />
              <div className="author-card__body">
                <span className="label">Автор текста</span>
                <span className="author-card__name">{a.author}</span>
                <a className="link-arrow" href={href(`archive.html?author=${encodeURIComponent(a.authorInfo.id)}`)}>
                  {authorTexts > 1 ? `Все тексты автора · ${authorTexts}` : 'Тексты автора в архиве'} <LuArrowRight aria-hidden="true" />
                </a>
              </div>
            </aside>
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
                  <span className="related__author"><Avatar author={r.authorInfo} size={22} />{r.author}</span>
                  <span className="related__meta">№ {pad2(r.number)} · {r.readingMinutes} мин <LuArrowUpRight aria-hidden="true" /></span>
                  <span className="track" data-track={r.slug} aria-hidden="true"><span /></span>
                </a>
              </li>
            ))}
          </ul>
        </section>
      )}

      <ReaderDialog />

      {hasToc && (
        <dialog className="dlg dlg--sheet" id="toc-sheet" aria-labelledby="toc-sheet-title">
          <div className="dlg__head">
            <h2 id="toc-sheet-title" className="dlg__title">Содержание</h2>
            <button type="button" className="dlg__close" data-dialog-close aria-label="Закрыть"><LuX aria-hidden="true" /></button>
          </div>
          <nav className="toc" aria-labelledby="toc-sheet-title"><Toc items={a.toc} id="toc-s" /></nav>
        </dialog>
      )}

      <dialog className="lightbox" id="lightbox" aria-label="Изображение">
        <button type="button" className="dlg__close lightbox__close" data-dialog-close aria-label="Закрыть"><LuX aria-hidden="true" /></button>
        <img alt="" data-lightbox-img />
        <p className="lightbox__cap" data-lightbox-cap />
      </dialog>

      <div className="quote-pop" role="toolbar" aria-label="Действия с выделенным текстом" data-quote-pop hidden>
        <button type="button" data-quote-copy><LuCopy aria-hidden="true" /> Копировать цитату</button>
        <button type="button" data-quote-share><LuQuote aria-hidden="true" /> Поделиться</button>
      </div>

      <div className="mbar" role="toolbar" aria-label="Панель статьи" data-mbar>
        <span className="mbar__progress" aria-hidden="true"><span data-mbar-progress /></span>
        {hasToc && <button type="button" data-dialog-open="toc-sheet"><LuListTree aria-hidden="true" /><span>Оглавление</span></button>}
        <button type="button" data-reader-open><LuType aria-hidden="true" /><span>Текст</span></button>
        <button type="button" data-save className="mbar__save" aria-pressed="false">
          <LuBookmark aria-hidden="true" className="i-idle" /><LuBookmarkCheck aria-hidden="true" className="i-done" /><span>Сохранить</span>
        </button>
        <button type="button" data-share><LuShare2 aria-hidden="true" /><span>Поделиться</span></button>
      </div>
    </article>
  );
}
