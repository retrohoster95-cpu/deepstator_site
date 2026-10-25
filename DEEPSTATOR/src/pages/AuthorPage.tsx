import React from 'react';
import { LuArrowUpRight } from 'react-icons/lu';
import type { Article, Author } from '../lib/content';
import { pad2, plural } from '../lib/text';
import { articleHref, Cover, href, Portrait } from '../components/ui';

export function AuthorPage({ author, articles }: { author: Author; articles: Article[] }) {
  const words = articles.reduce((s, a) => s + a.words, 0);
  const minutes = articles.reduce((s, a) => s + a.readingMinutes, 0);
  const cats = Array.from(new Set(articles.map((a) => a.category)));
  const [first, ...last] = author.name.split(' ');
  return (
    <div className="author-page">
      <section className="author-hero wrap" aria-labelledby="author-name">
        <div className="author-hero__photo">
          <Portrait author={author} />
          <span className="author-hero__tag">{author.role ?? 'Автор DEEPSTATOR'}</span>
        </div>
        <div className="author-hero__body">
          <p className="label"><span className="dot" aria-hidden="true" /> {author.role ?? 'Автор'}</p>
          <h1 id="author-name" className="author-hero__name">
            <span>{first}</span>
            {last.length > 0 && <em>{last.join(' ')}</em>}
          </h1>
          {author.bio && <p className="author-hero__bio">{author.bio}</p>}
          <dl className="author-stats">
            <div><dt>Тексты</dt><dd>{articles.length}</dd></div>
            <div><dt>Слов</dt><dd>{words.toLocaleString('ru-RU')}</dd></div>
            <div><dt>Минут чтения</dt><dd>{minutes}</dd></div>
          </dl>
          {cats.length > 0 && <p className="author-hero__cats">{cats.join(' · ')}</p>}
        </div>
      </section>

      <section className="author-texts wrap" aria-labelledby="author-texts-title">
        <h2 id="author-texts-title" className="related__title">
          {articles.length} {plural(articles.length, 'текст', 'текста', 'текстов')} автора
        </h2>
        <ol className="archive__list">
          {articles.map((a) => (
            <li key={a.slug} className="row">
              <a className="row__link" href={articleHref(a)}>
                <span className="row__num" aria-hidden="true">{pad2(a.number)}</span>
                <span className="row__body">
                  <span className="row__kicker"><span className="row__cat">{a.category}</span>{a.format && <span>{a.format}</span>}</span>
                  <span className="row__title">{a.title}</span>
                  <span className="row__excerpt">{a.subtitle ?? a.excerpt}</span>
                  <span className="row__meta">{a.readingMinutes} мин чтения<span className="row__state" data-state={a.slug} /></span>
                  <span className="track" data-track={a.slug} aria-hidden="true"><span /></span>
                </span>
                {a.cover ? <Cover a={a} className="row__media cover" sizes="200px" /> : <span className="row__media row__media--empty" aria-hidden="true"><span>{pad2(a.number)}</span></span>}
                <LuArrowUpRight className="row__icon" aria-hidden="true" />
              </a>
            </li>
          ))}
        </ol>
        <p className="author-texts__more"><a className="link-arrow" href={href('archive.html')}>Весь архив издания <LuArrowUpRight aria-hidden="true" /></a></p>
      </section>
    </div>
  );
}
