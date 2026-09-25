import { SEO_PAGE_FOR_BUSINESS_CATEGORY } from '@/lib/seoCategories';

// Neighbourhood pages (/[city]/area/[area] and /[city]/[category]/[area]) with
// 3+ real businesses. Its own file because sitemap.xml is near Google's
// 50,000-URL limit with every business page in it. Listed in robots.txt.
// Rendered on request (the fetch below is cached for a day) — prerendering at
// build time would freeze an empty sitemap if the API was unreachable then.
export const dynamic = 'force-dynamic';

const BASE = 'https://www.localsindia.com';
const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'https://localsindia-backend-in.azurewebsites.net';
const MAX_URLS = 50000;

interface LocalityPage { city_slug: string; locality_slug: string; category_slug: string | null; count: number }

export async function GET() {
  let pages: LocalityPage[] = [];
  try {
    const res = await fetch(`${API_BASE}/api/v1/businesses/locality-pages`, { next: { revalidate: 86400 } });
    if (res.ok) pages = await res.json();
  } catch {
    // empty sitemap is valid; retried on the next revalidation
  }
  const urls = pages
    .map(p => {
      if (!p.category_slug) return `${BASE}/${p.city_slug}/area/${p.locality_slug}`;
      const key = SEO_PAGE_FOR_BUSINESS_CATEGORY[p.category_slug];
      return key ? `${BASE}/${p.city_slug}/${key}/${p.locality_slug}` : null;
    })
    .filter((u): u is string => !!u)
    .slice(0, MAX_URLS);
  const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(u => `<url><loc>${u}</loc><changefreq>weekly</changefreq><priority>0.6</priority></url>`).join('\n')}
</urlset>`;
  return new Response(body, { headers: { 'Content-Type': 'application/xml; charset=utf-8' } });
}
