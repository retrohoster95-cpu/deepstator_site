/**
 * Motion layer. Everything here is decoration on top of a page that is complete without it:
 * - nothing runs when the reader asked for reduced motion;
 * - content is only hidden for a reveal after this script has started (html.motion).
 */

const reduce = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Elements that slide/fade in when they enter the viewport. Siblings in a group get a stagger. */
const REVEAL = [
  '.section-head', '.feature__card', '.entry', '.pull__figure', '.topic', '.pick', '.about-strip__grid',
  '.continue', '.row', '.page-head > *', '.filters', '.related__grid > li', '.pager__link', '.author-card',
  '.article__cover', '.prose > h2', '.prose > h3', '.prose > h4', '.prose > blockquote', '.prose > .figure', '.prose > .sep',
  '.academic', '.about__facts dl > div', '.about__section', '.author-tile', '.site-footer__grid > *', '.nf__body > *',
  '.marquee', '.author-feature', '.author-hero__photo', '.author-hero__body > *', '.prose > .note',
];

function initReveal() {
  const els: HTMLElement[] = [];
  document.querySelectorAll<HTMLElement>(REVEAL.join(',')).forEach((el) => {
    if (el.closest('dialog, .search')) return;
    el.classList.add('rv');
    // stagger among siblings that are also revealed
    const sibs = Array.from(el.parentElement?.children ?? []).filter((c) => c.classList.contains('rv'));
    el.style.setProperty('--rv-i', String(Math.min(sibs.indexOf(el), 8)));
    els.push(el);
  });
  const io = new IntersectionObserver(
    (entries) => entries.forEach((e) => {
      if (e.isIntersecting) { (e.target as HTMLElement).classList.add('is-in'); io.unobserve(e.target); }
    }),
    { rootMargin: '0px 0px -8% 0px', threshold: 0.08 },
  );
  els.forEach((el) => io.observe(el));
  // anything hidden by filters/pagination becomes visible later: reveal on display
  document.addEventListener('ds:list', () => els.forEach((el) => el.classList.add('is-in')));
}

/** Split the hero statement and giant wordmarks into pieces that animate in. */
function splitText() {
  const st = document.querySelector<HTMLElement>('.hero__statement');
  if (st) {
    let i = 0;
    const walk = (node: Node) => {
      Array.from(node.childNodes).forEach((n) => {
        if (n.nodeType === 3) {
          const frag = document.createDocumentFragment();
          (n.textContent || '').split(/(\s+)/).forEach((w) => {
            if (!w) return;
            if (/^\s+$/.test(w)) { frag.appendChild(document.createTextNode(w)); return; }
            const s = document.createElement('span');
            s.className = 'w';
            s.style.setProperty('--w-i', String(i++));
            s.textContent = w;
            frag.appendChild(s);
          });
          n.replaceWith(frag);
        } else if (n.nodeType === 1) walk(n);
      });
    };
    walk(st);
    st.classList.add('is-split');
  }
  document.querySelectorAll<HTMLElement>('.wordmark--xl').forEach((wm) => {
    let i = 0;
    wm.querySelectorAll<HTMLElement>(':scope > span[aria-hidden="true"]').forEach((part) => {
      if (part.classList.contains('wordmark__o')) { part.style.setProperty('--l-i', String(i++)); part.classList.add('l'); return; }
      const t = part.textContent || '';
      part.textContent = '';
      for (const ch of t) {
        const s = document.createElement('span');
        s.className = 'l';
        s.style.setProperty('--l-i', String(i++));
        s.textContent = ch;
        part.appendChild(s);
      }
    });
    const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { wm.classList.add('is-in'); io.disconnect(); } }), { threshold: 0.3 });
    io.observe(wm);
  });
}

