import type { Metadata } from 'next';
import type { Listing } from '@/lib/types';
import ListingDetailClient from './ListingDetailClient';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'https://localsindia-backend.azurewebsites.net';

async function fetchListing(id: string): Promise<Listing | null> {
  try {
    const res = await fetch(`${API_BASE}/api/v1/listings/${id}`, { next: { revalidate: 300 } });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

function truncate(text: string, max: number): string {
  const clean = text.trim().replace(/\s+/g, ' ');
  return clean.length > max ? `${clean.slice(0, max - 1).trimEnd()}…` : clean;
}

export async function generateMetadata(
  { params }: { params: { id: string } }
): Promise<Metadata> {
  const listing = await fetchListing(params.id);
  if (!listing) return { title: 'Listing not found | LocalsIndia' };

  const locality = [listing.area, listing.city_slug].filter(Boolean).join(', ');
  const title = `${listing.title}${locality ? ` — ${locality}` : ''} | LocalsIndia`;
  const description = truncate(listing.description, 155);
  const url = `https://www.localsindia.com/listing/${listing.id}`;
  const image = listing.images?.[0]?.url;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url,
      siteName: 'LocalsIndia',
      type: 'website',
      images: image
        ? [{ url: image, width: 800, height: 600, alt: listing.title }]
        : [{ url: '/logo.png', width: 400, height: 160, alt: 'LocalsIndia' }],
    },
    twitter: {
      card: image ? 'summary_large_image' : 'summary',
      title,
      description,
      images: image ? [image] : ['/logo.png'],
    },
    alternates: {
      canonical: url,
    },
  };
}

export default async function ListingPage({ params }: { params: { id: string } }) {
  const listing = await fetchListing(params.id);

  const jsonLd = listing ? {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: listing.title,
    description: listing.description,
    ...(listing.images?.[0]?.url ? { image: listing.images[0].url } : {}),
    ...(listing.price !== null ? {
      offers: {
        '@type': 'Offer',
        price: listing.price,
        priceCurrency: 'INR',
        availability: 'https://schema.org/InStock',
        url: `https://www.localsindia.com/listing/${listing.id}`,
      },
    } : {}),
  } : null;

  return (
    <>
      {jsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      )}
      <ListingDetailClient id={params.id} initialListing={listing} />
    </>
  );
}
