import { describe, it, expect } from 'vitest';
import { loadPost, listAllPosts, listCitySlugs, listPostSlugs } from './blog';

describe('loadPost', () => {
  it('returns null for a city that does not exist', () => {
    expect(loadPost('nonexistent-city-xyz', 'some-slug')).toBeNull();
  });

  it('returns null for a slug that does not exist under a real city dir', () => {
    const cities = listCitySlugs();
    if (cities.length === 0) return; // no content generated yet in this environment
    expect(loadPost(cities[0], 'nonexistent-slug-xyz')).toBeNull();
  });
});

describe('listCitySlugs / listPostSlugs / listAllPosts', () => {
  it('does not throw when the content directory is empty or missing', () => {
    expect(() => listCitySlugs()).not.toThrow();
    expect(() => listAllPosts()).not.toThrow();
  });

  it('listPostSlugs returns an empty array for a nonexistent city', () => {
    expect(listPostSlugs('nonexistent-city-xyz')).toEqual([]);
  });

  it('listAllPosts returns posts sorted newest-first by publishedAt', () => {
    const posts = listAllPosts();
    for (let i = 1; i < posts.length; i++) {
      expect(posts[i - 1].publishedAt >= posts[i].publishedAt).toBe(true);
    }
  });
});
