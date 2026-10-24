/** Per-reader state kept in this browser only: saved texts and reading progress. */

export interface Entry { s: string; t: string; c: string; m: number; n: number; i: string }
interface State { saved: string[]; prog: Record<string, { p: number; t: number }> }

const KEY = 'ds:v1';
let cache: State | null = null;

function read(): State {
  if (cache) return cache;
  try {
    const v = JSON.parse(localStorage.getItem(KEY) || '{}');
    cache = { saved: Array.isArray(v.saved) ? v.saved : [], prog: v.prog && typeof v.prog === 'object' ? v.prog : {} };
  } catch {
    cache = { saved: [], prog: {} };
  }
  return cache;
}

function write() {
  try { localStorage.setItem(KEY, JSON.stringify(cache)); } catch { /* storage unavailable: keep in memory */ }
  document.dispatchEvent(new CustomEvent('ds:state'));
}

export const isSaved = (slug: string) => read().saved.includes(slug);
export const savedList = () => read().saved.slice();

export function toggleSaved(slug: string): boolean {
  const st = read();
  const on = !st.saved.includes(slug);
  st.saved = on ? [slug, ...st.saved] : st.saved.filter((s) => s !== slug);
  write();
  return on;
}

export const progressOf = (slug: string) => read().prog[slug]?.p ?? 0;
export const history = () =>
  Object.entries(read().prog).map(([s, v]) => ({ s, p: v.p, t: v.t })).sort((a, b) => b.t - a.t);

export function setProgress(slug: string, p: number) {
  const st = read();
  const prev = st.prog[slug]?.p ?? 0;
  // keep the furthest point reached; a finished text stays finished
  const next = Math.max(prev, Math.round(p * 100) / 100);
  if (next === prev && st.prog[slug]) { st.prog[slug].t = Date.now(); }
  else st.prog[slug] = { p: next, t: Date.now() };
  write();
}

export function clearHistory() {
  read().prog = {};
  write();
}

export type Status = 'unread' | 'progress' | 'read';
export function statusOf(slug: string): Status {
  const p = progressOf(slug);
  return p >= 0.95 ? 'read' : p > 0.03 ? 'progress' : 'unread';
}

let catalogue: Entry[] | null = null;
export function getCatalogue(): Entry[] {
  if (catalogue) return catalogue;
  try { catalogue = JSON.parse(document.getElementById('ds-catalogue')?.textContent || '[]'); } catch { catalogue = []; }
  return catalogue!;
}

export function base(): string {
  return (window as any).__DS_BASE ?? '';
}
