import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Store } from 'lucide-react';
import SiteHeader from '@/components/site-header/SiteHeader';
import SiteFooter from '@/components/site-footer/SiteFooter';
import ListingCard from '@/components/listing-card/ListingCard';
import BusinessList, { ChipLinks } from '@/components/business-list/BusinessList';
import { categoryCover, listingCovers } from '@/lib/categoryCover';
import { serializeJsonLd } from '@/lib/jsonLd';
import { SEO_CATEGORIES } from '@/lib/seoCategories';
import { MIN_TYPE_BUSINESSES, typeDescription, type TypeInfo } from '@/lib/typePages';
import { listingPath } from '@/lib/utils';
import type { Business, City, Listing } from '@/lib/types';

// /{city}/{type} — e.g. "Dentists in Hyderabad": the real businesses of one
// subcategory, plus any matching classified ads. Indexed only with
// MIN_TYPE_BUSINESSES+ businesses; a type with none in the city shows the
// not-found page (noindex — see the [city]/loading.tsx soft-404 note in PROJECT_MAP).

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

async function typeData(citySlug: string, type: TypeInfo) {
  const q = `city_slug=${citySlug}&category_slug=${type.categorySlug}`;
  const [businesses, counts, listings] = await Promise.all([
    getJson<Business[]>(`${API_BASE}/api/v1/businesses?${q}&subcategory_slug=${type.slug}&page_size=${BUSINESS_LIMIT}`, []),
    getJson<Record<string, number>>(`${API_BASE}/api/v1/businesses/subcategory-counts?${q}`, {}),
    getJson<Listing[]>(`${API_BASE}/api/v1/cities/${citySlug}/listings?category_slug=${type.categorySlug}&subcategory_slug=${type.slug}&page_size=12`, []),
  ]);
  const list = Array.isArray(businesses) ? businesses : [];
  return {
    businesses: list,
    total: counts[type.slug] ?? list.length,
    counts,
    listings: Array.isArray(listings) ? listings : [],
  };
}

export async function typeMetadata(city: City, type: TypeInfo): Promise<Metadata> {
  const { total, listings } = await typeData(city.slug, type);
  const title = `${type.name} in ${city.name}${total >= MIN_TYPE_BUSINESSES ? ` (${total.toLocaleString('en-IN')})` : ''} | LocalsIndia`;
  const description = typeDescription(type, city.name, total).slice(0, 158);
  const url = `https://www.localsindia.com/${city.slug}/${type.slug}`;
  const image = categoryCover(type.categorySlug);
  return {
    title,
    description,
    openGraph: { title, description, url, siteName: 'LocalsIndia', type: 'website', images: [{ url: image, alt: title }] },
    twitter: { card: 'summary_large_image', title, description, images: [image] },
    alternates: { canonical: url },
    robots: { index: total >= MIN_TYPE_BUSINESSES || listings.length > 0, follow: true },
  };
}

