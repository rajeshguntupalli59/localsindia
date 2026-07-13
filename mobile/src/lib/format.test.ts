import { describe, expect, it } from 'vitest';
import { formatPrice } from './format';

describe('formatPrice', () => {
  it('shows exact amount under ₹10,000', () => {
    expect(formatPrice(999)).toBe('₹999');
    expect(formatPrice(2500)).toBe('₹2,500');
    expect(formatPrice(9999)).toBe('₹9,999');
  });

  it('truncates to k notation between ₹10,000 and ₹1L, never rounding up', () => {
    expect(formatPrice(12500)).toBe('₹12.5k');
    expect(formatPrice(12345)).toBe('₹12.3k');
    expect(formatPrice(20000)).toBe('₹20k');
  });

  it('truncates to L notation at ₹1L and above, never rounding up', () => {
    expect(formatPrice(150000)).toBe('₹1.5L');
    expect(formatPrice(199999)).toBe('₹1.9L');
  });
});
