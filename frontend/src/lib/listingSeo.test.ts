import { describe, expect, it } from 'vitest';
import { listingDescription, listingTitle } from './listingSeo';

const base = {
  title: 'I phone 12',
  description: 'Good condition, one year old, battery health is fine, box and charger included.',
  area: 'Madhapur',
  city_name: 'Hyderabad',
  category_name: 'Electronics',
};

describe('listingTitle', () => {
  it('names the area and city', () => {
    expect(listingTitle(base)).toBe('I phone 12 — Madhapur, Hyderabad | LocalsIndia');
  });

  it('uses the city alone when there is no area', () => {
    expect(listingTitle({ ...base, area: null })).toBe('I phone 12 — Hyderabad | LocalsIndia');
  });

  it('does not repeat a city the area already names', () => {
    expect(listingTitle({ ...base, area: 'Madhapur, Hyderabad' })).toBe('I phone 12 — Madhapur, Hyderabad | LocalsIndia');
  });

  it('does not repeat a place the title already names', () => {
    expect(listingTitle({ ...base, title: 'Flat in Hyderabad', area: null })).toBe('Flat in Hyderabad | LocalsIndia');
  });

  it('still works when the city is unknown', () => {
    expect(listingTitle({ ...base, area: null, city_name: null })).toBe('I phone 12 | LocalsIndia');
  });
});

describe('listingDescription', () => {
  it('keeps a good description as written', () => {
    expect(listingDescription(base)).toBe(base.description);
  });

  it('shortens a long description to the snippet limit', () => {
    const out = listingDescription({ ...base, description: 'word '.repeat(60) });
    expect(out.length).toBeLessThanOrEqual(155);
    expect(out.endsWith('…')).toBe(true);
  });

  it('adds the category and place to a very short description', () => {
    const out = listingDescription({ ...base, description: 'Good phone' });
    expect(out).toBe('Good phone · Electronics in Madhapur, Hyderabad on LocalsIndia. Contact the seller directly.');
    expect(out.length).toBeGreaterThanOrEqual(70);
  });

  it('handles an empty description and missing details', () => {
    expect(listingDescription({ ...base, description: '  ', category_name: null, area: null, city_name: null }))
      .toBe('on LocalsIndia. Contact the seller directly.');
  });
});
