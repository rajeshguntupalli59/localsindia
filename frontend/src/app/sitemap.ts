import type { MetadataRoute } from 'next';

const BASE = 'https://www.localsindia.com';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: BASE, lastModified: new Date(), changeFrequency: 'daily', priority: 1 },
    { url: `${BASE}/privacy`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.3 },
    { url: `${BASE}/terms`,   lastModified: new Date(), changeFrequency: 'monthly', priority: 0.3 },
  ];

  let cityRoutes: MetadataRoute.Sitemap = [];
  try {
    const apiBase = process.env.NEXT_PUBLIC_API_URL ?? 'https://localsindia-backend.up.railway.app';
    const res = await fetch(`${apiBase}/api/v1/cities`, { next: { revalidate: 86400 } });
    if (res.ok) {
      const cities: { slug: string; updated_at?: string }[] = await res.json();
      cityRoutes = cities.map(c => ({
        url: `${BASE}/${c.slug}`,
        lastModified: c.updated_at ? new Date(c.updated_at) : new Date(),
        changeFrequency: 'daily' as const,
        priority: 0.8,
      }));
    }
  } catch {
    // sitemap still works with just static routes if API is down
  }

  return [...staticRoutes, ...cityRoutes];
}
