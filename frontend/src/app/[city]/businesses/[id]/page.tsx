import type { Metadata } from 'next';
import Link from 'next/link';
import type { Business } from '@/lib/types';
import BusinessDetailClient from './BusinessDetailClient';
import { SEO_CATEGORIES, SEO_PAGE_FOR_BUSINESS_CATEGORY } from '@/lib/seoCategories';
import { coverFor } from '@/lib/categoryCover';
import { parseOpeningHours, schemaOpeningHours } from '@/lib/openingHours';
import { realImages } from '@/lib/utils';
import { serializeJsonLd } from '@/lib/jsonLd';

// Must be dynamic: a generateStaticParams placeholder (left from the old static
// export) made every real business id 500 — next-intl reads request headers,
// which Next refuses on a route it built as static.
export const dynamic = 'force-dynamic';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'https://localsindia-backend-in.azurewebsites.net';

const CATEGORY_LABEL: Record<string, string> = {
  tiffin: 'Tiffin & Food', doctors: 'Doctors & Clinics', education: 'Education', 'pg-roommate': 'PG & Hostels',
  jobs: 'Jobs', vehicles: 'Vehicles', electronics: 'Electronics', services: 'Services', events: 'Event Venues',
  businesses: 'Shops', 'real-estate': 'Real Estate', furniture: 'Furniture', fashion: 'Fashion',
};

async function fetchBusiness(id: string): Promise<Business | null> {
  try {
    const res = await fetch(`${API_BASE}/api/v1/businesses/${id}`, { next: { revalidate: 3600 } });
    return res.ok ? await res.json() : null;
  } catch {
    return null;
  }
}

function cityName(slug: string) {
  return slug.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

// Server-rendered title/description/JSON-LD so Google can list real local
// businesses (the page body itself is client-rendered).
export async function generateMetadata(
  { params }: { params: { city: string; id: string } },
): Promise<Metadata> {
  const b = await fetchBusiness(params.id);
  if (!b) return { title: 'Business | LocalsIndia' };
  const city = cityName(params.city);
  const kind = CATEGORY_LABEL[b.category_slug ?? ''] ?? 'Local business';
  const title = `${b.name} — ${kind} in ${city} | LocalsIndia`;
  const description = [b.address, b.phone ? `Phone ${b.phone}` : null, `${kind} in ${city} on LocalsIndia.`]
    .filter(Boolean).join(' · ').slice(0, 155);
  const url = `https://www.localsindia.com/${params.city}/businesses/${b.id}`;
  // Its own photo when it has one, else the same labelled category cover the page shows
  const image = realImages(b.images)[0]?.url ?? coverFor(b);
  return {
    title, description, alternates: { canonical: url },
    openGraph: { title, description, url, siteName: 'LocalsIndia', images: [{ url: image, alt: b.name }] },
    twitter: { card: 'summary_large_image', title, description, images: [image] },
  };
}

async function fetchRelated(citySlug: string, category: string | null | undefined, selfId: string): Promise<Business[]> {
  if (!category) return [];
  try {
    const res = await fetch(`${API_BASE}/api/v1/businesses?city_slug=${citySlug}&category_slug=${category}&page_size=9`,
      { next: { revalidate: 3600 } });
    const data: Business[] = res.ok ? await res.json() : [];
    return data.filter(x => x.id !== selfId).slice(0, 8);
  } catch {
    return [];
  }
}

export default async function Page({ params }: { params: { city: string; id: string } }) {
  const b = await fetchBusiness(params.id);
  const related = b ? await fetchRelated(params.city, b.category_slug, b.id) : [];
  const seoKey = SEO_PAGE_FOR_BUSINESS_CATEGORY[b?.category_slug ?? ''];
  const seoMeta = seoKey ? SEO_CATEGORIES[seoKey] : null;
  const city = cityName(params.city);
  const breadcrumbLd = b ? {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: city, item: `https://www.localsindia.com/${params.city}` },
      ...(seoKey && seoMeta ? [{ '@type': 'ListItem', position: 2, name: `${seoMeta.title} in ${city}`,
        item: `https://www.localsindia.com/${params.city}/${seoKey}` }] : []),
      { '@type': 'ListItem', position: seoKey ? 3 : 2, name: b.name,
        item: `https://www.localsindia.com/${params.city}/businesses/${b.id}` },
    ],
  } : null;
  const hours = parseOpeningHours(b?.opening_hours);
  const jsonLd = b ? {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    name: b.name,
    ...(b.address ? { address: b.address } : {}),
    ...(b.phone ? { telephone: b.phone } : {}),
    ...(b.latitude != null && b.longitude != null
      ? { geo: { '@type': 'GeoCoordinates', latitude: b.latitude, longitude: b.longitude } } : {}),
    ...(hours ? { openingHours: schemaOpeningHours(hours) } : {}),
    url: `https://www.localsindia.com/${params.city}/businesses/${b.id}`,
  } : null;
  return (
    <>
      {jsonLd && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(jsonLd) }} />
      )}
      {breadcrumbLd && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(breadcrumbLd) }} />
      )}
      <BusinessDetailClient />
      {/* Server-rendered so every business page links to its neighbours */}
      {related.length > 0 && seoMeta && (
        <section className="max-w-2xl mx-auto px-4 pb-24 -mt-16" style={{ background: 'var(--li-page-bg)' }}>
          <h2 className="text-base font-extrabold mb-3" style={{ color: 'var(--li-text)' }}>
            More {seoMeta.title.toLowerCase()} in {city}
          </h2>
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {related.map(r => (
              <li key={r.id}>
                <Link href={`/${params.city}/businesses/${r.id}`}
                  className="block bg-white rounded-xl border px-3.5 py-2.5 text-sm font-semibold hover:shadow-sm truncate"
                  style={{ borderColor: 'var(--li-border)', color: 'var(--li-text)' }}>
                  {r.name}
                </Link>
              </li>
            ))}
          </ul>
          <Link href={`/${params.city}/${seoKey}`} className="inline-block mt-3 text-sm font-semibold hover:underline"
            style={{ color: 'var(--li-primary)' }}>
            See all {seoMeta.title.toLowerCase()} in {city} →
          </Link>
        </section>
      )}
    </>
  );
}
