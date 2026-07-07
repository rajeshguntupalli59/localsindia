'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowLeft, MapPin, Clock, ChevronDown, ChevronUp, Flag, Tag, User, ExternalLink, Heart, Star, ChevronLeft, ChevronRight, Eye, AlertCircle } from 'lucide-react';
import { api, ApiError } from '@/lib/api';
import type { Listing, ListingReview } from '@/lib/types';
import { formatPrice, timeAgo } from '@/lib/utils';
import { useSaved } from '@/hooks/useSaved';
import { toast } from 'sonner';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'https://localsindia-backend.azurewebsites.net';

function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse bg-slate-100 rounded-lg ${className ?? ''}`} />;
}

const CATEGORY_EMOJI: Record<string, string> = {
  'tiffin': '🍱', 'pg-roommate': '🏠', 'jobs': '💼', 'vehicles': '🚗',
  'electronics': '📱', 'events': '🎉', 'businesses': '🏪', 'education': '📚',
};

export default function ListingDetailClient({ id }: { id: string }) {
  const router = useRouter();
  const { toggle, isSaved } = useSaved();

  const [listing, setListing] = useState<Listing | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [reviews, setReviews] = useState<ListingReview[]>([]);
  const [activeImg, setActiveImg] = useState(0);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [saveCount, setSaveCount] = useState<number | null>(null);
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewBody, setReviewBody] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);

  useEffect(() => {
    try {
      const u = JSON.parse(localStorage.getItem('user') ?? 'null');
      if (u?.id) setCurrentUserId(u.id);
    } catch {}
  }, []);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    api.listings.get(id)
      .then(data => {
        setListing(data);
        setLoading(false);
        api.listings.view(id);
        // Track recently viewed in localStorage for home-screen row
        try {
          const rv: Listing[] = JSON.parse(localStorage.getItem('li_rv') ?? '[]');
          const updated = [data, ...rv.filter(l => l.id !== data.id)].slice(0, 30);
          localStorage.setItem('li_rv', JSON.stringify(updated));
        } catch {}
      })
      .catch(() => { setError(true); setLoading(false); });
    api.listings.reviews(id).then(setReviews).catch(() => {});
    fetch(`${API_BASE}/api/v1/favorites/count/${id}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) setSaveCount(d.count); })
      .catch(() => {});
  }, [id]);

  const handleReport = async () => {
    const token = localStorage.getItem('access_token');
    if (!token) { router.push('/auth/login'); return; }
    try {
      await api.listings.report(id, 'spam', token);
      toast.success('Report submitted');
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Failed to report');
    }
  };

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
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => toggle(listing)}
                aria-label={isSaved(listing.id) ? 'Remove bookmark' : 'Save listing'}
                className="shrink-0 p-1.5 transition-colors"
              >
                <Heart
                  className={`w-4.5 h-4.5 transition-colors ${isSaved(listing.id) ? 'fill-red-500 text-red-500' : 'text-slate-300 hover:text-red-400'}`}
                  strokeWidth={2}
                />
              </button>
              <button
                type="button"
                onClick={handleReport}
                className="shrink-0 p-1.5 text-slate-300 hover:text-red-400 transition-colors"
                title="Report this listing"
                aria-label="Report listing"
              >
                <Flag className="w-4 h-4" strokeWidth={1.8} />
              </button>
            </div>
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
          {/* Image carousel */}
          <div
            className="relative w-full bg-slate-100"
            style={listing.images?.[0] ? { aspectRatio: '16/9', maxHeight: '380px' } : { height: '96px' }}
          >
            {listing.images?.[0] ? (
              <Image
                src={listing.images[activeImg]?.url ?? listing.images[0].url}
                alt={listing.title}
                fill
                className="object-cover transition-opacity duration-200"
                sizes="100vw"
                priority
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center text-4xl opacity-20 select-none">
                {CATEGORY_EMOJI[listing.category_slug ?? ''] ?? '🏷️'}
              </div>
            )}

            {/* Prev / Next arrows — only when multiple images */}
            {(listing.images?.length ?? 0) > 1 && (
              <>
                <button
                  type="button"
                  onClick={() => setActiveImg(i => Math.max(0, i - 1))}
                  disabled={activeImg === 0}
                  className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/40 hover:bg-black/60 flex items-center justify-center disabled:opacity-0 transition-all"
                  aria-label="Previous image"
                >
                  <ChevronLeft className="w-4 h-4 text-white" strokeWidth={2.5} />
                </button>
                <button
                  type="button"
                  onClick={() => setActiveImg(i => Math.min((listing.images!.length - 1), i + 1))}
                  disabled={activeImg === (listing.images!.length - 1)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/40 hover:bg-black/60 flex items-center justify-center disabled:opacity-0 transition-all"
                  aria-label="Next image"
                >
                  <ChevronRight className="w-4 h-4 text-white" strokeWidth={2.5} />
                </button>
                {/* Dot indicators */}
                <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5">
                  {listing.images!.map((_, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setActiveImg(i)}
                      className={`w-1.5 h-1.5 rounded-full transition-all ${i === activeImg ? 'bg-white scale-125' : 'bg-white/50'}`}
                      aria-label={`Go to image ${i + 1}`}
                    />
                  ))}
                </div>
              </>
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

          {/* Thumbnail strip — clickable, active highlighted */}
          {(listing.images?.length ?? 0) > 1 && (
            <div className="flex gap-2 px-4 py-2 overflow-x-auto bg-white border-b border-slate-100">
              {listing.images!.map((img, i) => (
                <button
                  key={img.id}
                  type="button"
                  onClick={() => setActiveImg(i)}
                  className={`relative shrink-0 w-16 h-12 rounded-lg overflow-hidden border-2 transition-all ${
                    i === activeImg ? 'border-orange-400 ring-1 ring-orange-300' : 'border-slate-100 opacity-60 hover:opacity-100'
                  }`}
                  aria-label={`View image ${i + 1}`}
                >
                  <Image src={img.url} alt={`Image ${i + 1}`} fill className="object-cover" sizes="64px" />
                </button>
              ))}
            </div>
          )}

          <div className="page-wrap py-5 space-y-5">

            {/* Breadcrumb */}
            <button
              type="button"
              onClick={() => router.back()}
              className="flex items-center gap-1 text-xs font-medium text-slate-400 hover:text-[#F7921E] transition-colors"
            >
              <ArrowLeft className="w-3 h-3" strokeWidth={2} />
              Back to results
            </button>

            {/* Category badge */}
            {listing.category_name && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold"
                style={{ background: 'rgba(247,146,30,0.10)', color: 'var(--li-primary)' }}>
                <Tag className="w-3 h-3 shrink-0" strokeWidth={2} />
                {listing.category_name}
              </span>
            )}

            {/* Job scam safety notice */}
            {listing.category_slug === 'jobs' && (
              <div className="px-4 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2"
                style={{ background: '#FEF2F2', color: '#B91C1C' }}>
                ⚠️ Never pay money to get a job. Report anyone who asks for a registration fee or deposit.
              </div>
            )}

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

            {/* Social proof */}
            {(saveCount !== null || (listing.view_count ?? 0) > 0) && (
              <div className="flex items-center gap-4 text-xs text-slate-400">
                {(listing.view_count ?? 0) > 0 && (
                  <span className="flex items-center gap-1">
                    <Eye className="w-3.5 h-3.5" strokeWidth={2} />
                    {listing.view_count} views
                  </span>
                )}
                {saveCount !== null && saveCount > 0 && (
                  <span className="flex items-center gap-1">
                    <Heart className="w-3.5 h-3.5 fill-red-400 text-red-400" strokeWidth={2} />
                    {saveCount} saved
                  </span>
                )}
              </div>
            )}

            {/* Expiry banner — shows to owner when < 7 days left */}
            {currentUserId && listing.user_id === currentUserId && listing.expires_at && (() => {
              const daysLeft = Math.ceil((new Date(listing.expires_at).getTime() - Date.now()) / 86400000);
              if (daysLeft > 7) return null;
              return (
                <div className={`flex items-start gap-2 px-4 py-3 rounded-xl text-sm
                  ${daysLeft <= 0 ? 'bg-red-50 text-red-700' : daysLeft <= 3 ? 'bg-orange-50 text-orange-700' : 'bg-yellow-50 text-yellow-700'}`}>
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" strokeWidth={2} />
                  <div>
                    <p className="font-semibold">
                      {daysLeft <= 0 ? 'Listing expired' : `Expires in ${daysLeft} day${daysLeft !== 1 ? 's' : ''}`}
                    </p>
                    <p className="text-xs mt-0.5 opacity-80">Renew it from My Listings to stay visible.</p>
                  </div>
                </div>
              );
            })()}

            {/* Seller name */}
            {listing.seller_name && (
              <Link href={`/seller/${listing.user_id}`}
                className="flex items-center gap-2 text-sm text-slate-600 hover:text-[#F7921E] transition-colors group">
                <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
                  <User className="w-3.5 h-3.5 text-slate-400 group-hover:text-[#F7921E]" strokeWidth={2} />
                </div>
                <span>Listed by <span className="font-semibold">{listing.seller_name}</span></span>
                <ExternalLink className="w-3 h-3 opacity-40 group-hover:opacity-70" strokeWidth={2} />
              </Link>
            )}

            {/* Category attribute chips */}
            {listing.attributes && Object.keys(listing.attributes).length > 0 && (
              <div className="flex flex-wrap gap-2">
                {Object.entries(listing.attributes).map(([key, val]) => (
                  <span key={key} className="px-3 py-1 rounded-full text-xs font-semibold border"
                    style={{ background: 'var(--li-primary-light)', color: 'var(--li-primary)', borderColor: 'rgba(249,115,22,0.2)' }}>
                    {val}
                  </span>
                ))}
              </div>
            )}

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

            {/* Reviews */}
            <div>
              {reviews.length > 0 && (
                <>
                  <h2 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
                    <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" strokeWidth={2} />
                    {reviews.length} Review{reviews.length !== 1 ? 's' : ''}
                  </h2>
                  <div className="space-y-3 mb-4">
                    {reviews.map(r => (
                      <div key={r.id} className="bg-slate-50 rounded-xl p-3">
                        <div className="flex items-center gap-0.5 mb-1">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <Star
                              key={i}
                              className={`w-3 h-3 ${i < r.rating ? 'fill-amber-400 text-amber-400' : 'text-slate-200 fill-slate-200'}`}
                              strokeWidth={1.5}
                            />
                          ))}
                        </div>
                        {r.body && <p className="text-xs text-slate-600 leading-relaxed">{r.body}</p>}
                      </div>
                    ))}
                  </div>
                </>
              )}

              {/* Review form — non-owners only, when logged in */}
              {currentUserId && currentUserId !== listing.user_id && (
                <div className="border border-slate-200 rounded-xl p-4">
                  <p className="text-xs font-semibold text-slate-600 mb-3">Rate this listing</p>
                  <div className="flex gap-1 mb-3">
                    {[1, 2, 3, 4, 5].map(n => (
                      <button
                        key={n}
                        type="button"
                        onClick={() => setReviewRating(n)}
                        className="transition-transform active:scale-110"
                      >
                        <Star
                          className={`w-6 h-6 ${n <= reviewRating ? 'fill-amber-400 text-amber-400' : 'text-slate-200 fill-slate-200'}`}
                          strokeWidth={1.5}
                        />
                      </button>
                    ))}
                  </div>
                  <textarea
                    value={reviewBody}
                    onChange={e => setReviewBody(e.target.value)}
                    placeholder="Optional — share your experience..."
                    rows={2}
                    className="w-full text-xs border border-slate-200 rounded-lg px-3 py-2 resize-none outline-none focus:border-orange-300"
                  />
                  <button
                    type="button"
                    disabled={reviewRating === 0 || submittingReview}
                    onClick={async () => {
                      if (!reviewRating) return;
                      const token = localStorage.getItem('access_token');
                      if (!token) { toast.error('Sign in to rate'); return; }
                      setSubmittingReview(true);
                      try {
                        const r = await fetch(`${API_BASE}/api/v1/listings/${id}/reviews`, {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                          body: JSON.stringify({ rating: reviewRating, body: reviewBody.trim() || null }),
                        });
                        if (!r.ok) { const e = await r.json(); throw new Error(e.detail ?? 'Failed'); }
                        const newReview: ListingReview = await r.json();
                        setReviews(prev => [newReview, ...prev]);
                        setReviewRating(0);
                        setReviewBody('');
                        toast.success('Review submitted!');
                      } catch (e: unknown) {
                        toast.error(e instanceof Error ? e.message : 'Failed to submit review');
                      } finally { setSubmittingReview(false); }
                    }}
                    className="mt-2 px-4 py-1.5 rounded-lg text-xs font-semibold text-white disabled:opacity-40 transition-opacity"
                    style={{ background: reviewRating > 0 ? 'var(--li-primary)' : '#94a3b8' }}
                  >
                    {submittingReview ? 'Submitting…' : 'Submit review'}
                  </button>
                </div>
              )}
            </div>

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

            {/* Promote button — visible to listing owner only */}
            {currentUserId && listing.user_id === currentUserId && !listing.is_featured && listing.city_slug && (
              <div className="mt-4">
                <Link
                  href={`/${listing.city_slug}/classifieds/${id}/promote`}
                  className="flex items-center justify-center gap-2 w-full h-12 rounded-2xl border-2 border-dashed font-semibold text-sm transition-all hover:bg-[#FEF3E2]/60"
                  style={{ borderColor: 'var(--li-primary)', color: 'var(--li-primary)' }}
                >
                  ⭐ Promote this listing — from ₹99
                </Link>
              </div>
            )}

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
