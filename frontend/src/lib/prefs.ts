/**
 * Pure, synchronous, SSR-safe persistence utilities.
 * No React imports — usable in hooks, context, and server utilities.
 */

// ── Constants ─────────────────────────────────────────────────────────────────
const CITY_KEY    = 'li_city';    // localStorage: selected city slug
const RECENT_KEY  = 'li_recent'; // localStorage: JSON array of recent city slugs
const LANG_COOKIE = 'lang';      // cookie: shared with next-intl locale detection

export const VALID_LANGS = [
  'en', 'hi', 'te', 'ta', 'kn', 'ml', 'mr', 'bn', 'gu', 'pa', 'or',
] as const;

export type LangCode = (typeof VALID_LANGS)[number];

// ── Guards ────────────────────────────────────────────────────────────────────
function hasStorage(): boolean {
  return typeof window !== 'undefined' && typeof localStorage !== 'undefined';
}

function hasDocument(): boolean {
  return typeof document !== 'undefined';
}

// ── City ──────────────────────────────────────────────────────────────────────
export function getCitySlug(): string {
  if (!hasStorage()) return '';
  return localStorage.getItem(CITY_KEY) ?? '';
}

export function setCitySlug(slug: string): void {
  if (!hasStorage()) return;
  if (slug) localStorage.setItem(CITY_KEY, slug);
  else localStorage.removeItem(CITY_KEY);
}

// ── Recent cities ─────────────────────────────────────────────────────────────
export function getRecentSlugs(): string[] {
  if (!hasStorage()) return [];
  try { return JSON.parse(localStorage.getItem(RECENT_KEY) ?? '[]') as string[]; }
  catch { return []; }
}

export function pushRecentSlug(slug: string): string[] {
  const next = [slug, ...getRecentSlugs().filter(s => s !== slug)].slice(0, 3);
  if (hasStorage()) localStorage.setItem(RECENT_KEY, JSON.stringify(next));
  return next;
}

// ── Language ──────────────────────────────────────────────────────────────────
export function getLangCode(): LangCode {
  if (!hasDocument()) return 'en';
  const m = document.cookie.match(/(?:^|;\s*)lang=([^;]*)/);
  const v = m ? decodeURIComponent(m[1]) : 'en';
  return (VALID_LANGS as readonly string[]).includes(v) ? (v as LangCode) : 'en';
}

export function setLangCode(code: LangCode): void {
  if (!hasDocument()) return;
  const exp = new Date();
  exp.setFullYear(exp.getFullYear() + 1);
  document.cookie = `${LANG_COOKIE}=${code}; path=/; expires=${exp.toUTCString()}; SameSite=Lax`;
}
