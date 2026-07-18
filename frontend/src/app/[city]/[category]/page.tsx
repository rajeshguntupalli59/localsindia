import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { Utensils, Home, Briefcase, Car, Smartphone, Wrench, Sofa, BookOpen, type LucideIcon } from 'lucide-react';
import ListingCard from '@/components/listing-card/ListingCard';
import SiteHeader from '@/components/site-header/SiteHeader';
import SiteFooter from '@/components/site-footer/SiteFooter';
import type { Listing } from '@/lib/types';

// Named routes that take priority — this page must never match these
const RESERVED = new Set([
  'businesses', 'events', 'search', 'classifieds', 'post', 'edit',
]);

const SEO_CATEGORIES: Record<string, {
  title: string;
  headline: string;
  description: string;
  categorySlug?: string;
  searchFallback?: string;
  icon: LucideIcon;
}> = {
  tiffin: {
    title: 'Tiffin Services',
    headline: 'Home-cooked Tiffin Services',
    description: 'Find affordable, hygienic home-cooked tiffin and meal delivery services near you.',
    categorySlug: 'services',
    searchFallback: 'tiffin',
    icon: Utensils,
  },
  'pg-roommate': {
    title: 'PG & Roommate',
    headline: 'PG Accommodation & Roommates',
    description: 'Find paying guest accommodation, shared flats and roommates for rent.',
    categorySlug: 'pg-roommate',
    icon: Home,
  },
  jobs: {
    title: 'Jobs',
    headline: 'Local Job Openings',
    description: 'Find jobs, employment and career opportunities posted by local businesses and employers.',
    categorySlug: 'jobs',
    icon: Briefcase,
  },
  vehicles: {
    title: 'Vehicles',
    headline: 'Cars, Bikes & Scooters',
    description: 'Buy and sell used cars, motorbikes, scooters and other vehicles directly from owners.',
    categorySlug: 'vehicles',
    icon: Car,
  },
  electronics: {
    title: 'Electronics',
    headline: 'Mobile Phones, Laptops & Gadgets',
    description: 'Buy and sell used mobile phones, laptops, TVs, cameras and electronics.',
    categorySlug: 'electronics',
    icon: Smartphone,
  },
  services: {
    title: 'Local Services',
    headline: 'Trusted Local Services',
    description: 'Find reliable plumbers, electricians, cleaners, painters and other home services.',
    categorySlug: 'services',
    icon: Wrench,
  },
  furniture: {
    title: 'Furniture',
    headline: 'Furniture & Home Decor',
    description: 'Buy and sell used furniture, sofas, beds, dining tables and home decor items.',
    searchFallback: 'furniture',
    icon: Sofa,
  },
  tutors: {
    title: 'Tutors & Classes',
    headline: 'Tutors, Coaching & Classes',
    description: 'Find qualified tutors for all subjects, spoken English, music and online/offline classes.',
    searchFallback: 'tutor',
    icon: BookOpen,
  },
};

const TOP_CITIES = [
  'bangalore', 'hyderabad', 'chennai', 'mumbai', 'delhi', 'pune',
  'kolkata', 'ahmedabad', 'jaipur', 'lucknow', 'surat', 'kanpur',
  'nagpur', 'indore', 'bhopal', 'visakhapatnam', 'vadodara', 'noida',
  'thane', 'patna',
];

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'https://localsindia-backend.azurewebsites.net';

async function fetchListings(citySlug: string, meta: typeof SEO_CATEGORIES[string]): Promise<Listing[]> {
  try {
    // Use city listings endpoint with category slug filter
    if (meta.categorySlug) {
      const res = await fetch(
        `${API_BASE}/api/v1/cities/${citySlug}/listings?category_slug=${meta.categorySlug}&page_size=12`,
        { next: { revalidate: 3600 } },
      );
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) return data;
      }
    }
    // Fallback: search with keyword
    if (meta.searchFallback) {
      const res = await fetch(
        `${API_BASE}/api/v1/search?q=${encodeURIComponent(meta.searchFallback)}&city_slug=${citySlug}&page_size=12`,
        { next: { revalidate: 3600 } },
      );
      if (res.ok) {
        const data = await res.json();
        return data.items ?? data ?? [];
      }
    }
    // Final fallback: all listings for the city
    const res = await fetch(
      `${API_BASE}/api/v1/cities/${citySlug}/listings?page_size=12`,
      { next: { revalidate: 3600 } },
    );
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

export async function generateStaticParams() {
  const params: { city: string; category: string }[] = [];
  for (const city of TOP_CITIES) {
    for (const category of Object.keys(SEO_CATEGORIES)) {
      params.push({ city, category });
    }
  }
  return params;
}

// A page with zero real listings just shows a "be the first to post" empty
// state — Google flags that as a soft 404, and category pages that fall back
// to the city's full listing set (see fetchListings) duplicate other category
// pages for the same city. Only index once there's at least one real listing.
const MIN_LISTINGS_FOR_INDEX = 1;

