const plural = (n: number, a: string, b: string, c: string) => {
  const m10 = n % 10, m100 = n % 100;
  return m10 === 1 && m100 !== 11 ? a : m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14) ? b : c;
};

export function initArticle() {
  const prose = document.querySelector<HTMLElement>('.prose');
  const bar = document.querySelector<HTMLElement>('[data-progress]');
  const remaining = document.querySelector<HTMLElement>('[data-remaining]');
  const minutes = Number(document.querySelector('.rail__line')?.textContent?.match(/\d+/)?.[0] ?? 0);

  // ---- reading progress (measured over the article body, not the whole page)
  if (prose && bar) {
    let ticking = false;
    const update = () => {
      const r = prose.getBoundingClientRect();
      const total = r.height - window.innerHeight * 0.6;
      const p = Math.min(1, Math.max(0, (window.innerHeight * 0.4 - r.top) / Math.max(1, total)));
      bar.style.transform = `scaleX(${p})`;
      if (remaining && minutes) {
        const left = Math.ceil(minutes * (1 - p));
        remaining.textContent = p >= 0.995 ? 'Прочитано' : p > 0.01 ? `Осталось ~${left} ${plural(left, 'минута', 'минуты', 'минут')}` : '';
      }
      ticking = false;
    };
    const onScroll = () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } };
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    update();
  }

  // ---- table of contents: highlight the section being read
  const links = Array.from(document.querySelectorAll<HTMLAnchorElement>('[data-toc-link]'));
  if (links.length && 'IntersectionObserver' in window) {
    const heads = Array.from(new Set(links.map((l) => l.dataset.tocLink!)))
      .map((id) => document.getElementById(id))
      .filter(Boolean) as HTMLElement[];
    const setCurrent = (id: string) =>
      links.forEach((l) => {
        const on = l.dataset.tocLink === id;
        l.classList.toggle('is-current', on);
        if (on) l.setAttribute('aria-current', 'location'); else l.removeAttribute('aria-current');
      });
    const pick = () => {
      let current = heads[0]?.id;
      for (const h of heads) if (h.getBoundingClientRect().top < window.innerHeight * 0.3) current = h.id;
      if (current) setCurrent(current);
    };
    const io = new IntersectionObserver(pick, { rootMargin: '0px 0px -60% 0px', threshold: [0, 1] });
    heads.forEach((h) => io.observe(h));
    window.addEventListener('scroll', () => requestAnimationFrame(pick), { passive: true });
    pick();
  }
  // close the mobile TOC after choosing a section
  document.querySelectorAll<HTMLDetailsElement>('.toc--mobile').forEach((d) =>
    d.addEventListener('click', (e) => { if ((e.target as Element).closest('a')) d.open = false; }));

  // ---- copy link & share
  const status = Array.from(document.querySelectorAll<HTMLElement>('[data-share-status]'));
  const say = (msg: string) => status.forEach((s) => (s.textContent = msg));
  const url = () => location.href.split('#')[0];

  const copy = async (): Promise<boolean> => {
    try {
      await navigator.clipboard.writeText(url());
      return true;
    } catch {
      const ta = document.createElement('textarea');
      ta.value = url();
      ta.setAttribute('readonly', '');
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      let ok = false;
      try { ok = document.execCommand('copy'); } catch { ok = false; }
      ta.remove();
      return ok;
    }
  };

  const flash = (btn: HTMLElement, text: string) => {
    const label = btn.querySelector<HTMLElement>('[data-label]');
    const prev = label?.textContent;
    btn.classList.add('is-done');
    if (label) label.textContent = text;
    setTimeout(() => { btn.classList.remove('is-done'); if (label && prev) label.textContent = prev; }, 2200);
  };

  document.querySelectorAll<HTMLButtonElement>('[data-copy-link]').forEach((btn) =>
    btn.addEventListener('click', async () => {
      const ok = await copy();
      flash(btn, ok ? 'Ссылка скопирована' : 'Не удалось скопировать');
      say(ok ? 'Ссылка скопирована в буфер обмена' : 'Не удалось скопировать ссылку');
    }));

  document.querySelectorAll<HTMLButtonElement>('[data-share]').forEach((btn) =>
    btn.addEventListener('click', async () => {
      const data = { title: document.title, url: url() };
      if (navigator.share) {
        try { await navigator.share(data); return; } catch (e) { if ((e as Error).name === 'AbortError') return; }
      }
      const ok = await copy();
      const copyBtn = btn.parentElement?.querySelector<HTMLElement>('[data-copy-link]');
      if (copyBtn) flash(copyBtn, ok ? 'Ссылка скопирована' : 'Не удалось скопировать');
      say(ok ? 'Системное меню «Поделиться» недоступно — ссылка скопирована' : 'Не удалось скопировать ссылку');
    }));
}
