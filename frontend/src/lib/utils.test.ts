import { describe, it, expect, vi, afterEach } from 'vitest';
import { formatPrice, isSaleCategory, fulfillLabel, timeAgo } from './utils';

describe('formatPrice', () => {
  it('formats a positive price with Indian digit grouping and rupee sign', () => {
    expect(formatPrice(150000)).toBe('₹1,50,000');
  });

  it('returns "Price on request" for null', () => {
    expect(formatPrice(null)).toBe('Price on request');
  });

  it('formats zero as ₹0, not "Price on request"', () => {
    expect(formatPrice(0)).toBe('₹0');
  });
});

describe('isSaleCategory / fulfillLabel', () => {
  it('treats vehicles as a sale category', () => {
    expect(isSaleCategory('vehicles')).toBe(true);
    expect(fulfillLabel('vehicles')).toBe('Sold');
  });

  it('treats jobs as a non-sale category', () => {
    expect(isSaleCategory('jobs')).toBe(false);
    expect(fulfillLabel('jobs')).toBe('Closed');
  });

  it('treats missing/undefined category as non-sale', () => {
    expect(isSaleCategory(undefined)).toBe(false);
    expect(fulfillLabel(undefined)).toBe('Closed');
  });
});

describe('timeAgo', () => {
  afterEach(() => vi.useRealTimers());

  it('returns "just now" for a timestamp under a minute old', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T12:00:30Z'));
    expect(timeAgo('2026-01-01T12:00:00Z')).toBe('just now');
  });

  it('returns singular "1 hour ago" not "1 hours ago"', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T13:00:00Z'));
    expect(timeAgo('2026-01-01T12:00:00Z')).toBe('1 hour ago');
  });

  it('returns plural hours for 2+ hours', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T15:00:00Z'));
    expect(timeAgo('2026-01-01T12:00:00Z')).toBe('3 hours ago');
  });

  it('falls back to months once past 30 days', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-01T12:00:00Z'));
    expect(timeAgo('2026-01-01T12:00:00Z')).toBe('1 month ago');
  });
});
