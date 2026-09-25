import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import type { Business, City } from '@/lib/types';
import BusinessesClient from './BusinessesClient';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'https://localsindia-backend-in.azurewebsites.net';
const MIN_BUSINESSES_FOR_INDEX = 10;

async function getJson<T>(url: string, fallback: T): Promise<T> {
  try {
    const res = await fetch(url, { next: { revalidate: 3600 } });
    return res.ok ? await res.json() : fallback;
  } catch {
    return fallback;
  }
}

const fetchCity = (slug: string) => getJson<City | null>(`${API_BASE}/api/v1/cities/${slug}`, null);
const fetchCounts = (slug: string) =>
  getJson<Record<string, number>>(`${API_BASE}/api/v1/businesses/counts?city_slug=${slug}`, {});

export async function generateMetadata({ params }: { params: { city: string } }): Promise<Metadata> {
  const [city, counts] = await Promise.all([fetchCity(params.city), fetchCounts(params.city)]);
  if (!city) return { title: 'LocalsIndia' };
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  const title = `Local Businesses in ${city.name} — Shops, Clinics, Schools & Services | LocalsIndia`;
  const description = total > 0
    ? `${total.toLocaleString('en-IN')} local businesses in ${city.name}, ${city.state} — hospitals, restaurants, schools, shops and services with addresses and phone numbers.`
    : `Find and list local businesses in ${city.name}, ${city.state} on LocalsIndia.`;
  const url = `https://www.localsindia.com/${params.city}/businesses`;
  return {
    title,
    description,
    openGraph: { title, description, url, siteName: 'LocalsIndia', type: 'website' },
    alternates: { canonical: url },
    robots: { index: total >= MIN_BUSINESSES_FOR_INDEX, follow: true },
  };
}

export default async function BusinessesPage({ params }: { params: { city: string } }) {
  const [city, first] = await Promise.all([
    fetchCity(params.city),
    getJson<Business[]>(`${API_BASE}/api/v1/businesses?city_slug=${params.city}&page_size=20`, []),
  ]);
  if (!city) notFound();
  return <BusinessesClient initialBusinesses={Array.isArray(first) ? first : []} initialCityName={city.name} />;
}
