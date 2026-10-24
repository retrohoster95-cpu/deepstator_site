import { base, isSaved, progressOf, setProgress, toggleSaved } from './store';
import { openDialog, toast } from './ui';

const plural = (n: number, a: string, b: string, c: string) => {
  const m10 = n % 10, m100 = n % 100;
  return m10 === 1 && m100 !== 11 ? a : m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14) ? b : c;
};

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.cssText = 'position:fixed;opacity:0;top:0;left:0';
    document.body.appendChild(ta);
    ta.select();
    let ok = false;
    try { ok = document.execCommand('copy'); } catch { ok = false; }
    ta.remove();
    return ok;
  }
}

async function share(data: { title: string; text?: string; url: string }, fallback: string) {
  if (navigator.share) {
    try { await navigator.share(data); return; } catch (e) { if ((e as Error).name === 'AbortError') return; }
  }
  const ok = await copyText(fallback);
  toast(ok ? 'Ссылка скопирована — вставьте её, куда нужно' : 'Не удалось скопировать ссылку');
}

/* ---------------- reader settings ---------------- */
const READER_KEYS = ['size', 'font', 'width', 'theme'] as const;
const DEFAULTS: Record<string, string> = { size: 'm', font: 'sans', width: 'normal', theme: 'dark' };

function readerPrefs(): Record<string, string> {
  try { return { ...DEFAULTS, ...JSON.parse(localStorage.getItem('ds:reader') || '{}') }; } catch { return { ...DEFAULTS }; }
}
function applyReader(p: Record<string, string>) {
  const d = document.documentElement;
  for (const k of READER_KEYS) d.setAttribute(`data-r-${k}`, p[k]);
  try { localStorage.setItem('ds:reader', JSON.stringify(p)); } catch { /* ignore */ }
  document.querySelectorAll<HTMLInputElement>('[data-reader]').forEach((i) => (i.checked = p[i.dataset.reader!] === i.value));
  document.dispatchEvent(new Event('ds:layout'));
}

function initReader() {
  const prefs = readerPrefs();
  applyReader(prefs);
  document.querySelectorAll<HTMLInputElement>('[data-reader]').forEach((i) =>
    i.addEventListener('change', () => { prefs[i.dataset.reader!] = i.value; applyReader(prefs); }));
  document.querySelector('[data-reader-reset]')?.addEventListener('click', () => {
    Object.assign(prefs, DEFAULTS);
    applyReader(prefs);
    toast('Настройки чтения сброшены');
  });
  document.addEventListener('click', (e) => {
    if ((e.target as Element).closest('[data-reader-open]')) openDialog('reader');
  });
}

/* ---------------- save ---------------- */
function initSave(slug: string) {
  const btns = Array.from(document.querySelectorAll<HTMLButtonElement>('[data-save]'));
  const paint = () => {
    const on = isSaved(slug);
    btns.forEach((b) => {
      b.setAttribute('aria-pressed', String(on));
      b.classList.toggle('is-done', on);
      const l = b.querySelector('[data-save-label]') ?? b.querySelector('span:last-child');
      if (l) l.textContent = on ? 'Сохранено' : 'Сохранить';
    });
  };
  const toggle = () => {
    const on = toggleSaved(slug);
    paint();
    toast(on ? 'Текст сохранён — он в разделе «Сохранённое»' : 'Текст убран из сохранённых');
  };
  btns.forEach((b) => b.addEventListener('click', toggle));
  paint();
  return toggle;
}

