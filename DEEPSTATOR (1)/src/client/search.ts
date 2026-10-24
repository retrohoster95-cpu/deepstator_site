import { base, highlight, loadIndex, search, tokens, escape, type Doc } from './index';

const plural = (n: number, a: string, b: string, c: string) => {
  const m10 = n % 10, m100 = n % 100;
  return m10 === 1 && m100 !== 11 ? a : m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14) ? b : c;
};

export function initSearch() {
  const dialog = document.getElementById('search');
  const input = document.getElementById('search-input') as HTMLInputElement | null;
  const list = document.getElementById('search-results');
  const status = document.getElementById('search-status');
  if (!dialog || !input || !list || !status) return;

  let docs: Doc[] | null = null;
  let active = -1;
  let lastFocus: HTMLElement | null = null;
  let timer = 0;

  const items = () => Array.from(list.querySelectorAll<HTMLAnchorElement>('[role="option"]'));

  const setActive = (i: number) => {
    const els = items();
    if (!els.length) { active = -1; input.removeAttribute('aria-activedescendant'); return; }
    active = (i + els.length) % els.length;
    els.forEach((el, j) => el.setAttribute('aria-selected', String(j === active)));
    input.setAttribute('aria-activedescendant', els[active].id);
    els[active].scrollIntoView({ block: 'nearest' });
  };

  const renderIdle = () => {
    list.innerHTML = '';
    if (!docs) return;
    status.textContent = 'Начните вводить запрос. Последние тексты:';
    list.innerHTML = docs.slice(0, 5).map((d, i) => option(d, i, null, [])).join('');
    active = -1;
  };

  const option = (d: Doc, i: number, snip: string | null, ts: string[]) =>
    `<li><a role="option" id="sr-${i}" aria-selected="false" class="sr-item" href="${base()}articles/${d.s}.html">` +
    `<span class="sr-item__num">${String(d.n).padStart(2, '0')}</span>` +
    `<span class="sr-item__body"><span class="sr-item__cat">${escape(d.c)} · ${d.m} мин</span>` +
    `<span class="sr-item__title">${highlight(d.t, ts)}</span>` +
    (snip ? `<span class="sr-item__snip">${highlight(snip, ts)}</span>` : d.st ? `<span class="sr-item__snip">${highlight(d.st, ts)}</span>` : '') +
    `</span></a></li>`;

  const run = () => {
    const q = input.value.trim();
    if (!docs) return;
    if (!q) return renderIdle();
    const ts = tokens(q);
    const hits = search(docs, q).slice(0, 20);
    if (!hits.length) {
      list.innerHTML = '';
      status.innerHTML = `По запросу «${escape(q)}» ничего не найдено. Проверьте написание или попробуйте более короткое слово.`;
      active = -1;
      return;
    }
    status.textContent = `${hits.length} ${plural(hits.length, 'результат', 'результата', 'результатов')}`;
    list.innerHTML = hits.map((h, i) => option(h.doc, i, h.snippet, ts)).join('');
    setActive(0);
  };

  const open = () => {
    if (!dialog.hidden) return;
    lastFocus = document.activeElement as HTMLElement;
    dialog.hidden = false;
    document.documentElement.classList.add('search-open');
    input.focus();
    input.select();
    if (!docs) {
      status.textContent = 'Загрузка индекса…';
      loadIndex()
        .then((d) => { docs = d; run(); })
        .catch(() => { status.textContent = 'Не удалось загрузить поисковый индекс. Обновите страницу.'; });
    } else run();
  };

  const close = () => {
    if (dialog.hidden) return;
    dialog.hidden = true;
    document.documentElement.classList.remove('search-open');
    lastFocus?.focus?.();
  };

  document.addEventListener('click', (e) => {
    const t = e.target as Element;
    if (t.closest('[data-search-open]')) { e.preventDefault(); open(); }
    else if (t.closest('[data-search-close]')) close();
  });

  document.addEventListener('keydown', (e) => {
    const k = e.key.toLowerCase();
    const typing = /^(input|textarea|select)$/i.test((e.target as Element).tagName) || (e.target as HTMLElement).isContentEditable;
    if ((e.metaKey || e.ctrlKey) && (k === 'k' || k === 'л')) { e.preventDefault(); dialog.hidden ? open() : close(); return; }
    if (k === '/' && !typing && dialog.hidden) { e.preventDefault(); open(); return; }
    if (dialog.hidden) return;
    if (k === 'escape') { e.preventDefault(); close(); }
    else if (k === 'arrowdown') { e.preventDefault(); setActive(active + 1); }
    else if (k === 'arrowup') { e.preventDefault(); setActive(active - 1); }
    else if (k === 'enter' && document.activeElement === input) {
      const el = items()[active];
      if (el) { e.preventDefault(); el.click(); }
    } else if (k === 'tab') {
      // keep focus inside the dialog
      const f = Array.from(dialog.querySelectorAll<HTMLElement>('input,button,a[href]')).filter((x) => x.offsetParent !== null);
      if (!f.length) return;
      const first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  });

  input.addEventListener('input', () => { clearTimeout(timer); timer = window.setTimeout(run, 60); });
  list.addEventListener('mousemove', (e) => {
    const el = (e.target as Element).closest('[role="option"]');
    if (el) { const i = items().indexOf(el as HTMLAnchorElement); if (i !== active) setActive(i); }
  });
}
