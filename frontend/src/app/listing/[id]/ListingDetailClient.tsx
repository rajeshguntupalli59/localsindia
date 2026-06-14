'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowLeft, MapPin, Clock, ChevronDown, ChevronUp, Flag } from 'lucide-react';
import { api } from '@/lib/api';
import type { Listing } from '@/lib/types';
import { formatPrice, timeAgo } from '@/lib/utils';

function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse bg-slate-100 rounded-lg ${className ?? ''}`} />;
}

export default function ListingDetailClient() {
  const params = useParams();
  const router = useRouter();
  const paramsId = typeof params?.id === 'string' ? params.id : '';
  const [id, setId] = useState(paramsId);

  const [listing, setListing] = useState<Listing | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [expanded, setExpanded] = useState(false);

  // In static export, useParams() may return 'placeholder' when SWA serves
  // /listing/placeholder/index.html for /listing/{real-id}. Fall back to URL.
  useEffect(() => {
    if (id && id !== 'placeholder') return;
    if (typeof window !== 'undefined') {
      const parts = window.location.pathname.split('/').filter(Boolean);
      const urlId = parts[parts.length - 1];
      if (urlId && urlId !== 'placeholder') setId(urlId);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!id || id === 'placeholder') return;
    setLoading(true);
    api.listings.get(id)
      .then(data => { setListing(data); setLoading(false); })
      .catch(() => { setError(true); setLoading(false); });
  }, [id]);

  const waUrl = listing
    ? listing.whatsapp_url ?? `https://wa.me/${listing.contact_phone.replace('+', '')}`
    : null;

  const desc = listing?.description ?? '';
  const isLong = desc.length > 200;
  const displayDesc = isLong && !expanded ? desc.slice(0, 200) + '…' : desc;

  return (
    <div className="min-h-screen bg-slate-50 pb-28">

      {/* ── Sticky header ── */}
      <div className="sticky top-0 z-40 bg-white border-b border-slate-200/70 shadow-sm">
        <div className="page-wrap h-14 flex items-center gap-3">
          <button
            type="button"
            onClick={() => router.back()}
            className="shrink-0 p-1 -ml-1 text-slate-400 hover:text-slate-700 transition-colors"
            aria-label="Go back"
          >
            <ArrowLeft className="w-5 h-5" strokeWidth={2} />
          </button>
          <span className="flex-1 text-sm font-semibold text-slate-700 truncate">
            {loading ? 'Loading…' : listing?.title ?? 'Listing'}
          </span>
          {listing && (
            <Link
              href={`/auth/login`}
              className="shrink-0 p-1.5 text-slate-300 hover:text-red-400 transition-colors"
              title="Report this listing"
              aria-label="Report listing"
            >
              <Flag className="w-4 h-4" strokeWidth={1.8} />
            </Link>
          )}
        </div>
      </div>

      {/* ── Error ── */}
      {error && (
        <div className="page-wrap py-20 text-center">
          <p className="text-slate-500 font-medium mb-4">Listing not found or unavailable.</p>
          <button
            type="button"
            onClick={() => router.back()}
            className="text-sm font-semibold text-[#F7921E] hover:underline"
          >
            Go back
          </button>
        </div>
      )}

      {/* ── Skeleton ── */}
      {loading && !error && (
        <div className="page-wrap py-5 space-y-4">
          <Skeleton className="w-full h-64 sm:h-80" />
          <Skeleton className="h-6 w-3/4" />
          <Skeleton className="h-5 w-1/3" />
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-24 w-full" />
        </div>
      )}

      {/* ── Content ── */}
      {listing && !loading && (
        <>
          {/* Image */}
          <div className="relative w-full bg-slate-100" style={{ aspectRatio: '16/9', maxHeight: '380px' }}>
            {listing.images?.[0] ? (
              <Image
                src={listing.images[0].url}
                alt={listing.title}
                fill
                className="object-cover"
                sizes="100vw"
                priority
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center text-7xl opacity-10 select-none">
                🏷️
              </div>
            )}

            {listing.is_featured && (
              <span className="absolute top-3 left-3 px-2.5 py-1 rounded-full text-xs font-bold text-amber-900 bg-amber-300/90">
                ⭐ Featured
              </span>
            )}
            {listing.status === 'fulfilled' && (
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                <span className="text-white font-bold text-lg bg-black/60 px-6 py-2 rounded-full">Sold</span>
              </div>
            )}
          </div>

          {/* Thumbnail strip (multiple images) */}
          {(listing.images?.length ?? 0) > 1 && (
            <div className="flex gap-2 px-4 py-2 overflow-x-auto bg-white border-b border-slate-100">
              {listing.images!.map((img, i) => (
                <div key={img.id} className="relative shrink-0 w-16 h-12 rounded-lg overflow-hidden border-2 border-slate-100">
                  <Image src={img.url} alt={`Image ${i + 1}`} fill className="object-cover" sizes="64px" />
                </div>
              ))}
            </div>
          )}

          <div className="page-wrap py-5 space-y-5">

            {/* Title + Price */}
            <div>
              <h1 className="text-xl font-bold text-slate-900 leading-snug mb-2">
                {listing.title}
              </h1>
              {listing.price !== null ? (
                <p className="text-2xl font-black" style={{ color: 'var(--li-primary)' }}>
                  {formatPrice(listing.price)}
                </p>
              ) : (
                <p className="text-sm text-slate-400 font-medium">Price on request</p>
              )}
            </div>

            {/* Meta row */}
            <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-sm text-slate-500">
              {listing.area && (
                <span className="flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-[#F7921E] shrink-0" strokeWidth={2} />
                  {listing.area}
                </span>
              )}
              <span className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 shrink-0" strokeWidth={2} />
                Posted {timeAgo(listing.created_at)}
              </span>
            </div>

            {/* WA verified */}
            {listing.wa_verified && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold"
                style={{ background: '#dcfce7', color: '#16a34a' }}>
                <span className="w-1.5 h-1.5 rounded-full bg-[#25D366] inline-block" />
                Seller active on WhatsApp
              </span>
            )}

            {/* Description */}
            {desc && (
              <div>
                <h2 className="text-sm font-semibold text-slate-700 mb-2">Description</h2>
                <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-line">
                  {displayDesc}
                </p>
                {isLong && (
                  <button
                    type="button"
                    onClick={() => setExpanded(e => !e)}
                    className="flex items-center gap-1 mt-2 text-xs font-semibold"
                    style={{ color: 'var(--li-primary)' }}
                  >
                    {expanded ? <><ChevronUp className="w-3.5 h-3.5" /> Show less</> : <><ChevronDown className="w-3.5 h-3.5" /> Read more</>}
                  </button>
                )}
              </div>
            )}

            {/* Divider */}
            <div className="h-px bg-slate-100" />

            {/* Desktop WA button */}
            <div className="hidden sm:block">
              <a
                href={waUrl ?? '#'}
                target="_blank"
                rel="noopener noreferrer"
                className="wa-btn w-full py-4 text-base font-bold"
                onClick={() => api.listings.waClick(listing.id)}
              >
                💬 Chat on WhatsApp
              </a>
            </div>

          </div>
        </>
      )}

      {/* ── Mobile fixed WA bar ── */}
      {listing && waUrl && (
        <div className="sm:hidden fixed bottom-0 inset-x-0 z-50 p-4 bg-white border-t border-slate-200 shadow-lg">
          <a
            href={waUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="wa-btn w-full py-4 text-base font-bold"
            onClick={() => api.listings.waClick(listing.id)}
          >
            💬 Chat on WhatsApp
          </a>
        </div>
      )}
    </div>
  );
}
