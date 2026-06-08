'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowLeft, Flag, ChevronLeft, ChevronRight, MapPin, Clock, Shield, MessageCircle } from 'lucide-react';
import { formatPrice, timeAgo } from '@/lib/utils';
import { api, ApiError } from '@/lib/api';
import type { Listing } from '@/lib/types';
import SiteHeader from '@/components/site-header/SiteHeader';
import SiteFooter from '@/components/site-footer/SiteFooter';
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
  const [imgIdx, setImgIdx] = useState(0);
  const [showFull, setShowFull] = useState(false);
  const [activeTab, setActiveTab] = useState<'description' | 'details'>('description');

  useEffect(() => {
    api.listings
      .get(id)
      .then(setListing)
      .catch(() => router.replace(`/${citySlug}`))
      .finally(() => setLoading(false));
  }, [id, citySlug, router]);

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
        <div className="grid grid-cols-[1fr_360px] gap-8 items-start">

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
                  <div className="absolute inset-0 flex items-center justify-center text-8xl opacity-15">🏷️</div>
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
                <span className="badge-featured absolute top-4 left-4">⭐ Featured</span>
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
                  {citySlug.charAt(0).toUpperCase() + citySlug.slice(1)}
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
                      style={{ color: 'var(--li-text)', lineHeight: 1.8 }}
                    >
                      {listing.description}
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
          </div>

          {/* ── RIGHT COLUMN: Seller card + CTA + Safety ── */}
          <div className="space-y-5 sticky top-24">
            {/* Seller card */}
            <div className="bg-white rounded-3xl p-6 border" style={{ borderColor: 'var(--li-border)' }}>
              <p className="text-xs font-bold uppercase tracking-widest mb-4" style={{ color: 'var(--li-muted)' }}>Seller</p>
              <div className="flex items-center gap-3 mb-5">
                <div
                  className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl shrink-0"
                  style={{ background: '#FFF3EC' }}
                >
                  👤
                </div>
                <div>
                  <p className="font-bold" style={{ color: 'var(--li-text)' }}>Seller</p>
                  <p className="text-sm" style={{ color: 'var(--li-muted)' }}>{listing.contact_phone}</p>
                </div>
              </div>

              {/* WhatsApp CTA — primary action */}
              <motion.a
                href={waUrl}
                target="_blank"
                rel="noopener noreferrer"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                className="wa-btn w-full py-4 flex items-center justify-center gap-3 text-base font-bold rounded-2xl"
                style={{ display: 'flex' }}
              >
                <MessageCircle className="w-5 h-5" />
                Chat on WhatsApp
              </motion.a>

              <p className="text-center text-xs mt-3" style={{ color: 'var(--li-muted)' }}>
                Opens WhatsApp • Reply usually within an hour
              </p>
            </div>

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

      <SiteFooter />
    </div>
  );
}

function SkeletonPage() {
  return (
    <div style={{ background: 'var(--li-page-bg)', minHeight: '100vh' }}>
      <div className="h-16 bg-white border-b" style={{ borderColor: 'var(--li-border)' }} />
      <div className="page-wrap py-8">
        <div className="grid grid-cols-[1fr_360px] gap-8">
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
