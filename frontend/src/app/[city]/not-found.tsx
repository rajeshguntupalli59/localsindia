'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { SearchX, Utensils, Home, Briefcase, Car, Smartphone } from 'lucide-react';
import SiteHeader from '@/components/site-header/SiteHeader';
import SiteFooter from '@/components/site-footer/SiteFooter';

const POPULAR_CATEGORIES = [
  { label: 'Tiffin Services', slug: 'tiffin', icon: Utensils },
  { label: 'PG & Roommate', slug: 'pg-roommate', icon: Home },
  { label: 'Jobs', slug: 'jobs', icon: Briefcase },
  { label: 'Vehicles', slug: 'vehicles', icon: Car },
  { label: 'Electronics', slug: 'electronics', icon: Smartphone },
];

export default function CityNotFound() {
  const params = useParams();
  const citySlug = params.city as string;
  const cityName = citySlug ? citySlug.charAt(0).toUpperCase() + citySlug.slice(1) : '';

  return (
    <div style={{ background: 'var(--li-page-bg)', minHeight: '100vh' }}>
      <SiteHeader citySlug={citySlug} />

      <div className="flex flex-col items-center justify-center gap-4 px-4 py-16 text-center">
        <SearchX size={44} strokeWidth={1.5} style={{ color: 'var(--li-muted)' }} />
        <h1 className="text-2xl font-black" style={{ color: 'var(--li-text)' }}>
          Page not found
        </h1>
        <p className="text-sm max-w-sm" style={{ color: 'var(--li-muted)' }}>
          That page doesn&apos;t exist{cityName ? ` in ${cityName}` : ''}. Try one of these instead.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3 mt-2">
          <Link
            href={citySlug ? `/${citySlug}` : '/'}
            className="px-6 py-2.5 rounded-xl font-semibold text-sm text-white transition-opacity hover:opacity-90"
            style={{ background: 'var(--li-primary)' }}
          >
            Back to {cityName || 'Home'}
          </Link>
          <Link
            href={citySlug ? `/${citySlug}/search` : '/search'}
            className="px-6 py-2.5 rounded-xl font-semibold text-sm border transition-colors hover:border-orange-400 hover:text-orange-600"
            style={{ borderColor: 'var(--li-border)', color: 'var(--li-text)' }}
          >
            Browse listings
          </Link>
        </div>

        {citySlug && (
          <div className="flex flex-wrap items-center justify-center gap-2 mt-6 max-w-lg">
            {POPULAR_CATEGORIES.map(cat => {
              const Icon = cat.icon;
              return (
                <Link
                  key={cat.slug}
                  href={`/${citySlug}/${cat.slug}`}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-full text-sm font-semibold border transition-colors hover:border-orange-400 hover:text-orange-600 bg-white"
                  style={{ borderColor: 'var(--li-border)', color: 'var(--li-text)' }}
                >
                  <Icon size={14} /> {cat.label}
                </Link>
              );
            })}
          </div>
        )}
      </div>

      <SiteFooter />
    </div>
  );
}
