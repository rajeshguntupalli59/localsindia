'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { MapPin, Search } from 'lucide-react';
import { api } from '@/lib/api';
import type { City } from '@/lib/types';

export default function CitiesPage() {
  const [cities, setCities] = useState<City[]>([]);
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.cities.list()
      .then(data => setCities(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filtered = q.trim()
    ? cities.filter(c =>
        c.name.toLowerCase().includes(q.toLowerCase()) ||
        c.state?.toLowerCase().includes(q.toLowerCase())
      )
    : cities;

  const byState: Record<string, City[]> = {};
  for (const city of filtered) {
    const state = city.state || 'Other';
    if (!byState[state]) byState[state] = [];
    byState[state].push(city);
  }
  const sortedStates = Object.keys(byState).sort();

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
            {loading ? 'Loading...' : `${cities.length} cities across India`}
          </p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-10">

        {/* Search */}
        <div className="relative mb-8">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" strokeWidth={2} />
          <input
            value={q}
            onChange={e => setQ(e.target.value)}
            placeholder="Search city or state..."
            className="w-full pl-11 pr-4 py-3 rounded-xl border border-slate-200 bg-white text-sm outline-none focus:border-[#F7921E] focus:ring-1 focus:ring-[#F7921E]/30 transition-colors"
          />
        </div>

        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {Array.from({ length: 20 }).map((_, i) => (
              <div key={i} className="h-12 bg-slate-200 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-slate-400">
            <MapPin className="w-10 h-10 mx-auto mb-3 opacity-30" strokeWidth={1.5} />
            <p className="font-medium">No cities found for &ldquo;{q}&rdquo;</p>
          </div>
        ) : (
          <div className="space-y-8">
            {sortedStates.map(state => (
              <div key={state}>
                <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-3">
                  {state}
                </h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
                  {byState[state].map(city => (
                    <Link
                      key={city.slug}
                      href={`/${city.slug}`}
                      className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl
                        bg-white border border-slate-100 text-sm font-medium text-slate-700
                        hover:border-[#F7921E]/40 hover:text-[#F7921E] hover:bg-orange-50/50
                        transition-all duration-150"
                    >
                      <MapPin className="w-3.5 h-3.5 text-[#F7921E] shrink-0" strokeWidth={2} />
                      {city.name}
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