/* ---------------- quote from selection ---------------- */
function initQuote(prose: HTMLElement) {
  const pop = document.querySelector<HTMLElement>('[data-quote-pop]');
  if (!pop) return;
  let text = '';
  const hide = () => { pop.hidden = true; };
  const show = () => {
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed || !sel.rangeCount) return hide();
    const range = sel.getRangeAt(0);
    if (!prose.contains(range.commonAncestorContainer)) return hide();
    text = sel.toString().replace(/\s+/g, ' ').trim();
    if (text.length < 12 || text.length > 1200) return hide();
    const r = range.getBoundingClientRect();
    pop.hidden = false;
    const w = pop.offsetWidth, h = pop.offsetHeight;
    const x = Math.min(Math.max(8, r.left + r.width / 2 - w / 2), window.innerWidth - w - 8);
    const above = r.top - h - 10;
    const y = above > 70 ? above : r.bottom + 10;
    pop.style.left = `${x + window.scrollX}px`;
    pop.style.top = `${y + window.scrollY}px`;
  };
  const cite = () => `«${text}»\n— ${document.querySelector('.article__title')?.textContent ?? ''}, ${document.querySelector('[data-author-name]')?.textContent ?? ''}\n${location.href.split('#')[0]}`;
  document.addEventListener('mouseup', () => setTimeout(show, 0));
  document.addEventListener('keyup', (e) => { if (e.shiftKey) show(); });
  document.addEventListener('selectionchange', () => { const s = window.getSelection(); if (!s || s.isCollapsed) hide(); });
  document.addEventListener('touchend', () => setTimeout(show, 250));
  window.addEventListener('scroll', () => { if (!pop.hidden && window.getSelection()?.isCollapsed) hide(); }, { passive: true });
  pop.addEventListener('mousedown', (e) => e.preventDefault()); // keep the selection
  pop.querySelector('[data-quote-copy]')?.addEventListener('click', async () => {
    const ok = await copyText(cite());
    toast(ok ? 'Цитата скопирована вместе со ссылкой' : 'Не удалось скопировать');
    hide();
  });
  pop.querySelector('[data-quote-share]')?.addEventListener('click', async () => {
    await share({ title: document.title, text: `«${text}»`, url: location.href.split('#')[0] }, cite());
    hide();
  });
}

/* ---------------- lightbox for figures ---------------- */
function initLightbox(prose: HTMLElement) {
  const dlg = document.getElementById('lightbox') as HTMLDialogElement | null;
  const img = dlg?.querySelector<HTMLImageElement>('[data-lightbox-img]');
  const cap = dlg?.querySelector<HTMLElement>('[data-lightbox-cap]');
  if (!dlg || !img || !cap) return;
  prose.querySelectorAll<HTMLImageElement>('.figure img').forEach((el) => {
    el.tabIndex = 0;
    el.setAttribute('role', 'button');
    el.setAttribute('aria-label', `Увеличить: ${el.alt}`);
    const open = () => {
      img.src = el.currentSrc || el.src;
      img.alt = el.alt;
      cap.textContent = el.closest('figure')?.querySelector('figcaption')?.textContent || el.alt;
      openDialog('lightbox');
    };
    el.addEventListener('click', open);
    el.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); } });
  });
  dlg.addEventListener('click', (e) => { if (e.target === img || e.target === dlg) dlg.close(); });
}

