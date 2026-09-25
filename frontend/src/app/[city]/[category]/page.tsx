import { listingPath } from '@/lib/utils';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { MIN_AREA_BUSINESSES, SEO_CATEGORIES } from '@/lib/seoCategories';
import ListingCard from '@/components/listing-card/ListingCard';
import { categoryCover, listingCovers } from '@/lib/categoryCover';
import SiteHeader from '@/components/site-header/SiteHeader';
import SiteFooter from '@/components/site-footer/SiteFooter';
import type { Business, City, Listing, Locality } from '@/lib/types';
import BusinessList, { ChipLinks } from '@/components/business-list/BusinessList';
import { serializeJsonLd } from '@/lib/jsonLd';

// Named routes that take priority — this page must never match these
const RESERVED = new Set([
  'businesses', 'events', 'search', 'classifieds', 'post', 'edit',
]);

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'https://localsindia-backend-in.azurewebsites.net';
const BUSINESS_LIMIT = 24;

async function getJson<T>(url: string, fallback: T): Promise<T> {
  try {
    const res = await fetch(url, { next: { revalidate: 3600 } });
    return res.ok ? await res.json() : fallback;
  } catch {
    return fallback;
  }
}

async function fetchCities(): Promise<City[]> {
  return getJson<City[]>(`${API_BASE}/api/v1/cities`, []);
}

// Listings for the category. `exact` is false when we had to fall back to
// the city's general listings — those don't count towards indexing (they'd
// duplicate every other category page for the city).
async function fetchListings(citySlug: string, meta: typeof SEO_CATEGORIES[string]): Promise<{ items: Listing[]; exact: boolean }> {
  if (meta.categorySlug) {
    const data = await getJson<Listing[]>(
      `${API_BASE}/api/v1/cities/${citySlug}/listings?category_slug=${meta.categorySlug}&page_size=12`, []);
    if (Array.isArray(data) && data.length > 0) return { items: data, exact: true };
  }
  if (meta.searchFallback) {
    const data = await getJson<{ items?: Listing[] }>(
      `${API_BASE}/api/v1/search?q=${encodeURIComponent(meta.searchFallback)}&city_slug=${citySlug}&page_size=12`, {});
    const items = data.items ?? [];
    if (items.length > 0) return { items, exact: true };
  }
  const data = await getJson<Listing[]>(`${API_BASE}/api/v1/cities/${citySlug}/listings?page_size=12`, []);
  return { items: Array.isArray(data) ? data : [], exact: false };
}

async function fetchBusinesses(citySlug: string, businessSlug: string): Promise<Business[]> {
  const data = await getJson<Business[]>(
    `${API_BASE}/api/v1/businesses?city_slug=${citySlug}&category_slug=${businessSlug}&page_size=${BUSINESS_LIMIT}`, []);
  return Array.isArray(data) ? data : [];
}

// Real number of businesses in the category (the list above is capped at BUSINESS_LIMIT)
async function fetchBusinessCount(citySlug: string, businessSlug: string): Promise<number> {
  const counts = await getJson<Record<string, number>>(`${API_BASE}/api/v1/businesses/counts?city_slug=${citySlug}`, {});
  return counts[businessSlug] ?? 0;
}

function countLabel(total: number, shown: number): string {
  return (total || shown).toLocaleString('en-IN');
}

// Index a page when it has something real for the category: at least one
// genuine listing, or a few real local businesses. An empty "be the first to
// post" page stays out of Google (soft 404).
const MIN_LISTINGS_FOR_INDEX = 1;
const MIN_BUSINESSES_FOR_INDEX = 3;

export async function generateMetadata(
  { params }: { params: { city: string; category: string } }
): Promise<Metadata> {
  const meta = SEO_CATEGORIES[params.category];
  const city = (await fetchCities()).find(c => c.slug === params.city);
  if (!meta || !city) return { title: 'LocalsIndia' };
  const [listings, businesses, total] = await Promise.all([
    fetchListings(params.city, meta), fetchBusinesses(params.city, meta.businessSlug),
    fetchBusinessCount(params.city, meta.businessSlug),
  ]);
  const count = countLabel(total, businesses.length);
  const title = `${meta.title} in ${city.name} | LocalsIndia`;
  const description = businesses.length >= MIN_BUSINESSES_FOR_INDEX
    ? `${count} ${meta.title.toLowerCase()} in ${city.name} with addresses and phone numbers. ${meta.description}`.slice(0, 158)
    : `${meta.description} Post free on LocalsIndia — ${city.name}'s local community platform.`.slice(0, 158);
  const shouldIndex = (listings.exact && listings.items.length >= MIN_LISTINGS_FOR_INDEX)
    || businesses.length >= MIN_BUSINESSES_FOR_INDEX;
  const url = `https://www.localsindia.com/${params.city}/${params.category}`;
  return {
    title,
    description,
    openGraph: { title, description, url, siteName: 'LocalsIndia', type: 'website', images: [{ url: categoryCover(meta.businessSlug), alt: title }] },
    twitter: { card: 'summary_large_image', title, description, images: [categoryCover(meta.businessSlug)] },
    alternates: { canonical: url },
    robots: { index: shouldIndex, follow: true },
  };
}

