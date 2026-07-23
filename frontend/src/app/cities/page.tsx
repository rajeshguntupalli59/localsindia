import type { Metadata } from 'next';
import Link from 'next/link';
import type { City } from '@/lib/types';
import CitiesListClient from './CitiesListClient';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'https://localsindia-backend-in.azurewebsites.net';

async function fetchCities(): Promise<City[]> {
  try {
    const res = await fetch(`${API_BASE}/api/v1/cities`, { next: { revalidate: 3600 } });
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

export const metadata: Metadata = {
  title: 'All Cities — LocalsIndia',
  description: 'Browse LocalsIndia classifieds, PGs, jobs and tiffin listings across every city in India.',
  alternates: { canonical: 'https://www.localsindia.com/cities' },
};

export default async function CitiesPage() {
  const cities = await fetchCities();

  return (
    <div className="min-h-screen bg-slate-50">

      {/* Header */}
      <div className="bg-[#0D0F1C] py-14">
        <div className="max-w-4xl mx-auto px-4">
          <Link href="/" className="text-sm font-semibold mb-8 inline-block text-[#F7921E]">
            ← Back to LocalsIndia
          </Link>
          <h1 className="text-3xl font-extrabold text-white tracking-tight mb-2">
            All Cities
          </h1>
          <p className="text-slate-400 text-sm">
            {cities.length} cities across India
          </p>
        </div>
      </div>

      <CitiesListClient initialCities={cities} />
    </div>
  );
}
