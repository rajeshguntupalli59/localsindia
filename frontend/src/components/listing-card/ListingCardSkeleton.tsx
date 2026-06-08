export default function ListingCardSkeleton() {
  return (
    <div className="bg-white rounded-xl overflow-hidden border">
      <div className="aspect-[4/3] bg-muted animate-pulse" />
      <div className="p-2.5 space-y-2">
        <div className="h-4 bg-muted rounded animate-pulse" />
        <div className="h-3 w-2/3 bg-muted rounded animate-pulse" />
        <div className="h-3 w-1/3 bg-muted rounded animate-pulse" />
      </div>
      <div className="px-2.5 pb-2.5">
        <div className="h-8 bg-muted rounded-lg animate-pulse" />
      </div>
    </div>
  );
}