export async function generateMetadata(
  { params }: { params: { city: string; category: string } }
): Promise<Metadata> {
  const meta = SEO_CATEGORIES[params.category];
  if (!meta) return { title: 'LocalsIndia' };
  const cityName = params.city.charAt(0).toUpperCase() + params.city.slice(1);
  const title = `${meta.title} in ${cityName} — Free Listings | LocalsIndia`;
  const description = `${meta.description} Post free on LocalsIndia — India's hyperlocal community platform.`;
  const listings = await fetchListings(params.city, meta);
  const shouldIndex = listings.length >= MIN_LISTINGS_FOR_INDEX;
  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: `https://www.localsindia.com/${params.city}/${params.category}`,
      siteName: 'LocalsIndia',
      type: 'website',
    },
    alternates: {
      canonical: `https://www.localsindia.com/${params.city}/${params.category}`,
    },
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

  const cityName = params.city.charAt(0).toUpperCase() + params.city.slice(1);
  const listings = await fetchListings(params.city, meta);

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: `${meta.title} in ${cityName}`,
    description: meta.description,
    url: `https://www.localsindia.com/${params.city}/${params.category}`,
    numberOfItems: listings.length,
    itemListElement: listings.slice(0, 10).map((l, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: l.title,
      url: `https://www.localsindia.com/${params.city}/classifieds/${l.id}`,
    })),
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
              <Link href={`/${params.city}`} className="hover:text-orange-500 transition-colors capitalize">
                {cityName}
              </Link>
              <span>/</span>
              <span style={{ color: 'var(--li-text)' }}>{meta.title}</span>
            </nav>

            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div>
                <h1 className="text-2xl sm:text-3xl font-black flex items-center gap-2" style={{ color: 'var(--li-text)' }}>
                  <meta.icon size={26} />
                  {meta.headline} in {cityName}
                </h1>
                <p className="text-sm mt-1.5" style={{ color: 'var(--li-muted)' }}>
                  {listings.length > 0
                    ? `${listings.length} listing${listings.length !== 1 ? 's' : ''} · Free to browse`
                    : 'Be the first to post a free listing!'}
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

        <div className="page-wrap py-8 pb-20 md:pb-8">
          {listings.length === 0 ? (
            <div className="text-center py-20">
              <div className="flex justify-center mb-5" style={{ color: 'var(--li-muted)' }}>
                <meta.icon size={56} strokeWidth={1.5} />
              </div>
              <h2 className="text-xl font-bold mb-2" style={{ color: 'var(--li-text)' }}>
                No {meta.title.toLowerCase()} listings in {cityName} yet
              </h2>
              <p className="text-sm mb-8 max-w-sm mx-auto" style={{ color: 'var(--li-muted)' }}>
                Be the first to post and reach thousands of locals looking for {meta.title.toLowerCase()} right now.
              </p>
              <Link
                href={`/${params.city}/classifieds/post`}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl text-white font-bold text-sm transition-opacity hover:opacity-90"
                style={{ background: 'var(--li-primary)' }}
              >
                Post Listing
              </Link>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {listings.map((listing) => (
                  <ListingCard key={listing.id} listing={listing} citySlug={params.city} />
                ))}
              </div>

              {/* SEO content block */}
              <div
                className="mt-10 p-6 rounded-3xl border"
                style={{ background: 'var(--li-card-bg)', borderColor: 'var(--li-border)' }}
              >
                <h2 className="font-bold text-base mb-2" style={{ color: 'var(--li-text)' }}>
                  Find {meta.title} in {cityName} on LocalsIndia
                </h2>
                <p className="text-sm leading-relaxed mb-4" style={{ color: 'var(--li-muted)' }}>
                  {meta.description} LocalsIndia connects buyers and sellers directly via WhatsApp —
                  no middlemen, no commissions, zero platform fees.
                  Post your {meta.title.toLowerCase()} listing for free and start receiving enquiries today.
                  All listings in {cityName} are verified and contact sellers directly on WhatsApp.
                </p>
                {/* Related category links */}
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

              {/* Cross-city links for this category */}
              <div className="mt-6">
                <p className="text-sm font-semibold mb-3" style={{ color: 'var(--li-text)' }}>
                  {meta.title} in other cities
                </p>
                <div className="flex flex-wrap gap-2">
                  {TOP_CITIES.filter(c => c !== params.city).slice(0, 12).map(city => (
                    <Link
                      key={city}
                      href={`/${city}/${params.category}`}
                      className="text-xs px-3 py-1.5 rounded-full border transition-colors hover:border-orange-400 hover:text-orange-500 capitalize"
                      style={{ borderColor: 'var(--li-border)', color: 'var(--li-muted)' }}
                    >
                      {city.charAt(0).toUpperCase() + city.slice(1)}
                    </Link>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>

        <SiteFooter />
      </div>
    </>
  );
}
