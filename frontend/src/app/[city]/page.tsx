'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { SearchX, SlidersHorizontal, ChevronDown, Tag, UtensilsCrossed, Building2, Briefcase, Car, Smartphone, CalendarDays, Store, GraduationCap, Star } from 'lucide-react';
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

interface CatDef { label: string; slug: string; icon: LucideIcon }

export default function CityHomePage() {
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

  const SORT_OPTIONS = [
    { label: t('sort.newest'),       value: 'newest' },
    { label: t('sort.priceAsc'),     value: 'price_asc' },
    { label: t('sort.priceDesc'),    value: 'price_desc' },
    { label: t('sort.featuredFirst'),value: 'featured' },
  ];

  const [city, setCity] = useState<City | null>(null);
  const [featured, setFeatured] = useState<Listing[]>([]);
  const [latest, setLatest] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('');
  const [sortBy, setSortBy] = useState('newest');
  const [showSortMenu, setShowSortMenu] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const [cityData, listings] = await Promise.all([
          api.cities.get(citySlug),
          api.cities.listings(citySlug, { status: 'active' }),
        ]);
        setCity(cityData);
        setFeatured(listings.filter(l => l.is_featured).slice(0, 3));
        setLatest(listings.filter(l => !l.is_featured).slice(0, 24));
      } catch {
        router.replace('/');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [citySlug, router]);

  const handleCategoryClick = (slug: string) => {
    setActiveCategory(slug);
    if (slug === 'events') { router.push(`/${citySlug}/events`); return; }
    if (slug === 'businesses') { router.push(`/${citySlug}/businesses`); return; }
    if (slug) router.push(`/${citySlug}/search?category=${slug}`);
  };

  const sortedLatest = [...latest].sort((a, b) => {
    if (sortBy === 'price_asc') return (a.price ?? 0) - (b.price ?? 0);
    if (sortBy === 'price_desc') return (b.price ?? 0) - (a.price ?? 0);
    if (sortBy === 'featured') return (b.is_featured ? 1 : 0) - (a.is_featured ? 1 : 0);
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  const activeSortLabel = SORT_OPTIONS.find(o => o.value === sortBy)?.label ?? 'Newest First';

  return (
    <div style={{ background: 'var(--li-page-bg)', minHeight: '100vh' }}>
      <SiteHeader citySlug={citySlug} cityName={city?.name} />

      {/* ── CITY HERO BANNER ── */}
      <div
        className="pt-6 pb-5 border-b"
        style={{
          background: 'linear-gradient(135deg, #1A1A2E 0%, #16213E 100%)',
          borderColor: 'rgba(255,255,255,0.06)',
        }}
      >
        <div className="page-wrap">
          <div>
            {loading ? (
              <div className="space-y-2">
                <div className="h-3 w-24 bg-white/15 rounded animate-pulse" />
                <div className="h-9 w-64 bg-white/15 rounded animate-pulse" />
              </div>
            ) : (
              <motion.div initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }}>
                <p className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: 'rgba(255,255,255,0.4)' }}>
                  {city?.state}
                </p>
                <h1 className="text-3xl font-black text-white">
                  {t('city2.discover')} <span style={{ color: 'var(--li-primary)' }}>{city?.name}</span>
                </h1>
                <p className="text-sm mt-1" style={{ color: 'rgba(255,255,255,0.45)' }}>
                  {t('city2.activeListings', { count: String(latest.length + featured.length) })}
                </p>
              </motion.div>
            )}
          </div>

          {/* Category pill strip */}
          <div className="flex gap-2 mt-4 flex-wrap">
            {CATEGORIES.map(cat => {
              const Icon = cat.icon;
              return (
                <button
                  key={cat.slug}
                  onClick={() => handleCategoryClick(cat.slug)}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold transition-all"
                  style={
                    activeCategory === cat.slug
                      ? { background: 'var(--li-primary)', color: 'white' }
                      : { background: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.7)', border: '1px solid rgba(255,255,255,0.15)' }
                  }
                >
                  <Icon className="w-3.5 h-3.5" strokeWidth={2} />
                  {cat.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="page-wrap py-8 space-y-10">

        {/* ── FEATURED SECTION ── */}
        <AnimatePresence>
          {(loading || featured.length > 0) && (
            <motion.section
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35 }}
            >
              <div className="flex items-center justify-between mb-5">
                <h2 className="section-title flex items-center gap-2">
                  <Star className="w-4 h-4 fill-current" style={{ color: 'var(--li-featured)' }} strokeWidth={0} />
                  {t('city2.featuredListings')}
                </h2>
                <Link
                  href={`/${citySlug}/search?featured=true`}
                  className="text-sm font-semibold transition-colors hover:underline"
                  style={{ color: 'var(--li-primary)' }}
                >
                  {t('listing.viewAll')}
                </Link>
              </div>

              <div className="grid grid-cols-3 gap-5">
                {loading
                  ? Array.from({ length: 3 }).map((_, i) => <ListingCardSkeleton key={i} />)
                  : featured.map((l, i) => (
                      <motion.div
                        key={l.id}
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.07 }}
                      >
                        <ListingCard listing={l} citySlug={citySlug} />
                      </motion.div>
                    ))}
              </div>
            </motion.section>
          )}
        </AnimatePresence>

        {/* ── LATEST LISTINGS ── */}
        <section>
          <div className="flex items-center justify-between mb-5">
            <h2 className="section-title">{t('city2.latestListings')}</h2>

            {/* Sort dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowSortMenu(!showSortMenu)}
                className="flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-medium transition-colors hover:border-orange-400"
                style={{ borderColor: 'var(--li-border)', color: 'var(--li-text)', background: 'white' }}
              >
                <SlidersHorizontal className="w-3.5 h-3.5" style={{ color: 'var(--li-muted)' }} />
                {activeSortLabel}
                <ChevronDown className="w-3.5 h-3.5" style={{ color: 'var(--li-muted)' }} />
              </button>

              <AnimatePresence>
                {showSortMenu && (
                  <motion.div
                    initial={{ opacity: 0, y: -4, scale: 0.97 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -4, scale: 0.97 }}
                    transition={{ duration: 0.12 }}
                    className="absolute right-0 top-full mt-2 z-20 bg-white rounded-2xl shadow-xl border overflow-hidden min-w-[200px]"
                    style={{ borderColor: 'var(--li-border)' }}
                  >
                    {SORT_OPTIONS.map(opt => (
                      <button
                        key={opt.value}
                        onClick={() => { setSortBy(opt.value); setShowSortMenu(false); }}
                        className="w-full text-left px-4 py-3 text-sm transition-colors hover:bg-orange-50"
                        style={{
                          color: sortBy === opt.value ? 'var(--li-primary)' : 'var(--li-text)',
                          fontWeight: sortBy === opt.value ? 700 : 400,
                        }}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {loading ? (
            <div className="grid grid-cols-4 gap-5">
              {Array.from({ length: 8 }).map((_, i) => <ListingCardSkeleton key={i} />)}
            </div>
          ) : sortedLatest.length === 0 ? (
            <EmptyState
              icon={SearchX}
              title={t('listing.noListings')}
              description={t('listing.beFirst')}
              action={{ label: t('listing.postListing'), href: `/${citySlug}/classifieds/post` }}
            />
          ) : (
            <div className="grid grid-cols-4 gap-5">
              {sortedLatest.map((l, i) => (
                <motion.div
                  key={l.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(i * 0.04, 0.3) }}
                >
                  <ListingCard listing={l} citySlug={citySlug} />
                </motion.div>
              ))}
            </div>
          )}

          {/* Load more */}
          {sortedLatest.length >= 24 && (
            <div className="flex justify-center mt-8">
              <Link
                href={`/${citySlug}/search`}
                className="px-8 py-3 rounded-xl border-2 font-semibold text-sm transition-colors hover:border-orange-400 hover:text-orange-600"
                style={{ borderColor: 'var(--li-border)', color: 'var(--li-text)' }}
              >
                {t('listing.viewAllListings')}
              </Link>
            </div>
          )}
        </section>
      </div>

      {/* Ad banner above footer */}
      <div className="page-wrap py-4">
        <AdBanner slot="7291834056" format="horizontal" className="rounded-2xl overflow-hidden" />
      </div>

      <SiteFooter />
    </div>
  );
}