/** Scroll-linked motion, all in one rAF loop. */
function initScroll() {
  const hero = document.querySelector<HTMLElement>('.hero');
  const heroSt = document.querySelector<HTMLElement>('.hero__statement');
  const heroIdx = document.querySelector<HTMLElement>('.hero__index');
  const covers = Array.from(document.querySelectorAll<HTMLElement>('.cover img, .row__media img'));
  const marquees = Array.from(document.querySelectorAll<HTMLElement>('[data-marquee-track]'));
  const scrub = Array.from(document.querySelectorAll<HTMLElement>('.pull__quote p'));
  const orbs = Array.from(document.querySelectorAll<HTMLElement>('.orb'));
  const topics = Array.from(document.querySelectorAll<HTMLElement>('.topic__name'));
  const heads = Array.from(document.querySelectorAll<HTMLElement>('.section-head'));

  // pull quote: words light up as the quote scrolls through the screen
  const scrubWords: HTMLElement[][] = scrub.map((p) => {
    const words = (p.textContent || '').split(/(\s+)/);
    p.textContent = '';
    const out: HTMLElement[] = [];
    words.forEach((w) => {
      if (/^\s+$/.test(w) || !w) { p.appendChild(document.createTextNode(w)); return; }
      const s = document.createElement('span');
      s.className = 'sw';
      s.textContent = w;
      p.appendChild(s);
      out.push(s);
    });
    return out;
  });

  let lastY = window.scrollY;
  let vel = 0;
  let offset = 0;
  const vh = () => window.innerHeight;

  const frame = () => {
    const y = window.scrollY;
    const dy = y - lastY;
    lastY = y;
    vel += (dy - vel) * 0.12;

    if (hero && heroSt && window.innerWidth >= 860) {
      const h = hero.offsetHeight || 1;
      const p = Math.min(1, Math.max(0, y / h));
      heroSt.style.transform = `translate3d(0, ${p * 120}px, 0)`;
      heroSt.style.opacity = String(1 - p * 0.85);
      if (heroIdx) heroIdx.style.transform = `translate3d(0, ${p * -80}px, 0)`;
    }

    for (const img of covers) {
      const r = img.parentElement!.getBoundingClientRect();
      if (r.bottom < -100 || r.top > vh() + 100) continue;
      const c = (r.top + r.height / 2 - vh() / 2) / vh(); // -1..1 around the viewport centre
      img.style.setProperty('--py', `${(c * -9).toFixed(2)}%`);
    }

    // marquee: constant drift + scroll velocity, skewed while moving fast
    offset -= 0.6 + Math.abs(vel) * 0.35;
    for (const t of marquees) {
      const w = t.scrollWidth / 2 || 1;
      if (-offset > w) offset += w;
      t.style.transform = `translate3d(${offset}px,0,0) skewX(${Math.max(-12, Math.min(12, -vel * 0.4))}deg)`;
    }

    scrub.forEach((p, i) => {
      const r = p.getBoundingClientRect();
      const prog = Math.min(1, Math.max(0, (vh() * 0.85 - r.top) / (r.height + vh() * 0.35)));
      const n = Math.round(prog * scrubWords[i].length);
      scrubWords[i].forEach((w, j) => w.classList.toggle('on', j < n));
    });

    for (const o of orbs) {
      const r = o.getBoundingClientRect();
      const c = (r.top + r.height / 2 - vh() / 2) / vh();
      o.style.transform = `translate3d(0, ${c * -60}px, 0) scale(${1 - Math.abs(c) * 0.25})`;
    }

    if (window.innerWidth >= 860) topics.forEach((t, i) => {
      const r = t.getBoundingClientRect();
      if (r.bottom < 0 || r.top > vh()) return;
      const c = (r.top - vh() / 2) / vh();
      t.style.setProperty('--tx', `${(c * (i % 2 ? 40 : -40)).toFixed(1)}px`);
    });

    for (const h of heads) {
      const r = h.getBoundingClientRect();
      const p = Math.min(1, Math.max(0, (vh() - r.top) / (vh() * 0.6)));
      h.style.setProperty('--line', p.toFixed(3));
    }

    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
}

/** A soft ring that trails the pointer and grows over links (fine pointers only). */
function initCursor() {
  if (!matchMedia('(pointer: fine)').matches) return;
  const ring = document.createElement('div');
  ring.className = 'cursor';
  ring.setAttribute('aria-hidden', 'true');
  document.body.appendChild(ring);
  let x = -100, y = -100, tx = -100, ty = -100;
  document.addEventListener('pointermove', (e) => { tx = e.clientX; ty = e.clientY; ring.classList.add('on'); }, { passive: true });
  document.addEventListener('pointerleave', () => ring.classList.remove('on'));
  document.addEventListener('pointerover', (e) => {
    const t = e.target as Element;
    ring.classList.toggle('big', !!t.closest('a, button, summary, label, [role="button"], select'));
    ring.classList.toggle('text', !!t.closest('.prose p, input[type="search"]') && !t.closest('a'));
  });
  document.addEventListener('pointerdown', () => ring.classList.add('down'));
  document.addEventListener('pointerup', () => ring.classList.remove('down'));
  const loop = () => {
    x += (tx - x) * 0.2;
    y += (ty - y) * 0.2;
    ring.style.transform = `translate3d(${x}px, ${y}px, 0)`;
    requestAnimationFrame(loop);
  };
  loop();
}

/** Cards tilt slightly towards the pointer. */
function initTilt() {
  if (!matchMedia('(pointer: fine)').matches) return;
  document.querySelectorAll<HTMLElement>('.pick__link, .related__card, .cont, .author-tile, .feature__media, .author-feature__photo').forEach((el) => {
    el.classList.add('tilt');
    el.addEventListener('pointermove', (e) => {
      const r = el.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width - 0.5;
      const py = (e.clientY - r.top) / r.height - 0.5;
      el.style.setProperty('--rx', `${(-py * 5).toFixed(2)}deg`);
      el.style.setProperty('--ry', `${(px * 6).toFixed(2)}deg`);
      el.style.setProperty('--mx', `${((px + 0.5) * 100).toFixed(1)}%`);
      el.style.setProperty('--my', `${((py + 0.5) * 100).toFixed(1)}%`);
    });
    el.addEventListener('pointerleave', () => { el.style.setProperty('--rx', '0deg'); el.style.setProperty('--ry', '0deg'); });
  });
}

/** Figures in the About page count up from zero. */
function initCounters() {
  document.querySelectorAll<HTMLElement>('.about__facts dd').forEach((dd) => {
    const target = Number((dd.textContent || '').replace(/\s/g, ''));
    if (!Number.isFinite(target) || target === 0) return;
    const io = new IntersectionObserver((es) => {
      if (!es[0].isIntersecting) return;
      io.disconnect();
      const t0 = performance.now();
      const tick = (t: number) => {
        const p = Math.min(1, (t - t0) / 1400);
        const v = Math.round(target * (1 - Math.pow(1 - p, 3)));
        dd.textContent = v.toLocaleString('ru-RU');
        if (p < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });
    io.observe(dd);
  });
}

export function initMotion() {
  if (reduce() || !('IntersectionObserver' in window)) return;
  document.documentElement.classList.add('motion');
  splitText();
  initReveal();
  initScroll();
  initCursor();
  initTilt();
  initCounters();
}
