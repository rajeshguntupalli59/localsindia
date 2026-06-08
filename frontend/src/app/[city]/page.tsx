'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Search, SearchX } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { api } from '@/lib/api';
import type { City, Listing } from '@/lib/types';
import ListingCard from '@/components/listing-card/ListingCard';
import ListingCardSkeleton from '@/components/listing-card/ListingCardSkeleton';
import EmptyState from '@/components/empty-state/EmptyState';
import BottomNav from '@/components/bottom-nav/BottomNav';
import LanguageSwitcher from '@/components/language-switcher/LanguageSwitcher';

const CATEGORIES = [
  { label: '🍱 Tiffin', slug: 'tiffin' },
  { label: '🏠 PG/Roommate', slug: 'pg-roommate' },
  { label: '💼 Jobs', slug: 'jobs' },
  { label: '🚗 Vehicles', slug: 'vehicles' },
  { label: '📱 Electronics', slug: 'electronics' },
  { label: '🎉 Events', slug: 'events' },
  { label: '🏪 Businesses', slug: 'businesses' },
];

export default function CityHomePage() {
  const params = useParams();
  const citySlug = params.city as string;
  const router = useRouter();

  const [city, setCity] = useState<City | null>(null);
  const [featured, setFeatured] = useState<Listing[]>([]);
  const [latest, setLatest] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');

  useEffect(() => {
    async function load() {
      try {
        const [cityData, listings] = await Promise.all([
          api.cities.get(citySlug),
          api.cities.listings(citySlug, { status: 'active' }),
        ]);
        setCity(cityData);
        setFeatured(listings.filter(l => l.is_featured));
        setLatest(listings.filter(l => !l.is_featured).slice(0, 20));
      } catch {
        router.replace('/');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [citySlug, router]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (q.trim()) router.push(`/${citySlug}/search?q=${encodeURIComponent(q.trim())}`);
  };

  return (
    <div className="min-h-screen pb-20" style={{ background: 'var(--li-page-bg)' }}>
      {/* Hero */}
      <div className="px-4 pt-10 pb-8" style={{ background: 'var(--li-nav-bg)' }}>
        <div className="flex items-start justify-between mb-4">
          <div>
            {loading ? (
              <div className="space-y-1">
                <div className="h-3 w-20 bg-white/20 rounded animate-pulse" />
                <div className="h-7 w-40 bg-white/20 rounded animate-pulse mt-1" />
              </div>
            ) : (
              <>
                <p className="text-white/60 text-xs uppercase tracking-widest">{city?.state}</p>
                <h1 className="text-2xl font-bold text-white">Discover {city?.name}</h1>
              </>
            )}
          </div>
          <LanguageSwitcher />
        </div>
        <form onSubmit={handleSearch} className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white/50 w-4 h-4" />
          <Input
            className="pl-10 bg-white/10 border-white/20 text-white placeholder:text-white/50 focus-visible:ring-white/30"
            placeholder="Search tiffin, PG, tutor..."
            value={q}
            onChange={e => setQ(e.target.value)}
          />
        </form>
      </div>

      {/* Category chips */}
      <div className="overflow-x-auto px-4 py-4 scrollbar-none">
        <div className="flex gap-2 min-w-max">
          {CATEGORIES.map(cat => (
            <button
              key={cat.slug}
              className="px-4 py-2 bg-white rounded-full border text-sm font-medium whitespace-nowrap hover:border-[var(--li-primary)] hover:text-[var(--li-primary)] transition-colors"
              onClick={() => router.push(`/${citySlug}/search?category=${cat.slug}`)}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 space-y-6">
        {/* Featured section */}
        {(loading || featured.length > 0) && (
          <section>
            <h2 className="text-lg font-semibold mb-3 flex items-center gap-1.5">
              <span style={{ color: 'var(--li-featured)' }}>★</span> Featured
            </h2>
            <div className="grid grid-cols-2 gap-3">
              {loading
                ? [...Array(2)].map((_, i) => <ListingCardSkeleton key={i} />)
                : featured.map(l => <ListingCard key={l.id} listing={l} citySlug={citySlug} />)}
            </div>
          </section>
        )}

        {/* Latest section */}
        <section>
          <h2 className="text-lg font-semibold mb-3">Latest</h2>
          {loading ? (
            <div className="grid grid-cols-2 gap-3">
              {[...Array(6)].map((_, i) => <ListingCardSkeleton key={i} />)}
            </div>
          ) : latest.length === 0 ? (
            <EmptyState
              icon={SearchX}
              title="No listings yet"
              description="Be the first to post in your city!"
              action={{ label: 'Post Free', href: `/${citySlug}/classifieds/post` }}
            />
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {latest.map(l => <ListingCard key={l.id} listing={l} citySlug={citySlug} />)}
            </div>
          )}
        </section>
      </div>

      <BottomNav citySlug={citySlug} />
    </div>
  );
}
