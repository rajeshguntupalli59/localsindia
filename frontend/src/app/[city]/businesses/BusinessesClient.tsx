'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { Store, Star, MapPin, Phone, Plus, BadgeCheck } from 'lucide-react';
import Link from 'next/link';
import { api } from '@/lib/api';
import type { Business, Category } from '@/lib/types';
import SiteHeader from '@/components/site-header/SiteHeader';
import SiteFooter from '@/components/site-footer/SiteFooter';
import OsmAttribution from '@/components/osm-attribution/OsmAttribution';
import RepresentativeLabel from '@/components/representative-label/RepresentativeLabel';
import { categoryCover } from '@/lib/categoryCover';
import Image from 'next/image';
import BottomNav from '@/components/bottom-nav/BottomNav';

const PAGE_SIZE = 20;

function BusinessCardSkeleton() {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-5 animate-pulse">
      <div className="h-5 bg-slate-200 rounded w-2/3 mb-2" />
      <div className="h-4 bg-slate-200 rounded w-1/2 mb-3" />
      <div className="h-4 bg-slate-200 rounded w-3/4" />
    </div>
  );
}

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map(i => (
        <Star
          key={i}
          className={`w-3.5 h-3.5 ${i <= Math.round(rating) ? 'fill-amber-400 text-amber-400' : 'text-slate-200'}`}
        />
      ))}
    </div>
  );
}

