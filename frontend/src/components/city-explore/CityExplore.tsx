import Link from 'next/link';
import { Store, ArrowRight } from 'lucide-react';
import { SEO_CATEGORIES } from '@/lib/seoCategories';
import type { City, Locality } from '@/lib/types';
import { ChipLinks } from '@/components/business-list/BusinessList';

/**
 * Server-rendered "Explore <city>" block for the city home page: links to
 * every category page that has real businesses (with counts), the full
 * business directory, and nearby cities in the same state. These are plain
 * links in the HTML so search engines can reach every category and business.
 */
export default function CityExplore({
  city,
  counts,
  nearby,
  areas = [],
}: {
  city: City;
  counts: Record<string, number>;
  nearby: City[];
  areas?: Locality[];   // neighbourhoods with enough businesses for their own page
}) {
  const categories = Object.entries(SEO_CATEGORIES)
    .map(([key, m]) => ({ key, m, n: counts[m.businessSlug] ?? 0 }))
    .filter(c => c.n > 0)
    .sort((a, b) => b.n - a.n);
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  if (total === 0 && nearby.length === 0) return null;

  return (
    <section className="page-wrap py-8" aria-labelledby="explore-heading">
      <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
        <h2 id="explore-heading" className="text-xl font-extrabold" style={{ color: 'var(--li-text)' }}>
          Explore {city.name}
        </h2>
        {total > 0 && (
          <Link
            href={`/${city.slug}/businesses`}
            className="inline-flex items-center gap-1.5 text-sm font-semibold hover:underline"
            style={{ color: 'var(--li-primary)' }}
          >
            <Store className="w-4 h-4" /> All {total.toLocaleString('en-IN')} local businesses <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        )}
      </div>

      {categories.length > 0 && (
        <ul className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5">
          {categories.map(({ key, m, n }) => (
            <li key={key}>
              <Link
                href={`/${city.slug}/${key}`}
                className="flex items-center gap-2.5 bg-white rounded-2xl border px-3.5 py-3 hover:shadow-md transition-shadow h-full"
                style={{ borderColor: 'var(--li-border)' }}
              >
                <m.icon className="w-4 h-4 shrink-0" style={{ color: 'var(--li-primary)' }} />
                <span className="text-sm font-semibold leading-tight" style={{ color: 'var(--li-text)' }}>
                  {m.title} <span className="font-normal" style={{ color: 'var(--li-muted)' }}>({n.toLocaleString('en-IN')})</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}

      {areas.length > 0 && (
        <div className="mt-6">
          <ChipLinks
            title={`Popular areas in ${city.name}`}
            links={areas.map(a => ({ href: `/${city.slug}/area/${a.slug}`, label: a.name }))}
          />
        </div>
      )}

      {nearby.length > 0 && (
        <div className="mt-6">
          <p className="text-sm font-semibold mb-2.5" style={{ color: 'var(--li-text)' }}>
            Nearby cities in {city.state}
          </p>
          <div className="flex flex-wrap gap-2">
            {nearby.map(c => (
              <Link
                key={c.slug}
                href={`/${c.slug}`}
                className="text-xs px-3 py-1.5 rounded-full border transition-colors hover:border-orange-400 hover:text-orange-500"
                style={{ borderColor: 'var(--li-border)', color: 'var(--li-muted)' }}
              >
                {c.name}
              </Link>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
