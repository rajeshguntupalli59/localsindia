export default function ListingCardSkeleton() {
  return (
    <div
      className="bg-white rounded-2xl overflow-hidden"
      style={{ boxShadow: '0 4px 20px rgba(0,0,0,0.05), 0 1px 4px rgba(0,0,0,0.03)' }}
    >
      {/* Brand accent strip placeholder */}
      <div className="h-[3px] shimmer-card" />
      {/* Image */}
      <div className="h-48 shimmer-card" />
      {/* Body — 16px padding matches ListingCard body */}
      <div className="px-4 pt-4 pb-5 space-y-3">
        <div className="h-4 rounded-lg shimmer-card" />
        <div className="h-4 w-3/4 rounded-lg shimmer-card" />
        <div className="h-3 w-1/2 rounded shimmer-card" />
        <div className="h-10 rounded-xl shimmer-card mt-1" />
      </div>
    </div>
  );
}
