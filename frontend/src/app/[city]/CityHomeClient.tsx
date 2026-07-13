'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  SearchX, Tag, UtensilsCrossed, Building2, Briefcase, Car,
  Smartphone, CalendarDays, Store, GraduationCap, Plus, AlertTriangle,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import Link from 'next/link';
import { api } from '@/lib/api';
import type { City, Listing } from '@/lib/types';
import { usePrefs } from '@/context/PrefsContext';
import SiteHeader from '@/components/site-header/SiteHeader';
import SiteFooter from '@/components/site-footer/SiteFooter';
import AdBanner from '@/components/ad-banner/AdBanner';
import ListingCard from '@/components/listing-card/ListingCard';
import ListingCardSkeleton from '@/components/listing-card/ListingCardSkeleton';
import EmptyState from '@/components/empty-state/EmptyState';
import BuyerRequestsSection from '@/components/buyer-requests/BuyerRequestsSection';

interface CatDef { label: string; slug: string; icon: LucideIcon }

interface CityHomeClientProps {
  initialCity?: City | null;
  initialTodayCount?: number;
  initialTrending?: Listing[];
  initialFresh?: Listing[];
}

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'morning';
  if (h < 17) return 'afternoon';
  return 'evening';
}

/** Horizontal-scroll listing row. Hides itself if fewer than 3 items. */
function HRow({
  title, viewAllHref, items, citySlug, loading,
}: {
  title: string;
  viewAllHref?: string;
  items: Listing[];
  citySlug: string;
  loading?: boolean;
}) {
  if (!loading && items.length < 3) return null;
  return (
    <section>
      <div className="flex items-center justify-between mb-3">
        <h2 className="section-title">{title}</h2>
        {viewAllHref && !loading && (
          <Link
            href={viewAllHref}
            className="text-sm font-semibold transition-colors hover:underline"
            style={{ color: 'var(--li-primary)' }}
          >
            View all →
          </Link>
        )}
      </div>
      <div className="flex gap-3 overflow-x-auto pb-3 scrollbar-none -mx-4 px-4">
        {loading
          ? Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="shrink-0 w-52"><ListingCardSkeleton /></div>
            ))
          : items.map(l => (
              <div key={l.id} className="shrink-0 w-52">
                <ListingCard listing={l} citySlug={citySlug} />
              </div>
            ))}
      </div>
    </section>
  );
}

