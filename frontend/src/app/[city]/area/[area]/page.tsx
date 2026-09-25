import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { MapPin } from 'lucide-react';
import { MIN_AREA_BUSINESSES, SEO_CATEGORIES, SEO_PAGE_FOR_BUSINESS_CATEGORY } from '@/lib/seoCategories';
import SiteHeader from '@/components/site-header/SiteHeader';
import SiteFooter from '@/components/site-footer/SiteFooter';
import BusinessList, { ChipLinks } from '@/components/business-list/BusinessList';
import type { Business, City, Locality } from '@/lib/types';
import { serializeJsonLd } from '@/lib/jsonLd';

// "Businesses in Madhapur, Hyderabad" — every real business in one
// neighbourhood, linking to its category-in-area pages.

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'https://localsindia-backend-in.azurewebsites.net';
const PAGE_SIZE = 50;

interface LocalityPage { city_slug: string; locality_slug: string; category_slug: string | null; count: number }

async function getJson<T>(url: string, fallback: T): Promise<T> {
  try {
    const res = await fetch(url, { next: { revalidate: 3600 } });
    return res.ok ? await res.json() : fallback;
  } catch {
    return fallback;
  }
}

async function load(params: { city: string; area: string }) {
  const [cities, localities] = await Promise.all([
    getJson<City[]>(`${API_BASE}/api/v1/cities`, []),
    getJson<Locality[]>(`${API_BASE}/api/v1/businesses/localities?city_slug=${params.city}`, []),
  ]);
  const city = cities.find(c => c.slug === params.city);
  const area = localities.find(l => l.slug === params.area);
  if (!city || !area) return null;
  return { city, area, localities };
}

export async function generateMetadata({ params }: { params: { city: string; area: string } }): Promise<Metadata> {
  const data = await load(params);
  if (!data) return { title: 'LocalsIndia' };
  const { city, area } = data;
  const title = `Businesses in ${area.name}, ${city.name} — Shops, Clinics & Services | LocalsIndia`;
  const description = `${area.count} local businesses in ${area.name}, ${city.name} — clinics, restaurants, schools, shops and services with addresses and phone numbers.`;
  const url = `https://www.localsindia.com/${params.city}/area/${params.area}`;
  return {
    title,
    description,
    openGraph: { title, description, url, siteName: 'LocalsIndia', type: 'website', images: [{ url: '/logo.png', width: 1200, height: 630, alt: 'LocalsIndia' }] },
    twitter: { card: 'summary_large_image', title, description, images: ['/logo.png'] },
    alternates: { canonical: url },
    robots: { index: area.count >= MIN_AREA_BUSINESSES, follow: true },
  };
}

export default async function AreaPage({ params }: { params: { city: string; area: string } }) {
  const data = await load(params);
  if (!data) notFound();
  const { city, area, localities } = data;

  const [businesses, pages] = await Promise.all([
    getJson<Business[]>(`${API_BASE}/api/v1/businesses?city_slug=${params.city}&locality_slug=${params.area}&page_size=${PAGE_SIZE}`, []),
    getJson<LocalityPage[]>(`${API_BASE}/api/v1/businesses/locality-pages?city_slug=${params.city}`, []),
  ]);
  const categoryLinks = pages
    .filter(p => p.locality_slug === area.slug && p.category_slug && SEO_PAGE_FOR_BUSINESS_CATEGORY[p.category_slug])
    .sort((a, b) => b.count - a.count)
    .map(p => {
      const key = SEO_PAGE_FOR_BUSINESS_CATEGORY[p.category_slug!];
      return { href: `/${params.city}/${key}/${area.slug}`, label: `${SEO_CATEGORIES[key].title} (${p.count})` };
    });
  const otherAreas = localities.filter(l => l.slug !== area.slug && l.count >= MIN_AREA_BUSINESSES).slice(0, 40);
  const base = 'https://www.localsindia.com';
  const pageUrl = `${base}/${params.city}/area/${params.area}`;

  const jsonLd = [
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { name: 'Home', item: base },
        { name: city.name, item: `${base}/${params.city}` },
        { name: area.name, item: pageUrl },
      ].map((b, i) => ({ '@type': 'ListItem', position: i + 1, ...b })),
    },
    {
      '@context': 'https://schema.org',
      '@type': 'ItemList',
      name: `Businesses in ${area.name}, ${city.name}`,
      url: pageUrl,
      numberOfItems: area.count,
      itemListElement: businesses.slice(0, 20).map((b, i) => ({
        '@type': 'ListItem', position: i + 1, name: b.name, url: `${base}/${params.city}/businesses/${b.id}`,
      })),
    },
  ];

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(jsonLd) }} />
      <div style={{ background: 'var(--li-page-bg)', minHeight: '100vh' }}>
        <SiteHeader citySlug={params.city} />

        <div className="bg-white border-b" style={{ borderColor: 'var(--li-border)' }}>
          <div className="page-wrap py-5">
            <nav className="flex flex-wrap items-center gap-2 text-xs mb-3" style={{ color: 'var(--li-muted)' }}>
              <Link href="/" className="hover:text-orange-500 transition-colors">Home</Link>
              <span>/</span>
              <Link href={`/${params.city}`} className="hover:text-orange-500 transition-colors">{city.name}</Link>
              <span>/</span>
              <span style={{ color: 'var(--li-text)' }}>{area.name}</span>
            </nav>
            <h1 className="text-2xl sm:text-3xl font-black flex items-center gap-2" style={{ color: 'var(--li-text)' }}>
              <MapPin size={26} className="shrink-0" />
              Businesses in {area.name}, {city.name}
            </h1>
            <p className="text-sm mt-1.5" style={{ color: 'var(--li-muted)' }}>
              {area.count.toLocaleString('en-IN')} local business{area.count !== 1 ? 'es' : ''} in and around {area.name}
            </p>
          </div>
        </div>

        <div className="page-wrap py-8 pb-20 md:pb-8 space-y-10">
          <ChipLinks title={`By category in ${area.name}`} links={categoryLinks} />

          <section>
            <BusinessList businesses={businesses} citySlug={params.city} />
            {area.count > businesses.length && (
              <Link href={`/${params.city}/businesses`} className="inline-block mt-4 text-sm font-semibold hover:underline"
                style={{ color: 'var(--li-primary)' }}>
                All businesses in {city.name} →
              </Link>
            )}
          </section>

          <ChipLinks
            title={`Other areas in ${city.name}`}
            links={otherAreas.map(a => ({ href: `/${params.city}/area/${a.slug}`, label: `${a.name} (${a.count})` }))}
          />
        </div>

        <SiteFooter />
      </div>
    </>
  );
}
