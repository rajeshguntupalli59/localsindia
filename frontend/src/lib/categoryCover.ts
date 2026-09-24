// Stock cover photo per category (CC0 / public domain — see
// public/category-covers/CREDITS.md). Shown only when a listing or business
// has no photos of its own, always with a "Representative image" label so
// nobody mistakes it for the actual shop.
const COVERS = new Set([
  'tiffin', 'doctors', 'education', 'pg-roommate', 'jobs', 'vehicles', 'electronics',
  'services', 'events', 'businesses', 'real-estate', 'furniture', 'fashion', 'classifieds',
]);

export function categoryCover(slug?: string | null): string {
  return `/category-covers/${slug && COVERS.has(slug) ? slug : 'classifieds'}.jpg`;
}
