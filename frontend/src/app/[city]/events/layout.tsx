import type { Metadata } from 'next';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'https://localsindia-backend-in.azurewebsites.net';

function cityName(slug: string) {
  return slug.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

// The page itself is client-rendered; an empty events list with the generic
// site title was flagged by Google as a soft 404. Noindex until the city has
// events (matches sitemap.ts, which only lists events pages with events).
export async function generateMetadata({ params }: { params: { city: string } }): Promise<Metadata> {
  let count = 0;
  try {
    const res = await fetch(`${API_BASE}/api/v1/events?city_slug=${params.city}`, { next: { revalidate: 3600 } });
    if (res.ok) count = ((await res.json()) as unknown[]).length;
  } catch {
    // treat as no events
  }
  const city = cityName(params.city);
  return {
    title: `Events in ${city} | LocalsIndia`,
    description: `Upcoming local events in ${city} on LocalsIndia.`,
    alternates: { canonical: `https://www.localsindia.com/${params.city}/events` },
    robots: { index: count > 0, follow: true },
  };
}

export default function CityEventsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
