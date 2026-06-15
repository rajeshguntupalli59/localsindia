'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, User } from 'lucide-react';
import { api } from '@/lib/api';
import type { SellerProfile } from '@/lib/types';
import ListingCard from '@/components/listing-card/ListingCard';

function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse bg-slate-100 rounded-lg ${className ?? ''}`} />;
}

function monthYear(iso: string) {
  return new Date(iso).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
}

export default function SellerProfilePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [profile, setProfile] = useState<SellerProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!id) return;
    api.users.publicProfile(id)
      .then(data => { setProfile(data); setLoading(false); })
      .catch(() => { setError(true); setLoading(false); });
  }, [id]);

  const initials = profile?.name
    ? profile.name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
    : '?';

  return (
    <div className="min-h-screen" style={{ background: 'var(--li-page-bg)' }}>

      {/* Header */}
      <div className="sticky top-0 z-40 bg-white border-b border-slate-200/70 shadow-sm">
        <div className="page-wrap h-14 flex items-center gap-3">
          <button
            type="button"
            onClick={() => router.back()}
            className="shrink-0 p-1 -ml-1 text-slate-400 hover:text-slate-700 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" strokeWidth={2} />
          </button>
          <span className="text-sm font-semibold text-slate-700">
            {loading ? 'Loading…' : profile?.name ? `${profile.name}'s Listings` : 'Seller Profile'}
          </span>
        </div>
      </div>

      <div className="page-wrap py-6">

        {/* Error */}
        {error && (
          <div className="text-center py-20">
            <User className="w-12 h-12 mx-auto mb-4 text-slate-200" strokeWidth={1.5} />
            <p className="text-slate-500 font-medium">Seller not found.</p>
          </div>
        )}

        {/* Skeleton */}
        {loading && !error && (
          <div className="space-y-6">
            <div className="flex items-center gap-4">
              <Skeleton className="w-16 h-16 rounded-full" />
              <div className="space-y-2">
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-4 w-48" />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3].map(i => <Skeleton key={i} className="h-52" />)}
            </div>
          </div>
        )}

        {/* Content */}
        {profile && !loading && (
          <>
            {/* Seller card */}
            <div className="bg-white rounded-2xl border p-5 mb-6 flex items-start gap-4"
              style={{ borderColor: 'var(--li-border)' }}>

              {/* Avatar */}
              <div className="w-16 h-16 rounded-full flex items-center justify-center shrink-0 text-xl font-black text-white"
                style={{ background: 'linear-gradient(135deg, #F7921E 0%, #e07b0a 100%)' }}>
                {initials}
              </div>

              <div className="flex-1 min-w-0">
                <h1 className="text-lg font-bold text-slate-900">
                  {profile.name ?? 'Local Seller'}
                </h1>
                <p className="text-sm text-slate-500 mt-0.5">
                  Member since {monthYear(profile.member_since)}
                </p>
                <div className="flex items-center gap-3 mt-2">
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-full"
                    style={{ background: 'rgba(247,146,30,0.10)', color: 'var(--li-primary)' }}>
                    {profile.active_listings_count} active listing{profile.active_listings_count !== 1 ? 's' : ''}
                  </span>
                </div>
              </div>
            </div>

            {/* Listings */}
            <h2 className="text-base font-bold text-slate-800 mb-4">
              {profile.listings.length > 0
                ? `${profile.listings.length} listing${profile.listings.length !== 1 ? 's' : ''} by ${profile.name ?? 'this seller'}`
                : 'No active listings'}
            </h2>

            {profile.listings.length === 0 ? (
              <div className="text-center py-16">
                <p className="text-slate-400 text-sm">No active listings right now.</p>
                <Link href="/search" className="mt-3 inline-block text-sm font-semibold text-[#F7921E] hover:underline">
                  Browse all listings
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {profile.listings.map(l => (
                  <ListingCard key={l.id} listing={l} />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
