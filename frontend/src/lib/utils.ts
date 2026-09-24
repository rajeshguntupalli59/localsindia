import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatPrice(price: number | null): string {
  if (price === null) return 'Price on request';
  return `₹${price.toLocaleString('en-IN')}`;
}

// Categories where physical items change hands — "Sold" label applies
export const SALE_CATEGORIES = new Set([
  'classifieds', 'vehicles', 'electronics', 'furniture', 'fashion', 'real-estate',
]);

export function isSaleCategory(slug?: string | null): boolean {
  return SALE_CATEGORIES.has(slug ?? '');
}

export function fulfillLabel(categorySlug?: string | null): string {
  return isSaleCategory(categorySlug) ? 'Sold' : 'Closed';
}

export function timeAgo(dateStr: string): string {
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diffMs / 60_000);
  const hours = Math.floor(diffMs / 3_600_000);
  const days = Math.floor(diffMs / 86_400_000);
  const months = Math.floor(days / 30);

  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} min ago`;
  if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  if (days < 30) return `${days} day${days > 1 ? 's' : ''} ago`;
  return `${months} month${months > 1 ? 's' : ''} ago`;
}

// Search page heading, e.g. "tiffin in Hyderabad", "Jobs in Guntur", "Listings in Hyderabad"
export function searchHeading(q: string, categoryName: string | undefined, cityName: string): string {
  const what = q.trim() || categoryName || 'Listings';
  return cityName ? `${what} in ${cityName}` : what;
}

// ── Listing URLs ───────────────────────────────────────────────────────────────
// Detail pages live at /listing/{uuid}-{title-slug} for SEO. The slug is purely
// cosmetic: the page reads the id from the first 36 chars, so bare-UUID links
// (older shares, the mobile app) keep working.
const UUID_PREFIX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;

export function slugify(text: string, max = 60): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, max)
    .replace(/-+$/, '');
}

export function listingPath(listing: { id: string; title?: string | null }): string {
  const slug = slugify(listing.title ?? '');
  return slug ? `/listing/${listing.id}-${slug}` : `/listing/${listing.id}`;
}

export function listingIdFromParam(param: string): string {
  const m = param.match(UUID_PREFIX);
  return m ? m[0] : param;
}

// Seeded listings carry a generic placehold.co "LocalsIndia" cover. Treat those
// as no photo at all, so cards fall back to category art and only listings with
// real photos earn the Photos badge.
export function realImages<T extends { url: string }>(images: T[] | null | undefined): T[] {
  return (images ?? []).filter(img => !img.url.includes('placehold.co'));
}
