import React from 'react';
import { LuArrowRight, LuArrowUpRight } from 'react-icons/lu';
import { site } from '../../site.config';
import type { Article } from '../lib/content';
import { pad2, plural } from '../lib/text';
import { articleHref, categoryHref, Cover, href, Kicker, MetaLine, SectionHead, Statement } from '../components/ui';

type Cat = { name: string; description: string; count: number };

export function Home({ articles, categories }: { articles: Article[]; categories: Cat[] }) {
  const lead = articles.find((a) => a.featured) ?? articles[0];
  const rest = articles.filter((a) => a !== lead);
  const recent = rest.slice(0, 6);
  const selected = articles.filter((a) => a.featured && a !== lead).slice(0, 3);
  // a pull-quote taken verbatim from the texts (blockquotes), never invented
  // skip epigraphs that quote someone else ("… — Александр Блок")
  const own = (q: string) => !/—\s*[А-ЯA-Z][а-яa-z]+\s+[А-ЯA-Z][а-яa-z]+\.?$/.test(q);
  const candidates = articles.flatMap((a) => a.quotes.filter(own).map((q) => ({ a, q })));
  const pickQ = candidates.sort((x, y) => y.q.length - x.q.length)[0];
  const quoteSource = pickQ?.a;
  const quote = pickQ?.q;
  const total = articles.length;

  return (
    <>
      {/* HERO */}
      <section className="hero" aria-labelledby="hero-title">
        <div className="wrap hero__grid">
          <p className="hero__label label">
            <span className="dot" aria-hidden="true" /> Независимое издание
          </p>
          <h1 id="hero-title" className="hero__statement">
            <Statement text={site.hero.statement} />
          </h1>
          <div className="hero__side">
            <p className="hero__lede">{site.hero.lede}</p>
            <p className="hero__links">
              <a className="btn btn--primary" href={articleHref(lead)}>
                Главный текст <LuArrowRight aria-hidden="true" />
              </a>
              <a className="btn" href={href('archive.html')}>
                Все {total} {plural(total, 'текст', 'текста', 'текстов')}
              </a>
            </p>
          </div>
          <div className="hero__index" aria-hidden="true">
            {articles.slice(0, 5).map((a) => (
              <span key={a.slug}>{pad2(a.number)}</span>
            ))}
          </div>
        </div>
        <div className="hero__rule wrap" aria-hidden="true">
          <span>{site.name}</span>
          <span className="hero__rule-line" />
          <span>{categories.filter((c) => c.count).map((c) => c.name).join(' · ')}</span>
        </div>
      </section>

      {/* FEATURED */}
      <section className="feature wrap" aria-labelledby="feature-head">
        <SectionHead index="01" title="Главный текст" id="feature-head" />
        <article className="feature__card">
          <a className="feature__media" href={articleHref(lead)} tabIndex={-1} aria-hidden="true">
            <Cover a={lead} sizes="(min-width: 1100px) 60vw, 100vw" eager className="cover cover--feature" />
            <span className="feature__num">{pad2(lead.number)}</span>
          </a>
          <div className="feature__body">
            <Kicker a={lead} />
            <h3 id="feature-title" className="feature__title">
              <a href={articleHref(lead)}>{lead.title}</a>
            </h3>
            {lead.subtitle && <p className="feature__subtitle">{lead.subtitle}</p>}
            <p className="feature__excerpt">{lead.excerpt}</p>
            <div className="feature__foot">
              <MetaLine a={lead} words />
              <a className="link-arrow" href={articleHref(lead)}>
                Читать <LuArrowUpRight aria-hidden="true" />
              </a>
            </div>
          </div>
        </article>
      </section>

      {/* RECENT */}
      <section className="recent wrap" aria-labelledby="recent-title">
        <SectionHead
          index="02"
          title="Новые тексты"
          id="recent-title"
          aside={<a className="link-arrow" href={href('archive.html')}>Весь архив <LuArrowRight aria-hidden="true" /></a>}
        />
        <ol className="recent__list">
          {recent.map((a, i) => (
            <li key={a.slug} className={`entry ${i === 0 ? 'entry--wide' : ''}`}>
              <article>
                <span className="entry__num" aria-hidden="true">{pad2(a.number)}</span>
                <div className="entry__main">
                  <Kicker a={a} number={false} />
                  <h3 className="entry__title">
                    <a href={articleHref(a)}>{a.title}</a>
                  </h3>
                  <p className="entry__excerpt">{a.excerpt}</p>
                  <MetaLine a={a} />
                </div>
                {a.cover && (
                  <a className="entry__media" href={articleHref(a)} tabIndex={-1} aria-hidden="true">
                    <Cover a={a} sizes="(min-width: 900px) 320px, 100vw" />
                  </a>
                )}
              </article>
            </li>
          ))}
        </ol>
      </section>

      {/* QUOTE */}
      {quote && quoteSource && (
        <section className="pull wrap" aria-label="Цитата">
          <figure className="pull__figure">
            <blockquote className="pull__quote">
              <p>{quote}</p>
            </blockquote>
            <figcaption className="pull__cite">
              <span className="label">Из текста</span>
              <a href={articleHref(quoteSource)}>{quoteSource.title}</a>
            </figcaption>
          </figure>
        </section>
      )}

      {/* TOPICS */}
      <section className="topics wrap" aria-labelledby="topics-title">
        <SectionHead index="03" title="Темы" id="topics-title" />
        <ul className="topics__list">
          {categories.map((c) => (
            <li key={c.name}>
              {c.count > 0 ? (
                <a className="topic" href={categoryHref(c.name)}>
                  <span className="topic__name">{c.name}</span>
                  <span className="topic__desc">{c.description}</span>
                  <span className="topic__count">
                    {c.count} {plural(c.count, 'текст', 'текста', 'текстов')}
                  </span>
                  <LuArrowUpRight aria-hidden="true" className="topic__icon" />
                </a>
              ) : (
                <span className="topic topic--empty">
                  <span className="topic__name">{c.name}</span>
                  <span className="topic__desc">{c.description}</span>
                  <span className="topic__count">скоро</span>
                </span>
              )}
            </li>
          ))}
        </ul>
      </section>

      {/* SELECTED */}
      {selected.length > 0 && (
        <section className="selected wrap" aria-labelledby="selected-title">
          <SectionHead index="04" title="Избранное" id="selected-title" />
          <div className={`selected__grid selected__grid--${selected.length}`}>
            {selected.map((a) => (
              <article key={a.slug} className="pick">
                <a className="pick__link" href={articleHref(a)}>
                  <span className="pick__num" aria-hidden="true">{pad2(a.number)}</span>
                  <span className="pick__cat">{a.category}</span>
                  <span className="pick__title">{a.title}</span>
                  <span className="pick__excerpt">{a.subtitle ?? a.excerpt}</span>
                  <span className="pick__meta">{a.readingMinutes} мин чтения <LuArrowUpRight aria-hidden="true" /></span>
                </a>
              </article>
            ))}
          </div>
        </section>
      )}

      {/* ABOUT */}
      <section className="about-strip wrap" aria-labelledby="about-head">
        <SectionHead index="05" title="Об издании" id="about-head" />
        <div className="about-strip__grid">
          <div className="about-strip__orb" aria-hidden="true"><span className="orb" /></div>
          <div>
            <p className="about-strip__title">
              Пространство для текстов, которые требуют времени.
            </p>
            <p className="about-strip__text">
              {site.name} публикует эссе и статьи, которые пишет {site.author.name}. Здесь собраны тексты о геополитике, экономике, обществе и мировоззрении — в том виде, в каком они написаны.
            </p>
            <a className="link-arrow" href={href('about.html')}>Подробнее об издании <LuArrowRight aria-hidden="true" /></a>
          </div>
        </div>
      </section>
    </>
  );
}
