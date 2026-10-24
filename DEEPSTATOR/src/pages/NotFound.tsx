import React from 'react';
import { LuArrowRight, LuSearch } from 'react-icons/lu';
import type { Article } from '../lib/content';
import { articleHref, href } from '../components/ui';

export function NotFound({ articles }: { articles: Article[] }) {
  return (
    <section className="nf wrap" aria-labelledby="nf-title">
      <p className="nf__code" aria-hidden="true">
        4<span className="nf__zero" />4
      </p>
      <div className="nf__body">
        <p className="label"><span className="dot" aria-hidden="true" /> Ошибка 404</p>
        <h1 id="nf-title" className="nf__title">Здесь пусто. Страница ушла на глубину.</h1>
        <p className="nf__text">Ссылка могла устареть, или адрес набран с ошибкой. Текст, который вы ищете, скорее всего, есть в архиве.</p>
        <p className="nf__actions">
          <a className="btn btn--primary" href={href('index.html')}>На главную <LuArrowRight aria-hidden="true" /></a>
          <a className="btn" href={href('archive.html')}>Открыть архив</a>
          <button className="btn" type="button" data-search-open><LuSearch aria-hidden="true" /> Поиск</button>
        </p>
        {articles.length > 0 && (
          <div className="nf__recent">
            <p className="label">Последние тексты</p>
            <ul>
              {articles.slice(0, 3).map((a) => (
                <li key={a.slug}><a href={articleHref(a)}>{a.title}</a></li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </section>
  );
}
