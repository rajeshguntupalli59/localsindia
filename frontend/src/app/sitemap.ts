import type { MetadataRoute } from 'next';
import { listAllPosts } from '@/lib/blog';
import { SEO_CATEGORIES } from '@/lib/seoCategories';
import { listingPath } from '@/lib/utils';

const BASE = 'https://www.localsindia.com';
const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'https://localsindia-backend-in.azurewebsites.net';

// Same "has real content" thresholds the pages use to decide index/noindex
// ([city]/page.tsx, [city]/businesses/page.tsx, [city]/[category]/page.tsx).
// A URL here whose page says noindex is a contradiction Google reports as an
// error, so only pages that will actually be indexable are listed.
const CITY_MIN_LISTINGS = 3;
const CITY_MIN_BUSINESSES = 10;
const CATEGORY_MIN_LISTINGS = 1;
const CATEGORY_MIN_BUSINESSES = 3;

type CityCounts = { businesses: Record<string, number>; listings: Record<string, number>; events: number };
type SitemapCounts = {
  cities: Record<string, CityCounts>;
  listings: { id: string; title: string; updated_at: string }[];
};

const sum = (m: Record<string, number>) => Object.values(m).reduce((a, b) => a + b, 0);

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // No lastModified on pages without a real change date — stamping every URL
  // with "now" teaches Google to ignore the field.
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: BASE,              changeFrequency: 'daily',   priority: 1.0 },
    { url: `${BASE}/privacy`, changeFrequency: 'monthly', priority: 0.3 },
    { url: `${BASE}/terms`,   changeFrequency: 'monthly', priority: 0.3 },
    { url: `${BASE}/invite`,  changeFrequency: 'monthly', priority: 0.5 },
    { url: `${BASE}/trust`,   changeFrequency: 'monthly', priority: 0.4 },
  ];

  const cityRoutes: MetadataRoute.Sitemap = [];
  const listingRoutes: MetadataRoute.Sitemap = [];
  try {
    const res = await fetch(`${API_BASE}/api/v1/businesses/sitemap-counts`, { next: { revalidate: 86400 } });
    if (res.ok) {
      const data: SitemapCounts = await res.json();
      for (const [slug, c] of Object.entries(data.cities)) {
        const totalBiz = sum(c.businesses);
        if (sum(c.listings) >= CITY_MIN_LISTINGS || totalBiz >= CITY_MIN_BUSINESSES) {
          cityRoutes.push({ url: `${BASE}/${slug}`, changeFrequency: 'daily', priority: 0.9 });
        }
        if (totalBiz >= CITY_MIN_BUSINESSES) {
          cityRoutes.push({ url: `${BASE}/${slug}/businesses`, changeFrequency: 'weekly', priority: 0.8 });
        }
        if (c.events > 0) {
          cityRoutes.push({ url: `${BASE}/${slug}/events`, changeFrequency: 'daily', priority: 0.7 });
        }
        // Category pages ("tiffin in Hyderabad")
        for (const [key, meta] of Object.entries(SEO_CATEGORIES)) {
          const listings = meta.categorySlug ? c.listings[meta.categorySlug] ?? 0 : 0;
          if (listings >= CATEGORY_MIN_LISTINGS || (c.businesses[meta.businessSlug] ?? 0) >= CATEGORY_MIN_BUSINESSES) {
            cityRoutes.push({ url: `${BASE}/${slug}/${key}`, changeFrequency: 'weekly', priority: 0.7 });
          }
        }
      }
      // Every active classified ad (server-rendered, canonical /listing/{id}-{slug})
      for (const l of data.listings) {
        listingRoutes.push({ url: `${BASE}${listingPath(l)}`, lastModified: new Date(l.updated_at), changeFrequency: 'weekly', priority: 0.6 });
      }
    }
  } catch {
    // sitemap still works with static routes if API is down
  }

  // Business pages worth indexing (backend Business.indexable — thin OSM
  // imports are noindex and left out). Capped server-side below 50,000 URLs.
  const businessRoutes: MetadataRoute.Sitemap = [];
  try {
    const res = await fetch(`${API_BASE}/api/v1/businesses/sitemap-entries`, { next: { revalidate: 86400 } });
    if (res.ok) {
      const entries: { id: string; city_slug: string; updated_at: string }[] = await res.json();
      for (const e of entries) {
        businessRoutes.push({
          url: `${BASE}/${e.city_slug}/businesses/${e.id}`,
          lastModified: new Date(e.updated_at),
          changeFrequency: 'weekly',
          priority: 0.5,
        });
      }
    }
  } catch {
    // business pages are optional in the sitemap
  }

  // Blog posts — local fs enumeration (no network fetch), independently
  // guarded so a malformed content file can never break the whole sitemap.
  const blogRoutes: MetadataRoute.Sitemap = [];
  try {
    blogRoutes.push({ url: `${BASE}/blog`, changeFrequency: 'weekly', priority: 0.6 });
    for (const post of listAllPosts()) {
      blogRoutes.push({
        url: `${BASE}/blog/${post.citySlug}/${post.slug}`,
        lastModified: new Date(post.publishedAt),
        changeFrequency: 'monthly',
        priority: 0.6,
      });
    }
  } catch {
    // sitemap still works without blog routes if content dir is malformed
  }

  return [...staticRoutes, ...cityRoutes, ...listingRoutes, ...blogRoutes, ...businessRoutes];
}
