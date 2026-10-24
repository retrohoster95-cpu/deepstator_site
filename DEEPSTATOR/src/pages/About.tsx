import React from 'react';
import { LuArrowRight, LuArrowUpRight } from 'react-icons/lu';
import { site } from '../../site.config';
import type { Article } from '../lib/content';
import { plural } from '../lib/text';
import { Avatar, Html, href, Wordmark } from '../components/ui';

/** [[текст]] in about.md marks a placeholder still to be filled in by the author. */
const withPlaceholders = (html: string) =>
  html.replace(/\[\[([\s\S]+?)\]\]/g, '<span class="placeholder" title="Заполните в content/pages/about.md">$1</span>');

export function About({ page, articles, categories }: { page: { data: Record<string, any>; html: string } | null; articles: Article[]; categories: { name: string; count: number }[] }) {
  const words = articles.reduce((s, a) => s + a.words, 0);
  const sections = (page?.html ?? '').split(/(?=<h2)/).filter((x) => x.trim());
  const authors = Array.from(new Map(articles.map((a) => [a.authorInfo.id, a.authorInfo])).values())
    .map((au) => ({ au, n: articles.filter((a) => a.authorInfo.id === au.id).length }));
  return (
    <div className="about">
      <header className="about__head wrap">
        <p className="label"><span className="dot" aria-hidden="true" /> Об издании</p>
        <h1 className="about__title">
          <Wordmark size="xl" />
        </h1>
        {page?.data.lede && <p className="about__lede">{page.data.lede}</p>}
      </header>

      <div className="about__grid wrap">
        <aside className="about__facts" aria-label="Издание в цифрах">
          <dl>
            <div><dt>Тексты</dt><dd>{articles.length}</dd></div>
            <div><dt>Слов опубликовано</dt><dd>{words.toLocaleString('ru-RU')}</dd></div>
            <div><dt>Темы</dt><dd>{categories.filter((c) => c.count).length}</dd></div>
            <div><dt>Авторы</dt><dd>{authors.length}</dd></div>
          </dl>
          <p className="about__facts-note">Цифры считаются автоматически по опубликованным текстам.</p>
        </aside>

        <div className="about__body">
          {sections.map((s, i) => (
            <section className="about__section" key={i}>
              <Html className="prose prose--about" html={withPlaceholders(s)} />
            </section>
          ))}
          <section className="about__section">
            <div className="prose prose--about"><h2>Авторы</h2></div>
            <ul className="authors">
              {authors.map(({ au, n }) => (
                <li key={au.id}>
                  <a className="author-tile" href={href(`archive.html?author=${encodeURIComponent(au.id)}`)}>
                    <Avatar author={au} size={120} />
                    <span className="author-tile__name">{au.name}</span>
                    <span className="author-tile__meta">{n} {plural(n, 'текст', 'текста', 'текстов')} <LuArrowRight aria-hidden="true" /></span>
                  </a>
                </li>
              ))}
            </ul>
          </section>
          {site.contacts.length > 0 && (
            <section className="about__section">
              <h2>Связь</h2>
              <ul className="about__contacts">
                {site.contacts.map((c) => (
                  <li key={c.href}><a href={c.href} target="_blank" rel="noopener">{c.label} <LuArrowUpRight aria-hidden="true" /></a></li>
                ))}
              </ul>
            </section>
          )}
          <p className="about__cta">
            <a className="btn btn--primary" href={href('archive.html')}>
              Читать все {articles.length} {plural(articles.length, 'текст', 'текста', 'текстов')} <LuArrowRight aria-hidden="true" />
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
