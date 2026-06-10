'use client';

import { useRef, useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  MapPin, Clock, ArrowRight, ChevronLeft, ChevronRight,
  Utensils, Home, Smartphone, Car, GraduationCap, Building2,
  BadgeCheck,
  type LucideIcon,
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
  gradient: [string, string]; // [from, to]
  Icon: LucideIcon;
  postedAt: string;
  waUrl: string;
}

// ─── Mockup data ──────────────────────────────────────────────
const FRESH_LISTINGS: MockListing[] = [
  {
    id: 'mock-1',
    title: 'Home-style South Indian Tiffin — Monthly Plan',
    category: 'Tiffin & Food',
    categorySlug: 'tiffin',
    price: 1800,
    priceUnit: '/mo',
    location: 'Koramangala, Bangalore',
    badge: 'New',
    gradient: ['#FF9A3C', '#FF6B35'],
    Icon: Utensils,
    postedAt: '2h ago',
    waUrl: '#',
  },
  {
    id: 'mock-2',
    title: 'PG for Girls — AC Furnished, All-Inclusive',
    category: 'PG / Rooms',
    categorySlug: 'pg-roommate',
    price: 8500,
    priceUnit: '/mo',
    location: 'HSR Layout, Bangalore',
    badge: 'Verified',
    gradient: ['#4F8EF7', '#1D4ED8'],
    Icon: Home,
    postedAt: '5h ago',
    waUrl: '#',
  },
  {
    id: 'mock-3',
    title: 'iPhone 14 · 256 GB · Midnight · Box Open',
    category: 'Electronics',
    categorySlug: 'electronics',
    price: 54000,
    priceUnit: '',
    location: 'Jubilee Hills, Hyderabad',
    badge: 'New',
    gradient: ['#8B5CF6', '#4F46E5'],
    Icon: Smartphone,
    postedAt: '1h ago',
    waUrl: '#',
  },
  {
    id: 'mock-4',
    title: 'Honda Activa 6G · 2022 · 12,000 km Only',
    category: 'Vehicles',
    categorySlug: 'vehicles',
    price: 68000,
    priceUnit: '',
    location: 'Madhapur, Hyderabad',
    badge: 'Verified',
    gradient: ['#F97316', '#DC2626'],
    Icon: Car,
    postedAt: '3h ago',
    waUrl: '#',
  },
  {
    id: 'mock-5',
    title: 'CBSE Maths + Science Tutor (Grades 8–12)',
    category: 'Education',
    categorySlug: 'education',
    price: 2500,
    priceUnit: '/mo',
    location: 'Anna Nagar, Chennai',
    badge: 'New',
    gradient: ['#10B981', '#047857'],
    Icon: GraduationCap,
    postedAt: '6h ago',
    waUrl: '#',
  },
  {
    id: 'mock-6',
    title: '2 BHK Semi-Furnished · Ready to Move In',
    category: 'PG / Rooms',
    categorySlug: 'pg-roommate',
    price: 22000,
    priceUnit: '/mo',
    location: 'Banjara Hills, Hyderabad',
    badge: 'Verified',
    gradient: ['#06B6D4', '#0284C7'],
    Icon: Building2,
    postedAt: '4h ago',
    waUrl: '#',
  },
];

// ─── Category accent colours ──────────────────────────────────
const CAT_ACCENT: Record<string, { pill: string; dot: string }> = {
  tiffin:      { pill: 'bg-amber-50  text-amber-700',  dot: 'bg-amber-400'  },
  'pg-roommate':{ pill: 'bg-blue-50   text-blue-700',   dot: 'bg-blue-400'   },
  electronics: { pill: 'bg-violet-50 text-violet-700', dot: 'bg-violet-400' },
  vehicles:    { pill: 'bg-orange-50 text-orange-700', dot: 'bg-orange-400' },
  education:   { pill: 'bg-emerald-50 text-emerald-700', dot: 'bg-emerald-400' },
};

const fallbackAccent = { pill: 'bg-slate-100 text-slate-600', dot: 'bg-slate-400' };

// ─── Helpers ──────────────────────────────────────────────────
function formatINR(n: number) {
  return n >= 1000
    ? `₹${(n / 1000).toFixed(n % 1000 === 0 ? 0 : 1)}k`
    : `₹${n}`;
}

