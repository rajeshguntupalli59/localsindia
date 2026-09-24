// Marks a category stock photo so it isn't mistaken for the actual listing.
export default function RepresentativeLabel({ className = '' }: { className?: string }) {
  return (
    <span
      className={`absolute z-10 text-[10px] font-semibold px-2 py-0.5 rounded-md text-white/90 pointer-events-none ${className}`}
      style={{ background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(4px)' }}
    >
      Representative image
    </span>
  );
}
