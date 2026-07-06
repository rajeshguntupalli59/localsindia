'use client';

import { useRef, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { usePrefs } from '@/context/PrefsContext';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MapPin, ArrowRight, ChevronLeft, ChevronRight,
  Utensils, Home, Smartphone, Car, GraduationCap, Building2,
  ShoppingBag, Briefcase, Calendar,
  BadgeCheck, type LucideIcon,
} from 'lucide-react';
import { api } from '@/lib/api';
import { timeAgo } from '@/lib/utils';
import type { Listing } from '@/lib/types';

// ─── Types ────────────────────────────────────────────────
interface DisplayListing {
  id: string;
  title: string;
  category: string;
  categorySlug: string;
  price: number | null;
  priceUnit: string;
  location: string;
  postedAt: string;
  badge: 'New' | 'Verified';
  gradient: [string, string];
  Icon: LucideIcon;
  waUrl: string;
  isReal: boolean;
}

// ─── Category → visual mapping ────────────────────────────
const CATEGORY_VISUALS: Record<string, { gradient: [string, string]; Icon: LucideIcon; label: string }> = {
  'tiffin':      { gradient: ['#FF9A3C', '#FF6B35'], Icon: Utensils,    label: 'Tiffin & Food' },
  'pg-roommate': { gradient: ['#4F8EF7', '#1D4ED8'], Icon: Home,        label: 'PG / Rooms' },
  'electronics': { gradient: ['#8B5CF6', '#4F46E5'], Icon: Smartphone,  label: 'Electronics' },
  'vehicles':    { gradient: ['#F97316', '#DC2626'], Icon: Car,         label: 'Vehicles' },
  'education':   { gradient: ['#10B981', '#047857'], Icon: GraduationCap, label: 'Education' },
  'businesses':  { gradient: ['#06B6D4', '#0284C7'], Icon: Building2,   label: 'Businesses' },
  'jobs':        { gradient: ['#6366F1', '#4338CA'], Icon: Briefcase,   label: 'Jobs' },
  'events':      { gradient: ['#EC4899', '#BE185D'], Icon: Calendar,    label: 'Events' },
  'classifieds': { gradient: ['#84CC16', '#4D7C0F'], Icon: ShoppingBag, label: 'Classifieds' },
  'services':    { gradient: ['#F59E0B', '#D97706'], Icon: Building2,   label: 'Services' },
};

const DEFAULT_VISUAL = { gradient: ['#94A3B8', '#64748B'] as [string, string], Icon: ShoppingBag, label: 'Listing' };

function realListingToDisplay(l: Listing): DisplayListing {
  const slug = l.category_slug ?? '';
  const vis = CATEGORY_VISUALS[slug] ?? DEFAULT_VISUAL;
  return {
    id: l.id,
    title: l.title,
    category: l.category_name ?? vis.label,
    categorySlug: slug,
    price: l.price,
    priceUnit: '',
    location: l.area ?? '',
    postedAt: timeAgo(l.created_at),
    badge: l.wa_verified ? 'Verified' : 'New',
    gradient: vis.gradient,
    Icon: vis.Icon,
    waUrl: l.whatsapp_url ?? `https://wa.me/${l.contact_phone.replace('+', '')}`,
    isReal: true,
  };
}

