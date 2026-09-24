import { describe, it, expect, vi, afterEach } from 'vitest';
import { formatPrice, isSaleCategory, fulfillLabel, timeAgo, searchHeading, slugify, listingPath, listingIdFromParam, realImages } from './utils';

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

describe('searchHeading', () => {
  it('uses the query when present', () => {
    expect(searchHeading(' tiffin ', 'Jobs', 'Hyderabad')).toBe('tiffin in Hyderabad');
  });
  it('falls back to the category, then "Listings"', () => {
    expect(searchHeading('', 'Jobs', 'Guntur')).toBe('Jobs in Guntur');
    expect(searchHeading('', undefined, 'Guntur')).toBe('Listings in Guntur');
  });
  it('omits the city when unknown', () => {
    expect(searchHeading('pg', undefined, '')).toBe('pg');
  });
});

describe('listing URLs', () => {
  const id = '7a72cb7c-8b23-4af0-8118-7e72e4e25acd';
  it('slugifies titles to lowercase ascii words', () => {
    expect(slugify('Honda Activa 6G · 2022 · 12,000 km!')).toBe('honda-activa-6g-2022-12-000-km');
  });
  it('builds a keyword path, or a bare id when the title has no latin text', () => {
    expect(listingPath({ id, title: 'PG for Girls' })).toBe(`/listing/${id}-pg-for-girls`);
    expect(listingPath({ id, title: 'టిఫిన్ సర్వీస్' })).toBe(`/listing/${id}`);
  });
  it('recovers the id from slugged and bare params', () => {
    expect(listingIdFromParam(`${id}-pg-for-girls`)).toBe(id);
    expect(listingIdFromParam(id)).toBe(id);
    expect(listingIdFromParam('mock-1')).toBe('mock-1');
  });
});

describe('realImages', () => {
  it('drops placeholder covers and keeps real photos', () => {
    const imgs = [
      { url: 'https://placehold.co/400x300/3b82f6/white?text=LocalsIndia' },
      { url: 'https://res.cloudinary.com/x/image/upload/a.jpg' },
    ];
    expect(realImages(imgs)).toEqual([imgs[1]]);
    expect(realImages(undefined)).toEqual([]);
  });
});

describe('categoryCover', () => {
  it('uses the category photo, falling back to classifieds', async () => {
    const { categoryCover } = await import('./categoryCover');
    expect(categoryCover('tiffin')).toBe('/category-covers/tiffin.jpg');
    expect(categoryCover('unknown')).toBe('/category-covers/classifieds.jpg');
    expect(categoryCover(null)).toBe('/category-covers/classifieds.jpg');
  });
});
