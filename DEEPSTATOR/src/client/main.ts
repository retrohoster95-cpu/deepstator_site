/* DEEPSTATOR client — progressive enhancement only. Every page is fully readable without JS. */
import { initSearch } from './search';
import { initArchive } from './archive';
import { initArticle } from './article';
import { initUi } from './ui';
import { initMotion } from './motion';

const $ = <T extends Element = HTMLElement>(s: string, r: ParentNode = document) => r.querySelector<T>(s);
const $$ = <T extends Element = HTMLElement>(s: string, r: ParentNode = document) => Array.from(r.querySelectorAll<T>(s));

function initMenu() {
  const btn = $<HTMLButtonElement>('[data-menu-toggle]');
  const menu = $('#mobile-menu');
  if (!btn || !menu) return;
  const set = (open: boolean) => {
    btn.setAttribute('aria-expanded', String(open));
    menu.hidden = !open;
    document.documentElement.classList.toggle('menu-open', open);
  };
  btn.addEventListener('click', () => set(btn.getAttribute('aria-expanded') !== 'true'));
  menu.addEventListener('click', (e) => {
    if ((e.target as Element).closest('a,button')) set(false);
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && btn.getAttribute('aria-expanded') === 'true') {
      set(false);
      btn.focus();
    }
  });
  matchMedia('(min-width: 860px)').addEventListener('change', (m) => m.matches && set(false));
}

function initBackToTop() {
  const btn = $<HTMLButtonElement>('[data-back-to-top]');
  if (!btn) return;
  let ticking = false;
  const update = () => {
    btn.hidden = window.scrollY < window.innerHeight * 1.5;
    ticking = false;
  };
  window.addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } }, { passive: true });
  btn.addEventListener('click', () => {
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' });
    ($('#main') as HTMLElement | null)?.focus({ preventScroll: true });
  });
  update();
}

function initKbdHint() {
  const mac = /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);
  $$('[data-kbd]').forEach((k) => (k.textContent = mac ? '⌘ K' : 'Ctrl K'));
}

/** Scale the giant wordmarks so they span their container exactly, whatever font loaded. */
function initFit() {
  const els = $$('[data-fit]');
  if (!els.length) return;
  const fit = () =>
    els.forEach((el) => {
      const box = el.parentElement;
      if (!box) return;
      el.style.fontSize = '';
      const size = parseFloat(getComputedStyle(el).fontSize);
      const w = el.scrollWidth;
      if (!w) return;
      el.style.fontSize = `${Math.min(size * ((box.clientWidth * 0.99) / w), 420)}px`;
    });
  fit();
  (document as any).fonts?.ready?.then(fit);
  let t = 0;
  window.addEventListener('resize', () => { clearTimeout(t); t = window.setTimeout(fit, 80); });
}

function ready(fn: () => void) {
  if (document.readyState !== 'loading') fn();
  else document.addEventListener('DOMContentLoaded', fn);
}

ready(() => {
  initKbdHint();
  initUi();
  initFit();
  initMenu();
  initSearch();
  initBackToTop();
  if ($('[data-archive]')) initArchive();
  if ($('[data-article]')) initArticle();
  initMotion();
});
