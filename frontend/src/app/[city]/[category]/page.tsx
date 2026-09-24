import { listingPath } from '@/lib/utils';
import { categoryCover } from '@/lib/categoryCover';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import {
  Utensils, Home, Briefcase, Car, Smartphone, Wrench, Sofa, BookOpen, Stethoscope, Shirt, PartyPopper,
  Building2, Store, MapPin, Phone, type LucideIcon,
} from 'lucide-react';
import ListingCard from '@/components/listing-card/ListingCard';
import SiteHeader from '@/components/site-header/SiteHeader';
import SiteFooter from '@/components/site-footer/SiteFooter';
import OsmAttribution from '@/components/osm-attribution/OsmAttribution';
import type { Business, City, Listing } from '@/lib/types';

// Named routes that take priority — this page must never match these
const RESERVED = new Set([
  'businesses', 'events', 'search', 'classifieds', 'post', 'edit',
]);

// Keys are the URL segment (/{city}/{key}); keep app/sitemap.ts CATEGORY_SLUGS in sync.
// businessSlug = the business-directory category shown on the page (real
// local businesses, mostly from OpenStreetMap).
const SEO_CATEGORIES: Record<string, {
  title: string;
  headline: string;
  description: string;
  categorySlug?: string;
  searchFallback?: string;
  businessSlug: string;
  icon: LucideIcon;
}> = {
  tiffin: {
    title: 'Tiffin Services',
    headline: 'Tiffin, Meals & Restaurants',
    description: 'Find affordable, hygienic home-cooked tiffin, meal delivery services and local restaurants near you.',
    categorySlug: 'services',
    searchFallback: 'tiffin',
    businessSlug: 'tiffin',
    icon: Utensils,
  },
  'pg-roommate': {
    title: 'PG & Hostels',
    headline: 'PG Accommodation, Hostels & Roommates',
    description: 'Find paying guest accommodation, hostels, shared flats and roommates for rent.',
    categorySlug: 'pg-roommate',
    businessSlug: 'pg-roommate',
    icon: Home,
  },
  jobs: {
    title: 'Jobs',
    headline: 'Local Job Openings',
    description: 'Find jobs, employment and career opportunities posted by local businesses and employers.',
    categorySlug: 'jobs',
    businessSlug: 'jobs',
    icon: Briefcase,
  },
  vehicles: {
    title: 'Vehicles',
    headline: 'Cars, Bikes, Scooters & Garages',
    description: 'Buy and sell used cars, motorbikes and scooters, and find local garages and vehicle showrooms.',
    categorySlug: 'vehicles',
    businessSlug: 'vehicles',
    icon: Car,
  },
  electronics: {
    title: 'Electronics',
    headline: 'Mobile Phones, Laptops & Electronics Shops',
    description: 'Buy and sell used phones, laptops and gadgets, and find local mobile and electronics shops.',
    categorySlug: 'electronics',
    businessSlug: 'electronics',
    icon: Smartphone,
  },
  services: {
    title: 'Local Services',
    headline: 'Trusted Local Services',
    description: 'Find salons, laundries, opticians, plumbers, electricians and other local services.',
    categorySlug: 'services',
    businessSlug: 'services',
    icon: Wrench,
  },
  furniture: {
    title: 'Furniture',
    headline: 'Furniture Shops & Home Decor',
    description: 'Buy and sell used furniture and find local furniture and home decor shops.',
    searchFallback: 'furniture',
    businessSlug: 'furniture',
    icon: Sofa,
  },
  tutors: {
    title: 'Schools, Tutors & Classes',
    headline: 'Schools, Colleges, Tutors & Coaching',
    description: 'Find schools, colleges, coaching centres and tutors for all subjects near you.',
    searchFallback: 'tutor',
    businessSlug: 'education',
    icon: BookOpen,
  },
  doctors: {
    title: 'Doctors & Clinics',
    headline: 'Hospitals, Clinics & Pharmacies',
    description: 'Find hospitals, clinics, dentists, diagnostic centres and pharmacies near you, with addresses and phone numbers.',
    businessSlug: 'doctors',
    icon: Stethoscope,
  },
  fashion: {
    title: 'Fashion & Textiles',
    headline: 'Clothing, Textiles, Tailors & Jewellery',
    description: 'Find local clothing stores, textile and saree shops, tailors, footwear and jewellery shops.',
    businessSlug: 'fashion',
    icon: Shirt,
  },
  'event-venues': {
    title: 'Function Halls & Venues',
    headline: 'Function Halls, Banquet Halls & Event Venues',
    description: 'Find function halls, convention centres and banquet halls for weddings and events.',
    businessSlug: 'events',
    icon: PartyPopper,
  },
  'real-estate': {
    title: 'Real Estate',
    headline: 'Real Estate Agents & Properties',
    description: 'Find local real estate agents, builders and property listings.',
    businessSlug: 'real-estate',
    icon: Building2,
  },
  shops: {
    title: 'Shops & Stores',
    headline: 'Local Shops & Stores',
    description: 'Find local supermarkets, kirana, hardware, stationery and general stores near you.',
    businessSlug: 'businesses',
    icon: Store,
  },
};

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
  const [listings, businesses] = await Promise.all([
    fetchListings(params.city, meta), fetchBusinesses(params.city, meta.businessSlug),
  ]);
  const count = businesses.length >= BUSINESS_LIMIT ? `${BUSINESS_LIMIT}+` : String(businesses.length);
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
    openGraph: { title, description, url, siteName: 'LocalsIndia', type: 'website' },
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

  const [{ items: listings, exact }, businesses] = await Promise.all([
    fetchListings(params.city, meta), fetchBusinesses(params.city, meta.businessSlug),
  ]);
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
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
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
                    businesses.length > 0 && `${businesses.length >= BUSINESS_LIMIT ? `${BUSINESS_LIMIT}+` : businesses.length} local businesses`,
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
              <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {businesses.map(b => (
                  <li key={b.id}>
                    <Link
                      href={`/${params.city}/businesses/${b.id}`}
                      className="flex gap-3 bg-white rounded-2xl border p-3 hover:shadow-md transition-shadow h-full"
                      style={{ borderColor: 'var(--li-border)' }}
                    >
                      <div className="relative w-16 h-16 rounded-xl overflow-hidden shrink-0 bg-slate-100">
                        <Image
                          src={b.images?.[0]?.url ?? categoryCover(b.category_slug ?? meta.businessSlug)}
                          alt="" fill className="object-cover" sizes="64px"
                        />
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-bold text-sm line-clamp-1" style={{ color: 'var(--li-text)' }}>{b.name}</h3>
                        {b.address && (
                          <p className="flex items-center gap-1 text-xs mt-0.5" style={{ color: 'var(--li-muted)' }}>
                            <MapPin className="w-3 h-3 shrink-0" /> <span className="truncate">{b.address}</span>
                          </p>
                        )}
                        {b.phone && (
                          <p className="flex items-center gap-1 text-xs mt-0.5" style={{ color: 'var(--li-muted)' }}>
                            <Phone className="w-3 h-3 shrink-0" /> {b.phone}
                          </p>
                        )}
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
              {businesses.some(b => b.source === 'osm') && <OsmAttribution className="mt-2" />}
            </section>
          )}

          {/* Listings posted by people */}
          {exact && listings.length > 0 ? (
            <section>
              <h2 className="text-lg font-extrabold mb-4" style={{ color: 'var(--li-text)' }}>
                Latest listings
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {listings.map((listing) => (
                  <ListingCard key={listing.id} listing={listing} citySlug={params.city} />
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
