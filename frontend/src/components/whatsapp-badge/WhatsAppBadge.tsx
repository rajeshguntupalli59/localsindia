'use client';

// ─── Types ────────────────────────────────────────────────────
// overlay — floating badge over a listing card image (caller handles absolute positioning)
// pill    — "Chat on WhatsApp" full pill for card footers / detail pages
// inline  — compact icon + text for list rows and metadata areas
export type WaBadgeVariant = 'overlay' | 'pill' | 'inline';

interface WhatsAppBadgeProps {
  variant?: WaBadgeVariant;
  className?: string;
}

// Official WhatsApp logo path (single-path version, fills correctly at small sizes)
function WaSvg({ size }: { size: number }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      className="fill-current shrink-0"
      aria-hidden
    >
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
}

export default function WhatsAppBadge({
  variant = 'pill',
  className = '',
}: WhatsAppBadgeProps) {

  // ── overlay ─────────────────────────────────────────────────
  // Floating badge for listing card images.
  // Use absolute positioning on the parent to place it.
  if (variant === 'overlay') {
    return (
      <div
        className={`inline-flex items-center gap-1.5
          bg-[#25D366] pl-1.5 pr-2.5 py-[3px] rounded-full
          shadow-[0_2px_10px_rgba(0,0,0,0.20)] ring-[2px] ring-white/60
          ${className}`}
      >
        <span className="text-white">
          <WaSvg size={11} />
        </span>
        <span className="text-[9px] font-bold text-white leading-none tracking-[0.05em]">
          WhatsApp
        </span>
      </div>
    );
  }

  // ── inline ───────────────────────────────────────────────────
  // For list rows, metadata lines, search result snippets.
  if (variant === 'inline') {
    return (
      <div className={`inline-flex items-center gap-1.5 ${className}`}>
        <span className="flex h-[18px] w-[18px] items-center justify-center
          rounded-full bg-[#25D366] text-white shrink-0">
          <WaSvg size={9} />
        </span>
        <span className="text-[11px] font-semibold text-emerald-600 leading-none tracking-wide">
          Chat instantly
        </span>
      </div>
    );
  }

  // ── pill (default) ───────────────────────────────────────────
  // Full-width or inline pill for listing cards and detail pages.
  return (
    <div
      className={`inline-flex items-center gap-2 pl-[5px] pr-3.5 py-[5px] rounded-full
        bg-[#25D366]/[0.08] border border-[#25D366]/[0.18]
        ${className}`}
    >
      <span className="flex h-6 w-6 items-center justify-center rounded-full
        bg-[#25D366] text-white shrink-0 shadow-sm shadow-[#25D366]/25">
        <WaSvg size={12} />
      </span>
      <span className="text-[11px] font-semibold text-emerald-700 leading-none tracking-wide">
        Chat on WhatsApp
      </span>
    </div>
  );
}
