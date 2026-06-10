'use client';

import { useRef, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MapPin, Clock, ArrowRight, ChevronLeft, ChevronRight,
  Utensils, Home, Smartphone, Car, GraduationCap, Building2,
  BadgeCheck, type LucideIcon,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────
interface MockListing {
  id: string;
  title: string;
  category: string;
  categorySlug: string;
  price: number;
  priceUnit: string;
  location: string;
  badge: 'New' | 'Verified' | 'Hot';
  gradient: [string, string];
  Icon: LucideIcon;
  postedAt: string;
  waUrl: string;
}

// ─── Mock data ────────────────────────────────────────────────
const FRESH_LISTINGS: MockListing[] = [
  {
    id: 'mock-1', title: 'Home-style South Indian Tiffin — Monthly Plan',
    category: 'Tiffin & Food', categorySlug: 'tiffin',
    price: 1800, priceUnit: '/mo', location: 'Koramangala, Bangalore',
    badge: 'New', gradient: ['#FF9A3C', '#FF6B35'], Icon: Utensils,
    postedAt: '2h ago', waUrl: '#',
  },
  {
    id: 'mock-2', title: 'PG for Girls — AC Furnished, All-Inclusive',
    category: 'PG / Rooms', categorySlug: 'pg-roommate',
    price: 8500, priceUnit: '/mo', location: 'HSR Layout, Bangalore',
    badge: 'Verified', gradient: ['#4F8EF7', '#1D4ED8'], Icon: Home,
    postedAt: '5h ago', waUrl: '#',
  },
  {
    id: 'mock-3', title: 'iPhone 14 · 256 GB · Midnight · Box Open',
    category: 'Electronics', categorySlug: 'electronics',
    price: 54000, priceUnit: '', location: 'Jubilee Hills, Hyderabad',
    badge: 'New', gradient: ['#8B5CF6', '#4F46E5'], Icon: Smartphone,
    postedAt: '1h ago', waUrl: '#',
  },
  {
    id: 'mock-4', title: 'Honda Activa 6G · 2022 · 12,000 km Only',
    category: 'Vehicles', categorySlug: 'vehicles',
    price: 68000, priceUnit: '', location: 'Madhapur, Hyderabad',
    badge: 'Verified', gradient: ['#F97316', '#DC2626'], Icon: Car,
    postedAt: '3h ago', waUrl: '#',
  },
  {
    id: 'mock-5', title: 'CBSE Maths + Science Tutor (Grades 8–12)',
    category: 'Education', categorySlug: 'education',
    price: 2500, priceUnit: '/mo', location: 'Anna Nagar, Chennai',
    badge: 'New', gradient: ['#10B981', '#047857'], Icon: GraduationCap,
    postedAt: '6h ago', waUrl: '#',
  },
  {
    id: 'mock-6', title: '2 BHK Semi-Furnished · Ready to Move In',
    category: 'PG / Rooms', categorySlug: 'pg-roommate',
    price: 22000, priceUnit: '/mo', location: 'Banjara Hills, Hyderabad',
    badge: 'Verified', gradient: ['#06B6D4', '#0284C7'], Icon: Building2,
    postedAt: '4h ago', waUrl: '#',
  },
];

// ─── Category accent colours ──────────────────────────────────
const CAT_ACCENT: Record<string, string> = {
  tiffin:         'bg-amber-50 text-amber-700 ring-1 ring-amber-100',
  'pg-roommate':  'bg-blue-50 text-blue-700 ring-1 ring-blue-100',
  electronics:    'bg-violet-50 text-violet-700 ring-1 ring-violet-100',
  vehicles:       'bg-orange-50 text-orange-700 ring-1 ring-orange-100',
  education:      'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100',
};
const fallbackAccent = 'bg-slate-100 text-slate-600 ring-1 ring-slate-200';

// ─── Helpers ──────────────────────────────────────────────────
function formatINR(n: number): string {
  if (n >= 100000) return `₹${(n / 100000).toFixed(1).replace(/\.0$/, '')}L`;
  if (n >= 1000)   return `₹${(n / 1000).toFixed(1).replace(/\.0$/, '')}k`;
  return `₹${n}`;
}

// ─── WhatsApp SVG (official path) ────────────────────────────
function WaIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.890-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
}