export function initArticle() {
  const root = document.querySelector<HTMLElement>('[data-article]')!;
  const slug = root.dataset.slug!;
  const prose = document.querySelector<HTMLElement>('.prose');
  const bar = document.querySelector<HTMLElement>('[data-progress]');
  const mbar = document.querySelector<HTMLElement>('[data-mbar-progress]');
  const remaining = document.querySelector<HTMLElement>('[data-remaining]');
  const status = document.querySelector<HTMLElement>('[data-read-status]');
  const minutes = Number(document.querySelector('.rail__line')?.textContent?.match(/\d+/)?.[0] ?? 0);

  initReader();
  const toggleSave = initSave(slug);

  // where the reader stopped last time
  const before = progressOf(slug);
  if (status) {
    status.textContent = before >= 0.95 ? 'Вы уже прочитали этот текст' : before > 0.03 ? `Вы остановились на ${Math.round(before * 100)}%` : '';
  }

  // ---- reading progress (measured over the article body) + persistence
  if (prose) {
    let ticking = false;
    let lastSaved = 0;
    const update = () => {
      const r = prose.getBoundingClientRect();
      const total = r.height - window.innerHeight * 0.6;
      const p = Math.min(1, Math.max(0, (window.innerHeight * 0.4 - r.top) / Math.max(1, total)));
      if (bar) bar.style.transform = `scaleX(${p})`;
      if (mbar) mbar.style.transform = `scaleX(${p})`;
      if (remaining && minutes) {
        const left = Math.ceil(minutes * (1 - p));
        remaining.textContent = p >= 0.995 ? 'Прочитано' : p > 0.01 ? `Осталось ~${left} ${plural(left, 'минута', 'минуты', 'минут')}` : '';
      }
      if (Math.abs(p - lastSaved) >= 0.02 || (p >= 0.95 && lastSaved < 0.95)) {
        if (p >= 0.95 && progressOf(slug) < 0.95) toast('Текст прочитан');
        lastSaved = p;
        if (p > 0.02) setProgress(slug, p);
      }
      document.documentElement.classList.toggle('mbar-on', window.scrollY > 400);
      ticking = false;
    };
    const onScroll = () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } };
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    document.addEventListener('ds:layout', onScroll);
    update();
    initQuote(prose);
    initLightbox(prose);
  }

  // ---- table of contents: highlight the section being read
  const links = Array.from(document.querySelectorAll<HTMLAnchorElement>('[data-toc-link]'));
  if (links.length) {
    const heads = Array.from(new Set(links.map((l) => l.dataset.tocLink!)))
      .map((id) => document.getElementById(id))
      .filter(Boolean) as HTMLElement[];
    const setCurrent = (id: string) =>
      links.forEach((l) => {
        const on = l.dataset.tocLink === id;
        l.classList.toggle('is-current', on);
        if (on) l.setAttribute('aria-current', 'location'); else l.removeAttribute('aria-current');
      });
    let raf = 0;
    const pick = () => {
      raf = 0;
      let current = heads[0]?.id;
      for (const h of heads) if (h.getBoundingClientRect().top < window.innerHeight * 0.3) current = h.id;
      if (current) setCurrent(current);
    };
    window.addEventListener('scroll', () => { if (!raf) raf = requestAnimationFrame(pick); }, { passive: true });
    pick();
  }
  document.querySelectorAll<HTMLDetailsElement>('.toc--mobile').forEach((d) =>
    d.addEventListener('click', (e) => { if ((e.target as Element).closest('a')) d.open = false; }));

  // ---- copy link & share
  const url = () => location.href.split('#')[0];
  document.querySelectorAll<HTMLButtonElement>('[data-copy-link]').forEach((btn) =>
    btn.addEventListener('click', async () => {
      const ok = await copyText(url());
      btn.classList.add('is-done');
      const label = btn.querySelector<HTMLElement>('[data-label]');
      const prev = label?.textContent;
      if (label) label.textContent = ok ? 'Скопировано' : 'Не удалось';
      setTimeout(() => { btn.classList.remove('is-done'); if (label && prev) label.textContent = prev; }, 2000);
      toast(ok ? 'Ссылка скопирована' : 'Не удалось скопировать ссылку');
    }));
  document.querySelectorAll<HTMLButtonElement>('[data-share]').forEach((btn) =>
    btn.addEventListener('click', () => share({ title: document.title, url: url() }, url())));

  // ---- keyboard: [ ] neighbours, b save, a reader settings
  document.addEventListener('ds:key', (e) => {
    const k = (e as CustomEvent).detail as string;
    if ((k === '[' || k === 'х') && root.dataset.prev) location.href = `${base()}articles/${root.dataset.prev}`;
    else if ((k === ']' || k === 'ъ') && root.dataset.next) location.href = `${base()}articles/${root.dataset.next}`;
    else if (k === 'b' || k === 'и') toggleSave();
    else if (k === 'a' || k === 'ф') openDialog('reader');
  });
}
