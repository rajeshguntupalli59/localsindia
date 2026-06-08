'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import { ArrowLeft, Flag, ChevronLeft, ChevronRight } from 'lucide-react';
import { formatPrice, timeAgo } from '@/lib/utils';
import { api, ApiError } from '@/lib/api';
import type { Listing } from '@/lib/types';
import WhatsAppButton from '@/components/whatsapp-button/WhatsAppButton';
import { toast } from 'sonner';

export default function ListingDetailPage() {
  const { city: citySlug, id } = useParams<{ city: string; id: string }>();
  const router = useRouter();

  const [listing, setListing] = useState<Listing | null>(null);
  const [loading, setLoading] = useState(true);
  const [imgIdx, setImgIdx] = useState(0);
  const [showFull, setShowFull] = useState(false);

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

  if (loading) return <Skeleton />;
  if (!listing) return null;

  const images = listing.images ?? [];
  const waUrl = listing.whatsapp_url ?? `https://wa.me/${listing.contact_phone.replace('+', '')}`;

  return (
    <div className="min-h-screen pb-24" style={{ background: 'var(--li-page-bg)' }}>
      {/* Sticky header */}
      <div className="sticky top-0 z-40 flex items-center justify-between px-4 py-3 bg-white/95 backdrop-blur border-b">
        <button onClick={() => router.back()} className="flex items-center gap-1 text-sm font-medium hover:text-foreground/70">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        <button
          onClick={handleReport}
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-destructive transition-colors"
        >
          <Flag className="w-3.5 h-3.5" /> Report
        </button>
      </div>

      {/* Image carousel */}
      {images.length > 0 ? (
        <div className="relative bg-black aspect-[4/3] overflow-hidden">
          <AnimatePresence mode="wait">
            <motion.div
              key={imgIdx}
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -30 }}
              transition={{ duration: 0.2 }}
              className="absolute inset-0"
            >
              <Image src={images[imgIdx].url} alt={listing.title} fill className="object-contain" />
            </motion.div>
          </AnimatePresence>
          {images.length > 1 && (
            <>
              <button
                onClick={() => setImgIdx(i => Math.max(0, i - 1))}
                className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/40 flex items-center justify-center text-white"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                onClick={() => setImgIdx(i => Math.min(images.length - 1, i + 1))}
                className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/40 flex items-center justify-center text-white"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
                {images.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setImgIdx(i)}
                    className={`w-1.5 h-1.5 rounded-full transition-colors ${i === imgIdx ? 'bg-white' : 'bg-white/40'}`}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      ) : (
        <div className="aspect-[4/3] bg-muted flex items-center justify-center text-7xl opacity-20">🏷️</div>
      )}

      {/* Main content card */}
      <div className="bg-white mx-4 mt-4 rounded-xl p-4 shadow-sm space-y-3">
        <div className="flex items-start justify-between gap-3">
          <h1 className="text-xl font-bold leading-tight flex-1">{listing.title}</h1>
          {listing.price !== null && (
            <span className="text-xl font-bold shrink-0" style={{ color: 'var(--li-primary)' }}>
              {formatPrice(listing.price)}
            </span>
          )}
        </div>
        {listing.price === null && (
          <p className="text-sm font-semibold" style={{ color: 'var(--li-primary)' }}>Price on request</p>
        )}
        <p className="text-xs text-muted-foreground">{timeAgo(listing.created_at)}</p>

        <hr />

        <div>
          <h2 className="text-sm font-semibold mb-1.5">Description</h2>
          <p className={`text-sm text-muted-foreground leading-relaxed ${!showFull ? 'line-clamp-4' : ''}`}>
            {listing.description}
          </p>
          {listing.description.length > 220 && (
            <button
              onClick={() => setShowFull(f => !f)}
              className="text-xs font-semibold mt-1.5 underline"
              style={{ color: 'var(--li-primary)' }}
            >
              {showFull ? 'Show less' : 'Show more...'}
            </button>
          )}
        </div>
      </div>

      {/* Seller card */}
      <div className="bg-white mx-4 mt-3 rounded-xl p-4 shadow-sm">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Seller</p>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-xl">👤</div>
          <div>
            <p className="text-sm font-semibold">Seller</p>
            <p className="text-xs text-muted-foreground">{listing.contact_phone}</p>
          </div>
        </div>
      </div>

      {/* Fixed WhatsApp CTA */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t z-40 shadow-[0_-4px_12px_rgba(0,0,0,0.06)]">
        <WhatsAppButton url={waUrl} variant="full" label="Chat on WhatsApp" />
      </div>
    </div>
  );
}

function Skeleton() {
  return (
    <div className="min-h-screen" style={{ background: 'var(--li-page-bg)' }}>
      <div className="h-14 bg-white border-b" />
      <div className="aspect-[4/3] bg-muted animate-pulse" />
      <div className="mx-4 mt-4 bg-white rounded-xl p-4 space-y-3">
        <div className="h-7 bg-muted rounded animate-pulse w-3/4" />
        <div className="h-4 bg-muted rounded animate-pulse w-1/4" />
        <div className="h-20 bg-muted rounded animate-pulse" />
      </div>
    </div>
  );
}
