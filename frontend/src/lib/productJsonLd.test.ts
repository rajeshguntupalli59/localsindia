import { describe, it, expect } from 'vitest';
import { aggregateRating } from './productJsonLd';

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
