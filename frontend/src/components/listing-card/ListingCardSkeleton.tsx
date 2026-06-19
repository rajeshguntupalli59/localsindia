export default function ListingCardSkeleton() {
  return (
    <div className="bg-white rounded-2xl overflow-hidden border" style={{ borderColor: 'var(--li-border)' }}>
      <div className="h-44 shimmer-card" />
      <div className="p-3 space-y-2">
        <div className="h-3 w-16 rounded shimmer-card" />
        <div className="h-4 rounded shimmer-card" />
        <div className="h-4 w-3/4 rounded shimmer-card" />
        <div className="h-3 w-1/2 rounded shimmer-card" />
        <div className="h-9 rounded-xl shimmer-card mt-1" />
      </div>
    </div>
  );
}