export default async function TypePage({ city, type }: { city: City; type: TypeInfo }) {
  const { businesses, total, counts, listings } = await typeData(city.slug, type);
  if (businesses.length === 0 && listings.length === 0) notFound();

  const parent = type.seoKey ? SEO_CATEGORIES[type.seoKey] : undefined;
  const Icon = parent?.icon ?? Store;
  const covers = listingCovers(listings);
  const pageUrl = `https://www.localsindia.com/${city.slug}/${type.slug}`;
  const siblings = type.siblings.filter(s => (counts[s.slug] ?? 0) >= MIN_TYPE_BUSINESSES);

  const jsonLd = [
    {
      '@context': 'https://schema.org',
      '@type': 'ItemList',
      name: `${type.name} in ${city.name}`,
      url: pageUrl,
      numberOfItems: businesses.length + listings.length,
      itemListElement: [
        ...businesses.slice(0, 20).map(b => ({ name: b.name, url: `https://www.localsindia.com/${city.slug}/businesses/${b.id}` })),
        ...listings.slice(0, 10).map(l => ({ name: l.title, url: `https://www.localsindia.com${listingPath(l)}` })),
      ].map((item, i) => ({ '@type': 'ListItem', position: i + 1, ...item })),
    },
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://www.localsindia.com' },
        { '@type': 'ListItem', position: 2, name: city.name, item: `https://www.localsindia.com/${city.slug}` },
        ...(parent && type.seoKey
          ? [{ '@type': 'ListItem', position: 3, name: parent.title, item: `https://www.localsindia.com/${city.slug}/${type.seoKey}` }]
          : []),
        { '@type': 'ListItem', position: parent ? 4 : 3, name: type.name, item: pageUrl },
      ],
    },
  ];

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(jsonLd) }} />

      <div style={{ background: 'var(--li-page-bg)', minHeight: '100vh' }}>
        <SiteHeader citySlug={city.slug} />

        <div className="bg-white border-b" style={{ borderColor: 'var(--li-border)' }}>
          <div className="page-wrap py-5">
            <nav className="flex items-center gap-2 text-xs mb-3 flex-wrap" style={{ color: 'var(--li-muted)' }}>
              <Link href="/" className="hover:text-orange-500 transition-colors">Home</Link>
              <span>/</span>
              <Link href={`/${city.slug}`} className="hover:text-orange-500 transition-colors">{city.name}</Link>
              {parent && type.seoKey && (
                <>
                  <span>/</span>
                  <Link href={`/${city.slug}/${type.seoKey}`} className="hover:text-orange-500 transition-colors">{parent.title}</Link>
                </>
              )}
              <span>/</span>
              <span style={{ color: 'var(--li-text)' }}>{type.name}</span>
            </nav>

            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div>
                <h1 className="text-2xl sm:text-3xl font-black flex items-center gap-2" style={{ color: 'var(--li-text)' }}>
                  <Icon size={26} />
                  {type.name} in {city.name}
                </h1>
                <p className="text-sm mt-1.5" style={{ color: 'var(--li-muted)' }}>
                  {[
                    total > 0 && `${total.toLocaleString('en-IN')} local business${total !== 1 ? 'es' : ''}`,
                    listings.length > 0 && `${listings.length} listing${listings.length !== 1 ? 's' : ''}`,
                  ].filter(Boolean).join(' · ')}
                </p>
              </div>
              <Link
                href={`/${city.slug}/classifieds/post`}
                className="shrink-0 px-5 py-2.5 rounded-xl text-sm font-bold text-white transition-opacity hover:opacity-90"
                style={{ background: 'var(--li-primary)' }}
              >
                + Post Listing
              </Link>
            </div>
          </div>
        </div>

        <div className="page-wrap py-8 pb-20 md:pb-8 space-y-10">
          {businesses.length > 0 && (
            <section>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-extrabold" style={{ color: 'var(--li-text)' }}>
                  {type.name} in {city.name}
                </h2>
                {total > businesses.length && (
                  <Link
                    href={`/${city.slug}/businesses?category=${type.categorySlug}&sub=${type.slug}`}
                    className="text-sm font-semibold hover:underline"
                    style={{ color: 'var(--li-primary)' }}
                  >
                    View all {total.toLocaleString('en-IN')} →
                  </Link>
                )}
              </div>
              <BusinessList businesses={businesses} citySlug={city.slug} fallbackCategory={type.categorySlug} />
            </section>
          )}

          {listings.length > 0 && (
            <section>
              <h2 className="text-lg font-extrabold mb-4" style={{ color: 'var(--li-text)' }}>Latest listings</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {listings.map(l => (
                  <ListingCard key={l.id} listing={l} citySlug={city.slug} coverUrl={covers.get(l.id)} />
                ))}
              </div>
            </section>
          )}

          <ChipLinks
            title={parent ? `More ${parent.title.toLowerCase()} in ${city.name}` : `More in ${city.name}`}
            links={siblings.map(s => ({ href: `/${city.slug}/${s.slug}`, label: `${s.name} (${counts[s.slug]})` }))}
          />

        </div>

        <SiteFooter />
      </div>
    </>
  );
}
