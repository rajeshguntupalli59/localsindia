import type { Listing } from '@/lib/types';

type SeoFields = Pick<Listing, 'title' | 'description' | 'area' | 'city_name' | 'category_name'>;

const MIN_DESCRIPTION = 70;
const MAX_DESCRIPTION = 155;

function tidy(text: string): string {
  return text.trim().replace(/\s+/g, ' ');
}

function place(l: SeoFields): string {
  const city = l.city_name ?? '';
  if (!l.area) return city;
  return !city || l.area.toLowerCase().includes(city.toLowerCase()) ? l.area : `${l.area}, ${city}`;
}

export function listingTitle(l: SeoFields): string {
  const where = place(l);
  const named = where && !l.title.toLowerCase().includes(where.toLowerCase());
  return `${l.title}${named ? ` — ${where}` : ''} | LocalsIndia`;
}

/** The owner's own words; very short ones get the category and place added so the search snippet says something. */
export function listingDescription(l: SeoFields): string {
  const own = tidy(l.description);
  if (own.length >= MIN_DESCRIPTION) {
    return own.length > MAX_DESCRIPTION ? `${own.slice(0, MAX_DESCRIPTION - 1).trimEnd()}…` : own;
  }
  const where = place(l);
  const about = [l.category_name, where && `in ${where}`, 'on LocalsIndia.'].filter(Boolean).join(' ');
  return [own, `${about} Contact the seller directly.`].filter(Boolean).join(' · ');
}