// ─── Badge ────────────────────────────────────────────────────
function ListingBadge({ type }: { type: MockListing['badge'] }) {
  if (type === 'Verified') {
    return (
      <div className="flex items-center gap-1 bg-white/95 backdrop-blur-sm
        pl-1.5 pr-2.5 py-1 rounded-full
        ring-1 ring-blue-200/70 shadow-sm">
        <BadgeCheck className="w-3 h-3 text-blue-500 shrink-0" strokeWidth={2.5} />
        <span className="text-[10px] font-semibold text-blue-600 leading-none tracking-wide">
          Verified
        </span>
      </div>
    );
  }
  if (type === 'Hot') {
    return (
      <div className="bg-white/95 backdrop-blur-sm
        px-2.5 py-1 rounded-full
        ring-1 ring-rose-200/70 shadow-sm">
        <span className="text-[10px] font-semibold text-rose-600 leading-none tracking-wide">
          Hot
        </span>
      </div>
    );
  }
  // New
  return (
    <div className="bg-white/95 backdrop-blur-sm
      px-2.5 py-1 rounded-full
      ring-1 ring-emerald-200/70 shadow-sm">
      <span className="text-[10px] font-semibold text-emerald-600 leading-none tracking-wide">
        New
      </span>
    </div>
  );
}

// ─── WhatsApp CTA ─────────────────────────────────────────────
function WaCta({ url }: { url: string }) {
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      onClick={e => e.stopPropagation()}
      className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl
        bg-[#25D366]/[0.08] border border-[#25D366]/20 text-[#1a7a47]
        text-[12.5px] font-semibold
        hover:bg-[#25D366]/[0.15] hover:border-[#25D366]/30
        active:scale-[0.98]
        transition-all duration-200"
      aria-label="Contact seller on WhatsApp"
    >
      <WaIcon className="w-[15px] h-[15px] text-[#25D366]" />
      WhatsApp Seller
    </a>
  );
}

// ─── Loading skeleton ─────────────────────────────────────────
function CardSkeleton() {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden flex flex-col">
      {/* Image zone */}
      <div className="h-[148px] bg-gradient-to-br from-slate-100 to-slate-50 relative overflow-hidden">
        <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.4s_infinite]
          bg-gradient-to-r from-transparent via-white/60 to-transparent" />
      </div>
      {/* Body */}
      <div className="p-4 flex flex-col gap-3">
        {/* Price + badge row */}
        <div className="flex items-center justify-between">
          <div className="h-6 w-[72px] bg-slate-100 rounded-lg overflow-hidden relative">
            <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.4s_infinite]
              bg-gradient-to-r from-transparent via-white/80 to-transparent" />
          </div>
          <div className="h-5 w-16 bg-slate-100 rounded-full overflow-hidden relative">
            <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.4s_0.1s_infinite]
              bg-gradient-to-r from-transparent via-white/80 to-transparent" />
          </div>
        </div>
        {/* Title lines */}
        <div className="space-y-2">
          <div className="h-4 w-full bg-slate-100 rounded overflow-hidden relative">
            <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.4s_0.2s_infinite]
              bg-gradient-to-r from-transparent via-white/80 to-transparent" />
          </div>
          <div className="h-4 w-4/5 bg-slate-100 rounded overflow-hidden relative">
            <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.4s_0.3s_infinite]
              bg-gradient-to-r from-transparent via-white/80 to-transparent" />
          </div>
        </div>
        {/* Location row */}
        <div className="h-3.5 w-2/5 bg-slate-100 rounded overflow-hidden relative">
          <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.4s_0.4s_infinite]
            bg-gradient-to-r from-transparent via-white/80 to-transparent" />
        </div>
        {/* WA button skeleton */}
        <div className="h-9 w-full bg-slate-100 rounded-xl overflow-hidden relative mt-0.5">
          <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.4s_0.5s_infinite]
            bg-gradient-to-r from-transparent via-white/80 to-transparent" />
        </div>
      </div>
    </div>
  );
}

