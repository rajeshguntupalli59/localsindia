import type { Metadata } from 'next';
import type { Business } from '@/lib/types';
import BusinessDetailClient from './BusinessDetailClient';

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
  return { title, description, alternates: { canonical: url }, openGraph: { title, description, url, siteName: 'LocalsIndia' } };
}

export default async function Page({ params }: { params: { city: string; id: string } }) {
  const b = await fetchBusiness(params.id);
  const jsonLd = b ? {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    name: b.name,
    ...(b.address ? { address: b.address } : {}),
    ...(b.phone ? { telephone: b.phone } : {}),
    ...(b.latitude != null && b.longitude != null
      ? { geo: { '@type': 'GeoCoordinates', latitude: b.latitude, longitude: b.longitude } } : {}),
    url: `https://www.localsindia.com/${params.city}/businesses/${b.id}`,
  } : null;
  return (
    <>
      {jsonLd && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      )}
      <BusinessDetailClient />
    </>
  );
}
