import { base, getCatalogue, markSeen, newSlugs } from './store';
import { toast } from './ui';

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
const plural = (n: number, a: string, b: string, c: string) => {
  const m10 = n % 10, m100 = n % 100;
  return m10 === 1 && m100 !== 11 ? a : m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14) ? b : c;
};

function paint() {
  const fresh = newSlugs();
  document.querySelectorAll<HTMLElement>('[data-new]').forEach((b) => (b.hidden = !fresh.includes(b.dataset.new!)));
  document.querySelectorAll<HTMLElement>('[data-new-count]').forEach((b) => { b.hidden = !fresh.length; b.textContent = String(fresh.length); });
  const list = document.querySelector<HTMLElement>('[data-news-list]');
  const empty = document.querySelector<HTMLElement>('[data-news-empty]');
  const clear = document.querySelector<HTMLElement>('[data-news-clear]');
  if (list) {
    const cat = getCatalogue();
    list.innerHTML = fresh
      .map((s) => cat.find((e) => e.s === s))
      .filter(Boolean)
      .map((e) => `<li><a href="${base()}articles/${e!.s}.html"><span class="sub__cat">${esc(e!.c)} · ${e!.m} мин</span><span class="sub__title">${esc(e!.t)}</span></a></li>`)
      .join('');
    if (empty) empty.hidden = fresh.length > 0;
    if (clear) clear.hidden = fresh.length === 0;
  }
  document.documentElement.classList.toggle('has-news', fresh.length > 0);
}

export function initNews() {
  // opening an article marks it as seen
  const here = document.querySelector<HTMLElement>('[data-article]')?.dataset.slug;
  const before = newSlugs().length;
  if (here && newSlugs().includes(here)) markSeen([here]);
  paint();
  document.addEventListener('ds:state', paint);
  document.querySelector('[data-news-clear]')?.addEventListener('click', () => { markSeen(newSlugs()); toast('Всё отмечено как просмотренное'); });
  document.querySelector('[data-copy-rss]')?.addEventListener('click', async () => {
    const url = document.querySelector('[data-rss-url]')?.textContent || '';
    try { await navigator.clipboard.writeText(url); toast('Ссылка на RSS скопирована'); }
    catch { toast('Скопируйте адрес вручную: ' + url); }
  });
  // one gentle note per browser session
  const n = newSlugs().length;
  let shown = false;
  try { shown = sessionStorage.getItem('ds:news-toast') === '1'; sessionStorage.setItem('ds:news-toast', '1'); } catch { /* ignore */ }
  if (n && !shown && before) setTimeout(() => toast(`С вашего прошлого визита ${n === 1 ? 'вышел' : 'вышло'} ${n} ${plural(n, 'новый текст', 'новых текста', 'новых текстов')} — нажмите на колокольчик`), 1200);
}