export default function CityHomeClient({
  initialCity = null,
  initialTodayCount,
  initialTrending = [],
  initialFresh = [],
}: CityHomeClientProps) {
  const params = useParams();
  const citySlug = params.city as string;
  const router = useRouter();
  const { t } = usePrefs();

  const CATEGORIES: CatDef[] = [
    { label: t('categories.all'),         slug: '',            icon: Tag },
    { label: t('categories.tiffin'),      slug: 'tiffin',      icon: UtensilsCrossed },
    { label: t('categories.pgRooms'),     slug: 'pg-roommate', icon: Building2 },
    { label: t('categories.jobs'),        slug: 'jobs',        icon: Briefcase },
    { label: t('categories.vehicles'),    slug: 'vehicles',    icon: Car },
    { label: t('categories.electronics'), slug: 'electronics', icon: Smartphone },
    { label: t('categories.events'),      slug: 'events',      icon: CalendarDays },
    { label: t('categories.businesses'),  slug: 'businesses',  icon: Store },
    { label: t('categories.education'),   slug: 'education',   icon: GraduationCap },
  ];

  const [city, setCity] = useState<City | null>(initialCity);
  const [loading, setLoading] = useState(!initialCity);
  const [loadError, setLoadError] = useState(false);
  const [retryKey, setRetryKey] = useState(0);
  const [todayCount, setTodayCount] = useState<number | null>(initialTodayCount ?? null);
  const [trendingListings, setTrendingListings] = useState<Listing[]>(initialTrending);
  const [freshListings, setFreshListings] = useState<Listing[]>(initialFresh);
  const [recentlyViewed, setRecentlyViewed] = useState<Listing[]>([]);
  const [user, setUser] = useState<{ name?: string } | null>(null);
  // Time-of-day text (greeting, section heading) depends on the reader's clock —
  // the server/ISR-cached render and the client hydration pass rarely share the
  // same hour, so it must only be computed after mount, never during SSR.
  const [mounted, setMounted] = useState(false);

  // Load user + recently-viewed from localStorage (client-side only)
  useEffect(() => {
    setMounted(true);
    try {
      const raw = localStorage.getItem('user');
      if (raw) setUser(JSON.parse(raw));
    } catch {}
    try {
      const rv: Listing[] = JSON.parse(localStorage.getItem('li_rv') ?? '[]');
      setRecentlyViewed(rv.slice(0, 10));
    } catch {}
  }, []);

  useEffect(() => {
    setLoadError(false);
    setLoading(true);
    async function load() {
      try {
        const [cityData, countData, trending, fresh] = await Promise.all([
          api.cities.get(citySlug),
          api.cities.todayCount(citySlug),
          api.cities.trending(citySlug),
          api.cities.listings(citySlug, { status: 'active', sort: 'newest', page_size: '20' }),
        ]);
        setCity(cityData);
        setTodayCount(countData.count);
        setTrendingListings(trending);
        setFreshListings(fresh);
      } catch {
        setLoadError(true);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [citySlug, retryKey]);

  const handleCategoryClick = (slug: string) => {
    if (slug === 'events') { router.push(`/${citySlug}/events`); return; }
    if (slug === 'businesses') { router.push(`/${citySlug}/businesses`); return; }
    if (slug) router.push(`/${citySlug}/search?category=${slug}`);
    else router.push(`/${citySlug}/search`);
  };

  const firstName = user?.name?.split(' ')[0] ?? user?.name ?? '';

  if (loadError) {
    return (
      <div style={{ background: 'var(--li-page-bg)', minHeight: '100vh' }}>
        <SiteHeader citySlug={citySlug} />
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 px-4 text-center">
          <AlertTriangle size={28} className="text-amber-500" />
          <h2 className="text-lg font-bold text-slate-800">Could not load listings</h2>
          <p className="text-sm text-slate-500">The server took too long to respond. Please try again.</p>
          <button
            onClick={() => setRetryKey(k => k + 1)}
            className="px-6 py-2.5 rounded-xl font-semibold text-sm text-white"
            style={{ background: 'var(--li-primary)' }}
          >
            Retry
          </button>
          <button onClick={() => router.push('/')} className="text-sm text-slate-400 underline">
            Change city
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ background: 'var(--li-page-bg)', minHeight: '100vh' }}>
      <SiteHeader citySlug={citySlug} cityName={city?.name} />

      {/* ── CITY HERO ── */}
      <div
        className="pt-6 pb-5 border-b"
        style={{
          background: 'linear-gradient(135deg, #1A1A2E 0%, #16213E 100%)',
          borderColor: 'rgba(255,255,255,0.06)',
        }}
      >
        <div className="page-wrap">
          {loading ? (
            <div className="space-y-2">
              <div className="h-3 w-48 bg-white/15 rounded animate-pulse" />
              <div className="h-9 w-64 bg-white/15 rounded animate-pulse" />
              <div className="h-3 w-56 bg-white/15 rounded animate-pulse" />
            </div>
          ) : (
            <motion.div initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }}>
              {/* Greeting line */}
              <p className="text-sm font-medium mb-1" style={{ color: 'rgba(255,255,255,0.65)' }}>
                Good {mounted ? getGreeting() : 'day'}{firstName ? `, ${firstName}` : ''} 👋
                {' — '}
                {todayCount !== null && todayCount > 0
                  ? `${todayCount} new listing${todayCount > 1 ? 's' : ''} in ${city?.name} today`
                  : `explore what's happening in ${city?.name ?? citySlug}`}
              </p>
              <p className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: 'rgba(255,255,255,0.4)' }}>
                {city?.state}
              </p>
              <h1 className="text-3xl font-black text-white">
                Discover <span style={{ color: 'var(--li-primary)' }}>{city?.name}</span>
              </h1>
            </motion.div>
          )}
        </div>
      </div>

      <div className="page-wrap py-8 space-y-10">

        {/* ── ROW 1: Picked up where you left off (conditional) ── */}
        <AnimatePresence>
          {recentlyViewed.length >= 3 && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
              <HRow
                title="Picked up where you left off"
                viewAllHref={`/${citySlug}/search`}
                items={recentlyViewed}
                citySlug={citySlug}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── ROW 2: Trending near you ── */}
        <HRow
          title="Trending near you 🔥"
          viewAllHref={`/${citySlug}/search?sort=trending`}
          items={trendingListings}
          citySlug={citySlug}
          loading={loading}
        />

        {/* ── ROW 3: Fresh listings ── */}
        {(loading || freshListings.length >= 3) && (
          <section>
            <div className="flex items-center justify-between mb-3">
              <h2 className="section-title">
                {mounted
                  ? (() => {
                      const h = new Date().getHours();
                      return h < 12 ? 'New this morning ☀️' : h < 17 ? 'Posted today' : 'Fresh tonight 🌙';
                    })()
                  : 'Fresh listings'}
              </h2>
              {!loading && (
                <Link
                  href={`/${citySlug}/search?sort=newest`}
                  className="text-sm font-semibold hover:underline"
                  style={{ color: 'var(--li-primary)' }}
                >
                  View all →
                </Link>
              )}
            </div>
            <div className="flex gap-3 overflow-x-auto pb-3 scrollbar-none -mx-4 px-4">
              {loading
                ? Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="shrink-0 w-52"><ListingCardSkeleton /></div>
                  ))
                : freshListings.slice(0, 12).map(l => (
                    <div key={l.id} className="shrink-0 w-52">
                      <ListingCard listing={l} citySlug={citySlug} />
                    </div>
                  ))}
            </div>
          </section>
        )}

        {/* ── POST CTA BANNER ── */}
        {!loading && (
          <Link
            href={`/${citySlug}/classifieds/post`}
            className="flex items-center justify-between gap-4 px-5 py-4 rounded-2xl border-2 border-dashed transition-all hover:border-orange-400 hover:bg-orange-50 group"
            style={{ borderColor: 'var(--li-primary)', background: 'rgba(247,146,30,0.04)' }}
          >
            <div>
              <p className="font-bold text-sm" style={{ color: 'var(--li-primary)' }}>
                Sell, rent, or offer services in {city?.name ?? citySlug}?
              </p>
              <p className="text-xs text-slate-500 mt-0.5">Post a listing — it&apos;s free and takes 2 minutes</p>
            </div>
            <span className="shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold text-white group-hover:scale-105 transition-transform" style={{ background: 'var(--li-primary)' }}>
              <Plus className="w-3.5 h-3.5" strokeWidth={2.8} /> Post Listing
            </span>
          </Link>
        )}

        {/* ── ROW 4: Browse by category (horizontal scroll at bottom) ── */}
        <section>
          <h2 className="section-title mb-3">Browse by category</h2>
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none -mx-4 px-4">
            {CATEGORIES.filter(c => c.slug).map(cat => {
              const Icon = cat.icon;
              return (
                <button
                  key={cat.slug}
                  onClick={() => handleCategoryClick(cat.slug)}
                  className="shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-semibold border transition-all hover:border-orange-400 hover:text-orange-600 bg-white"
                  style={{ borderColor: 'var(--li-border)', color: 'var(--li-text)' }}
                >
                  <Icon className="w-3.5 h-3.5" strokeWidth={2} />
                  {cat.label}
                </button>
              );
            })}
          </div>
        </section>

        {/* Buyer requests — wanted section */}
        <BuyerRequestsSection citySlug={citySlug} />

        {/* Empty state — only if not loading and all rows empty */}
        {!loading && trendingListings.length === 0 && freshListings.length === 0 && (
          <EmptyState
            icon={SearchX}
            title={t('listing.noListings')}
            description={t('listing.beFirst')}
            action={{ label: t('listing.postListing'), href: `/${citySlug}/classifieds/post` }}
          />
        )}
      </div>

      <div className="page-wrap py-4">
        <AdBanner slot="7291834056" format="horizontal" className="rounded-2xl overflow-hidden" />
      </div>

      <SiteFooter />
    </div>
  );
}
