import { describe, it, expect } from 'vitest';
import { aggregateRating, productBrand } from './productJsonLd';

describe('aggregateRating', () => {
  it('returns null when there are no reviews', () => {
    expect(aggregateRating([])).toBeNull();
  });

  it('averages real ratings to one decimal', () => {
    expect(aggregateRating([{ rating: 5 }, { rating: 4 }, { rating: 4 }])).toEqual({
      '@type': 'AggregateRating',
      ratingValue: 4.3,
      reviewCount: 3,
      bestRating: 5,
      worstRating: 1,
    });
  });

  it('ignores out-of-range ratings', () => {
    expect(aggregateRating([{ rating: 0 }, { rating: 9 }])).toBeNull();
    expect(aggregateRating([{ rating: 0 }, { rating: 3 }])?.reviewCount).toBe(1);
  });
});

describe('productBrand', () => {
  it('uses the brand the seller picked or typed', () => {
    expect(productBrand({ brand: 'Honda', year: 2019 })).toEqual({ '@type': 'Brand', name: 'Honda' });
    expect(productBrand({ brand: '  Samsung ' })).toEqual({ '@type': 'Brand', name: 'Samsung' });
  });
  it('omits it when there is no real brand', () => {
    for (const d of [null, undefined, {}, { brand: '' }, { brand: '   ' }, { brand: 42 }, { brand: 'Other' }]) {
      expect(productBrand(d as Record<string, unknown> | null | undefined)).toBeNull();
    }
  });
});
