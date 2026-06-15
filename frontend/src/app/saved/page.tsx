'use client';

import { Suspense } from 'react';
import Link from 'next/link';
import { Heart, Search } from 'lucide-react';
import { useSaved } from '@/hooks/useSaved';
import ListingCard from '@/components/listing-card/ListingCard';

function SavedInner() {
  const { saved } = useSaved();

  return (
    <div className="min-h-screen" style={{ background: 'var(--li-page-bg)' }}>

      {/* Header */}
      <div className="bg-white border-b border-slate-200/70 shadow-sm">
        <div className="page-wrap h-14 flex items-center gap-2">
          <Heart className="w-4 h-4 text-red-400 shrink-0" strokeWidth={2} fill="currentColor" />
          <h1 className="text-sm font-semibold text-slate-800">Saved Listings</h1>
        </div>
      </div>

      <div className="page-wrap py-6">
        {saved.length === 0 ? (
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
          <>
            <p className="text-sm text-slate-500 mb-5">
              <span className="font-semibold text-slate-800">{saved.length}</span> saved listing{saved.length !== 1 ? 's' : ''}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {saved.map(l => (
                <ListingCard key={l.id} listing={l} />
              ))}
            </div>
          </>
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
