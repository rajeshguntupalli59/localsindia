import { describe, expect, it } from 'vitest';
import type { CatalogCategory } from '@/lib/types';
import { SEO_CATEGORIES } from '@/lib/seoCategories';
import { findType, MIN_TYPE_BUSINESSES, NO_TYPE_PAGE, typeDescription, typePageSlugs } from './typePages';
import catalog from '@/components/detail-questions/catalog.fixture.json';

const CATALOG = catalog as CatalogCategory[];
// Routes under /[city]/ that a type slug must never shadow
const CITY_ROUTES = ['businesses', 'events', 'search', 'classifieds', 'post', 'edit', 'area', 'launch'];

describe('type pages (/{city}/{type})', () => {
  it('no type slug collides with a category page or a city route', () => {
    const all = CATALOG.flatMap(c => c.subcategories.map(s => s.slug));
    expect(all.filter(s => SEO_CATEGORIES[s] || CITY_ROUTES.includes(s))).toEqual([]);
  });

  it('finds a type with its category, SEO parent and siblings', () => {
    const t = findType(CATALOG, 'dentists')!;
    expect(t.name).toBe('Dentists');
    expect(t.categorySlug).toBe('doctors');
    expect(t.seoKey).toBe('doctors');
    expect(t.siblings.map(s => s.slug)).toContain('hospitals');
    expect(t.siblings.map(s => s.slug)).not.toContain('dentists');
  });

  it('has no page for catch-alls, function halls, unknown slugs or category keys', () => {
    for (const slug of Array.from(NO_TYPE_PAGE)) expect(findType(CATALOG, slug)).toBeNull();
    expect(findType(CATALOG, 'no-such-type')).toBeNull();
    expect(findType(CATALOG, 'doctors')).toBeNull();
    const slugs = typePageSlugs(CATALOG);
    expect(slugs.has('hospitals')).toBe(true);
    expect(Array.from(NO_TYPE_PAGE).some(s => slugs.has(s))).toBe(false);
  });

  it('description claims a count only at the indexing bar', () => {
    const t = findType(CATALOG, 'hospitals')!;
    expect(typeDescription(t, 'Hyderabad', MIN_TYPE_BUSINESSES)).toMatch(/^3 hospitals in Hyderabad/);
    expect(typeDescription(t, 'Hyderabad', MIN_TYPE_BUSINESSES - 1)).toMatch(/^Find hospitals in Hyderabad/);
  });
});
