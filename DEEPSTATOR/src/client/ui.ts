/** Site-wide enhancements: toasts, dialogs, keyboard shortcuts, random text, saved count,
 *  reading-progress marks on cards, and the "continue reading" strip. */
import { base, clearHistory, getCatalogue, history, progressOf, savedList, statusOf } from './store';

export function toast(msg: string) {
  const box = document.querySelector<HTMLElement>('[data-toasts]');
  if (!box) return;
  const el = document.createElement('div');
  el.className = 'toast';
  el.setAttribute('role', 'status');
  el.textContent = msg;
  box.appendChild(el);
  requestAnimationFrame(() => el.classList.add('is-in'));
  setTimeout(() => { el.classList.remove('is-in'); setTimeout(() => el.remove(), 300); }, 2600);
}

/** <dialog> helpers: [data-dialog-open="id"], [data-dialog-close], click on the backdrop closes. */
export function openDialog(id: string) {
  const d = document.getElementById(id) as HTMLDialogElement | null;
  if (!d || d.open) return;
  document.querySelectorAll<HTMLDialogElement>('dialog[open]').forEach((o) => o.close());
  if (typeof d.showModal === 'function') d.showModal(); else d.setAttribute('open', '');
}

function initDialogs() {
  document.addEventListener('click', (e) => {
    const t = e.target as Element;
    const opener = t.closest<HTMLElement>('[data-dialog-open]');
    if (opener) { openDialog(opener.dataset.dialogOpen!); return; }
    if (t.closest('[data-shortcuts-open]')) { openDialog('shortcuts'); return; }
    const closer = t.closest('[data-dialog-close]');
    if (closer) { (closer.closest('dialog') as HTMLDialogElement | null)?.close(); return; }
    if (t instanceof HTMLDialogElement && t.open) {
      // a click on the backdrop lands on the dialog element itself
      const r = t.getBoundingClientRect();
      const ev = e as MouseEvent;
      if (ev.clientX < r.left || ev.clientX > r.right || ev.clientY < r.top || ev.clientY > r.bottom) t.close();
    }
  });
  // following an in-page link from a dialog (e.g. table of contents) closes it
  document.querySelectorAll('dialog').forEach((d) =>
    d.addEventListener('click', (e) => { if ((e.target as Element).closest('a[href^="#"]')) (d as HTMLDialogElement).close(); }));
}

export function goRandom() {
  const list = getCatalogue();
  if (!list.length) return;
  const here = document.querySelector<HTMLElement>('[data-article]')?.dataset.slug;
  // prefer texts not yet read, never the current one
  const pool = list.filter((e) => e.s !== here && statusOf(e.s) !== 'read');
  const from = pool.length ? pool : list.filter((e) => e.s !== here);
  const pick = (from.length ? from : list)[Math.floor(Math.random() * (from.length || list.length))];
  location.href = `${base()}articles/${pick.s}.html`;
}

function typing(t: EventTarget | null) {
  const el = t as HTMLElement | null;
  return !!el && (/^(input|textarea|select)$/i.test(el.tagName) || el.isContentEditable);
}

function initShortcuts() {
  let g = 0;
  document.addEventListener('keydown', (e) => {
    if (e.metaKey || e.ctrlKey || e.altKey || typing(e.target)) return;
    if (document.querySelector('dialog[open]') || !document.getElementById('search')?.hidden) return;
    const k = e.key;
    if (g && Date.now() - g < 900) {
      g = 0;
      if (k === 'h' || k === 'р') { location.href = `${base()}index.html`; return; }
      if (k === 'a' || k === 'ф') { location.href = `${base()}archive.html`; return; }
    }
    if (k === 'g' || k === 'п') { g = Date.now(); return; }
    if (k === '?') { e.preventDefault(); openDialog('shortcuts'); }
    else if (k === 'r' || k === 'к') goRandom();
    else if (k === 't' || k === 'е') window.scrollTo({ top: 0, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
    else document.dispatchEvent(new CustomEvent('ds:key', { detail: k }));
  });
}

function paintState() {
  const saved = savedList();
  document.querySelectorAll<HTMLElement>('[data-saved-count]').forEach((b) => {
    b.hidden = saved.length === 0;
    b.textContent = String(saved.length);
  });
  document.querySelectorAll<HTMLElement>('[data-track]').forEach((el) => {
    const p = progressOf(el.dataset.track!);
    el.classList.toggle('is-on', p > 0.03);
    el.classList.toggle('is-done', p >= 0.95);
    (el.firstElementChild as HTMLElement | null)?.style.setProperty('width', `${Math.round(Math.min(1, p) * 100)}%`);
    el.title = p >= 0.95 ? 'Прочитано' : p > 0.03 ? `Прочитано ${Math.round(p * 100)}%` : '';
  });
  document.querySelectorAll<HTMLElement>('[data-state]').forEach((el) => {
    const s = el.dataset.state!;
    const st = statusOf(s);
    const parts = [st === 'read' ? 'прочитано' : st === 'progress' ? `прочитано ${Math.round(progressOf(s) * 100)}%` : '', saved.includes(s) ? 'сохранено' : ''].filter(Boolean);
    el.textContent = parts.length ? ` · ${parts.join(' · ')}` : '';
  });
  paintContinue();
}

function paintContinue() {
  const box = document.querySelector<HTMLElement>('[data-continue]');
  const list = box?.querySelector<HTMLElement>('[data-continue-list]');
  if (!box || !list) return;
  const cat = getCatalogue();
  const items = history()
    .filter((h) => h.p > 0.03 && h.p < 0.95)
    .map((h) => ({ h, e: cat.find((c) => c.s === h.s) }))
    .filter((x) => x.e)
    .slice(0, 3);
  box.hidden = items.length === 0;
  list.innerHTML = items
    .map(({ h, e }) => {
      const left = Math.max(1, Math.ceil(e!.m * (1 - h.p)));
      const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
      return `<li><a class="cont" href="${base()}articles/${e!.s}.html">
        <span class="cont__cat">${esc(e!.c)}</span>
        <span class="cont__title">${esc(e!.t)}</span>
        <span class="cont__meta">Прочитано ${Math.round(h.p * 100)}% · осталось ~${left} мин</span>
        <span class="track is-on" aria-hidden="true"><span style="width:${Math.round(h.p * 100)}%"></span></span>
      </a></li>`;
    })
    .join('');
}

export function initUi() {
  initDialogs();
  initShortcuts();
  document.addEventListener('click', (e) => {
    if ((e.target as Element).closest('[data-random]')) { e.preventDefault(); goRandom(); }
    if ((e.target as Element).closest('[data-history-clear]')) { clearHistory(); toast('История чтения очищена'); }
  });
  document.addEventListener('ds:state', paintState);
  paintState();
}
