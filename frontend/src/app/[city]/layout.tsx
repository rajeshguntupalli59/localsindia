import { notFound } from 'next/navigation';
import BottomNav from '@/components/bottom-nav/BottomNav';

export const dynamicParams = true;

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'https://localsindia-backend-in.azurewebsites.net';

// Slugs of the cities LocalsIndia serves, or null when the API can't be
// reached — then we fail open (render as before) rather than 404 every city.
async function activeCitySlugs(): Promise<Set<string> | null> {
  try {
    const res = await fetch(`${API_BASE}/api/v1/cities`, { next: { revalidate: 3600 } });
    if (!res.ok) return null;
    const cities: { slug: string }[] = await res.json();
    return Array.isArray(cities) && cities.length > 0 ? new Set(cities.map(c => c.slug)) : null;
  } catch {
    return null;
  }
}

export default async function CityLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { city: string };
}) {
  // Checked here, above the home page's loading boundary, so an unknown city
  // gets a real 404 status instead of a streamed 200 "soft 404".
  const slugs = await activeCitySlugs();
  if (slugs && !slugs.has(params.city)) notFound();

  return (
    <>
      <div className="pb-16 md:pb-0">{children}</div>
      <BottomNav citySlug={params.city} />
    </>
  );
}