// ─── Individual listing card ───────────────────────────────────
function FreshListingCard({ listing, index }: { listing: MockListing; index: number }) {
  const accent = CAT_ACCENT[listing.categorySlug] ?? fallbackAccent;
  const [from, to] = listing.gradient;

  return (
    <motion.article
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-32px' }}
      transition={{ delay: index * 0.06, duration: 0.36, ease: [0.22, 1, 0.36, 1] }}
      whileHover={{ y: -2, transition: { duration: 0.18 } }}
      className="group bg-white rounded-2xl border border-slate-100 overflow-hidden
        shadow-[0_1px_3px_rgba(0,0,0,0.05),0_1px_2px_rgba(0,0,0,0.03)]
        hover:shadow-[0_16px_40px_-8px_rgba(0,0,0,0.10),0_4px_10px_-4px_rgba(0,0,0,0.05)]
        hover:border-slate-200/60
        transition-[box-shadow,border-color,transform] duration-300
        cursor-pointer flex flex-col"
    >
      {/* ── Image zone ─────────────────────────────────── */}
      <div
        className="relative h-[148px] shrink-0 overflow-hidden"
        style={{ background: `linear-gradient(135deg, ${from} 0%, ${to} 100%)` }}
      >
        {/* Centered oversized icon — purely decorative */}
        <listing.Icon
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2
            text-white opacity-[0.14] transition-transform duration-300
            group-hover:scale-105"
          style={{ width: 72, height: 72 }}
          strokeWidth={1}
        />

        {/* Badge — top-left, frosted glass */}
        <div className="absolute top-3 left-3 z-10">
          <ListingBadge type={listing.badge} />
        </div>
      </div>

      {/* ── Card body ──────────────────────────────────── */}
      <div className="flex flex-col flex-1 p-4 pt-3.5 gap-2.5">

        {/* ── Row 1: Price + Category ── */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-baseline gap-1 min-w-0">
            <span className="text-[17px] font-extrabold text-slate-900
              tracking-tight leading-none tabular-nums shrink-0">
              {formatINR(listing.price)}
            </span>
            {listing.priceUnit && (
              <span className="text-[11px] font-medium text-slate-400 leading-none">
                {listing.priceUnit}
              </span>
            )}
          </div>
          <span className={`text-[10px] font-semibold tracking-[0.04em]
            px-2 py-[3px] rounded-full shrink-0 ${accent}`}>
            {listing.category}
          </span>
        </div>

        {/* ── Row 2: Title ── */}
        <h3 className="text-[13.5px] font-semibold text-slate-800 leading-snug
          line-clamp-2 flex-1 min-h-[2.8em]
          group-hover:text-orange-600 transition-colors duration-200">
          {listing.title}
        </h3>

        {/* ── Row 3: Location + Time ── */}
        <div className="flex items-center justify-between gap-2">
          <span className="flex items-center gap-1 text-[11px] text-slate-400 min-w-0">
            <MapPin className="w-3 h-3 shrink-0 text-slate-300" strokeWidth={2} />
            <span className="truncate">{listing.location}</span>
          </span>
          <span className="flex items-center gap-1 text-[11px] text-slate-400 shrink-0">
            <Clock className="w-3 h-3 text-slate-300" strokeWidth={2} />
            {listing.postedAt}
          </span>
        </div>

        {/* ── Divider ── */}
        <div className="h-px bg-slate-100" />

        {/* ── WhatsApp CTA ── */}
        <WaCta url={listing.waUrl} />

      </div>
    </motion.article>
  );
}

// ─── Section ──────────────────────────────────────────────────
interface FreshListingsSectionProps {
  onCityPickerOpen?: () => void;
  isLoading?: boolean;
}

export default function FreshListingsSection({
  onCityPickerOpen,
  isLoading = false,
}: FreshListingsSectionProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft,  setCanScrollLeft]  = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

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
  }, []);

  const scroll = (dir: 'left' | 'right') => {
    trackRef.current?.scrollBy({ left: dir === 'right' ? 320 : -320, behavior: 'smooth' });
  };

  const skeletonCount = 6;

  return (
    <section className="bg-slate-50/60 py-16 sm:py-20 border-b border-slate-100">
      <div className="page-wrap">

        {/* ── Section header ─────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.38 }}
          className="flex items-end justify-between mb-10 gap-4"
        >
          <div>
            <div className="flex items-center gap-2 mb-2.5">
              <span className="relative flex h-[7px] w-[7px]">
                <span className="animate-ping absolute inline-flex h-full w-full
                  rounded-full bg-emerald-400 opacity-70" />
                <span className="relative inline-flex rounded-full h-[7px] w-[7px] bg-emerald-500" />
              </span>
              <span className="text-[10px] font-semibold uppercase tracking-[0.13em] text-emerald-600">
                Live · Updated just now
              </span>
            </div>
            <h2 className="text-2xl sm:text-[1.75rem] font-bold text-slate-900
              tracking-[-0.02em] leading-none">
              Fresh Listings Near You
            </h2>
            <p className="text-[13px] text-slate-500 mt-2 leading-relaxed">
              Real people, real prices — contact sellers directly via WhatsApp.
            </p>
          </div>

          <button
            type="button"
            onClick={onCityPickerOpen}
            className="hidden sm:flex items-center gap-1.5 shrink-0 text-[13px]
              font-semibold text-orange-500 hover:text-orange-600
              transition-colors duration-150 group pb-0.5"
          >
            View all
            <ArrowRight className="w-3.5 h-3.5 transition-transform duration-200
              group-hover:translate-x-0.5" strokeWidth={2.2} />
          </button>
        </motion.div>

        {/* ── Carousel ───────────────────────────────── */}
        <div className="relative">

          {/* Left arrow */}
          <AnimatePresence>
            {canScrollLeft && !isLoading && (
              <motion.button
                key="left"
                type="button"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                onClick={() => scroll('left')}
                aria-label="Scroll left"
                className="absolute left-0 top-[44%] -translate-y-1/2 -translate-x-4
                  z-10 hidden md:flex w-9 h-9 rounded-full
                  bg-white border border-slate-200
                  items-center justify-center
                  shadow-[0_2px_8px_rgba(0,0,0,0.08)]
                  text-slate-500 hover:text-slate-900
                  hover:shadow-[0_4px_14px_rgba(0,0,0,0.10)]
                  transition-shadow duration-200"
              >
                <ChevronLeft className="w-4 h-4" strokeWidth={2} />
              </motion.button>
            )}
          </AnimatePresence>

          {/* Scrollable track */}
          <div
            ref={trackRef}
            className="flex gap-4 overflow-x-auto scrollbar-none snap-x snap-mandatory
              -mx-4 px-4 sm:-mx-6 sm:px-6 md:-mx-8 md:px-8 lg:mx-0 lg:px-0 pb-1"
          >
            {isLoading
              ? Array.from({ length: skeletonCount }).map((_, i) => (
                  <div key={i} className="min-w-[78vw] sm:min-w-[calc(50%-8px)]
                    lg:min-w-[calc(25%-12px)] shrink-0 snap-start">
                    <CardSkeleton />
                  </div>
                ))
              : FRESH_LISTINGS.map((listing, i) => (
                  <div key={listing.id} className="min-w-[78vw] sm:min-w-[calc(50%-8px)]
                    lg:min-w-[calc(25%-12px)] shrink-0 snap-start">
                    <FreshListingCard listing={listing} index={i} />
                  </div>
                ))
            }
          </div>

          {/* Right arrow */}
          <AnimatePresence>
            {canScrollRight && !isLoading && (
              <motion.button
                key="right"
                type="button"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                onClick={() => scroll('right')}
                aria-label="Scroll right"
                className="absolute right-0 top-[44%] -translate-y-1/2 translate-x-4
                  z-10 hidden md:flex w-9 h-9 rounded-full
                  bg-white border border-slate-200
                  items-center justify-center
                  shadow-[0_2px_8px_rgba(0,0,0,0.08)]
                  text-slate-500 hover:text-slate-900
                  hover:shadow-[0_4px_14px_rgba(0,0,0,0.10)]
                  transition-shadow duration-200"
              >
                <ChevronRight className="w-4 h-4" strokeWidth={2} />
              </motion.button>
            )}
          </AnimatePresence>
        </div>

        {/* ── Dot indicators — mobile ─────────────────── */}
        {!isLoading && (
          <div className="flex justify-center gap-1.5 mt-5 sm:hidden" aria-hidden>
            {FRESH_LISTINGS.map((_, i) => (
              <div key={i} className="w-1.5 h-1.5 rounded-full bg-slate-300" />
            ))}
          </div>
        )}

        {/* ── Mobile CTA ─────────────────────────────── */}
        <div className="flex sm:hidden justify-center mt-6">
          <button
            type="button"
            onClick={onCityPickerOpen}
            className="flex items-center gap-1.5 px-5 py-2.5 rounded-2xl
              bg-orange-500 text-white text-[13px] font-semibold
              shadow-[0_2px_10px_rgba(249,115,22,0.30)]
              hover:bg-orange-600 hover:shadow-[0_4px_18px_rgba(249,115,22,0.38)]
              active:scale-[0.97] transition-all duration-200 group"
          >
            View all near you
            <ArrowRight className="w-3.5 h-3.5 transition-transform duration-200
              group-hover:translate-x-0.5" strokeWidth={2.2} />
          </button>
        </div>

        {/* ── Trust footnote ─────────────────────────── */}
        <p className="mt-7 text-center text-[11px] text-slate-400/80 tracking-wide">
          All sellers contactable directly via WhatsApp · No middlemen · No commissions
        </p>

      </div>
    </section>
  );
}
