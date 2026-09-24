import type { MetadataRoute } from 'next';
import { listAllPosts } from '@/lib/blog';

const BASE = 'https://www.localsindia.com';
const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'https://localsindia-backend-in.azurewebsites.net';

// Must match the keys of SEO_CATEGORIES in app/[city]/[category]/page.tsx —
// that page self-gates its own robots/noindex per city based on real listing
// count, so it's safe to submit unconditionally for every city.
const CATEGORY_SLUGS = [
  'tiffin', 'pg-roommate', 'jobs', 'vehicles',
  'electronics', 'services', 'furniture', 'tutors',
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: BASE,              lastModified: new Date(), changeFrequency: 'daily',   priority: 1.0 },
    { url: `${BASE}/privacy`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.3 },
    { url: `${BASE}/terms`,   lastModified: new Date(), changeFrequency: 'monthly', priority: 0.3 },
    { url: `${BASE}/invite`,  lastModified: new Date(), changeFrequency: 'monthly', priority: 0.5 },
    { url: `${BASE}/trust`,   lastModified: new Date(), changeFrequency: 'monthly', priority: 0.4 },
  ];

  const cityRoutes: MetadataRoute.Sitemap = [];
  try {
    const res = await fetch(`${API_BASE}/api/v1/cities`, { next: { revalidate: 86400 } });
    if (res.ok) {
      const cities: { slug: string; updated_at?: string }[] = await res.json();

      for (const c of cities) {
        const mod = c.updated_at ? new Date(c.updated_at) : new Date();

        // City home — highest priority, crawled hourly
        cityRoutes.push({ url: `${BASE}/${c.slug}`, lastModified: mod, changeFrequency: 'hourly', priority: 0.9 });

        // Events + businesses pages
        cityRoutes.push({ url: `${BASE}/${c.slug}/events`,     lastModified: mod, changeFrequency: 'daily', priority: 0.8 });
        cityRoutes.push({ url: `${BASE}/${c.slug}/businesses`, lastModified: mod, changeFrequency: 'daily', priority: 0.8 });
        cityRoutes.push({ url: `${BASE}/${c.slug}/launch`,     lastModified: mod, changeFrequency: 'weekly', priority: 0.6 });

        // Category SEO pages — long-tail SEO gold ("tiffin in Hyderabad").
        // Points at /[city]/[category], not /[city]/search?category= — the
        // search page is client-rendered and already declares itself
        // noindex, so submitting it to Google was pure waste.
        for (const cat of CATEGORY_SLUGS) {
          cityRoutes.push({
            url: `${BASE}/${c.slug}/${cat}`,
            lastModified: mod,
            changeFrequency: 'daily',
            priority: 0.7,
          });
        }
      }
    }
  } catch {
    // sitemap still works with static routes if API is down at build time
  }

  // Every business page (real, mostly OpenStreetMap-imported) so Google can
  // surface them. Capped server-side below the 50,000-URL sitemap limit.
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
    blogRoutes.push({ url: `${BASE}/blog`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.6 });
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

  return [...staticRoutes, ...cityRoutes, ...blogRoutes, ...businessRoutes];
}
