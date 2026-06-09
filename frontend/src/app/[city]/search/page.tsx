'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, SearchX, X, ChevronDown, ChevronUp, Tag, UtensilsCrossed, Building2, Briefcase, Car, Smartphone, CalendarDays, Store, GraduationCap } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { api } from '@/lib/api';
import type { Category, SearchResult } from '@/lib/types';
import SiteHeader from '@/components/site-header/SiteHeader';
import SiteFooter from '@/components/site-footer/SiteFooter';
import ListingCard from '@/components/listing-card/ListingCard';
import ListingCardSkeleton from '@/components/listing-card/ListingCardSkeleton';
import EmptyState from '@/components/empty-state/EmptyState';

const PAGE_SIZE = 12;
const CATEGORY_ICONS: Record<string, LucideIcon> = {
  tiffin: UtensilsCrossed, 'pg-roommate': Building2, jobs: Briefcase, vehicles: Car,
  electronics: Smartphone, events: CalendarDays, businesses: Store, education: GraduationCap,
};
const DATE_OPTIONS = [
  { label: 'Any time', value: '' },
  { label: 'Today', value: 'today' },
  { label: 'This week', value: 'week' },
  { label: 'This month', value: 'month' },
];

export default function SearchPage() {
  const { city: citySlug } = useParams<{ city: string }>();
  const searchParams = useSearchParams();
  const router = useRouter();

  const q = searchParams.get('q') ?? '';
  const catParam = searchParams.get('category') ?? '';
  const pageStr = searchParams.get('page') ?? '1';
  const page = parseInt(pageStr, 10) || 1;

  const [result, setResult] = useState<SearchResult | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  // sidebar filter state
  const [localCat, setLocalCat] = useState(catParam);
  const [priceMin, setPriceMin] = useState('');
  const [priceMax, setPriceMax] = useState('');
  const [dateRange, setDateRange] = useState('');
  const [catExpanded, setCatExpanded] = useState(true);
  const [priceExpanded, setPriceExpanded] = useState(true);
  const [dateExpanded, setDateExpanded] = useState(false);

  // live search box
  const [localQ, setLocalQ] = useState(q);

  const doSearch = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.search.query({
        q,
        city_slug: citySlug,
        category_id: catParam || undefined,
        page: String(page),
        page_size: String(PAGE_SIZE),
      });
      setResult(res);
    } finally {
      setLoading(false);
    }
  }, [q, citySlug, catParam, page]);

  useEffect(() => {
    api.categories.list().then(setCategories).catch(() => {});
  }, []);

  useEffect(() => {
    doSearch();
  }, [doSearch]);

  const applyCategory = (catId: string) => {
    setLocalCat(catId);
    const params = new URLSearchParams(searchParams.toString());
    if (catId) params.set('category', catId); else params.delete('category');
    params.set('page', '1');
    router.replace(`/${citySlug}/search?${params.toString()}`);
  };

  const applySearch = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams(searchParams.toString());
    if (localQ.trim()) params.set('q', localQ.trim()); else params.delete('q');
    params.set('page', '1');
    router.replace(`/${citySlug}/search?${params.toString()}`);
  };

  const clearAllFilters = () => {
    setLocalCat('');
    setPriceMin('');
    setPriceMax('');
    setDateRange('');
    const params = new URLSearchParams();
    if (q) params.set('q', q);
    router.replace(`/${citySlug}/search?${params.toString()}`);
  };

  const totalPages = result ? Math.ceil(result.total / PAGE_SIZE) : 1;
  const hasActiveFilters = localCat || priceMin || priceMax || dateRange;

  // Active chips
  const activeChips: { label: string; key: string }[] = [];
  if (localCat) {
    const cat = categories.find(c => c.id === localCat);
    if (cat) activeChips.push({ label: cat.name, key: 'cat' });
  }
  if (priceMin || priceMax) activeChips.push({ label: `₹${priceMin || '0'} – ₹${priceMax || '∞'}`, key: 'price' });
  if (dateRange) activeChips.push({ label: DATE_OPTIONS.find(d => d.value === dateRange)?.label ?? dateRange, key: 'date' });

  return (
    <div style={{ background: 'var(--li-page-bg)', minHeight: '100vh' }}>
      <SiteHeader citySlug={citySlug} cityName={citySlug.charAt(0).toUpperCase() + citySlug.slice(1)} />

      {/* Search bar strip */}
      <div className="bg-white border-b" style={{ borderColor: 'var(--li-border)' }}>
        <div className="page-wrap py-4">
          <form onSubmit={applySearch} className="flex items-center gap-4">
            <div
              className="flex items-center gap-3 flex-1 rounded-xl px-4 h-12 border transition-colors focus-within:border-orange-400"
              style={{ background: '#F3F4F6', borderColor: 'transparent' }}
            >
              <Search className="w-4 h-4 shrink-0" style={{ color: 'var(--li-muted)' }} />
              <input
                value={localQ}
                onChange={e => setLocalQ(e.target.value)}
                placeholder={`Search in ${citySlug.charAt(0).toUpperCase() + citySlug.slice(1)}...`}
                className="flex-1 bg-transparent text-sm outline-none"
                style={{ color: 'var(--li-text)' }}
              />
              {localQ && (
                <button type="button" onClick={() => setLocalQ('')}>
                  <X className="w-4 h-4" style={{ color: 'var(--li-muted)' }} />
                </button>
              )}
            </div>
            <button type="submit" className="cta-btn px-6 h-12 rounded-xl font-bold text-sm">
              Search
            </button>
          </form>

          {/* Result count + active chips */}
          <div className="flex items-center gap-2 mt-3 flex-wrap">
            {result && (
              <span className="text-sm font-medium" style={{ color: 'var(--li-muted)' }}>
                {result.total.toLocaleString('en-IN')} result{result.total !== 1 ? 's' : ''}{q ? ` for "${q}"` : ''}
              </span>
            )}
            <AnimatePresence>
              {activeChips.map(chip => (
                <motion.span
                  key={chip.key}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold"
                  style={{ background: 'var(--li-primary-light)', color: 'var(--li-primary)' }}
                >
                  {chip.label}
                  <button onClick={clearAllFilters}>
                    <X className="w-3 h-3" />
                  </button>
                </motion.span>
              ))}
            </AnimatePresence>
            {hasActiveFilters && (
              <button
                onClick={clearAllFilters}
                className="text-xs font-semibold underline transition-colors hover:text-orange-500"
                style={{ color: 'var(--li-muted)' }}
              >
                Clear all
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 2-column layout: sidebar + results */}
      <div className="page-wrap py-8 flex gap-8 items-start">

        {/* ── SIDEBAR FILTERS ── */}
        <aside className="w-64 shrink-0 space-y-4 sticky top-24">
          <div className="bg-white rounded-3xl border overflow-hidden" style={{ borderColor: 'var(--li-border)' }}>
            <div className="px-5 py-4 border-b flex items-center justify-between" style={{ borderColor: 'var(--li-border)' }}>
              <h2 className="font-bold text-sm" style={{ color: 'var(--li-text)' }}>Filters</h2>
              {hasActiveFilters && (
                <button
                  onClick={clearAllFilters}
                  className="text-xs font-semibold transition-colors hover:text-orange-500"
                  style={{ color: 'var(--li-primary)' }}
                >
                  Reset
                </button>
              )}
            </div>

            {/* Category filter */}
            <div className="border-b" style={{ borderColor: 'var(--li-border)' }}>
              <button
                onClick={() => setCatExpanded(e => !e)}
                className="w-full flex items-center justify-between px-5 py-3.5"
              >
                <span className="text-sm font-semibold" style={{ color: 'var(--li-text)' }}>Category</span>
                {catExpanded ? <ChevronUp className="w-4 h-4" style={{ color: 'var(--li-muted)' }} /> : <ChevronDown className="w-4 h-4" style={{ color: 'var(--li-muted)' }} />}
              </button>
              <AnimatePresence>
                {catExpanded && (
                  <motion.div
                    initial={{ height: 0 }}
                    animate={{ height: 'auto' }}
                    exit={{ height: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="px-4 pb-4 space-y-1">
                      <button
                        onClick={() => applyCategory('')}
                        className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium text-left transition-colors"
                        style={!localCat ? { background: 'var(--li-primary-light)', color: 'var(--li-primary)', fontWeight: 700 } : { color: 'var(--li-text)' }}
                      >
                        <Tag className="w-3.5 h-3.5 shrink-0" strokeWidth={2} />
                        All categories
                      </button>
                      {categories.map(cat => {
                        const Icon = CATEGORY_ICONS[cat.slug] ?? Tag;
                        return (
                          <button
                            key={cat.id}
                            onClick={() => applyCategory(cat.id)}
                            className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-sm text-left transition-colors"
                            style={localCat === cat.id ? { background: 'var(--li-primary-light)', color: 'var(--li-primary)', fontWeight: 700 } : { color: 'var(--li-text)' }}
                          >
                            <Icon className="w-3.5 h-3.5 shrink-0" strokeWidth={2} />
                            {cat.name}
                          </button>
                        );
                      })}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Price filter */}
            <div className="border-b" style={{ borderColor: 'var(--li-border)' }}>
              <button
                onClick={() => setPriceExpanded(e => !e)}
                className="w-full flex items-center justify-between px-5 py-3.5"
              >
                <span className="text-sm font-semibold" style={{ color: 'var(--li-text)' }}>Price Range</span>
                {priceExpanded ? <ChevronUp className="w-4 h-4" style={{ color: 'var(--li-muted)' }} /> : <ChevronDown className="w-4 h-4" style={{ color: 'var(--li-muted)' }} />}
              </button>
              <AnimatePresence>
                {priceExpanded && (
                  <motion.div
                    initial={{ height: 0 }}
                    animate={{ height: 'auto' }}
                    exit={{ height: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="px-4 pb-4 space-y-2">
                      <div className="flex gap-2">
                        <input
                          type="number"
                          placeholder="Min ₹"
                          value={priceMin}
                          onChange={e => setPriceMin(e.target.value)}
                          className="w-full border rounded-xl px-3 py-2 text-sm outline-none focus:border-orange-400"
                          style={{ borderColor: 'var(--li-border)', color: 'var(--li-text)' }}
                        />
                        <input
                          type="number"
                          placeholder="Max ₹"
                          value={priceMax}
                          onChange={e => setPriceMax(e.target.value)}
                          className="w-full border rounded-xl px-3 py-2 text-sm outline-none focus:border-orange-400"
                          style={{ borderColor: 'var(--li-border)', color: 'var(--li-text)' }}
                        />
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Date posted filter */}
            <div>
              <button
                onClick={() => setDateExpanded(e => !e)}
                className="w-full flex items-center justify-between px-5 py-3.5"
              >
                <span className="text-sm font-semibold" style={{ color: 'var(--li-text)' }}>Date Posted</span>
                {dateExpanded ? <ChevronUp className="w-4 h-4" style={{ color: 'var(--li-muted)' }} /> : <ChevronDown className="w-4 h-4" style={{ color: 'var(--li-muted)' }} />}
              </button>
              <AnimatePresence>
                {dateExpanded && (
                  <motion.div
                    initial={{ height: 0 }}
                    animate={{ height: 'auto' }}
                    exit={{ height: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="px-4 pb-4 space-y-1">
                      {DATE_OPTIONS.map(opt => (
                        <button
                          key={opt.value}
                          onClick={() => setDateRange(opt.value)}
                          className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-sm text-left transition-colors"
                          style={dateRange === opt.value ? { background: 'var(--li-primary-light)', color: 'var(--li-primary)', fontWeight: 700 } : { color: 'var(--li-text)' }}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </aside>

        {/* ── RESULTS GRID ── */}
        <div className="flex-1 min-w-0">
          {loading ? (
            <div className="grid grid-cols-3 gap-5">
              {Array.from({ length: 9 }).map((_, i) => <ListingCardSkeleton key={i} />)}
            </div>
          ) : result && result.items.length > 0 ? (
            <>
              <div className="grid grid-cols-3 gap-5">
                {result.items.map((l, i) => (
                  <motion.div
                    key={l.id}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: Math.min(i * 0.05, 0.25) }}
                  >
                    <ListingCard listing={l} citySlug={citySlug} />
                  </motion.div>
                ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 mt-10">
                  <button
                    disabled={page <= 1}
                    onClick={() => {
                      const p = new URLSearchParams(searchParams.toString());
                      p.set('page', String(page - 1));
                      router.replace(`/${citySlug}/search?${p.toString()}`);
                    }}
                    className="px-4 py-2 rounded-xl border text-sm font-medium transition-colors hover:border-orange-400 disabled:opacity-40 disabled:cursor-not-allowed"
                    style={{ borderColor: 'var(--li-border)', color: 'var(--li-text)' }}
                  >
                    ← Prev
                  </button>
                  {Array.from({ length: Math.min(totalPages, 7) }).map((_, i) => {
                    const pg = i + 1;
                    return (
                      <button
                        key={pg}
                        onClick={() => {
                          const p = new URLSearchParams(searchParams.toString());
                          p.set('page', String(pg));
                          router.replace(`/${citySlug}/search?${p.toString()}`);
                        }}
                        className="w-10 h-10 rounded-xl text-sm font-bold transition-all"
                        style={
                          pg === page
                            ? { background: 'var(--li-primary)', color: 'white' }
                            : { borderColor: 'var(--li-border)', color: 'var(--li-text)', border: '1px solid var(--li-border)' }
                        }
                      >
                        {pg}
                      </button>
                    );
                  })}
                  <button
                    disabled={page >= totalPages}
                    onClick={() => {
                      const p = new URLSearchParams(searchParams.toString());
                      p.set('page', String(page + 1));
                      router.replace(`/${citySlug}/search?${p.toString()}`);
                    }}
                    className="px-4 py-2 rounded-xl border text-sm font-medium transition-colors hover:border-orange-400 disabled:opacity-40 disabled:cursor-not-allowed"
                    style={{ borderColor: 'var(--li-border)', color: 'var(--li-text)' }}
                  >
                    Next →
                  </button>
                </div>
              )}
            </>
          ) : (
            <EmptyState
              icon={SearchX}
              title={q ? `No results for "${q}"` : 'No listings found'}
              description="Try different keywords or remove filters"
              action={{ label: 'Browse all listings', href: `/${citySlug}` }}
            />
          )}
        </div>
      </div>

      <SiteFooter />
    </div>
  );
}