export default async function SeoCategoryPage({
  params,
}: {
  params: { city: string; category: string };
}) {
  if (RESERVED.has(params.category)) notFound();
  const meta = SEO_CATEGORIES[params.category];
  if (!meta) notFound();

  const cities = await fetchCities();
  const city = cities.find(c => c.slug === params.city);
  if (!city) notFound();   // only cities LocalsIndia actually serves

  const [{ items: listings, exact }, businesses, businessTotal, localities] = await Promise.all([
    fetchListings(params.city, meta), fetchBusinesses(params.city, meta.businessSlug),
    fetchBusinessCount(params.city, meta.businessSlug),
    getJson<Locality[]>(`${API_BASE}/api/v1/businesses/localities?city_slug=${params.city}&category_slug=${meta.businessSlug}`, []),
  ]);
  const covers = listingCovers(listings);
  const areas = localities.filter(l => l.count >= MIN_AREA_BUSINESSES).slice(0, 40);
  const sameState = cities.filter(c => c.state === city.state && c.slug !== city.slug).slice(0, 12);
  const pageUrl = `https://www.localsindia.com/${params.city}/${params.category}`;

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: `${meta.headline} in ${city.name}`,
    description: meta.description,
    url: pageUrl,
    numberOfItems: businesses.length + (exact ? listings.length : 0),
    itemListElement: [
      ...businesses.slice(0, 20).map(b => ({
        name: b.name, url: `https://www.localsindia.com/${params.city}/businesses/${b.id}` })),
      ...(exact ? listings.slice(0, 10).map(l => ({ name: l.title, url: `https://www.localsindia.com${listingPath(l)}` })) : []),
    ].map((item, i) => ({ '@type': 'ListItem', position: i + 1, ...item })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(jsonLd) }}
      />

      <div style={{ background: 'var(--li-page-bg)', minHeight: '100vh' }}>
        <SiteHeader citySlug={params.city} />

        {/* Breadcrumb + Hero header */}
        <div className="bg-white border-b" style={{ borderColor: 'var(--li-border)' }}>
          <div className="page-wrap py-5">
            <nav className="flex items-center gap-2 text-xs mb-3" style={{ color: 'var(--li-muted)' }}>
              <Link href="/" className="hover:text-orange-500 transition-colors">Home</Link>
              <span>/</span>
              <Link href={`/${params.city}`} className="hover:text-orange-500 transition-colors">
                {city.name}
              </Link>
              <span>/</span>
              <span style={{ color: 'var(--li-text)' }}>{meta.title}</span>
            </nav>

            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div>
                <h1 className="text-2xl sm:text-3xl font-black flex items-center gap-2" style={{ color: 'var(--li-text)' }}>
                  <meta.icon size={26} />
                  {meta.headline} in {city.name}
                </h1>
                <p className="text-sm mt-1.5" style={{ color: 'var(--li-muted)' }}>
                  {[
                    businesses.length > 0 && `${countLabel(businessTotal, businesses.length)} local businesses`,
                    exact && listings.length > 0 && `${listings.length} listing${listings.length !== 1 ? 's' : ''}`,
                  ].filter(Boolean).join(' · ') || 'Be the first to post a free listing!'}
                </p>
              </div>
              <Link
                href={`/${params.city}/classifieds/post`}
                className="shrink-0 px-5 py-2.5 rounded-xl text-sm font-bold text-white transition-opacity hover:opacity-90"
                style={{ background: 'var(--li-primary)' }}
              >
                + Post Listing
              </Link>
            </div>
            {params.category === 'jobs' && (
              <div
                className="mt-4 px-4 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2"
                style={{ background: '#FEF2F2', color: '#B91C1C' }}
              >
                ⚠️ Never pay money to get a job. Report anyone who asks for a registration fee or deposit.
              </div>
            )}
          </div>
        </div>

        <div className="page-wrap py-8 pb-20 md:pb-8 space-y-10">
          {/* Real local businesses — server-rendered so search engines see them */}
          {businesses.length > 0 && (
            <section>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-extrabold" style={{ color: 'var(--li-text)' }}>
                  {meta.title} in {city.name}
                </h2>
                <Link
                  href={`/${params.city}/businesses?category=${meta.businessSlug}`}
                  className="text-sm font-semibold hover:underline"
                  style={{ color: 'var(--li-primary)' }}
                >
                  View all →
                </Link>
              </div>
              <BusinessList businesses={businesses} citySlug={params.city} fallbackCategory={meta.businessSlug} />
            </section>
          )}

          <ChipLinks
            title={`${meta.title} by area in ${city.name}`}
            links={areas.map(a => ({ href: `/${params.city}/${params.category}/${a.slug}`, label: `${a.name} (${a.count})` }))}
          />

          {/* Listings posted by people */}
          {exact && listings.length > 0 ? (
            <section>
              <h2 className="text-lg font-extrabold mb-4" style={{ color: 'var(--li-text)' }}>
                Latest listings
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {listings.map((listing) => (
                  <ListingCard key={listing.id} listing={listing} citySlug={params.city} coverUrl={covers.get(listing.id)} />
                ))}
              </div>
            </section>
          ) : businesses.length === 0 ? (
            <div className="text-center py-20">
              <div className="flex justify-center mb-5" style={{ color: 'var(--li-muted)' }}>
                <meta.icon size={56} strokeWidth={1.5} />
              </div>
              <h2 className="text-xl font-bold mb-2" style={{ color: 'var(--li-text)' }}>
                No {meta.title.toLowerCase()} in {city.name} yet
              </h2>
              <p className="text-sm mb-8 max-w-sm mx-auto" style={{ color: 'var(--li-muted)' }}>
                Be the first to post and reach locals looking for {meta.title.toLowerCase()}.
              </p>
              <Link
                href={`/${params.city}/classifieds/post`}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl text-white font-bold text-sm transition-opacity hover:opacity-90"
                style={{ background: 'var(--li-primary)' }}
              >
                Post Listing
              </Link>
            </div>
          ) : null}

          {/* SEO content block */}
          <div
            className="p-6 rounded-3xl border"
            style={{ background: 'var(--li-card-bg)', borderColor: 'var(--li-border)' }}
          >
            <h2 className="font-bold text-base mb-2" style={{ color: 'var(--li-text)' }}>
              Find {meta.title} in {city.name} on LocalsIndia
            </h2>
            <p className="text-sm leading-relaxed mb-4" style={{ color: 'var(--li-muted)' }}>
              {meta.description} Browse local businesses with their address and phone number, or post a
              free listing. Every listing in {city.name} is reviewed before it goes live, and you contact
              sellers directly on WhatsApp — no middlemen, no commissions.
            </p>
            <div className="flex flex-wrap gap-2">
              {Object.entries(SEO_CATEGORIES)
                .filter(([k]) => k !== params.category)
                .map(([slug, m]) => (
                  <Link
                    key={slug}
                    href={`/${params.city}/${slug}`}
                    className="text-xs px-3 py-1.5 rounded-full border transition-colors hover:border-orange-400 hover:text-orange-500"
                    style={{ borderColor: 'var(--li-border)', color: 'var(--li-muted)' }}
                  >
                    <m.icon size={14} className="inline-block mr-1 align-text-bottom" />
                    {m.title}
                  </Link>
                ))}
            </div>
          </div>

          {/* Same category in nearby cities (same state) */}
          {sameState.length > 0 && (
            <div>
              <p className="text-sm font-semibold mb-3" style={{ color: 'var(--li-text)' }}>
                {meta.title} in other {city.state} cities
              </p>
              <div className="flex flex-wrap gap-2">
                {sameState.map(c => (
                  <Link
                    key={c.slug}
                    href={`/${c.slug}/${params.category}`}
                    className="text-xs px-3 py-1.5 rounded-full border transition-colors hover:border-orange-400 hover:text-orange-500"
                    style={{ borderColor: 'var(--li-border)', color: 'var(--li-muted)' }}
                  >
                    {c.name}
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>

        <SiteFooter />
      </div>
    </>
  );
}
