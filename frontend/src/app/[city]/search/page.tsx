'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import { SlidersHorizontal, SearchX, X } from 'lucide-react';
import { api } from '@/lib/api';
import type { Category, SearchResult } from '@/lib/types';
import ListingCard from '@/components/listing-card/ListingCard';
import ListingCardSkeleton from '@/components/listing-card/ListingCardSkeleton';
import EmptyState from '@/components/empty-state/EmptyState';

const PAGE_SIZE = 12;

export default function SearchPage() {
  const { city: citySlug } = useParams<{ city: string }>();
  const searchParams = useSearchParams();
  const router = useRouter();

  const q = searchParams.get('q') ?? '';
  const catId = searchParams.get('category') ?? '';
  const pageStr = searchParams.get('page') ?? '1';

  const [result, setResult] = useState<SearchResult | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);

  // local filter state
  const [localCat, setLocalCat] = useState(catId);
  const [priceMin, setPriceMin] = useState('');
  const [priceMax, setPriceMax] = useState('');

  const page = parseInt(pageStr, 10) || 1;

  const doSearch = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.search.query({
        q,
        city_slug: citySlug,
        category_id: localCat || undefined,
        page: String(page),
        page_size: String(PAGE_SIZE),
      });
      setResult(res);
    } finally {
      setLoading(false);
    }
  }, [q, citySlug, localCat, page]);

  useEffect(() => {
    api.categories.list().then(setCategories).catch(() => {});
    doSearch();
  }, [doSearch]);

  const applyFilters = () => {
    const params = new URLSearchParams(searchParams.toString());
    if (localCat) params.set('category', localCat); else params.delete('category');
    params.set('page', '1');
    router.replace(`/${citySlug}/search?${params.toString()}`);
    setShowFilters(false);
  };

  const clearFilters = () => {
    setLocalCat('');
    setPriceMin('');
    setPriceMax('');
    const params = new URLSearchParams();
    if (q) params.set('q', q);
    router.replace(`/${citySlug}/search?${params.toString()}`);
    setShowFilters(false);
  };

  const totalPages = result ? Math.ceil(result.total / PAGE_SIZE) : 1;

  return (
    <div className="min-h-screen pb-20" style={{ background: 'var(--li-page-bg)' }}>
      {/* Header */}
      <div className="sticky top-0 z-30 bg-white border-b px-4 py-3 flex items-center gap-3">
        <button onClick={() => router.back()} className="shrink-0 text-muted-foreground hover:text-foreground">
          <X className="w-5 h-5" />
        </button>
        <div className="flex-1 min-w-0">
          {q ? (
            <p className="font-semibold truncate">&quot;{q}&quot;</p>
          ) : (
            <p className="text-muted-foreground text-sm">All listings</p>
          )}
          {result && (
            <p className="text-xs text-muted-foreground">{result.total} results</p>
          )}
        </div>
        <button
          onClick={() => setShowFilters(true)}
          className="shrink-0 flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-full border"
        >
          <SlidersHorizontal className="w-4 h-4" /> Filters
          {(localCat || priceMin || priceMax) && (
            <span className="w-2 h-2 rounded-full bg-[var(--li-primary)]" />
          )}
        </button>
      </div>

      {/* Results */}
      <div className="p-4">
        {loading ? (
          <div className="grid grid-cols-2 gap-3">
            {Array.from({ length: 8 }).map((_, i) => <ListingCardSkeleton key={i} />)}
          </div>
        ) : result && result.items.length > 0 ? (
          <>
            <div className="grid grid-cols-2 gap-3">
              {result.items.map(l => (
                <ListingCard key={l.id} listing={l} citySlug={citySlug} />
              ))}
            </div>
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-6">
                <PageBtn
                  label="← Prev"
                  disabled={page <= 1}
                  onClick={() => {
                    const p = new URLSearchParams(searchParams.toString());
                    p.set('page', String(page - 1));
                    router.replace(`/${citySlug}/search?${p.toString()}`);
                  }}
                />
                <span className="text-sm text-muted-foreground px-2">
                  {page} / {totalPages}
                </span>
                <PageBtn
                  label="Next →"
                  disabled={page >= totalPages}
                  onClick={() => {
                    const p = new URLSearchParams(searchParams.toString());
                    p.set('page', String(page + 1));
                    router.replace(`/${citySlug}/search?${p.toString()}`);
                  }}
                />
              </div>
            )}
          </>
        ) : (
          <EmptyState
            icon={SearchX}
            title={q ? `No results for "${q}"` : 'No listings found'}
            description="Try different keywords or remove filters"
          />
        )}
      </div>

      {/* Filters sheet */}
      {showFilters && (
        <div className="fixed inset-0 z-50 flex items-end">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowFilters(false)} />
          <div className="relative w-full bg-white rounded-t-2xl p-5 pb-8 space-y-5 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold">Filters</h2>
              <button onClick={() => setShowFilters(false)}><X className="w-5 h-5" /></button>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium">Category</p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setLocalCat('')}
                  className={`py-2 px-3 rounded-lg border text-sm transition-colors ${!localCat ? 'border-[var(--li-primary)] bg-orange-50 text-[var(--li-primary)] font-semibold' : 'border-muted'}`}
                >
                  All
                </button>
                {categories.map(cat => (
                  <button
                    key={cat.id}
                    onClick={() => setLocalCat(cat.id)}
                    className={`py-2 px-3 rounded-lg border text-sm transition-colors text-left ${localCat === cat.id ? 'border-[var(--li-primary)] bg-orange-50 text-[var(--li-primary)] font-semibold' : 'border-muted'}`}
                  >
                    {cat.icon} {cat.name}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium">Price range</p>
              <div className="flex gap-2">
                <input
                  type="number"
                  placeholder="Min ₹"
                  value={priceMin}
                  onChange={e => setPriceMin(e.target.value)}
                  className="flex-1 border rounded-lg px-3 py-2 text-sm"
                />
                <input
                  type="number"
                  placeholder="Max ₹"
                  value={priceMax}
                  onChange={e => setPriceMax(e.target.value)}
                  className="flex-1 border rounded-lg px-3 py-2 text-sm"
                />
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={clearFilters}
                className="flex-1 py-2.5 rounded-xl border text-sm font-semibold"
              >
                Clear all
              </button>
              <button
                onClick={applyFilters}
                className="flex-1 py-2.5 rounded-xl text-white text-sm font-semibold"
                style={{ background: 'var(--li-primary)' }}
              >
                Apply
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function PageBtn({ label, disabled, onClick }: { label: string; disabled: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="px-4 py-2 rounded-lg border text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed hover:bg-muted transition-colors"
    >
      {label}
    </button>
  );
}
