import ListingCardSkeleton from '@/components/listing-card/ListingCardSkeleton';

// Shown the instant someone picks a city (and on any page inside a city)
// while the server gathers that page's data — instead of the old page just
// sitting there frozen, or a blank screen. No data needed, so it's immediate.
export default function CityLoading() {
  return (
    <div style={{ background: 'var(--li-page-bg)', minHeight: '100vh' }} aria-busy="true" aria-label="Loading">
      <div className="bg-white border-b border-slate-200/70">
        <div className="page-wrap h-16 flex items-center justify-between">
          <div className="h-8 w-36 rounded-lg shimmer-card" />
          <div className="h-10 w-24 rounded-2xl shimmer-card" />
        </div>
      </div>

      <div style={{ background: 'var(--li-nav-bg)' }}>
        <div className="page-wrap py-8 space-y-3">
          <div className="h-4 w-56 rounded bg-white/10" />
          <div className="h-9 w-64 rounded-lg bg-white/15" />
        </div>
      </div>

      <div className="page-wrap py-8 space-y-6">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-14 rounded-2xl shimmer-card" />
          ))}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => <ListingCardSkeleton key={i} />)}
        </div>
      </div>
    </div>
  );
}
