/** Lazy loader + matching utilities for the local full-text search index. */

export interface Doc { s: string; t: string; st: string; a?: string; c: string; tg: string[]; x: string; b: string; n: number; m: number }

declare global {
  interface Window { __DS_SEARCH?: Doc[]; __DS_BASE?: string }
}

let loading: Promise<Doc[]> | null = null;

export function base(): string {
  return window.__DS_BASE ?? '';
}

export function loadIndex(): Promise<Doc[]> {
  if (window.__DS_SEARCH) return Promise.resolve(window.__DS_SEARCH);
  if (loading) return loading;
  loading = new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = `${base()}assets/search-index.js`;
    s.async = true;
    s.onload = () => resolve(window.__DS_SEARCH ?? []);
    s.onerror = () => { loading = null; reject(new Error('index')); };
    document.head.appendChild(s);
  });
  return loading;
}

export const norm = (s: string) => s.toLowerCase().replace(/ё/g, 'е');

export function tokens(q: string): string[] {
  return norm(q).split(/[\s,.;:!?«»"“”()]+/).filter((t) => t.length > 0);
}

export interface Hit { doc: Doc; score: number; snippet: string | null; inBody: boolean }

export function search(docs: Doc[], q: string): Hit[] {
  const ts = tokens(q);
  if (!ts.length) return [];
  const hits: Hit[] = [];
  for (const d of docs) {
    const title = norm(d.t), sub = norm(d.st), meta = norm(`${d.a ?? ''} ${d.c} ${d.tg.join(' ')}`), ex = norm(d.x), body = norm(d.b);
    let score = 0;
    let ok = true;
    let bodyOnly = true;
    for (const t of ts) {
      let s = 0;
      if (title.includes(t)) s += title.startsWith(t) ? 14 : 10;
      if (sub.includes(t)) s += 6;
      if (meta.includes(t)) s += 5;
      if (ex.includes(t)) s += 3;
      if (s > 0) bodyOnly = false;
      const bc = count(body, t);
      s += Math.min(bc, 8) * 0.6;
      if (s === 0) { ok = false; break; }
      score += s;
    }
    if (!ok) continue;
    const phrase = norm(q.trim());
    if (ts.length > 1 && (title.includes(phrase) || body.includes(phrase))) score += 8;
    hits.push({ doc: d, score, snippet: snippet(d.b, ts), inBody: bodyOnly });
  }
  return hits.sort((a, b) => b.score - a.score);
}

function count(hay: string, needle: string): number {
  let n = 0, i = 0;
  while ((i = hay.indexOf(needle, i)) !== -1) { n++; i += needle.length; }
  return n;
}

function snippet(body: string, ts: string[]): string | null {
  const nb = norm(body);
  let at = -1;
  for (const t of ts) { const i = nb.indexOf(t); if (i !== -1 && (at === -1 || i < at)) at = i; }
  if (at === -1) return null;
  let start = Math.max(0, at - 70);
  let end = Math.min(body.length, at + 150);
  if (start > 0) { const sp = body.indexOf(' ', start); start = sp !== -1 && sp < at ? sp + 1 : start; }
  if (end < body.length) { const sp = body.lastIndexOf(' ', end); end = sp > at ? sp : end; }
  return (start > 0 ? '…' : '') + body.slice(start, end) + (end < body.length ? '…' : '');
}

export function escape(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/** Escape text, then wrap every token occurrence in <mark>. */
export function highlight(text: string, ts: string[]): string {
  if (!ts.length) return escape(text);
  const nt = norm(text);
  const ranges: [number, number][] = [];
  for (const t of ts) {
    let i = 0;
    while ((i = nt.indexOf(t, i)) !== -1) { ranges.push([i, i + t.length]); i += t.length; }
  }
  if (!ranges.length) return escape(text);
  ranges.sort((a, b) => a[0] - b[0]);
  const merged: [number, number][] = [];
  for (const r of ranges) {
    const last = merged[merged.length - 1];
    if (last && r[0] <= last[1]) last[1] = Math.max(last[1], r[1]);
    else merged.push([...r]);
  }
  let out = '', pos = 0;
  for (const [a, b] of merged) { out += escape(text.slice(pos, a)) + '<mark>' + escape(text.slice(a, b)) + '</mark>'; pos = b; }
  return out + escape(text.slice(pos));
}
