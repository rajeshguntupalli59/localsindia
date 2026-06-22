export default function ListingCardSkeleton() {
  return (
    <div
      className="bg-white rounded-[20px] overflow-hidden"
      style={{ boxShadow: '0 2px 10px rgba(0,0,0,0.06), inset 0 0 0 1px rgba(0,0,0,0.05)' }}
    >
      {/* Category color strip placeholder */}
      <div className="h-[3px] shimmer-card" />
      {/* Image */}
      <div className="h-48 shimmer-card" />
      {/* Body */}
      <div className="px-3 pt-2.5 pb-3 space-y-2">
        <div className="h-4 rounded-lg shimmer-card" />
        <div className="h-4 w-3/4 rounded-lg shimmer-card" />
        <div className="h-3 w-1/2 rounded shimmer-card" />
        <div className="h-9 rounded-xl shimmer-card mt-1" />
      </div>
    </div>
  );
}
