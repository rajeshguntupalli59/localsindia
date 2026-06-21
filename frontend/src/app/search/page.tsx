'use client';

import { Suspense, useEffect, useState, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Search, MapPin, ArrowLeft, X, SlidersHorizontal } from 'lucide-react';
import { api } from '@/lib/api';
import type { Listing, Category } from '@/lib/types';
import ListingCard from '@/components/listing-card/ListingCard';
import ListingCardSkeleton from '@/components/listing-card/ListingCardSkeleton';
import CityPickerModal from '@/components/city-picker/CityPickerModal';
import { usePrefs } from '@/context/PrefsContext';

const CITY_ALIASES: Record<string, string> = {
  bangalore: 'bengaluru', bombay: 'mumbai', madras: 'chennai',
  calcutta: 'kolkata', mysore: 'mysuru', mangalore: 'mangaluru',
  hubli: 'hubballi', trivandrum: 'thiruvananthapuram', calicut: 'kozhikode',
  trichur: 'thrissur', cochin: 'kochi', gauhati: 'guwahati',
};
function normaliseCity(city: string): string {
  const lc = city.toLowerCase().trim();
  return CITY_ALIASES[lc] ?? lc;
}

function SearchInner() {
  const router = useRouter();
  const sp = useSearchParams();
  const { citySlug: prefCity, cityName: prefCityName, setCity } = usePrefs();

  const q            = sp.get('q') ?? '';
  const rawCity      = sp.get('city') ?? prefCity ?? '';
  const cityParam    = normaliseCity(rawCity);
  const categorySlug = sp.get('category') ?? '';

  const [inputQ, setInputQ]         = useState(q);
  const [results, setResults]       = useState<Listing[]>([]);
  const [loading, setLoading]       = useState(false);
  const [cityName, setCityName]     = useState(prefCityName ?? '');
  const [categories, setCategories] = useState<Category[]>([]);
  const [showPicker, setShowPicker] = useState(false);

  // Filter state
  const [minPrice, setMinPrice]       = useState('');
  const [maxPrice, setMaxPrice]       = useState('');
  const [sortBy, setSortBy]           = useState('newest');
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [postedWithin, setPostedWithin] = useState('');

  const hasActiveFilters = !!(minPrice || maxPrice || postedWithin || verifiedOnly || sortBy !== 'newest');

  const clearFilters = () => {
    setMinPrice(''); setMaxPrice(''); setPostedWithin('');
    setVerifiedOnly(false); setSortBy('newest');
  };

  // Auto-open city picker on mount only if no city anywhere and no category active
  useEffect(() => {
    const urlCity = sp.get('city');
    const urlCat = sp.get('category');
    const savedCity = typeof window !== 'undefined' ? localStorage.getItem('li_city') : '';
    if (!urlCity && !savedCity && !urlCat) setShowPicker(true);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keep input in sync when URL q changes
  useEffect(() => { setInputQ(q); }, [q]);

  // Fetch category list once
  useEffect(() => { api.categories.list().then(setCategories).catch(() => {}); }, []);

  // Fetch city display name
  useEffect(() => {
    if (!cityParam) return;
    api.cities.get(cityParam).then(c => setCityName(c.name)).catch(() => {});
  }, [cityParam]);

  // Fetch listings whenever query params or filters change
  useEffect(() => {
    if (!cityParam) { setResults([]); return; }
    setLoading(true);

    const params: Record<string, string> = {};
    if (q) params.q = q;

    // Resolve category slug → id for API call
    if (categorySlug && categories.length > 0) {
      const cat = categories.find(c => c.slug === categorySlug || c.name.toLowerCase().replace(/[\s/]+/g, '-') === categorySlug);
      if (cat) params.category_id = cat.id;
    }

    if (minPrice) params.min_price = minPrice;
    if (maxPrice) params.max_price = maxPrice;
    if (sortBy !== 'newest') params.sort = sortBy;
    if (verifiedOnly) params.verified_only = 'true';
    if (postedWithin) params.within = postedWithin;

    api.cities.listings(cityParam, params)
      .then(data => setResults(data))
      .catch(() => setResults([]))
      .finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, cityParam, categorySlug, categories.length, minPrice, maxPrice, sortBy, verifiedOnly, postedWithin]);

  const navigate = useCallback((overrides: { q?: string; city?: string; category?: string }) => {
    const p = new URLSearchParams();
    const merged = { q, city: cityParam, category: categorySlug, ...overrides };
    if (merged.q?.trim()) p.set('q', merged.q.trim());
    if (merged.city) p.set('city', merged.city);
    if (merged.category) p.set('category', merged.category);
    router.push(`/search?${p.toString()}`);
  }, [q, cityParam, categorySlug, router]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!cityParam) { setShowPicker(true); return; }
    navigate({ q: inputQ });
  };

  const activeCat = categories.find(c => c.slug === categorySlug || c.name.toLowerCase().replace(/[\s/]+/g, '-') === categorySlug);

  return (
    <div className="min-h-screen" style={{ background: 'var(--li-page-bg)' }}>

      {/* ── Sticky header ── */}
      <div className="sticky top-0 z-40 bg-white border-b border-slate-200/70 shadow-sm">
        <div className="page-wrap h-16 flex items-center gap-3">

          <Link href="/" className="shrink-0 p-1 -ml-1 text-slate-400 hover:text-slate-700 transition-colors">
            <ArrowLeft className="w-5 h-5" strokeWidth={2} />
          </Link>

          {/* Search bar */}
          <form onSubmit={handleSearch} className="flex flex-1 items-center rounded-xl border border-slate-200 overflow-hidden bg-white focus-within:border-[#F7921E]/70 transition-colors">
            <input
              value={inputQ}
              onChange={e => setInputQ(e.target.value)}
              placeholder="Search listings…"
              className="flex-1 px-3 py-2 text-sm outline-none bg-transparent placeholder:text-slate-300"
            />
            {inputQ && (
              <button type="button" onClick={() => { setInputQ(''); navigate({ q: '' }); }}
                className="px-2 text-slate-300 hover:text-slate-500">
                <X className="w-3.5 h-3.5" strokeWidth={2} />
              </button>
            )}
            <button type="submit" className="px-3 text-[#F7921E] hover:text-[#E07B0A] transition-colors">
              <Search className="w-4 h-4" strokeWidth={2.5} />
            </button>
          </form>

          {/* City selector */}
          <button
            type="button"
            onClick={() => setShowPicker(true)}
            className="flex items-center gap-1.5 shrink-0 px-3 py-2 rounded-xl border border-slate-200
              text-sm font-medium text-slate-700
              hover:border-[#F7921E]/40 hover:text-[#F7921E] transition-all"
          >
            <MapPin className="w-3.5 h-3.5 text-[#F7921E] shrink-0" strokeWidth={2} />
            <span className="hidden sm:inline">{cityName || 'Select city'}</span>
          </button>
        </div>

        {/* Category pills */}
        {categories.length > 0 && (
          <div className="border-t border-slate-100">
            <div className="page-wrap">
              <div className="flex gap-2 py-2.5 overflow-x-auto scrollbar-none">
                <button
                  onClick={() => navigate({ category: '' })}
                  className={`flex-shrink-0 px-3.5 py-1.5 rounded-full text-[12px] font-semibold transition-all ${
                    !categorySlug ? 'bg-[#F7921E] text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  All
                </button>
                {categories.map(cat => (
                  <button
                    key={cat.id}
                    onClick={() => navigate({ category: cat.slug })}
                    className={`flex-shrink-0 px-3.5 py-1.5 rounded-full text-[12px] font-semibold transition-all ${
                      activeCat?.id === cat.id ? 'bg-[#F7921E] text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {cat.name}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Filter bar — always visible */}
        <div className="border-t border-slate-100 bg-white">
          <div className="page-wrap py-2 flex flex-wrap items-center gap-2">
            <SlidersHorizontal className="w-3.5 h-3.5 text-slate-400 shrink-0" strokeWidth={2} />

            {/* Sort */}
            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value)}
              className="border border-slate-200 rounded-lg px-2 py-1.5 text-[12px] outline-none focus:border-[#F7921E] transition-colors bg-white"
              aria-label="Sort order"
            >
              <option value="newest">Newest first</option>
              <option value="price_asc">Price: low to high</option>
              <option value="price_desc">Price: high to low</option>
            </select>

            {/* Price range */}
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-semibold text-slate-400">₹</span>
              <input
                type="number"
                placeholder="Min price"
                value={minPrice}
                onChange={e => setMinPrice(e.target.value)}
                className="w-24 border border-slate-200 rounded-lg px-2 py-1.5 text-[12px] outline-none focus:border-[#F7921E] transition-colors"
                aria-label="Minimum price"
              />
              <span className="text-slate-400 text-[12px]">–</span>
              <input
                type="number"
                placeholder="Max price"
                value={maxPrice}
                onChange={e => setMaxPrice(e.target.value)}
                className="w-24 border border-slate-200 rounded-lg px-2 py-1.5 text-[12px] outline-none focus:border-[#F7921E] transition-colors"
                aria-label="Maximum price"
              />
            </div>

            {/* Posted within */}
            <select
              value={postedWithin}
              onChange={e => setPostedWithin(e.target.value)}
              className="border border-slate-200 rounded-lg px-2 py-1.5 text-[12px] outline-none focus:border-[#F7921E] transition-colors bg-white"
              aria-label="Posted within"
            >
              <option value="">Any time</option>
              <option value="24h">Last 24 hours</option>
              <option value="7d">Last 7 days</option>
              <option value="30d">Last 30 days</option>
            </select>

            {/* Verified only */}
            <label className="flex items-center gap-1.5 cursor-pointer text-[12px] font-semibold text-slate-600">
              <input
                type="checkbox"
                checked={verifiedOnly}
                onChange={e => setVerifiedOnly(e.target.checked)}
                className="accent-[#F7921E]"
              />
              Verified only
            </label>

            {hasActiveFilters && (
              <button
                type="button"
                onClick={clearFilters}
                className="text-[11px] text-[#F7921E] font-semibold hover:underline"
              >
                Clear all
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="page-wrap py-6">

        {/* No city selected */}
        {!cityParam && (
          <div className="text-center py-20">
            <MapPin className="w-12 h-12 mx-auto mb-4 text-slate-200" strokeWidth={1.5} />
            <p className="text-slate-700 font-semibold mb-1.5">Select your city to browse listings</p>
            <p className="text-slate-400 text-sm mb-6">All listings are organised by city.</p>
            <button
              onClick={() => setShowPicker(true)}
              className="px-6 py-3 rounded-xl font-semibold text-sm text-white bg-[#F7921E] hover:bg-[#E07B0A] transition-colors shadow-[0_2px_12px_rgba(247,146,30,0.28)]"
            >
              Choose your city
            </button>
          </div>
        )}

        {/* Results summary */}
        {cityParam && !loading && (
          <div className="mb-5">
            <p className="text-sm text-slate-500">
              <span className="font-semibold text-slate-800">{results.length}</span> listing{results.length !== 1 ? 's' : ''}
              {q && <> for <span className="font-semibold text-slate-800">&ldquo;{q}&rdquo;</span></>}
              {activeCat && <> in <span className="font-semibold text-slate-800">{activeCat.name}</span></>}
              {cityName && <> · <span className="font-semibold text-slate-800">{cityName}</span></>}
            </p>
          </div>
        )}

        {/* Grid */}
        {cityParam && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {loading
              ? Array.from({ length: 8 }).map((_, i) => <ListingCardSkeleton key={i} />)
              : results.length > 0
                ? results.map(l => <ListingCard key={l.id} listing={l} citySlug={cityParam} />)
                : (
                  <div className="col-span-full text-center py-16">
                    <p className="text-slate-400 font-medium mb-1">
                      No listings found{q ? ` for "${q}"` : ''}
                      {cityName ? ` in ${cityName}` : ''}
                    </p>
                    {(q || categorySlug) && (
                      <button onClick={() => navigate({ q: '', category: '' })}
                        className="mt-3 text-sm font-semibold text-[#F7921E] hover:underline">
                        Clear filters
                      </button>
                    )}
                    <div className="mt-6">
                      <Link
                        href={`/${cityParam}/classifieds/post`}
                        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-[#F7921E] hover:bg-[#E07B0A] transition-colors"
                      >
                        + Post the first listing
                      </Link>
                    </div>
                  </div>
                )
            }
          </div>
        )}
      </div>

      {showPicker && (
        <CityPickerModal
          onClose={() => setShowPicker(false)}
          onSelect={city => {
            setCity(city);
            setShowPicker(false);
            setCityName(city.name);
            navigate({ city: city.slug });
          }}
        />
      )}
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="w-8 h-8 rounded-full border-2 border-[#F7921E] border-t-transparent animate-spin" />
      </div>
    }>
      <SearchInner />
    </Suspense>
  );
}
