import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { describe, expect, it } from 'vitest';
import type { CatalogCategory } from '@/lib/types';
import DetailQuestions, { answersPayload, checkAnswers } from './DetailQuestions';
// Snapshot of GET /api/v1/categories/catalog (backend/app/core/category_catalog.py).
// Refresh it after changing the catalog: curl …/api/v1/categories/catalog > catalog.fixture.json
import catalog from './catalog.fixture.json';

const CATALOG = catalog as CatalogCategory[];

function renderQuestions(subs: CatalogCategory['subcategories'], subSlug: string) {
  const el = document.createElement('div');
  act(() => {
    createRoot(el).render(
      <DetailQuestions subcategories={subs} subSlug={subSlug} answers={{}} errors={{}}
        onSubChange={() => {}} onAnswer={() => {}} />,
    );
  });
  return el;
}

const listingCategories = CATALOG
  .map(c => ({ ...c, subcategories: c.subcategories.filter(s => s.questions.length > 0) }))
  .filter(c => c.subcategories.length > 0);

describe('DetailQuestions renders every category and type from the catalog', () => {
  it('covers the 12 categories that take listings', () => {
    expect(listingCategories.map(c => c.slug).sort()).toEqual([
      'classifieds', 'doctors', 'education', 'electronics', 'fashion', 'furniture',
      'jobs', 'pg-roommate', 'real-estate', 'services', 'tiffin', 'vehicles',
    ]);
  });

  for (const cat of listingCategories) {
    describe(cat.name, () => {
      it('shows a Type chip for every subcategory', () => {
        const el = renderQuestions(cat.subcategories, '');
        const chips = Array.from(el.querySelectorAll('button[aria-pressed]')).map(b => b.textContent?.trim());
        expect(chips).toEqual(cat.subcategories.map(s => s.name));
      });

      for (const sub of cat.subcategories) {
        it(`${sub.name}: shows all its questions and options, and flags missing required answers`, () => {
          const el = renderQuestions(cat.subcategories, sub.slug);
          const text = el.textContent ?? '';
          for (const q of sub.questions) {
            expect(text, `${sub.slug} → ${q.key}`).toContain(q.label);
            for (const opt of q.options ?? []) expect(text, `${sub.slug} → ${q.key} → ${opt}`).toContain(opt);
          }
          // Inputs only for typed questions, switches for yes/no ones
          expect(el.querySelectorAll('input').length).toBe(sub.questions.filter(q => q.type === 'text' || q.type === 'number').length);
          expect(el.querySelectorAll('button[role="switch"]').length).toBe(sub.questions.filter(q => q.type === 'switch').length);

          const errors = checkAnswers(sub, {});
          const required = sub.questions.filter(q => q.required && q.type !== 'switch').map(q => q.key);
          expect(Object.keys(errors).sort()).toEqual([...required].sort());
        });
      }
    });
  }

  it('answersPayload keeps only answered questions and makes numbers numeric', () => {
    const cars = listingCategories.find(c => c.slug === 'vehicles')!.subcategories.find(s => s.slug === 'cars')!;
    expect(answersPayload(cars.questions, { brand: 'Hyundai', year: '2019', model: '  i20 ', km_driven: '' }))
      .toEqual({ brand: 'Hyundai', year: 2019, model: 'i20' });
  });
});
