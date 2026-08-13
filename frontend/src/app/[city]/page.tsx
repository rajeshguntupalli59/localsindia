import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import type { City, Listing } from '@/lib/types';
import { regionalPhraseFor } from '@/lib/regionalSeo';
import { loadCitySeo } from '@/lib/seo';
import CityHomeClient from './CityHomeClient';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'https://localsindia-backend-in.azurewebsites.net';

// Cities with fewer real listings than this are kept out of the Google index —
// a thin/empty city page hurts trust and drags down the whole domain's SEO.
// Deliberately low: the site isn't indexed by Google at all yet (P0 priority is
// getting *any* real content indexed), and most seeded cities only have 10-30
// listings today. This just keeps the ~410 completely unseeded (0-listing)
// cities out of the index — raise this once inventory per city grows.
const MIN_LISTINGS_FOR_INDEX = 3;

async function fetchCity(citySlug: string): Promise<City | null> {
  try {
    const res = await fetch(`${API_BASE}/api/v1/cities/${citySlug}`, { next: { revalidate: 3600 } });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

async function fetchTodayCount(citySlug: string): Promise<number> {
  try {
    const res = await fetch(`${API_BASE}/api/v1/cities/${citySlug}/listings/today-count`, { next: { revalidate: 3600 } });
    if (!res.ok) return 0;
    const data = await res.json();
    return data.count ?? 0;
  } catch {
    return 0;
  }
}

async function fetchTrending(citySlug: string): Promise<Listing[]> {
  try {
    const res = await fetch(`${API_BASE}/api/v1/cities/${citySlug}/listings/trending`, { next: { revalidate: 3600 } });
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

async function fetchFresh(citySlug: string): Promise<Listing[]> {
  try {
    const res = await fetch(
      `${API_BASE}/api/v1/cities/${citySlug}/listings?status=active&sort=newest&page_size=20`,
      { next: { revalidate: 3600 } },
    );
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

export async function generateMetadata(
  { params }: { params: { city: string } }
): Promise<Metadata> {
  const city = await fetchCity(params.city);
  if (!city) return { title: 'LocalsIndia' };

  // agents/seo_agent.py generates richer, city-specific copy + keywords for
  // cities that qualify for Google's index (see MIN_LISTINGS_FOR_INDEX) —
  // use it when available. Most cities won't have one yet, so fall back to
  // the plain template + regional-language keyword (regionalSeo.ts) below.
  const citySeo = loadCitySeo(params.city);
  const regionalPhrase = regionalPhraseFor(city.lang_default);

  const title = citySeo?.titleTag
    || (regionalPhrase
      ? `${city.name} Classifieds — Tiffin, PG, Jobs & More | LocalsIndia · ${regionalPhrase}`
      : `${city.name} Classifieds — Tiffin, PG, Jobs & More | LocalsIndia`);
  const description = citySeo?.metaDescription
    || (regionalPhrase
      ? `Buy, sell and find PGs, tiffin services, jobs and local services in ${city.name}, ${city.state}. Free to post, contact sellers directly on WhatsApp. ${regionalPhrase}.`
      : `Buy, sell and find PGs, tiffin services, jobs and local services in ${city.name}, ${city.state}. Free to post, contact sellers directly on WhatsApp.`);
  const ogTitle = citySeo?.ogTitle || title;
  const ogDescription = citySeo?.ogDescription || description;
  const keywords = citySeo
    ? [citySeo.focusKeyword, ...citySeo.secondaryKeywords, ...citySeo.longTailKeywords].filter(Boolean)
    : undefined;

  const fresh = await fetchFresh(params.city);
  const shouldIndex = fresh.length >= MIN_LISTINGS_FOR_INDEX;

  return {
    title,
    description,
    keywords,
    openGraph: {
      title: ogTitle,
      description: ogDescription,
      url: `https://www.localsindia.com/${params.city}`,
      siteName: 'LocalsIndia',
      type: 'website',
    },
    alternates: {
      canonical: `https://www.localsindia.com/${params.city}`,
    },
    robots: { index: shouldIndex, follow: true },
  };
}

export default async function CityHomePage({ params }: { params: { city: string } }) {
  const [city, todayCount, trending, fresh] = await Promise.all([
    fetchCity(params.city),
    fetchTodayCount(params.city),
    fetchTrending(params.city),
    fetchFresh(params.city),
  ]);

  if (!city) notFound();

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: `Listings in ${city.name}`,
    url: `https://www.localsindia.com/${params.city}`,
    numberOfItems: fresh.length,
    itemListElement: fresh.slice(0, 10).map((l, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: l.title,
      url: `https://www.localsindia.com/${params.city}/classifieds/${l.id}`,
    })),
  };

  // Complements the ItemList block above (different @type — WebPage vs
  // ItemList — multiple JSON-LD blocks per page is valid), only present for
  // cities agents/seo_agent.py has generated content for.
  const citySeo = loadCitySeo(params.city);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      {citySeo?.jsonLd && Object.keys(citySeo.jsonLd).length > 0 && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(citySeo.jsonLd) }}
        />
      )}
      <CityHomeClient
        initialCity={city}
        initialTodayCount={todayCount}
        initialTrending={trending}
        initialFresh={fresh}
      />
    </>
  );
}
