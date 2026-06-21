'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowLeft, Flag, ChevronLeft, ChevronRight, MapPin, Clock, Shield, MessageCircle, Tag, Star, User, Globe, Share2, CheckCircle2, X } from 'lucide-react';
import { formatPrice, timeAgo } from '@/lib/utils';
import { api, ApiError } from '@/lib/api';

import type { Listing, ListingReview } from '@/lib/types';
import SiteHeader from '@/components/site-header/SiteHeader';
import SiteFooter from '@/components/site-footer/SiteFooter';
import AdBanner from '@/components/ad-banner/AdBanner';
import { toast } from 'sonner';

const SAFETY_TIPS = [
  'Meet in a public place for exchanges',
  'Never share your OTP or banking details',
  'Inspect the item before payment',
  'Report suspicious listings immediately',
];

export default function ListingDetailPage() {
  const { city: citySlug, id } = useParams<{ city: string; id: string }>();
  const router = useRouter();

  const [listing, setListing] = useState<Listing | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [imgIdx, setImgIdx] = useState(0);
  const [showFull, setShowFull] = useState(false);
  const [activeTab, setActiveTab] = useState<'description' | 'details'>('description');

  // Reviews
  const [reviews, setReviews] = useState<ListingReview[]>([]);
  const [reviewPrompt, setReviewPrompt] = useState(false);
  const [pendingRating, setPendingRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [reviewBody, setReviewBody] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);
  const [alreadyReviewed, setAlreadyReviewed] = useState(false);
  const waTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    try {
      const u = JSON.parse(localStorage.getItem('user') ?? 'null');
      if (u?.id) setCurrentUserId(u.id);
    } catch {}
    api.listings
      .get(id)
      .then(l => {
        setListing(l);
        api.listings.view(id); // fire-and-forget view count
      })
      .catch(() => router.replace(`/${citySlug}`))
      .finally(() => setLoading(false));
    api.listings.reviews(id).then(setReviews).catch(() => {});
  }, [id, citySlug, router]);

  useEffect(() => () => { if (waTimerRef.current) clearTimeout(waTimerRef.current); }, []);

  const handleWaClick = () => {
    api.listings.waClick(listing!.id);
    const token = localStorage.getItem('access_token');
    if (!token || alreadyReviewed) return;
    waTimerRef.current = setTimeout(() => setReviewPrompt(true), 5000);
  };

  const submitReview = async () => {
    if (pendingRating === 0) { toast.error('Please select a star rating'); return; }
    const token = localStorage.getItem('access_token');
    if (!token) { router.push('/auth/login'); return; }
    setSubmittingReview(true);
    try {
      const r = await api.listings.submitReview(id, pendingRating, reviewBody.trim() || null, token);
      setReviews(prev => [r, ...prev]);
      setAlreadyReviewed(true);
      setReviewPrompt(false);
      toast.success('Review submitted — thanks!');
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        setAlreadyReviewed(true);
        setReviewPrompt(false);
        toast('You have already reviewed this listing');
      } else {
        toast.error('Failed to submit review');
      }
    } finally {
      setSubmittingReview(false);
    }
  };

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

  const handleShare = () => {
    if (!listing) return;
    const url = window.location.href;
    const priceStr = listing.price !== null ? ` — ₹${listing.price.toLocaleString('en-IN')}` : '';
    const text = `${listing.title}${priceStr}\n\nFound on LocalsIndia — free classifieds in ${citySlug.charAt(0).toUpperCase() + citySlug.slice(1)}\n${url}`;
    if (typeof navigator !== 'undefined' && navigator.share) {
      navigator.share({ title: listing.title, text, url }).catch(() => {});
    } else {
      navigator.clipboard.writeText(url).then(() => toast.success('Link copied!')).catch(() => {});
    }
  };

  if (loading) return <SkeletonPage />;
  if (!listing) return null;

  const images = listing.images ?? [];
  const waUrl = listing.whatsapp_url ?? `https://wa.me/${listing.contact_phone.replace('+', '')}`;
  const mainImg = images[imgIdx];

  return (
    <div style={{ background: 'var(--li-page-bg)', minHeight: '100vh' }}>
      <SiteHeader citySlug={citySlug} />

      {/* Breadcrumb */}
      <div className="border-b bg-white" style={{ borderColor: 'var(--li-border)' }}>
        <div className="page-wrap py-3">
          <nav className="flex items-center gap-2 text-xs" style={{ color: 'var(--li-muted)' }}>
            <Link href="/" className="hover:text-orange-500 transition-colors">Home</Link>
            <span>/</span>
            <Link href={`/${citySlug}`} className="hover:text-orange-500 transition-colors capitalize">{citySlug}</Link>
            <span>/</span>
            <span className="line-clamp-1" style={{ color: 'var(--li-text)' }}>{listing.title}</span>
          </nav>
        </div>
      </div>

      <div className="page-wrap py-8">
        {/* Back button */}
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-sm font-medium mb-6 transition-colors hover:text-orange-500"
          style={{ color: 'var(--li-muted)' }}
        >
          <ArrowLeft className="w-4 h-4" /> Back to listings
        </button>

        {/* 2-COLUMN LAYOUT */}
        <div className="grid md:grid-cols-[1fr_360px] gap-6 md:gap-8 items-start pb-24 md:pb-0">

          {/* ── LEFT COLUMN: Image + Content ── */}
          <div>
            {/* Main image */}
            <div
              className="relative rounded-3xl overflow-hidden mb-3"
              style={{ aspectRatio: '4/3', background: '#1A1A2E' }}
            >
              <AnimatePresence mode="wait">
                {mainImg ? (
                  <motion.div
                    key={imgIdx}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="absolute inset-0"
                  >
                    <Image
                      src={mainImg.url}
                      alt={listing.title}
                      fill
                      className="object-contain"
                      sizes="800px"
                    />
                  </motion.div>
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center opacity-10">
                    <Tag className="w-24 h-24 text-white" strokeWidth={1} />
                  </div>
                )}
              </AnimatePresence>

              {/* Arrow controls */}
              {images.length > 1 && (
                <>
                  <button
                    onClick={() => setImgIdx(i => Math.max(0, i - 1))}
                    className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/40 backdrop-blur flex items-center justify-center text-white transition-colors hover:bg-black/60"
                    style={{ display: imgIdx === 0 ? 'none' : 'flex' }}
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => setImgIdx(i => Math.min(images.length - 1, i + 1))}
                    className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/40 backdrop-blur flex items-center justify-center text-white transition-colors hover:bg-black/60"
                    style={{ display: imgIdx === images.length - 1 ? 'none' : 'flex' }}
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </>
              )}

              {listing.is_featured && (
                <span className="badge-featured absolute top-4 left-4 flex items-center gap-1">
                  <Star className="w-2.5 h-2.5 fill-current" strokeWidth={0} /> Featured
                </span>
              )}
              {listing.status === 'fulfilled' && (
                <div className="absolute inset-0 bg-black/55 flex items-center justify-center">
                  <span className="text-white font-bold text-lg bg-black/60 px-6 py-2 rounded-full">SOLD</span>
                </div>
              )}
            </div>

            {/* Thumbnail strip */}
            {images.length > 1 && (
              <div className="flex gap-2 mb-6">
                {images.map((img, i) => (
                  <button
                    key={img.id}
                    onClick={() => setImgIdx(i)}
                    className="relative w-20 h-16 rounded-xl overflow-hidden border-2 transition-all"
                    style={{ borderColor: i === imgIdx ? 'var(--li-primary)' : 'var(--li-border)' }}
                  >
                    <Image src={img.url} alt="" fill className="object-cover" />
                  </button>
                ))}
              </div>
            )}

            {/* Title + Price */}
            <div className="bg-white rounded-3xl p-6 mb-5 border" style={{ borderColor: 'var(--li-border)' }}>
              <div className="flex items-start justify-between gap-4 mb-3">
                <h1 className="text-2xl font-black leading-snug flex-1" style={{ color: 'var(--li-text)' }}>
                  {listing.title}
                </h1>
                <button
                  onClick={handleReport}
                  className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border transition-colors hover:border-red-400 hover:text-red-500"
                  style={{ borderColor: 'var(--li-border)', color: 'var(--li-muted)' }}
                >
                  <Flag className="w-3 h-3" /> Report
                </button>
              </div>

              {listing.price !== null ? (
                <p className="text-3xl font-black mb-3" style={{ color: 'var(--li-primary)' }}>
                  {formatPrice(listing.price)}
                </p>
              ) : (
                <p className="text-lg font-bold mb-3" style={{ color: 'var(--li-primary)' }}>Price on request</p>
              )}

              <div className="flex items-center gap-4 text-sm" style={{ color: 'var(--li-muted)' }}>
                <span className="flex items-center gap-1.5">
                  <MapPin className="w-4 h-4" style={{ color: 'var(--li-primary)' }} />
                  {listing.area ? `${listing.area}, ` : ''}{citySlug.charAt(0).toUpperCase() + citySlug.slice(1)}
                </span>
                <span className="flex items-center gap-1.5">
                  <Clock className="w-4 h-4" />
                  {timeAgo(listing.created_at)}
                </span>
              </div>
            </div>

            {/* Tabs: Description / Details */}
            <div className="bg-white rounded-3xl border overflow-hidden" style={{ borderColor: 'var(--li-border)' }}>
              <div className="flex border-b" style={{ borderColor: 'var(--li-border)' }}>
                {(['description', 'details'] as const).map(tab => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className="flex-1 py-4 text-sm font-bold capitalize transition-colors"
                    style={
                      activeTab === tab
                        ? { borderBottom: '2px solid var(--li-primary)', color: 'var(--li-primary)' }
                        : { color: 'var(--li-muted)' }
                    }
                  >
                    {tab}
                  </button>
                ))}
              </div>

              <div className="p-6">
                {activeTab === 'description' ? (
                  <>
                    <p
                      className={`text-sm leading-relaxed ${!showFull ? 'line-clamp-6' : ''}`}
                      style={{ color: 'var(--li-text)', lineHeight: 1.8, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}
                    >
                      {listing.description.replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&nbsp;/g, ' ')}
                    </p>
                    {listing.description.length > 300 && (
                      <button
                        onClick={() => setShowFull(f => !f)}
                        className="mt-3 text-sm font-semibold underline"
                        style={{ color: 'var(--li-primary)' }}
                      >
                        {showFull ? 'Show less' : 'Read full description...'}
                      </button>
                    )}
                  </>
                ) : (
                  <dl className="space-y-3">
                    {[
                      ['Status', listing.status.charAt(0).toUpperCase() + listing.status.slice(1)],
                      ['Listed', new Date(listing.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })],
                      ['Expires', new Date(listing.expires_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })],
                    ].map(([k, v]) => (
                      <div key={k} className="flex items-center justify-between py-2 border-b last:border-0" style={{ borderColor: 'var(--li-border)' }}>
                        <dt className="text-sm font-medium" style={{ color: 'var(--li-muted)' }}>{k}</dt>
                        <dd className="text-sm font-bold" style={{ color: 'var(--li-text)' }}>{v}</dd>
                      </div>
                    ))}
                  </dl>
                )}
              </div>
            </div>

            {/* Ad between description and reviews */}
            <AdBanner slot="3847291056" format="rectangle" className="mt-5 rounded-2xl" />

            {/* Reviews */}
            <div className="bg-white rounded-3xl border mt-5" style={{ borderColor: 'var(--li-border)' }}>
              <div className="px-6 pt-5 pb-4 border-b" style={{ borderColor: 'var(--li-border)' }}>
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="font-bold text-base" style={{ color: 'var(--li-text)' }}>Reviews</h2>
                    {reviews.length > 0 && (
                      <p className="text-sm mt-0.5" style={{ color: 'var(--li-muted)' }}>
                        {(reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1)} / 5
                        {' · '}{reviews.length} review{reviews.length !== 1 ? 's' : ''}
                      </p>
                    )}
                  </div>
                  {!alreadyReviewed && (
                    <button
                      onClick={() => setReviewPrompt(true)}
                      className="text-sm font-semibold px-4 py-2 rounded-xl border-2 transition-colors hover:border-orange-400"
                      style={{ borderColor: 'var(--li-border)', color: 'var(--li-primary)' }}
                    >
                      Rate seller
                    </button>
                  )}
                </div>
              </div>

              <div className="divide-y" style={{ borderColor: 'var(--li-border)' }}>
                {reviews.length === 0 ? (
                  <p className="px-6 py-8 text-center text-sm" style={{ color: 'var(--li-muted)' }}>
                    No reviews yet — be the first after chatting on WhatsApp!
                  </p>
                ) : (
                  reviews.map(rv => (
                    <div key={rv.id} className="px-6 py-4">
                      <div className="flex items-center gap-2 mb-1.5">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star
                            key={i}
                            className="w-4 h-4"
                            style={{ color: i < rv.rating ? '#F59E0B' : '#D1D5DB' }}
                            fill={i < rv.rating ? '#F59E0B' : '#D1D5DB'}
                            strokeWidth={0}
                          />
                        ))}
                        <span className="text-xs ml-1" style={{ color: 'var(--li-muted)' }}>{timeAgo(rv.created_at)}</span>
                      </div>
                      {rv.body && (
                        <p className="text-sm leading-relaxed" style={{ color: 'var(--li-text)' }}>{rv.body}</p>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* ── RIGHT COLUMN: Seller card + CTA + Safety ── */}
          <div className="space-y-5 sticky top-24">
            {/* Seller card */}
            <div className="bg-white rounded-3xl p-6 border" style={{ borderColor: 'var(--li-border)' }}>
              <p className="text-xs font-bold uppercase tracking-widest mb-4" style={{ color: 'var(--li-muted)' }}>Seller</p>
              <div className="flex items-center gap-3 mb-5">
                <div
                  className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0"
                  style={{ background: '#FFF3EC' }}
                >
                  <User className="w-6 h-6" style={{ color: 'var(--li-primary)' }} strokeWidth={1.8} />
                </div>
                <div>
                  <p className="font-bold" style={{ color: 'var(--li-text)' }}>Seller</p>
                  <p className="text-sm" style={{ color: 'var(--li-muted)' }}>{listing.contact_phone}</p>
                  {listing.wa_verified && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold mt-1 px-2 py-0.5 rounded-full" style={{ background: '#dcfce7', color: '#16a34a' }}>
                      <CheckCircle2 className="w-3 h-3" />
                      Active on WhatsApp
                    </span>
                  )}
                </div>
              </div>

              {/* WhatsApp CTA — primary action */}
              <motion.a
                href={waUrl}
                target="_blank"
                rel="noopener noreferrer"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                onClick={handleWaClick}
                className="wa-btn w-full py-4 flex items-center justify-center gap-3 text-base font-bold rounded-2xl"
                style={{ display: 'flex' }}
              >
                <MessageCircle className="w-5 h-5" />
                Chat on WhatsApp
              </motion.a>

              <p className="text-center text-xs mt-3" style={{ color: 'var(--li-muted)' }}>
                Opens WhatsApp • Reply usually within an hour
              </p>

              {/* Share this listing */}
              <button
                onClick={handleShare}
                className="w-full mt-3 flex items-center justify-center gap-2 py-2.5 rounded-2xl border-2 text-sm font-semibold transition-colors hover:border-orange-400"
                style={{ borderColor: 'var(--li-border)', color: 'var(--li-text)', background: 'white' }}
              >
                <Share2 className="w-4 h-4" style={{ color: 'var(--li-primary)' }} />
                Share this listing
              </button>

              {/* Website / Social links */}
              {(listing.website_url || listing.social_url) && (
                <div className="flex gap-2 mt-4 pt-4 border-t" style={{ borderColor: 'var(--li-border)' }}>
                  {listing.website_url && (
                    <a
                      href={listing.website_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 text-sm font-semibold transition-colors hover:border-orange-400"
                      style={{ borderColor: 'var(--li-border)', color: 'var(--li-text)' }}
                    >
                      <Globe className="w-4 h-4" style={{ color: 'var(--li-primary)' }} />
                      Website
                    </a>
                  )}
                  {listing.social_url && (
                    <a
                      href={listing.social_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 text-sm font-semibold transition-colors hover:border-orange-400"
                      style={{ borderColor: 'var(--li-border)', color: 'var(--li-text)' }}
                    >
                      <Share2 className="w-4 h-4" style={{ color: 'var(--li-primary)' }} />
                      Social Page
                    </a>
                  )}
                </div>
              )}
            </div>

            {/* Promote button — visible to listing owner only */}
            {currentUserId && listing.user_id === currentUserId && !listing.is_featured && (
              <div className="mt-4">
                <Link
                  href={`/${citySlug}/classifieds/${id}/promote`}
                  className="flex items-center justify-center gap-2 w-full h-12 rounded-2xl border-2 border-dashed font-semibold text-sm transition-all hover:border-[#F7921E] hover:bg-[#FEF3E2]/60"
                  style={{ borderColor: 'var(--li-primary)', color: 'var(--li-primary)' }}
                >
                  ⭐ Promote this listing — from ₹99
                </Link>
              </div>
            )}

            {/* Safety tips */}
            <div
              className="rounded-3xl p-5 border"
              style={{ background: '#FFFBEB', borderColor: '#FDE68A' }}
            >
              <div className="flex items-center gap-2 mb-3">
                <Shield className="w-4 h-4" style={{ color: '#D97706' }} />
                <p className="text-sm font-bold" style={{ color: '#92400E' }}>Stay Safe</p>
              </div>
              <ul className="space-y-2">
                {SAFETY_TIPS.map(tip => (
                  <li key={tip} className="flex items-start gap-2 text-xs leading-relaxed" style={{ color: '#78350F' }}>
                    <span className="mt-0.5 shrink-0">•</span>
                    {tip}
                  </li>
                ))}
              </ul>
            </div>

            {/* Map placeholder */}
            <div
              className="rounded-3xl overflow-hidden border"
              style={{ borderColor: 'var(--li-border)', height: 160, background: '#F3F4F6', position: 'relative' }}
            >
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
                <MapPin className="w-8 h-8" style={{ color: 'var(--li-primary)' }} />
                <p className="text-sm font-semibold" style={{ color: 'var(--li-text)' }}>
                  {citySlug.charAt(0).toUpperCase() + citySlug.slice(1)}
                </p>
                <p className="text-xs" style={{ color: 'var(--li-muted)' }}>Map available soon</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Fixed mobile WhatsApp bar — above the fold on phones */}
      <div className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-white/95 backdrop-blur-sm border-t px-4 py-3" style={{ borderColor: 'var(--li-border)' }}>
        <motion.a
          href={waUrl}
          target="_blank"
          rel="noopener noreferrer"
          whileTap={{ scale: 0.97 }}
          onClick={handleWaClick}
          className="wa-btn w-full py-3.5 flex items-center justify-center gap-3 text-base font-bold rounded-2xl"
          style={{ display: 'flex' }}
        >
          <MessageCircle className="w-5 h-5" />
          Chat on WhatsApp
        </motion.a>
      </div>

      {/* WA review prompt — appears 5s after WA click */}
      <AnimatePresence>
        {reviewPrompt && (
          <motion.div
            initial={{ opacity: 0, y: 80 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 80 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            className="fixed bottom-0 left-0 right-0 z-50 md:left-auto md:right-6 md:bottom-6 md:w-96"
          >
            <div className="bg-white rounded-t-3xl md:rounded-3xl shadow-2xl p-6 border" style={{ borderColor: 'var(--li-border)' }}>
              <div className="flex items-start justify-between mb-4">
                <div>
                  <p className="font-bold" style={{ color: 'var(--li-text)' }}>How was the seller?</p>
                  <p className="text-sm mt-0.5" style={{ color: 'var(--li-muted)' }}>Rate your WhatsApp experience</p>
                </div>
                <button
                  onClick={() => setReviewPrompt(false)}
                  className="p-1 rounded-full hover:bg-muted transition-colors"
                  style={{ color: 'var(--li-muted)' }}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Star picker */}
              <div className="flex gap-2 mb-4">
                {[1, 2, 3, 4, 5].map(n => (
                  <button
                    key={n}
                    onMouseEnter={() => setHoverRating(n)}
                    onMouseLeave={() => setHoverRating(0)}
                    onClick={() => setPendingRating(n)}
                    className="transition-transform hover:scale-110"
                  >
                    <Star
                      className="w-9 h-9"
                      style={{ color: n <= (hoverRating || pendingRating) ? '#F59E0B' : '#D1D5DB' }}
                      fill={n <= (hoverRating || pendingRating) ? '#F59E0B' : '#D1D5DB'}
                      strokeWidth={0}
                    />
                  </button>
                ))}
              </div>

              <textarea
                value={reviewBody}
                onChange={e => setReviewBody(e.target.value)}
                placeholder="Optional — share your experience..."
                rows={3}
                className="w-full border rounded-xl px-3 py-2.5 text-sm resize-none mb-4 focus:outline-none focus:ring-2"
                style={{ borderColor: 'var(--li-border)' }}
              />

              <button
                onClick={submitReview}
                disabled={submittingReview || pendingRating === 0}
                className="w-full py-3 rounded-xl font-bold text-sm text-white transition-opacity disabled:opacity-40"
                style={{ background: 'var(--li-primary)' }}
              >
                {submittingReview ? 'Submitting...' : 'Submit Review'}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <SiteFooter />
    </div>
  );
}

function SkeletonPage() {
  return (
    <div style={{ background: 'var(--li-page-bg)', minHeight: '100vh' }}>
      <div className="h-16 bg-white border-b" style={{ borderColor: 'var(--li-border)' }} />
      <div className="page-wrap py-8">
        <div className="grid md:grid-cols-[1fr_360px] gap-6 md:gap-8 pb-24 md:pb-0">
          <div className="space-y-4">
            <div className="w-full rounded-3xl bg-gray-200 animate-pulse" style={{ aspectRatio: '4/3' }} />
            <div className="bg-white rounded-3xl p-6 space-y-3 border" style={{ borderColor: 'var(--li-border)' }}>
              <div className="h-8 bg-gray-100 rounded animate-pulse w-3/4" />
              <div className="h-6 bg-gray-100 rounded animate-pulse w-1/4" />
              <div className="h-4 bg-gray-100 rounded animate-pulse w-1/3" />
            </div>
          </div>
          <div className="space-y-4">
            <div className="bg-white rounded-3xl p-6 space-y-4 border" style={{ borderColor: 'var(--li-border)' }}>
              <div className="h-14 w-14 bg-gray-100 rounded-2xl animate-pulse" />
              <div className="h-14 bg-gray-100 rounded-2xl animate-pulse" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
