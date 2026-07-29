'use client';

import { Suspense, useEffect, useState, useCallback } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, SearchX, X, ChevronDown, ChevronUp, Tag, UtensilsCrossed, Building2, Briefcase, Car, Smartphone, CalendarDays, Store, GraduationCap, SlidersHorizontal, Bookmark } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { toast } from 'sonner';
import { api, ApiError } from '@/lib/api';
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

function SearchInner() {
  const { city: citySlug } = useParams<{ city: string }>();
  const searchParams = useSearchParams();
  const router = useRouter();

  const q = searchParams.get('q') ?? '';
  const catParam = searchParams.get('category') ?? '';
  const sortParam = searchParams.get('sort') ?? 'newest';
  const pageStr = searchParams.get('page') ?? '1';
  const page = parseInt(pageStr, 10) || 1;

  const [result, setResult] = useState<SearchResult | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  // sidebar filter state
  const [localCat, setLocalCat] = useState(catParam);
  const [sortBy, setSortBy] = useState(sortParam);
  const [priceMin, setPriceMin] = useState('');
  const [priceMax, setPriceMax] = useState('');
  const [dateRange, setDateRange] = useState('');
  const [catExpanded, setCatExpanded] = useState(true);
  const [priceExpanded, setPriceExpanded] = useState(true);
  const [dateExpanded, setDateExpanded] = useState(false);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [savingSearch, setSavingSearch] = useState(false);

  // live search box
  const [localQ, setLocalQ] = useState(q);

  const isUUID = (s: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);

  // Resolve catParam slug → UUID once categories load so tabs highlight correctly
  useEffect(() => {
    if (catParam && !isUUID(catParam) && categories.length > 0) {
      const match = categories.find(c =>
        c.slug === catParam ||
        c.name.toLowerCase().replace(/[\s/]+/g, '-') === catParam
      );
      if (match) setLocalCat(match.id);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categories, catParam]);

  const doSearch = useCallback(async () => {
    setLoading(true);
    try {
      if (!q.trim()) {
        // Browse mode — no query. Use city listings endpoint (supports category_slug + category_id).
        const params: Record<string, string> = { status: 'active', sort: sortBy };
        if (catParam) {
          if (isUUID(catParam)) params.category_id = catParam;
          else params.category_slug = catParam;
        }
        const items = await api.cities.listings(citySlug, params);
        setResult({ items, total: items.length, page: 1, page_size: items.length });
      } else {
        const res = await api.search.query({
          q,
          city_slug: citySlug,
          category_id: catParam || undefined,
          page: String(page),
          page_size: String(PAGE_SIZE),
          sort: sortBy,
        });
        setResult(res);
      }
    } catch {
      setResult(null);
    } finally {
      setLoading(false);
    }
  }, [q, citySlug, catParam, page, sortBy]);

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

  const applySort = (sort: string) => {
    setSortBy(sort);
    const params = new URLSearchParams(searchParams.toString());
    if (sort && sort !== 'newest') params.set('sort', sort); else params.delete('sort');
    params.set('page', '1');
    router.replace(`/${citySlug}/search?${params.toString()}`);
  };

  const clearAllFilters = () => {
    setLocalCat('');
    setPriceMin('');
    setPriceMax('');
    setDateRange('');
    setSortBy('newest');
    const params = new URLSearchParams();
    if (q) params.set('q', q);
    router.replace(`/${citySlug}/search?${params.toString()}`);
  };

  const clearFilter = (key: string) => {
    if (key === 'cat') { applyCategory(''); return; }
    if (key === 'price') { setPriceMin(''); setPriceMax(''); return; }
    if (key === 'date') { setDateRange(''); return; }
  };

  const filteredItems = result?.items.filter(l => {
    if (priceMin && (l.price == null || l.price < parseFloat(priceMin))) return false;
    if (priceMax && (l.price == null || l.price > parseFloat(priceMax))) return false;
    if (dateRange) {
      const days = dateRange === 'today' ? 1 : dateRange === 'week' ? 7 : 30;
      const cutoff = new Date(Date.now() - days * 86400000);
      if (new Date(l.created_at) < cutoff) return false;
    }
    return true;
  }) ?? [];

  const totalPages = result ? Math.ceil(result.total / PAGE_SIZE) : 1;
  const hasActiveFilters = localCat || priceMin || priceMax || dateRange;

  const activeCategorySlug = categories.find(c => c.id === localCat)?.slug
    ?? (catParam && !isUUID(catParam) ? catParam : undefined);
  const canSaveSearch = !!q.trim() || !!activeCategorySlug;

  const saveSearch = async () => {
    const token = localStorage.getItem('access_token');
    if (!token) { router.push('/auth/login'); return; }
    setSavingSearch(true);
    try {
      await api.savedSearches.create(
        { city_slug: citySlug, query_text: q.trim() || undefined, category_slug: activeCategorySlug },
        token,
      );
      toast.success('Search saved — find it under Profile → Saved Searches');
    } catch (e) {
      if (e instanceof ApiError && e.status === 409) toast('Already saved this search');
      else toast.error('Could not save this search');
    } finally {
      setSavingSearch(false);
    }
  };

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
                <button type="button" onClick={() => setLocalQ('')} aria-label="Clear search">
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
                  <button onClick={() => clearFilter(chip.key)} aria-label={`Remove ${chip.label} filter`}>
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
            {canSaveSearch && (
              <button
                onClick={saveSearch}
                disabled={savingSearch}
                className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border transition-colors hover:border-orange-400 disabled:opacity-50 ml-auto"
                style={{ borderColor: 'var(--li-border)', color: 'var(--li-primary)' }}
              >
                <Bookmark className="w-3.5 h-3.5" />
                Save search
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 2-column layout: sidebar + results */}
      <div className="page-wrap py-6 md:py-8 md:flex md:gap-8 md:items-start">

        {/* ── SIDEBAR FILTERS (desktop only) ── */}
        <aside className="hidden md:block w-64 shrink-0 space-y-4 sticky top-24">
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
                aria-expanded={catExpanded}
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
                        role="tab"
                        onClick={() => applyCategory('')}
                        aria-selected={!localCat && !catParam}
                        className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium text-left transition-colors"
                        style={!localCat ? { background: 'var(--li-primary-light)', color: 'var(--li-primary)', fontWeight: 700 } : { color: 'var(--li-text)' }}
                      >
                        <Tag className="w-3.5 h-3.5 shrink-0" strokeWidth={2} />
                        All categories
                      </button>
                      {categories.map(cat => {
                        const Icon = CATEGORY_ICONS[cat.slug] ?? Tag;
                        const isActive = localCat === cat.id || (!localCat && catParam === cat.slug);
                        return (
                          <button
                            key={cat.id}
                            role="tab"
                            onClick={() => applyCategory(cat.id)}
                            aria-selected={isActive}
                            className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-sm text-left transition-colors"
                            style={isActive ? { background: 'var(--li-primary-light)', color: 'var(--li-primary)', fontWeight: 700 } : { color: 'var(--li-text)' }}
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
                aria-expanded={priceExpanded}
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
                aria-expanded={dateExpanded}
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

          {/* ── MOBILE FILTERS (hidden on md+) ── */}
          <div className="md:hidden mb-4 space-y-3">
            {/* Category chips horizontal scroll */}
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none -mx-4 px-4">
              <button
                role="tab"
                onClick={() => applyCategory('')}
                aria-selected={!localCat && !catParam}
                className="shrink-0 px-3.5 py-1.5 rounded-full text-xs font-semibold border transition-colors"
                style={!localCat ? { background: 'var(--li-primary)', color: 'white', borderColor: 'var(--li-primary)' } : { borderColor: 'var(--li-border)', color: 'var(--li-text)' }}
              >
                All
              </button>
              {categories.map(cat => {
                const isActive = localCat === cat.id || (!localCat && catParam === cat.slug);
                return (
                  <button
                    key={cat.id}
                    role="tab"
                    onClick={() => applyCategory(cat.id)}
                    aria-selected={isActive}
                    className="shrink-0 px-3.5 py-1.5 rounded-full text-xs font-semibold border transition-colors"
                    style={isActive ? { background: 'var(--li-primary)', color: 'white', borderColor: 'var(--li-primary)' } : { borderColor: 'var(--li-border)', color: 'var(--li-text)' }}
                  >
                    {cat.name}
                  </button>
                );
              })}
            </div>

            {/* More filters toggle */}
            <button
              onClick={() => setMobileFiltersOpen(f => !f)}
              className="flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-semibold transition-colors"
              style={{ borderColor: 'var(--li-border)', color: 'var(--li-text)' }}
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              More filters
              {(priceMin || priceMax || dateRange) && (
                <span className="w-4 h-4 rounded-full bg-orange-500 text-white text-[10px] flex items-center justify-center">
                  {[priceMin || priceMax ? 1 : 0, dateRange ? 1 : 0].filter(n => n > 0).length}
                </span>
              )}
            </button>

            <AnimatePresence>
              {mobileFiltersOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="bg-white rounded-2xl border p-4 space-y-3" style={{ borderColor: 'var(--li-border)' }}>
                    <div>
                      <p className="text-xs font-bold mb-2" style={{ color: 'var(--li-text)' }}>Price Range (₹)</p>
                      <div className="flex gap-2">
                        <input
                          type="number"
                          placeholder="Min"
                          value={priceMin}
                          onChange={e => setPriceMin(e.target.value)}
                          className="flex-1 px-3 py-2 rounded-xl border text-sm bg-gray-50 outline-none focus:border-orange-400"
                          style={{ borderColor: 'var(--li-border)' }}
                        />
                        <input
                          type="number"
                          placeholder="Max"
                          value={priceMax}
                          onChange={e => setPriceMax(e.target.value)}
                          className="flex-1 px-3 py-2 rounded-xl border text-sm bg-gray-50 outline-none focus:border-orange-400"
                          style={{ borderColor: 'var(--li-border)' }}
                        />
                      </div>
                    </div>
                    <div>
                      <p className="text-xs font-bold mb-2" style={{ color: 'var(--li-text)' }}>Posted</p>
                      <div className="flex flex-wrap gap-2">
                        {DATE_OPTIONS.map(opt => (
                          <button
                            key={opt.value}
                            onClick={() => setDateRange(opt.value)}
                            className="px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors"
                            style={dateRange === opt.value ? { background: 'var(--li-primary)', color: 'white', borderColor: 'var(--li-primary)' } : { borderColor: 'var(--li-border)', color: 'var(--li-text)' }}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    </div>
                    {hasActiveFilters && (
                      <button
                        onClick={() => { clearAllFilters(); setMobileFiltersOpen(false); }}
                        className="text-xs font-semibold underline"
                        style={{ color: 'var(--li-primary)' }}
                      >
                        Clear all filters
                      </button>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Sort bar — always visible */}
          <div className="flex items-center gap-2 mb-4">
            <SlidersHorizontal className="w-3.5 h-3.5 shrink-0" style={{ color: 'var(--li-muted)' }} strokeWidth={2} />
            <select
              value={sortBy}
              onChange={e => applySort(e.target.value)}
              aria-label="Sort order"
              className="text-xs font-semibold border rounded-xl px-3 py-1.5 outline-none focus:border-orange-400 bg-white"
              style={{ borderColor: 'var(--li-border)', color: 'var(--li-text)' }}
            >
              <option value="newest">Newest first</option>
              <option value="price_asc">Price: low to high</option>
              <option value="price_desc">Price: high to low</option>
            </select>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 md:gap-5">
              {Array.from({ length: 9 }).map((_, i) => <ListingCardSkeleton key={i} />)}
            </div>
          ) : result && filteredItems.length > 0 ? (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 md:gap-5">
                {filteredItems.map((l, i) => (
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
              title={q ? `No results for "${q}"` : catParam ? 'No listings in this category yet' : 'No listings yet'}
              description={q ? 'Try different keywords or remove filters' : 'Be the first to post in this city!'}
              action={{ label: q ? 'Browse all listings' : 'Post Listing', href: q ? `/${citySlug}` : `/${citySlug}/classifieds/post` }}
            />
          )}
        </div>
      </div>

      <SiteFooter />
    </div>
  );
}

export default function SearchPage() {
  return <Suspense fallback={null}><SearchInner /></Suspense>;
}