// ─── WhatsApp icon badge (inline SVG = no image dependency) ───
function WaBadge() {
  return (
    <div
      aria-label="Available on WhatsApp"
      className="absolute bottom-2.5 right-2.5 z-10 flex items-center gap-1.5
        bg-[#25D366] pl-1.5 pr-2 py-[3px] rounded-full
        shadow-[0_2px_8px_rgba(0,0,0,0.22)] ring-[2px] ring-white/70"
    >
      {/* Official WA logo path */}
      <svg viewBox="0 0 24 24" className="w-3 h-3 fill-white shrink-0" aria-hidden>
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.890-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
      </svg>
      <span className="text-[9px] font-bold text-white leading-none tracking-wide">
        WhatsApp
      </span>
    </div>
  );
}

// ─── Individual listing card ───────────────────────────────────
function FreshListingCard({ listing, index }: { listing: MockListing; index: number }) {
  const accent = CAT_ACCENT[listing.categorySlug] ?? fallbackAccent;
  const [from, to] = listing.gradient;

  return (
    <motion.article
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ delay: index * 0.07, duration: 0.38, ease: [0.22, 1, 0.36, 1] }}
      whileHover={{ y: -3, transition: { duration: 0.2 } }}
      className="group bg-white rounded-2xl overflow-hidden border border-slate-100
        shadow-sm hover:shadow-xl hover:shadow-slate-900/8
        transition-shadow duration-300 cursor-pointer flex flex-col"
    >
      {/* ── Image zone ─────────────────────────────────── */}
      <div className="relative aspect-[4/3] overflow-hidden shrink-0">

        {/* Gradient artwork (always visible; serves as placeholder) */}
        <div
          className="absolute inset-0 flex items-end justify-start p-4"
          style={{ background: `linear-gradient(135deg, ${from} 0%, ${to} 100%)` }}
        >
          {/* Large background icon */}
          <listing.Icon
            className="absolute right-4 top-1/2 -translate-y-1/2 opacity-[0.18] text-white"
            style={{ width: 80, height: 80 }}
            strokeWidth={1.2}
          />
        </div>

        {/* Top-left: badge */}
        {listing.badge === 'Verified' ? (
          <div className="absolute top-2.5 left-2.5 z-10 flex items-center gap-1
            bg-white/95 backdrop-blur-sm text-blue-600
            pl-1.5 pr-2 py-0.5 rounded-full shadow-sm ring-1 ring-blue-100">
            <BadgeCheck className="w-3 h-3 shrink-0" strokeWidth={2.5} />
            <span className="text-[10px] font-bold leading-none tracking-wide">Verified</span>
          </div>
        ) : listing.badge === 'Hot' ? (
          <div className="absolute top-2.5 left-2.5 z-10
            bg-rose-500 text-white text-[10px] font-bold
            px-2 py-0.5 rounded-full shadow-sm tracking-wide">
            🔥 Hot
          </div>
        ) : (
          <div className="absolute top-2.5 left-2.5 z-10
            bg-orange-500 text-white text-[10px] font-bold
            px-2 py-0.5 rounded-full shadow-sm tracking-wide">
            New
          </div>
        )}

        {/* Top-right: price */}
        <div className="absolute top-2.5 right-2.5 z-10">
          <div className="bg-slate-900/75 backdrop-blur-sm text-white
            px-2.5 py-1 rounded-xl shadow-sm
            font-extrabold text-sm leading-none tracking-tight">
            {formatINR(listing.price)}
            {listing.priceUnit && (
              <span className="font-normal text-[10px] text-white/70 ml-0.5">
                {listing.priceUnit}
              </span>
            )}
          </div>
        </div>

        {/* Bottom-right: WhatsApp badge */}
        <WaBadge />
      </div>

      {/* ── Card body ──────────────────────────────────── */}
      <div className="flex flex-col flex-1 p-4 gap-2.5">

        {/* Category pill */}
        <span className={`self-start text-[10px] font-bold uppercase tracking-widest
          px-2 py-0.5 rounded-full ${accent.pill}`}>
          {listing.category}
        </span>

        {/* Title */}
        <h3 className="text-sm font-bold text-slate-900 leading-snug line-clamp-2 flex-1
          group-hover:text-orange-600 transition-colors duration-200">
          {listing.title}
        </h3>

        {/* Location + time */}
        <div className="flex items-center justify-between pt-1.5
          border-t border-slate-50">
          <span className="flex items-center gap-1 text-[11px] text-slate-500 min-w-0 truncate mr-2">
            <MapPin className="w-3 h-3 shrink-0 text-slate-400" strokeWidth={2} />
            <span className="truncate">{listing.location}</span>
          </span>
          <span className="flex items-center gap-1 text-[11px] text-slate-400 shrink-0">
            <Clock className="w-3 h-3" strokeWidth={2} />
            {listing.postedAt}
          </span>
        </div>
      </div>
    </motion.article>
  );
}

// ─── Section ──────────────────────────────────────────────────
interface FreshListingsSectionProps {
  onCityPickerOpen?: () => void;
}

