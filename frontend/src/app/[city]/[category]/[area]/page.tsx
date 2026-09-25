import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { MIN_AREA_BUSINESSES, SEO_CATEGORIES } from '@/lib/seoCategories';
import { categoryCover } from '@/lib/categoryCover';
import SiteHeader from '@/components/site-header/SiteHeader';
import SiteFooter from '@/components/site-footer/SiteFooter';
import BusinessList, { ChipLinks } from '@/components/business-list/BusinessList';
import type { Business, City, Locality } from '@/lib/types';

// "Doctors & Clinics in Madhapur, Hyderabad" — real businesses in one
// neighbourhood (localities come from OpenStreetMap, agents/assign_localities.py).

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'https://localsindia-backend-in.azurewebsites.net';
const PAGE_SIZE = 50;

async function getJson<T>(url: string, fallback: T): Promise<T> {
  try {
    const res = await fetch(url, { next: { revalidate: 3600 } });
    return res.ok ? await res.json() : fallback;
  } catch {
    return fallback;
  }
}

async function load(params: { city: string; category: string; area: string }) {
  const meta = SEO_CATEGORIES[params.category];
  if (!meta) return null;
  const [cities, localities] = await Promise.all([
    getJson<City[]>(`${API_BASE}/api/v1/cities`, []),
    getJson<Locality[]>(`${API_BASE}/api/v1/businesses/localities?city_slug=${params.city}&category_slug=${meta.businessSlug}`, []),
  ]);
  const city = cities.find(c => c.slug === params.city);
  const area = localities.find(l => l.slug === params.area);
  if (!city || !area) return null;
  return { meta, city, area, localities };
}

export async function generateMetadata(
  { params }: { params: { city: string; category: string; area: string } },
): Promise<Metadata> {
  const data = await load(params);
  if (!data) return { title: 'LocalsIndia' };
  const { meta, city, area } = data;
  const title = `${meta.title} in ${area.name}, ${city.name} | LocalsIndia`;
  const description = `${area.count} ${meta.title.toLowerCase()} in ${area.name}, ${city.name} with addresses and phone numbers. ${meta.description}`.slice(0, 158);
  const url = `https://www.localsindia.com/${params.city}/${params.category}/${params.area}`;
  const image = categoryCover(meta.businessSlug);
  return {
    title,
    description,
    openGraph: { title, description, url, siteName: 'LocalsIndia', type: 'website', images: [{ url: image, alt: title }] },
    twitter: { card: 'summary_large_image', title, description, images: [image] },
    alternates: { canonical: url },
    robots: { index: area.count >= MIN_AREA_BUSINESSES, follow: true },
  };
}

export default async function CategoryAreaPage(
  { params }: { params: { city: string; category: string; area: string } },
) {
  const data = await load(params);
  if (!data) notFound();
  const { meta, city, area, localities } = data;

  const businesses = await getJson<Business[]>(
    `${API_BASE}/api/v1/businesses?city_slug=${params.city}&category_slug=${meta.businessSlug}&locality_slug=${params.area}&page_size=${PAGE_SIZE}`, []);
  const otherAreas = localities.filter(l => l.slug !== area.slug && l.count >= MIN_AREA_BUSINESSES).slice(0, 40);
  const base = 'https://www.localsindia.com';
  const pageUrl = `${base}/${params.city}/${params.category}/${params.area}`;

  const jsonLd = [
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { name: 'Home', item: base },
        { name: city.name, item: `${base}/${params.city}` },
        { name: meta.title, item: `${base}/${params.city}/${params.category}` },
        { name: area.name, item: pageUrl },
      ].map((b, i) => ({ '@type': 'ListItem', position: i + 1, ...b })),
    },
    {
      '@context': 'https://schema.org',
      '@type': 'ItemList',
      name: `${meta.title} in ${area.name}, ${city.name}`,
      url: pageUrl,
      numberOfItems: area.count,
      itemListElement: businesses.slice(0, 20).map((b, i) => ({
        '@type': 'ListItem', position: i + 1, name: b.name, url: `${base}/${params.city}/businesses/${b.id}`,
      })),
    },
  ];

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <div style={{ background: 'var(--li-page-bg)', minHeight: '100vh' }}>
        <SiteHeader citySlug={params.city} />

        <div className="bg-white border-b" style={{ borderColor: 'var(--li-border)' }}>
          <div className="page-wrap py-5">
            <nav className="flex flex-wrap items-center gap-2 text-xs mb-3" style={{ color: 'var(--li-muted)' }}>
              <Link href="/" className="hover:text-orange-500 transition-colors">Home</Link>
              <span>/</span>
              <Link href={`/${params.city}`} className="hover:text-orange-500 transition-colors">{city.name}</Link>
              <span>/</span>
              <Link href={`/${params.city}/${params.category}`} className="hover:text-orange-500 transition-colors">{meta.title}</Link>
              <span>/</span>
              <span style={{ color: 'var(--li-text)' }}>{area.name}</span>
            </nav>
            <h1 className="text-2xl sm:text-3xl font-black flex items-center gap-2" style={{ color: 'var(--li-text)' }}>
              <meta.icon size={26} className="shrink-0" />
              {meta.headline} in {area.name}, {city.name}
            </h1>
            <p className="text-sm mt-1.5" style={{ color: 'var(--li-muted)' }}>
              {area.count.toLocaleString('en-IN')} local business{area.count !== 1 ? 'es' : ''} in and around {area.name}
            </p>
          </div>
        </div>

        <div className="page-wrap py-8 pb-20 md:pb-8 space-y-10">
          <section>
            <BusinessList businesses={businesses} citySlug={params.city} fallbackCategory={meta.businessSlug} />
            <div className="flex flex-wrap gap-4 mt-4 text-sm font-semibold" style={{ color: 'var(--li-primary)' }}>
              <Link href={`/${params.city}/area/${params.area}`} className="hover:underline">
                All businesses in {area.name} →
              </Link>
              <Link href={`/${params.city}/${params.category}`} className="hover:underline">
                {meta.title} across {city.name} →
              </Link>
            </div>
          </section>

          <ChipLinks
            title={`${meta.title} in other areas of ${city.name}`}
            links={otherAreas.map(a => ({ href: `/${params.city}/${params.category}/${a.slug}`, label: `${a.name} (${a.count})` }))}
          />
        </div>

        <SiteFooter />
      </div>
    </>
  );
}
