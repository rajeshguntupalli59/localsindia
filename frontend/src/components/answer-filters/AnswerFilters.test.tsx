import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { describe, expect, it } from 'vitest';
import type { CatalogCategory } from '@/lib/types';
import AnswerFilters, { answerApiParams, listingSubcategories, withoutAnswerFilters } from './AnswerFilters';
import catalog from '../detail-questions/catalog.fixture.json';

const CATALOG = catalog as CatalogCategory[];

function renderFilters(category: CatalogCategory, params: URLSearchParams) {
  const el = document.createElement('div');
  act(() => { createRoot(el).render(<AnswerFilters category={category} params={params} onChange={() => {}} />); });
  return el;
}

describe('AnswerFilters shows the right type chips and filters for every category', () => {
  for (const cat of CATALOG.filter(c => listingSubcategories(c).length > 0)) {
    it(`${cat.name}: one chip per type`, () => {
      const el = renderFilters(cat, new URLSearchParams());
      const chips = Array.from(el.querySelectorAll('button[aria-pressed]')).map(b => b.textContent?.trim());
      for (const s of listingSubcategories(cat)) expect(chips).toContain(s.name);
    });

    for (const sub of listingSubcategories(cat)) {
      it(`${cat.name} → ${sub.name}: a filter for each filterable question`, () => {
        const el = renderFilters(cat, new URLSearchParams({ sub: sub.slug }));
        const text = el.textContent ?? '';
        for (const q of sub.questions.filter(q => q.filter)) expect(text, q.key).toContain(q.label);
        const ranges = sub.questions.filter(q => q.filter && q.type === 'number').length;
        expect(el.querySelectorAll('input[type="number"]').length).toBe(ranges * 2);
      });
    }
  }

  it('maps URL params to the listings API and clears them on category change', () => {
    const p = new URLSearchParams({ category: 'vehicles', sub: 'cars', f_fuel_type: 'Diesel', f_year_min: '2018', page: '2' });
    expect(answerApiParams(p)).toEqual({ subcategory_slug: 'cars', f_fuel_type: 'Diesel', f_year_min: '2018' });
    expect(withoutAnswerFilters(p).toString()).toBe('category=vehicles&page=2');
  });
});
