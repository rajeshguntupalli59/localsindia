export default function ListingCardSkeleton() {
  return (
    <div className="bg-white rounded-2xl overflow-hidden border" style={{ borderColor: 'var(--li-border)' }}>
      <div className="h-44 bg-gray-100 animate-pulse" />
      <div className="p-3 space-y-2">
        <div className="h-3 w-16 bg-gray-100 rounded animate-pulse" />
        <div className="h-4 bg-gray-100 rounded animate-pulse" />
        <div className="h-4 w-3/4 bg-gray-100 rounded animate-pulse" />
        <div className="h-3 w-1/2 bg-gray-100 rounded animate-pulse" />
        <div className="h-9 bg-gray-100 rounded-xl animate-pulse mt-1" />
      </div>
    </div>
  );
}
