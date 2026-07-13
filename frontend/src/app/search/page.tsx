import type { Metadata } from 'next';
import SearchClient from './SearchClient';

export async function generateMetadata(
  { searchParams }: { searchParams: { q?: string; city?: string } }
): Promise<Metadata> {
  const q = searchParams.q?.trim();
  const city = searchParams.city?.trim();
  const cityName = city ? city.charAt(0).toUpperCase() + city.slice(1) : '';

  let title = 'Search | LocalsIndia';
  if (q && cityName) title = `${q} in ${cityName} | LocalsIndia`;
  else if (q) title = `${q} | LocalsIndia`;
  else if (cityName) title = `Search listings in ${cityName} | LocalsIndia`;

  return {
    title,
    description: q
      ? `Search results for "${q}"${cityName ? ` in ${cityName}` : ''} on LocalsIndia.`
      : 'Search classifieds, PGs, jobs and services near you on LocalsIndia.',
    // Query-driven results pages have near-infinite variations and duplicate
    // content across searches — keep them out of the index, unlike the
    // static category/city pages which are the real SEO surface.
    robots: { index: false, follow: true },
  };
}

export default function SearchPage() {
  return <SearchClient />;
}