// ─── Mock data (fallback when no city selected) ───────────
const FRESH_LISTINGS: DisplayListing[] = [
  {
    id: 'mock-1', title: 'Home-style South Indian Tiffin — Monthly Plan',
    category: 'Tiffin & Food', categorySlug: 'tiffin',
    price: 1800, priceUnit: '/mo', location: 'Koramangala, Bangalore',
    postedAt: '2h ago', badge: 'New',
    gradient: ['#FF9A3C', '#FF6B35'], Icon: Utensils, waUrl: '#', isReal: false,
  },
  {
    id: 'mock-2', title: 'PG for Girls — AC Furnished, All-Inclusive',
    category: 'PG / Rooms', categorySlug: 'pg-roommate',
    price: 8500, priceUnit: '/mo', location: 'HSR Layout, Bangalore',
    postedAt: '5h ago', badge: 'Verified',
    gradient: ['#4F8EF7', '#1D4ED8'], Icon: Home, waUrl: '#', isReal: false,
  },
  {
    id: 'mock-3', title: 'iPhone 14 · 256 GB · Midnight · Box Open',
    category: 'Electronics', categorySlug: 'electronics',
    price: 54000, priceUnit: '', location: 'Jubilee Hills, Hyderabad',
    postedAt: '1h ago', badge: 'New',
    gradient: ['#8B5CF6', '#4F46E5'], Icon: Smartphone, waUrl: '#', isReal: false,
  },
  {
    id: 'mock-4', title: 'Honda Activa 6G · 2022 · 12,000 km Only',
    category: 'Vehicles', categorySlug: 'vehicles',
    price: 68000, priceUnit: '', location: 'Madhapur, Hyderabad',
    postedAt: '3h ago', badge: 'Verified',
    gradient: ['#F97316', '#DC2626'], Icon: Car, waUrl: '#', isReal: false,
  },
  {
    id: 'mock-5', title: 'CBSE Maths + Science Tutor (Grades 8–12)',
    category: 'Education', categorySlug: 'education',
    price: 2500, priceUnit: '/mo', location: 'Anna Nagar, Chennai',
    postedAt: '6h ago', badge: 'New',
    gradient: ['#10B981', '#047857'], Icon: GraduationCap, waUrl: '#', isReal: false,
  },
  {
    id: 'mock-6', title: '2 BHK Semi-Furnished · Ready to Move In',
    category: 'PG / Rooms', categorySlug: 'pg-roommate',
    price: 22000, priceUnit: '/mo', location: 'Banjara Hills, Hyderabad',
    postedAt: '4h ago', badge: 'Verified',
    gradient: ['#06B6D4', '#0284C7'], Icon: Building2, waUrl: '#', isReal: false,
  },
];

// ─── Helpers ──────────────────────────────────────────────
function formatINR(n: number | null): string {
  if (n === null) return 'On request';
  if (n >= 100_000) return `₹${(n / 100_000).toFixed(1).replace(/\.0$/, '')}L`;
  if (n >= 1_000)   return `₹${(n / 1_000).toFixed(1).replace(/\.0$/, '')}k`;
  return `₹${n}`;
}

// ─── WhatsApp SVG (official mark) ─────────────────────────
function WaIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.890-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
}

// ══════════════════════════════════════════════════════════════
//  CARD SUB-COMPONENTS
// ══════════════════════════════════════════════════════════════

function ListingBadge({ type, labelNew, labelVerified }: { type: DisplayListing['badge']; labelNew: string; labelVerified: string }) {
  if (type === 'Verified') {
    return (
      <div className="inline-flex items-center gap-[5px]
        pl-[7px] pr-2.5 py-[5px] rounded-full
        bg-white/95 backdrop-blur-sm
        shadow-[0_1px_4px_rgba(0,0,0,0.12),0_0_0_1px_rgba(186,230,253,0.50)]">
        <BadgeCheck className="w-[11px] h-[11px] text-sky-500 shrink-0" strokeWidth={2.5} />
        <span className="text-[9.5px] font-bold text-sky-600 uppercase tracking-[0.07em] leading-none">
          {labelVerified}
        </span>
      </div>
    );
  }
  return (
    <div className="inline-flex items-center gap-[5px]
      pl-[7px] pr-2.5 py-[5px] rounded-full
      bg-emerald-500/90 backdrop-blur-sm
      shadow-[0_1px_4px_rgba(0,0,0,0.18)]">
      <span className="w-[5px] h-[5px] rounded-full bg-white/80 shrink-0 inline-block" />
      <span className="text-[9.5px] font-bold text-white uppercase tracking-[0.07em] leading-none">
        {labelNew}
      </span>
    </div>
  );
}


