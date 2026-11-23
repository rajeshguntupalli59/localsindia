import { describe, expect, it } from 'vitest';
import { cityNameFromSlug, chatSuggestions } from './chatSuggestions';

describe('chatSuggestions', () => {
  it('names the visitor city in each question', () => {
    expect(chatSuggestions('hyderabad')).toEqual(['Dentists in Hyderabad', 'Hospitals in Hyderabad', 'Restaurants in Hyderabad']);
  });
  it('handles multi-word city slugs', () => {
    expect(cityNameFromSlug('navi-mumbai')).toBe('Navi Mumbai');
    expect(chatSuggestions('visakhapatnam')[0]).toBe('Dentists in Visakhapatnam');
  });
  it('falls back to city-free questions when no city is known', () => {
    for (const s of [null, undefined, '', '  ']) {
      expect(chatSuggestions(s)).toEqual(['Find a dentist near me', 'Hospitals near me', 'Is LocalsIndia free?']);
    }
  });
  it('ignores a malformed stored value', () => {
    expect(chatSuggestions('<script>')).toEqual(chatSuggestions(null));
  });
});
