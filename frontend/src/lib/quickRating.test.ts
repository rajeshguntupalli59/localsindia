import { beforeEach, describe, expect, it } from 'vitest';
import { savePendingRating, takePendingRating } from './quickRating';

describe('pending quick rating', () => {
  beforeEach(() => sessionStorage.clear());

  it('returns the rating once, then nothing', () => {
    savePendingRating('biz-1', 4);
    expect(takePendingRating('biz-1')).toBe(4);
    expect(takePendingRating('biz-1')).toBeNull();
  });

  it('leaves a rating meant for another business alone', () => {
    savePendingRating('biz-1', 4);
    expect(takePendingRating('biz-2')).toBeNull();
    expect(takePendingRating('biz-1')).toBe(4);
  });

  it('ignores anything that is not 1 to 5 stars', () => {
    savePendingRating('biz-1', 9);
    expect(takePendingRating('biz-1')).toBeNull();
    sessionStorage.setItem('li_pending_rating', 'not json');
    expect(takePendingRating('biz-1')).toBeNull();
  });
});