function WaTray({ url, waLabel, listingId, isReal }: { url: string; waLabel: string; listingId: string; isReal: boolean }) {
  const isRealWaLink = url.startsWith('https://wa.me');
  const href = isRealWaLink
    ? url
    : (isReal ? `/listing/${listingId}` : '/search');
  return (
    <div className="px-4 pb-4">
      <div className="h-px bg-slate-100 mb-3" />
      <a
        href={href}
        target={isRealWaLink ? '_blank' : '_self'}
        rel={isRealWaLink ? 'noopener noreferrer' : undefined}
        onClick={e => e.stopPropagation()}
        className="group/tray flex items-center justify-between w-full
          px-3 py-2.5 rounded-full
          bg-[#F0FDF4]
          hover:bg-[#DCFCE7]
          active:scale-[0.96]
          transition-all duration-150 select-none"
        aria-label="Contact seller on WhatsApp"
      >
        <div className="flex items-center gap-2.5">
          <div className="w-[26px] h-[26px] rounded-[7px]
            bg-[#25D366]/15 flex items-center justify-center shrink-0">
            <WaIcon className="w-[13px] h-[13px] text-[#16a34a]" />
          </div>
          <span className="text-[12.5px] font-semibold text-[#166534] leading-none">
            {waLabel}
          </span>
        </div>
        <ArrowRight
          className="w-3.5 h-3.5 text-emerald-400/70
            group-hover/tray:translate-x-0.5
            transition-transform duration-200"
          strokeWidth={2}
          aria-hidden
        />
      </a>
    </div>
  );
}

function SkLine({ className }: { className: string }) {
  return (
    <div className={`relative overflow-hidden rounded bg-slate-100 ${className}`}>
      <div className="absolute inset-0 -translate-x-full
        animate-[shimmer_1.6s_ease-in-out_infinite]
        bg-gradient-to-r from-transparent via-white/70 to-transparent" />
    </div>
  );
}

function CardSkeleton() {
  return (
    <div
      className="bg-white rounded-2xl overflow-hidden flex flex-col"
      style={{ boxShadow: '0 4px 20px rgba(0,0,0,0.05), 0 1px 4px rgba(0,0,0,0.03)' }}
    >
      <div className="relative h-[152px] bg-slate-100 overflow-hidden">
        <div className="absolute inset-0 -translate-x-full
          animate-[shimmer_1.6s_ease-in-out_infinite]
          bg-gradient-to-r from-transparent via-white/55 to-transparent" />
        <div className="absolute top-3 left-3 h-[22px] w-[62px] rounded-full bg-white/35" />
        <div className="absolute top-3 right-3 h-[22px] w-[76px] rounded-full bg-white/20" />
      </div>
      <div className="flex-1 px-4 pt-4 pb-2.5 flex flex-col gap-3">
        <SkLine className="h-[20px] w-[80px] rounded-lg" />
        <div className="space-y-[7px]">
          <SkLine className="h-[13px] w-full" />
          <SkLine className="h-[13px] w-[72%]" />
        </div>
        <SkLine className="h-[11px] w-[45%]" />
      </div>
      <div className="px-4 pb-4">
        <div className="h-px bg-slate-100 mb-3" />
        <SkLine className="h-[42px] w-full rounded-[11px]" />
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
//  LISTING CARD
// ══════════════════════════════════════════════════════════════
function FreshListingCard({
  listing, index, labelNew, labelVerified, labelChatOnWA, citySlug,
}: {
  listing: DisplayListing; index: number; labelNew: string; labelVerified: string;
  labelChatOnWA: string; citySlug: string;
}) {
  const solidColor = listing.gradient[0];
  const router = useRouter();

  const handleCardClick = () => {
    if (listing.isReal) {
      router.push(`/listing/${listing.id}`);
    } else {
      const city = citySlug || (typeof window !== 'undefined' ? (localStorage.getItem('li_city') || 'hyderabad') : 'hyderabad');
      router.push(`/${city}/search?category=${encodeURIComponent(listing.categorySlug)}`);
    }
  };

  return (
    <motion.article
      initial={{ opacity: 0, y: 14 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-30px' }}
      transition={{ delay: index * 0.06, duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
      whileHover={{
        y: -5,
        boxShadow: '0 16px 40px rgba(0,0,0,0.10), 0 6px 16px rgba(0,0,0,0.05)',
        transition: { duration: 0.2, ease: 'easeOut' },
      }}
      onClick={handleCardClick}
      style={{ boxShadow: '0 4px 20px rgba(0,0,0,0.05), 0 1px 4px rgba(0,0,0,0.03)' }}
      className="group bg-white rounded-2xl overflow-hidden cursor-pointer flex flex-col"
    >
      {/* ── 3px category colour strip ────────────────── */}
      <div className="h-[3px] shrink-0" style={{ backgroundColor: solidColor }} aria-hidden />

      {/* ── Category header row ──────────────────────── */}
      <div className="flex items-center gap-2.5 px-4 pt-4 pb-3 shrink-0">
        {/* Icon swatch */}
        <div className="relative w-[36px] h-[36px] rounded-[10px] shrink-0">
          <div
            className="absolute inset-0 rounded-[10px]"
            style={{ backgroundColor: solidColor, opacity: 0.12 }}
          />
          <div className="relative z-10 w-full h-full flex items-center justify-center">
            <listing.Icon
              className="w-[16px] h-[16px]"
              style={{ color: solidColor }}
              strokeWidth={2}
              aria-hidden
            />
          </div>
        </div>
        {/* Category name */}
        <span
          className="text-[11.5px] font-semibold leading-none flex-1 truncate"
          style={{ color: solidColor }}
        >
          {listing.category}
        </span>
        {/* Badge */}
        <div className="shrink-0">
          <ListingBadge type={listing.badge} labelNew={labelNew} labelVerified={labelVerified} />
        </div>
      </div>

      {/* ── Card body ────────────────────────────────── */}
      <div className="flex-1 px-4 pb-0 flex flex-col gap-2">
        {/* Price pill + unit */}
        <div className="flex items-baseline gap-2 flex-wrap">
          <span className="inline-flex items-center px-3 py-[6px] rounded-full
            text-[14px] font-black tabular-nums tracking-tight leading-none
            bg-orange-50 text-[#E07B0A]">
            {formatINR(listing.price)}
          </span>
          {listing.priceUnit && (
            <span className="text-[11px] font-medium text-slate-400 leading-none">
              {listing.priceUnit}
            </span>
          )}
        </div>

        <h3 className="text-[14px] font-semibold text-slate-800 leading-[1.45]
          line-clamp-2 tracking-[-0.01em]
          group-hover:text-slate-900 transition-colors duration-200">
          {listing.title}
        </h3>

        {/* Location + time pill tags */}
        <div className="flex items-center gap-1.5 pb-4 flex-wrap">
          {listing.location && (
            <span className="inline-flex items-center gap-1 px-2.5 py-[4px] rounded-full
              text-[10.5px] font-medium bg-slate-100 text-slate-500">
              <MapPin className="w-[9px] h-[9px] shrink-0" strokeWidth={2} aria-hidden />
              <span className="truncate max-w-[120px]">{listing.location}</span>
            </span>
          )}
          <span className="inline-flex items-center px-2.5 py-[4px] rounded-full
            text-[10.5px] font-medium bg-slate-100 text-slate-500 shrink-0">
            {listing.postedAt}
          </span>
        </div>
      </div>

      {/* ── WhatsApp action tray ──────────────────────── */}
      <WaTray url={listing.waUrl} waLabel={labelChatOnWA} listingId={listing.id} isReal={listing.isReal} />
    </motion.article>
  );
}

// ══════════════════════════════════════════════════════════════
//  SECTION
// ══════════════════════════════════════════════════════════════
interface FreshListingsSectionProps {
  isLoading?: boolean;
}

export default function FreshListingsSection({
  isLoading = false,
}: FreshListingsSectionProps) {
  const { t, citySlug } = usePrefs();
  const router = useRouter();
  const trackRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft,  setCanScrollLeft]  = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);
  const [listings, setListings] = useState<DisplayListing[]>(FRESH_LISTINGS);
  const [fetchingReal, setFetchingReal] = useState(false);

  // ── Fetch real listings — default to hyderabad for new visitors ──────────────
  useEffect(() => {
    const effectiveCity = citySlug ||
      (typeof window !== 'undefined' ? (localStorage.getItem('li_city') || 'hyderabad') : 'hyderabad');
    setFetchingReal(true);
    api.cities.listings(effectiveCity, { page_size: '6', sort: 'newest' })
      .then(data => {
        if (data && data.length > 0) {
          setListings(data.map(realListingToDisplay));
        } else {
          setListings(FRESH_LISTINGS);
        }
      })
      .catch(() => setListings(FRESH_LISTINGS))
      .finally(() => setFetchingReal(false));
  }, [citySlug]);

  const syncArrows = () => {
    const el = trackRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 10);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 10);
  };

  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    el.addEventListener('scroll', syncArrows, { passive: true });
    syncArrows();
    return () => el.removeEventListener('scroll', syncArrows);
  }, [listings]);

  const scroll = (dir: 'left' | 'right') =>
    trackRef.current?.scrollBy({ left: dir === 'right' ? 320 : -320, behavior: 'smooth' });

  const arrowBtn =
    'absolute top-[40%] -translate-y-1/2 z-10 hidden md:flex w-10 h-10 rounded-full ' +
    'bg-white border border-slate-200/80 items-center justify-center ' +
    'shadow-[0_2px_12px_rgba(0,0,0,0.07),0_1px_3px_rgba(0,0,0,0.04)] ' +
    'text-slate-400 hover:text-slate-700 hover:border-slate-300/60 ' +
    'hover:shadow-[0_4px_18px_rgba(0,0,0,0.09)] transition-all duration-200';

  const showSkeleton = isLoading || fetchingReal;
  const isMockData = !showSkeleton && listings.length > 0 && listings[0].isReal === false;

  return (
    <section className="bg-white py-24 sm:py-32">
      <div className="page-wrap">

        {/* ── Section header ───────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.38 }}
          className="flex items-end justify-between mb-14 gap-4"
        >
          <div>
            <div className="flex items-center gap-2 mb-3">
              {isMockData ? (
                <span className="text-[10px] font-semibold uppercase tracking-[0.13em]
                  text-slate-400">
                  Example listings
                </span>
              ) : (
                <>
                  <span className="relative flex h-[7px] w-[7px]">
                    <span className="animate-ping absolute inline-flex h-full w-full
                      rounded-full bg-emerald-400 opacity-70" />
                    <span className="relative inline-flex rounded-full h-[7px] w-[7px]
                      bg-emerald-500" />
                  </span>
                  <span className="text-[10px] font-semibold uppercase tracking-[0.13em]
                    text-emerald-600">
                    {t('fresh.live')}
                  </span>
                </>
              )}
            </div>
            <h2 className="text-[2rem] sm:text-[2.375rem] font-extrabold text-slate-900
              tracking-[-0.04em] leading-tight">
              {t('fresh.title')}
            </h2>
            <p className="text-[14px] text-slate-500 mt-3 leading-relaxed">
              {t('fresh.sub')}
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              const city = citySlug || (typeof window !== 'undefined' ? (localStorage.getItem('li_city') || 'hyderabad') : 'hyderabad');
              router.push(`/${city}/search`);
            }}
            className="hidden sm:flex items-center gap-1.5 shrink-0 pb-0.5
              text-[13px] font-semibold text-[#F7921E] hover:text-[#E07B0A]
              transition-colors duration-150 group"
          >
            {t('fresh.viewAll')}
            <ArrowRight
              className="w-3.5 h-3.5 transition-transform duration-200
                group-hover:translate-x-0.5"
              strokeWidth={2.2}
            />
          </button>
        </motion.div>

        {/* ── Carousel ─────────────────────────────── */}
        <div className="relative">

          <AnimatePresence>
            {canScrollLeft && !showSkeleton && (
              <motion.button
                key="left"
                type="button"
                initial={{ opacity: 0, scale: 0.88 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.88 }}
                transition={{ duration: 0.14 }}
                onClick={() => scroll('left')}
                aria-label="Scroll left"
                className={`${arrowBtn} -translate-x-5`}
              >
                <ChevronLeft className="w-4 h-4" strokeWidth={2} />
              </motion.button>
            )}
          </AnimatePresence>

          <div
            ref={trackRef}
            className="flex gap-4 overflow-x-auto scrollbar-none snap-x snap-mandatory
              -mx-4 px-4 sm:-mx-6 sm:px-6 md:-mx-8 md:px-8 lg:mx-0 lg:px-0 pb-1"
          >
            {showSkeleton
              ? Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="min-w-[82vw] sm:min-w-[calc(50%-8px)]
                    lg:min-w-[calc(25%-12px)] shrink-0 snap-start">
                    <CardSkeleton />
                  </div>
                ))
              : listings.map((listing, i) => (
                  <div key={listing.id} className="min-w-[82vw] sm:min-w-[calc(50%-8px)]
                    lg:min-w-[calc(25%-12px)] shrink-0 snap-start">
                    <FreshListingCard
                      listing={listing}
                      index={i}
                      labelNew={t('fresh.badgeNew')}
                      labelVerified={t('fresh.badgeVerified')}
                      labelChatOnWA={t('listing.chatOnWA')}
                      citySlug={citySlug}
                    />
                  </div>
                ))
            }
          </div>

          <AnimatePresence>
            {canScrollRight && !showSkeleton && (
              <motion.button
                key="right"
                type="button"
                initial={{ opacity: 0, scale: 0.88 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.88 }}
                transition={{ duration: 0.14 }}
                onClick={() => scroll('right')}
                aria-label="Scroll right"
                className={`${arrowBtn} translate-x-5`}
              >
                <ChevronRight className="w-4 h-4" strokeWidth={2} />
              </motion.button>
            )}
          </AnimatePresence>
        </div>

        {/* ── Progress dots — mobile ────────────────── */}
        {!showSkeleton && (
          <div className="flex justify-center gap-[5px] mt-5 sm:hidden" aria-hidden>
            {listings.map((_, i) => (
              <div key={i} className="w-[5px] h-[5px] rounded-full bg-slate-300/80" />
            ))}
          </div>
        )}

        {/* ── View all CTA ─────────────────────────── */}
        <div className="flex justify-center mt-6">
          <button
            type="button"
            onClick={() => {
              const city = citySlug || (typeof window !== 'undefined' ? (localStorage.getItem('li_city') || 'hyderabad') : 'hyderabad');
              router.push(`/${city}/search`);
            }}
            className="flex items-center gap-2 px-8 py-[12px] rounded-full
              bg-[#F7921E] text-white text-[14px] font-semibold
              shadow-[0_4px_20px_rgba(247,146,30,0.32),inset_0_1px_0_rgba(255,255,255,0.14)]
              hover:bg-[#E07B0A] hover:shadow-[0_6px_24px_rgba(247,146,30,0.44)]
              active:scale-[0.95] transition-all duration-200 group"
          >
            {t('fresh.viewAllNear')}
            <ArrowRight
              className="w-3.5 h-3.5 transition-transform duration-200
                group-hover:translate-x-0.5"
              strokeWidth={2.2}
            />
          </button>
        </div>

        {/* ── Footnote ─────────────────────────────── */}
        <p className="mt-7 text-center text-[11px] text-slate-400/75 tracking-wide">
          {isMockData
            ? 'Example listings — no live postings in your city yet. Be the first to post one.'
            : t('fresh.footnote')}
        </p>

      </div>
    </section>
  );
}
