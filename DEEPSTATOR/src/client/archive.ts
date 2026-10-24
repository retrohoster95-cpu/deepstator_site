import { highlight, loadIndex, norm, search, tokens, type Doc } from './index';

const plural = (n: number, a: string, b: string, c: string) => {
  const m10 = n % 10, m100 = n % 100;
  return m10 === 1 && m100 !== 11 ? a : m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14) ? b : c;
};

interface Row {
  el: HTMLLIElement;
  slug: string; cat: string; tags: string[]; featured: boolean; sort: string; title: string; text: string;
  titleEl: HTMLElement; exEl: HTMLElement; snipEl: HTMLElement; titleRaw: string; exRaw: string;
}

export function initArchive() {
  const root = document.querySelector<HTMLElement>('[data-archive]')!;
  const form = root.querySelector<HTMLFormElement>('[data-filters]')!;
  const q = root.querySelector<HTMLInputElement>('[data-filter-q]')!;
  const cats = Array.from(root.querySelectorAll<HTMLInputElement>('[data-filter-cat]'));
  const featured = root.querySelector<HTMLInputElement>('[data-filter-featured]')!;
  const sort = root.querySelector<HTMLSelectElement>('[data-filter-sort]')!;
  const listEl = root.querySelector<HTMLOListElement>('[data-list]')!;
  const countEl = root.querySelector<HTMLElement>('[data-count]')!;
  const empty = root.querySelector<HTMLElement>('[data-empty]')!;
  const more = root.querySelector<HTMLButtonElement>('[data-more]')!;
  const tagRow = root.querySelector<HTMLElement>('[data-tag-row]')!;
  const tagName = root.querySelector<HTMLElement>('[data-tag-name]')!;
  const tagNames: Record<string, string> = JSON.parse(document.getElementById('tag-names')?.textContent || '{}');
  const pageSize = Number(root.dataset.pageSize) || 12;

  const rows: Row[] = Array.from(listEl.querySelectorAll<HTMLLIElement>('[data-item]')).map((el) => {
    const titleEl = el.querySelector<HTMLElement>('[data-hl-title]')!;
    const exEl = el.querySelector<HTMLElement>('[data-hl-excerpt]')!;
    return {
      el, titleEl, exEl,
      snipEl: el.querySelector<HTMLElement>('[data-snippet]')!,
      titleRaw: titleEl.textContent || '', exRaw: exEl.textContent || '',
      slug: el.dataset.slug!, cat: el.dataset.category!, tags: (el.dataset.tags || '').split('|').filter(Boolean),
      featured: el.dataset.featured === '1', sort: el.dataset.sort!, title: el.dataset.title!, text: norm(el.dataset.text || ''),
    };
  });
  const total = rows.length;

  let docs: Doc[] | null = null;
  let tag = '';
  let shown = pageSize;

  // ---- state <-> URL
  const params = new URLSearchParams(location.search);
  q.value = params.get('q') ?? '';
  const pc = params.get('category') ?? '';
  (cats.find((c) => c.value === pc) ?? cats[0]).checked = true;
  featured.checked = params.get('featured') === '1';
  if (['new', 'old', 'title'].includes(params.get('sort') ?? '')) sort.value = params.get('sort')!;
  tag = params.get('tag') ?? '';

  const syncUrl = () => {
    const p = new URLSearchParams();
    if (q.value.trim()) p.set('q', q.value.trim());
    const c = cats.find((x) => x.checked)?.value;
    if (c) p.set('category', c);
    if (tag) p.set('tag', tag);
    if (featured.checked) p.set('featured', '1');
    if (sort.value !== 'new') p.set('sort', sort.value);
    const qs = p.toString();
    try { history.replaceState(null, '', qs ? `?${qs}` : location.pathname); } catch { /* sandboxed preview */ }
  };

  const apply = (resetPage = true) => {
    if (resetPage) shown = pageSize;
    const query = q.value.trim();
    const ts = tokens(query);
    const cat = cats.find((x) => x.checked)?.value ?? '';
    tagRow.hidden = !tag;
    tagName.textContent = tag ? `#${tagNames[tag] ?? tag}` : '';

    // full-text hits (from the lazy index) or the light inline text as a fallback
    let bodyHits: Map<string, { score: number; snippet: string | null; inBody: boolean }> | null = null;
    if (ts.length && docs) {
      bodyHits = new Map(search(docs, query).map((h) => [h.doc.s, h]));
    }

    let visible = rows.filter((r) => {
      if (cat && r.cat !== cat) return false;
      if (tag && !r.tags.includes(tag)) return false;
      if (featured.checked && !r.featured) return false;
      if (!ts.length) return true;
      if (bodyHits) return bodyHits.has(r.slug);
      return ts.every((t) => r.text.includes(t));
    });

    const by = sort.value;
    visible.sort((a, b) =>
      by === 'title' ? a.title.localeCompare(b.title, 'ru') :
      by === 'old' ? a.sort.localeCompare(b.sort) :
      b.sort.localeCompare(a.sort));
    if (ts.length && bodyHits && by === 'new' && query) {
      // with a query, relevance first
      visible.sort((a, b) => (bodyHits!.get(b.slug)!.score - bodyHits!.get(a.slug)!.score));
    }

    const set = new Set(visible);
    rows.forEach((r) => {
      const on = set.has(r);
      r.el.hidden = !on;
      r.titleEl.innerHTML = highlight(r.titleRaw, ts);
      r.exEl.innerHTML = highlight(r.exRaw, ts);
      const h = bodyHits?.get(r.slug);
      const visibleMatch = r.titleEl.querySelector('mark') || r.exEl.querySelector('mark');
      if (on && h && h.snippet && !visibleMatch) {
        r.snipEl.hidden = false;
        r.snipEl.innerHTML = 'В тексте: ' + highlight(h.snippet, ts);
      } else r.snipEl.hidden = true;
    });
    visible.forEach((r, i) => {
      listEl.appendChild(r.el);
      if (i >= shown) r.el.hidden = true;
    });

    const n = visible.length;
    const on = Math.min(n, shown);
    countEl.textContent = n === total && !ts.length
      ? `${total} ${plural(total, 'текст', 'текста', 'текстов')}`
      : n === 0 ? 'Ничего не найдено' : `Найдено: ${n} ${plural(n, 'текст', 'текста', 'текстов')} из ${total}` + (on < n ? ` · показано ${on}` : '');
    empty.hidden = n !== 0;
    more.hidden = on >= n;
    more.textContent = `Показать ещё ${Math.min(pageSize, n - on)}`;
    syncUrl();
  };

  let timer = 0;
  q.addEventListener('input', () => {
    clearTimeout(timer);
    timer = window.setTimeout(() => apply(), 120);
    if (!docs) loadIndex().then((d) => { docs = d; apply(); }).catch(() => {});
  });
  form.addEventListener('change', (e) => { if (e.target !== q) apply(); });
  form.addEventListener('submit', (e) => e.preventDefault());
  more.addEventListener('click', () => {
    const firstNew = shown;
    shown += pageSize;
    apply(false);
    const next = rows.filter((r) => !r.el.hidden)[firstNew];
    next?.querySelector<HTMLAnchorElement>('a')?.focus();
  });
  root.querySelector('[data-tag-clear]')?.addEventListener('click', () => { tag = ''; apply(); });
  root.querySelector('[data-reset]')?.addEventListener('click', () => {
    q.value = ''; cats[0].checked = true; featured.checked = false; sort.value = 'new'; tag = '';
    apply();
    q.focus();
  });

  if (q.value.trim()) loadIndex().then((d) => { docs = d; apply(); }).catch(() => apply());
  apply();
}
