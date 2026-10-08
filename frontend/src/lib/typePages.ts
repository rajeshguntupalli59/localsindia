import type { CatalogCategory } from '@/lib/types';
import { SEO_CATEGORIES, SEO_PAGE_FOR_BUSINESS_CATEGORY } from '@/lib/seoCategories';

// City-level type pages: /{city}/{type}, e.g. /hyderabad/dentists — the
// subcategories from backend/app/core/category_catalog.py, served by the
// [city]/[category] route when the segment isn't a category key.
// (Area-level type pages are a planned second step — not live yet.)

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'https://localsindia-backend-in.azurewebsites.net';

// Same bar as category pages: a type page is indexed (and in sitemap.xml)
// only with this many real businesses of that type in the city.
export const MIN_TYPE_BUSINESSES = 3;

// No page for the catch-alls ("Other Shops in Hyderabad" helps no one), nor
// for Function Halls — it would duplicate the /{city}/event-venues page.
export const NO_TYPE_PAGE = new Set(['other-shops', 'other-items', 'other-services', 'function-halls']);

export interface TypeInfo {
  slug: string;
  name: string;
  /** Business-directory category, e.g. 'doctors' */
  categorySlug: string;
  /** SEO category page key, e.g. 'doctors' or 'shops' */
  seoKey: string | undefined;
  siblings: { slug: string; name: string }[];
}

export async function fetchCatalog(): Promise<CatalogCategory[]> {
  try {
    const res = await fetch(`${API_BASE}/api/v1/categories/catalog`, { next: { revalidate: 3600 } });
    return res.ok ? await res.json() : [];
  } catch {
    return [];
  }
}

export function findType(catalog: CatalogCategory[], slug: string): TypeInfo | null {
  if (NO_TYPE_PAGE.has(slug) || SEO_CATEGORIES[slug]) return null;
  for (const c of catalog) {
    const sub = c.subcategories.find(s => s.slug === slug);
    if (sub) {
      return {
        slug: sub.slug,
        name: sub.name,
        categorySlug: c.slug,
        seoKey: SEO_PAGE_FOR_BUSINESS_CATEGORY[c.slug],
        siblings: c.subcategories.filter(s => s.slug !== slug && !NO_TYPE_PAGE.has(s.slug)).map(s => ({ slug: s.slug, name: s.name })),
      };
    }
  }
  return null;
}

/** Every slug that may have a type page (sitemap uses this). */
export function typePageSlugs(catalog: CatalogCategory[]): Set<string> {
  return new Set(catalog.flatMap(c => c.subcategories.map(s => s.slug)).filter(s => !NO_TYPE_PAGE.has(s) && !SEO_CATEGORIES[s]));
}

export function typeDescription(type: TypeInfo, cityName: string, count: number): string {
  const what = type.name.toLowerCase();
  return count >= MIN_TYPE_BUSINESSES
    ? `${count.toLocaleString('en-IN')} ${what} in ${cityName} with addresses, phone numbers and opening hours. Compare and contact them directly on LocalsIndia.`
    : `Find ${what} in ${cityName} on LocalsIndia — ${cityName}'s local community platform.`;
}
