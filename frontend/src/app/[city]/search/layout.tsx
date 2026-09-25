import type { Metadata } from 'next';

// Same as /search: query-driven results have endless variations and duplicate
// the city/category pages, which are the real SEO surface.
export const metadata: Metadata = { robots: { index: false, follow: true } };

export default function CitySearchLayout({ children }: { children: React.ReactNode }) {
  return children;
}