function BusinessCard({ business, citySlug }: { business: Business; citySlug: string }) {
  return (
    <motion.div
      whileHover={{ y: -2 }}
      className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm hover:shadow-md transition-shadow overflow-hidden"
    >
      {/* Own photo, or the labelled category cover */}
      <Link href={`/${citySlug}/businesses/${business.id}`} className="block relative h-36 -mx-5 -mt-5 mb-4 bg-slate-100">
        <Image
          src={business.images?.[0]?.url ?? categoryCover(business.category_slug)}
          alt={business.images?.[0] ? business.name : ''}
          fill
          className="object-cover"
          sizes="(max-width: 640px) 100vw, 50vw"
        />
        {!business.images?.[0] && <RepresentativeLabel className="bottom-2 left-2" />}
      </Link>
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-2">
          <h3 className="font-bold text-slate-900">{business.name}</h3>
          {business.verified && (
            <BadgeCheck className="w-4 h-4 text-blue-500 flex-shrink-0" />
          )}
        </div>
        {!business.owner_id && (
          <span className="shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">
            Unclaimed
          </span>
        )}
      </div>

      {business.review_count > 0 && !!business.avg_rating && (
        <div className="flex items-center gap-2 mb-2">
          <StarRating rating={business.avg_rating} />
          <span className="text-xs text-slate-500">
            {business.avg_rating.toFixed(1)} ({business.review_count})
          </span>
        </div>
      )}

      {business.address && (
        <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-2">
          <MapPin className="w-3 h-3 flex-shrink-0" />
          <span className="line-clamp-1">{business.address}</span>
        </div>
      )}

      {business.description && (
        <p className="text-sm text-slate-600 line-clamp-2 mb-4">{business.description}</p>
      )}

      <div className="flex gap-2 mt-auto">
        <Link
          href={`/${citySlug}/businesses/${business.id}`}
          className="flex-1 text-center text-sm font-semibold py-2 rounded-xl border-2 transition-colors"
          style={{ borderColor: 'var(--li-primary)', color: 'var(--li-primary)' }}
        >
          View Profile
        </Link>
        {business.whatsapp_url && (
          <a
            href={business.whatsapp_url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-sm font-semibold px-4 py-2 rounded-xl text-white"
            style={{ background: '#25D366' }}
          >
            <Phone className="w-3.5 h-3.5" />
            WhatsApp
          </a>
        )}
      </div>
    </motion.div>
  );
}

export default function BusinessesClient({
  initialBusinesses = [],
  initialCityName = '',
}: {
  /** First page (no filters), server-rendered so the HTML has real business links */
  initialBusinesses?: Business[];
  initialCityName?: string;
}) {
  const params = useParams();
  const citySlug = params.city as string;

  const [businesses, setBusinesses] = useState<Business[]>(initialBusinesses);
  const [loading, setLoading] = useState(initialBusinesses.length === 0);
  const [cityName, setCityName] = useState(initialCityName);
  // The unfiltered first page came from the server — don't refetch it on mount
  const skipFirstLoad = useRef(initialBusinesses.length > 0);
  const [categories, setCategories] = useState<Category[]>([]);
  // ?category=<slug> — set by the "View all" link on category pages
  const [category, setCategory] = useState<string | null>(null);
  const [q, setQ] = useState('');   // ?q= from a search page's "View all"
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  useEffect(() => {
    const sp = new URLSearchParams(window.location.search);
    setQ(sp.get('q') || '');
    setCategory(sp.get('category') || '');
    api.cities.get(citySlug).then(c => setCityName(c.name)).catch(() => {});
    api.categories.list().then(setCategories).catch(() => {});
  }, [citySlug]);

  const fetchPage = (pg: number) =>
    api.businesses.list(citySlug, {
      page: String(pg), page_size: String(PAGE_SIZE), ...(category ? { category_slug: category } : {}), ...(q ? { q } : {}),
    });

  // Reload from page 1 whenever the category changes
  useEffect(() => {
    if (category === null) return;   // wait until the URL has been read
    if (skipFirstLoad.current) {
      skipFirstLoad.current = false;
      if (!category && !q) { setHasMore(initialBusinesses.length === PAGE_SIZE); return; }
    }
    setLoading(true);
    fetchPage(1)
      .then(data => { setBusinesses(data); setPage(1); setHasMore(data.length === PAGE_SIZE); })
      .catch(() => setBusinesses([]))
      .finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [citySlug, category, q]);

  const loadMore = async () => {
    setLoadingMore(true);
    try {
      const data = await fetchPage(page + 1);
      setBusinesses(b => [...b, ...data]);
      setPage(page + 1);
      setHasMore(data.length === PAGE_SIZE);
    } finally {
      setLoadingMore(false);
    }
  };

  const syncUrl = (cat: string, query: string) => {
    const sp = new URLSearchParams({ ...(cat ? { category: cat } : {}), ...(query ? { q: query } : {}) }).toString();
    window.history.replaceState(null, '', sp ? `?${sp}` : window.location.pathname);
  };
  const pickCategory = (slug: string) => { setCategory(slug); syncUrl(slug, q); };
  const clearQuery = () => { setQ(''); syncUrl(category ?? '', ''); };

  // Every category except the listing-only "Classifieds"
  const chipCategories = categories.filter(c => c.slug !== 'classifieds');

  return (
    <div className="min-h-screen" style={{ background: 'var(--li-page-bg)' }}>
      <SiteHeader />

      <div className="page-wrap py-8 pb-24">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-black" style={{ color: 'var(--li-text)' }}>
              Businesses in {cityName || citySlug}
            </h1>
            {q ? (
              <p className="text-sm text-slate-500 mt-0.5">
                Matching &ldquo;{q}&rdquo; ·{' '}
                <button onClick={clearQuery} className="font-semibold underline" style={{ color: 'var(--li-primary)' }}>
                  Show all
                </button>
              </p>
            ) : (
              <p className="text-sm text-slate-500 mt-0.5">Find trusted local businesses</p>
            )}
          </div>
          <Link
            href={`/${citySlug}/businesses/add`}
            className="flex items-center gap-1.5 text-sm font-semibold px-4 py-2 rounded-xl text-white"
            style={{ background: 'var(--li-primary)' }}
          >
            <Plus className="w-4 h-4" />
            Add Business
          </Link>
        </div>

        {/* Category chips */}
        {chipCategories.length > 0 && (
          <div className="flex gap-2 overflow-x-auto scrollbar-none pb-2 mb-5 -mx-4 px-4">
            {[{ slug: '', name: 'All' }, ...chipCategories].map(c => (
              <button
                key={c.slug || 'all'}
                onClick={() => pickCategory(c.slug)}
                className={`shrink-0 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                  (category ?? '') === c.slug ? 'text-white' : 'bg-white border text-slate-600 hover:border-orange-300'
                }`}
                style={(category ?? '') === c.slug ? { background: 'var(--li-primary)' } : { borderColor: 'var(--li-border)' }}
              >
                {c.name}
              </button>
            ))}
          </div>
        )}

        {loading ? (
          <div className="grid gap-4 sm:grid-cols-2">
            {[...Array(4)].map((_, i) => <BusinessCardSkeleton key={i} />)}
          </div>
        ) : businesses.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Store className="w-12 h-12 text-slate-300 mb-4" />
            <h3 className="text-lg font-bold text-slate-700">No businesses listed yet</h3>
            <p className="text-sm text-slate-500 mt-1 mb-6">Add your business to reach local customers!</p>
            <Link
              href={`/${citySlug}/businesses/add`}
              className="text-sm font-semibold px-5 py-2.5 rounded-xl text-white"
              style={{ background: 'var(--li-primary)' }}
            >
              Add Your Business →
            </Link>
          </div>
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-2">
              {businesses.map(biz => (
                <BusinessCard key={biz.id} business={biz} citySlug={citySlug} />
              ))}
            </div>
            {hasMore && (
              <div className="flex justify-center mt-6">
                <button
                  onClick={loadMore}
                  disabled={loadingMore}
                  className="px-6 py-2.5 rounded-xl border text-sm font-semibold hover:border-orange-400 disabled:opacity-50"
                  style={{ borderColor: 'var(--li-border)', color: 'var(--li-text)' }}
                >
                  {loadingMore ? 'Loading…' : 'Load more'}
                </button>
              </div>
            )}
            {businesses.some(b => b.source === 'osm') && <OsmAttribution className="mt-6 text-center" />}
          </>
        )}
      </div>

      <SiteFooter />
      <BottomNav citySlug={citySlug} />
    </div>
  );
}