export default function FreshListingsSection({ onCityPickerOpen }: FreshListingsSectionProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  // Track scroll position to show/hide arrows
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
    const el = trackRef.current;
    if (!el) return;
    // Scroll by ~one card width (approximate for all breakpoints)
    el.scrollBy({ left: dir === 'right' ? 300 : -300, behavior: 'smooth' });
  };

  return (
    <section className="bg-slate-50/80 py-16 border-b border-slate-100">
      <div className="page-wrap">

        {/* ── Section header ─────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4 }}
          className="flex items-end justify-between mb-8 gap-4"
        >
          <div>
            {/* Eyebrow with live pulse */}
            <div className="flex items-center gap-2 mb-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-70" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
              <span className="text-xs font-bold uppercase tracking-widest text-emerald-600">
                Live · Updated just now
              </span>
            </div>

            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight leading-none">
              Fresh Listings Near You
            </h2>
            <p className="text-sm text-slate-500 mt-1.5">
              Real people, real prices — buy and sell directly via WhatsApp.
            </p>
          </div>

          {/* CTA — desktop */}
          <button
            type="button"
            onClick={onCityPickerOpen}
            className="hidden sm:flex items-center gap-1.5 shrink-0
              text-sm font-semibold text-orange-600 hover:text-orange-700
              transition-colors duration-150 group"
          >
            View all near you
            <ArrowRight
              className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-0.5"
              strokeWidth={2.2}
            />
          </button>
        </motion.div>

        {/* ── Carousel wrapper ───────────────────────── */}
        <div className="relative">

          {/* Left scroll arrow */}
          <motion.button
            type="button"
            onClick={() => scroll('left')}
            animate={{ opacity: canScrollLeft ? 1 : 0, pointerEvents: canScrollLeft ? 'auto' : 'none' }}
            transition={{ duration: 0.15 }}
            aria-label="Scroll left"
            className="absolute left-0 top-[38%] -translate-y-1/2 -translate-x-4
              z-10 hidden md:flex w-10 h-10 rounded-full
              bg-white border border-slate-200
              items-center justify-center shadow-lg shadow-slate-900/8
              text-slate-600 hover:text-slate-900 hover:shadow-xl
              transition-shadow duration-200"
          >
            <ChevronLeft className="w-5 h-5" strokeWidth={2} />
          </motion.button>

          {/* Scrollable track ────────────────────────────
              Mobile  (<sm):  1.5 cards peek
              Tablet  (sm-lg): 2 cards
              Desktop (lg+):  4 cards  */}
          <div
            ref={trackRef}
            className="
              flex gap-4 overflow-x-auto scrollbar-none
              snap-x snap-mandatory
              -mx-4 px-4 sm:-mx-6 sm:px-6 md:-mx-8 md:px-8 lg:mx-0 lg:px-0
              pb-2
            "
          >
            {FRESH_LISTINGS.map((listing, i) => (
              <div
                key={listing.id}
                className="
                  min-w-[72vw]
                  sm:min-w-[calc(50%-8px)]
                  lg:min-w-[calc(25%-12px)]
                  shrink-0 snap-start
                "
              >
                <FreshListingCard listing={listing} index={i} />
              </div>
            ))}
          </div>

          {/* Right scroll arrow */}
          <motion.button
            type="button"
            onClick={() => scroll('right')}
            animate={{ opacity: canScrollRight ? 1 : 0, pointerEvents: canScrollRight ? 'auto' : 'none' }}
            transition={{ duration: 0.15 }}
            aria-label="Scroll right"
            className="absolute right-0 top-[38%] -translate-y-1/2 translate-x-4
              z-10 hidden md:flex w-10 h-10 rounded-full
              bg-white border border-slate-200
              items-center justify-center shadow-lg shadow-slate-900/8
              text-slate-600 hover:text-slate-900 hover:shadow-xl
              transition-shadow duration-200"
          >
            <ChevronRight className="w-5 h-5" strokeWidth={2} />
          </motion.button>
        </div>

        {/* ── Scroll dot indicators (mobile) ─────────── */}
        <div className="flex justify-center gap-1.5 mt-5 sm:hidden" aria-hidden>
          {FRESH_LISTINGS.map((_, i) => (
            <div key={i} className="w-1.5 h-1.5 rounded-full bg-slate-300" />
          ))}
        </div>

        {/* ── CTA row — mobile ───────────────────────── */}
        <div className="flex sm:hidden justify-center mt-6">
          <button
            type="button"
            onClick={onCityPickerOpen}
            className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl
              bg-orange-500 text-white text-sm font-semibold
              hover:bg-orange-600 transition-colors duration-150
              shadow-sm shadow-orange-500/25 group"
          >
            View all near you
            <ArrowRight
              className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-0.5"
              strokeWidth={2.2}
            />
          </button>
        </div>

        {/* ── Trust footnote ─────────────────────────── */}
        <p className="mt-6 text-center text-[11px] text-slate-400 tracking-wide">
          All sellers contactable directly via WhatsApp · No middlemen · No commissions
        </p>

      </div>
    </section>
  );
}
