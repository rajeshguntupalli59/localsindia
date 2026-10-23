import type { Metadata } from 'next';

// Same as /search: query-driven results have endless variations and duplicate
// the city/category pages, which are the real SEO surface.
export function generateMetadata({ params }: { params: { city: string } }): Metadata {
  const city = params.city.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  return { title: `Search listings in ${city} | LocalsIndia`, robots: { index: false, follow: true } };
}

export default function CitySearchLayout({ children }: { children: React.ReactNode }) {
  return children;
}
