'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { Heart, Search } from 'lucide-react';
import { useSaved } from '@/hooks/useSaved';
import ListingCard from '@/components/listing-card/ListingCard';
import type { Listing } from '@/lib/types';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'https://localsindia-backend-in.azurewebsites.net';

function SavedInner() {
  const { saved: localSaved } = useSaved();
  const [backendSaved, setBackendSaved] = useState<Listing[] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (!token) { setLoading(false); return; }
    fetch(`${API_BASE}/api/v1/favorites`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data) setBackendSaved(data); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const listings = backendSaved ?? localSaved;

  return (
    <div className="min-h-screen" style={{ background: 'var(--li-page-bg)' }}>
      <div className="bg-white border-b border-slate-200/70 shadow-sm">
        <div className="page-wrap h-14 flex items-center gap-2">
          <Heart className="w-4 h-4 text-red-400 shrink-0" strokeWidth={2} fill="currentColor" />
          <h1 className="text-sm font-semibold text-slate-800">Saved Listings</h1>
          {!loading && listings.length > 0 && (
            <span className="ml-auto text-xs text-slate-400">{listings.length} saved</span>
          )}
        </div>
      </div>

      <div className="page-wrap py-6">
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-56 bg-white rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : listings.length === 0 ? (
          <div className="text-center py-24">
            <Heart className="w-12 h-12 mx-auto mb-4 text-slate-200" strokeWidth={1.5} />
            <p className="font-semibold text-slate-700 mb-1">No saved listings yet</p>
            <p className="text-sm text-slate-400 mb-6">
              Tap the heart icon on any listing to save it here.
            </p>
            <Link
              href="/search"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-colors"
              style={{ background: 'var(--li-primary)' }}
            >
              <Search className="w-4 h-4" strokeWidth={2} />
              Browse listings
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {listings.map(l => (
              <ListingCard key={l.id} listing={l} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function SavedPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="w-8 h-8 rounded-full border-2 border-[#F7921E] border-t-transparent animate-spin" />
      </div>
    }>
      <SavedInner />
    </Suspense>
  );
}
