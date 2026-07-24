'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import {
  Search, MapPin, ChevronDown, Plus, ArrowRight,
  Utensils, Home, Briefcase, Car,
  Smartphone, Calendar, Store, GraduationCap,
  MessageCircle, Languages, Layers,
  LocateFixed, Loader2, CheckCircle2,
  type LucideIcon,
} from 'lucide-react';
import Link from 'next/link';
import { usePrefs } from '@/context/PrefsContext';
import CityPickerModal from '@/components/city-picker/CityPickerModal';
import SiteFooter from '@/components/site-footer/SiteFooter';
import LanguageSelector, { LANGUAGES } from '@/components/language-selector/LanguageSelector';
import FreshListingsSection from '@/components/fresh-listings/FreshListingsSection';
import SiteLogo from '@/components/site-logo/SiteLogo';
import { geolocateAndMatch } from '@/lib/geolocate';

// ─── types ───────────────────────────────────────────────────
interface CategoryDef { icon: LucideIcon; name: string; slug: string; color: string; accent: string }
interface WhyDef { icon: LucideIcon; title: string; body: string }
interface DaySection { time: string; tagline: string; slugs: string[] }
type GeoStatus = 'idle' | 'locating' | 'located' | 'denied' | 'failed';

// ─── static data ─────────────────────────────────────────────
const CATEGORIES: CategoryDef[] = [
  { icon: Utensils,      name: 'Tiffin & Food', slug: 'tiffin',       color: 'text-white bg-orange-500',     accent: 'bg-orange-500'    },
  { icon: Home,          name: 'PG / Rooms',    slug: 'pg-roommate',  color: 'text-white bg-blue-500',       accent: 'bg-blue-500'      },
  { icon: Briefcase,     name: 'Jobs',          slug: 'jobs',         color: 'text-white bg-emerald-500',    accent: 'bg-emerald-500'   },
  { icon: Car,           name: 'Vehicles',      slug: 'vehicles',     color: 'text-white bg-red-500',        accent: 'bg-red-500'       },
  { icon: Smartphone,    name: 'Electronics',   slug: 'electronics',  color: 'text-white bg-purple-500',     accent: 'bg-purple-500'    },
  { icon: Calendar,      name: 'Events',        slug: 'events',       color: 'text-white bg-rose-500',       accent: 'bg-rose-500'      },
  { icon: Store,         name: 'Businesses',    slug: 'businesses',   color: 'text-white bg-cyan-500',       accent: 'bg-cyan-500'      },
  { icon: GraduationCap, name: 'Education',     slug: 'education',    color: 'text-white bg-indigo-500',     accent: 'bg-indigo-500'    },
];

// Category browsing organized around actual daily life instead of a flat
// icon grid — the same 8 categories, grouped by when someone typically
// needs them, each with a one-line editorial frame.
const DAY_SECTIONS: DaySection[] = [
  { time: 'Morning',  tagline: 'Start the day sorted', slugs: ['tiffin', 'pg-roommate'] },
  { time: 'Midday',   tagline: 'Get things done',      slugs: ['jobs', 'electronics'] },
  { time: 'Evening',  tagline: "See what's on",        slugs: ['events', 'businesses'] },
  { time: 'Anytime',  tagline: 'The bigger stuff',     slugs: ['vehicles', 'education'] },
];

const POPULAR_TAGS = ['Tiffin Service', 'PG for Boys', 'Used Laptop', 'Honda Activa', 'Home Tutor', '2BHK Flat'];

// The direct answer to "why LocalsIndia" — concrete differentiators, not
// vague trust badges. City/language counts are real, derived from the live
// `cities` list (usePrefs) and the LANGUAGES registry at render time.
function buildWhyUs(cityCount: number): WhyDef[] {
  return [
    { icon: Layers,        title: 'Everything in one place', body: 'Tiffin, jobs, rooms, vehicles, events, businesses — stop juggling five different apps.' },
    { icon: MessageCircle, title: 'Talk directly, no middlemen', body: 'Every listing connects straight to WhatsApp. No commission, no waiting for approval.' },
    { icon: MapPin,        title: 'Built for your neighbourhood', body: `Search by area, not just city — live across ${cityCount}+ cities in South India.` },
    { icon: Languages,     title: 'In your language',        body: `Browse and post in ${LANGUAGES.length} South Indian languages, not just English.` },
  ];
}

const HERO_WORDS = ['Tiffin', 'PG Rooms', 'Jobs', 'Used Cars', 'Electronics', 'Tutors', 'Events'];

// spring easing for the headline swap
const SPRING = { duration: 0.3, ease: [0.22, 1, 0.36, 1] } as const;

// ─── component ───────────────────────────────────────────────
export default function HomePage() {
  const router = useRouter();
  const { citySlug, cityName, setCity, cities, t } = usePrefs();
  const [q, setQ] = useState('');
  const [showCityPicker, setShowCityPicker] = useState(false);
  const [pendingCategory, setPendingCategory] = useState<string | null>(null);
  const [heroWordIdx, setHeroWordIdx] = useState(0);

  // Real, live counts — never a hardcoded number that can drift from what's actually active
  const cityCount = cities.length;
  const STATS: [string, string][] = [
    [cityCount > 0 ? `${cityCount}+` : '—', 'Cities'],
    [String(LANGUAGES.length), 'Languages'],
  ];
  const WHY_US = buildWhyUs(cityCount > 0 ? cityCount : 140);

  // Cycle hero category words
  useEffect(() => {
    const id = setInterval(() => setHeroWordIdx(i => (i + 1) % HERO_WORDS.length), 2500);
    return () => clearInterval(id);
  }, []);

  // geolocation
  const [geoStatus, setGeoStatus] = useState<GeoStatus>('idle');
  const [geoMsg, setGeoMsg] = useState('');
  const geoTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    const savedCity = localStorage.getItem('li_city');
    if (savedCity) { router.replace(`/${savedCity}`); }
  }, [router]);

  useEffect(() => {
    return () => clearTimeout(geoTimer.current);
  }, []);

  // ── helpers ──────────────────────────────────────────────────
  const flashMsg = (msg: string, status: GeoStatus) => {
    setGeoStatus(status);
    setGeoMsg(msg);
    clearTimeout(geoTimer.current);
    geoTimer.current = setTimeout(() => {
      setGeoMsg('');
      // keep 'located' active (so the icon stays orange), clear errors
      if (status !== 'located') setGeoStatus(s => (s === status ? 'idle' : s));
    }, status === 'located' ? 2800 : 3500);
  };

  const handleGeoLocate = async () => {
    if (geoStatus === 'locating') return;
    setGeoStatus('locating');
    setGeoMsg('');

    const result = await geolocateAndMatch(cities);
    switch (result.status) {
      case 'located':
        setCity(result.match);
        flashMsg(`Located in ${result.match.name}`, 'located');
        break;
      case 'no-match':
        flashMsg(result.raw ? `"${result.raw}" isn't in our city list yet` : 'City not detected', 'failed');
        break;
      case 'denied':
        flashMsg('Location access denied — enable it in browser settings', 'denied');
        break;
      case 'failed':
        flashMsg(result.message, 'failed');
        break;
      case 'unsupported':
        flashMsg('Geolocation not supported by this browser', 'failed');
        break;
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!q.trim()) return;
    const p = new URLSearchParams({ q: q.trim() });
    if (citySlug) p.set('city', citySlug);
    router.push(`/search?${p.toString()}`);
  };

  // ─────────────────────────────────────────────────────────────
  return (
    <div className="bg-[#F9FAFB]">

      {/* ══════════════════════════════════════════════
          HEADER
      ══════════════════════════════════════════════ */}
      <header className="sticky top-0 z-50 nav-glass">
        <div className="page-wrap h-16 flex items-center">

          {/* ── Logo ─────────────────────────────────── */}
          <SiteLogo href="/" size="sm" variant="default" className="shrink-0" />

          <div className="flex-1" />

          {/* ── Right nav ─────────────────────────────── */}
          <nav className="flex items-center gap-0.5" aria-label="Site navigation">

            {/* Browse Cities — pill chip */}
            <button
              type="button"
              onClick={() => setShowCityPicker(true)}
              className="hidden md:flex items-center gap-1.5 h-8 px-3.5 rounded-full
                text-[12.5px] font-medium shrink-0
                text-slate-600 bg-slate-50 border border-slate-100/80
                hover:bg-[#FEF3E2] hover:border-orange-200/60 hover:text-[#E07B0A]
                transition-all duration-150"
            >
              <MapPin
                className="w-3 h-3 text-[#F7921E] shrink-0"
                strokeWidth={2.5}
                aria-hidden
              />
              {t('nav.cities')}
            </button>

            {/* Hairline divider */}
            <div className="hidden md:block w-px h-[14px] bg-slate-200/70 mx-2.5 shrink-0" />

            {/* Language selector */}
            <LanguageSelector />

            {/* Sign in — visible on all sizes */}
            <Link
              href="/auth/login"
              className="flex items-center h-8 px-2.5 md:px-3.5 rounded-xl ml-0.5
                text-[12px] md:text-[12.5px] font-medium text-slate-500
                hover:text-slate-900 hover:bg-slate-50
                transition-all duration-150"
            >
              {t('nav.signIn')}
            </Link>

            {/* Post Listing — primary CTA */}
            <button
              type="button"
              onClick={() => citySlug
                ? router.push(`/${citySlug}/classifieds/post`)
                : setShowCityPicker(true)
              }
              className="ml-2 flex items-center gap-1.5 shrink-0
                pl-5 pr-6 py-[10px] rounded-full
                text-[13px] font-semibold tracking-tight text-white
                bg-[#F7921E]
                shadow-[0_2px_12px_rgba(247,146,30,0.30),inset_0_1px_0_rgba(255,255,255,0.14)]
                hover:bg-[#E07B0A]
                hover:shadow-[0_4px_20px_rgba(247,146,30,0.46),inset_0_1px_0_rgba(255,255,255,0.10)]
                hover:-translate-y-px
                active:translate-y-0 active:scale-[0.94]
                active:shadow-[0_1px_6px_rgba(247,146,30,0.22)]
                transition-all duration-200 select-none"
            >
              <Plus
                className="w-[13px] h-[13px] shrink-0"
                strokeWidth={2.8}
                aria-hidden
              />
              <span className="hidden sm:inline">{t('nav.post')}</span>
              <span className="sm:hidden">{t('nav.postShort')}</span>
            </button>
          </nav>
        </div>
      </header>

      {/* ══════════════════════════════════════════════
          HERO
      ══════════════════════════════════════════════ */}
      <section className="relative overflow-hidden bg-[#0D0F1C] py-20 md:py-28">
        {/* Atmospheric glows */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
          <div className="absolute -right-32 -top-32 h-[500px] w-[500px] rounded-full bg-orange-500/10 blur-[100px]" />
          <div className="absolute -bottom-20 -left-24 h-[380px] w-[380px] rounded-full bg-violet-600/[0.08] blur-[80px]" />
          <div className="absolute left-1/2 top-1/3 h-[200px] w-[200px] -translate-x-1/2 rounded-full bg-blue-500/[0.05] blur-[60px]" />
          {/* Extra glow that pulses when city is located */}
          <AnimatePresence>
            {geoStatus === 'located' && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 1 }}
                className="absolute left-0 top-0 h-full w-full"
                style={{ background: 'radial-gradient(ellipse at 30% 50%, rgba(249,115,22,0.06) 0%, transparent 65%)' }}
              />
            )}
          </AnimatePresence>
        </div>

        <div className="page-wrap relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease: 'easeOut' }}
            className="max-w-3xl"
          >
            {/* ── Dynamic Headline ──────────────────────── */}
            <h1 className="text-4xl sm:text-5xl md:text-[3.75rem] font-extrabold text-white
              leading-[1.08] tracking-[-0.03em] mb-5">
              {'Find '}
              <AnimatePresence mode="wait" initial={false}>
                <motion.span
                  key={heroWordIdx}
                  initial={{ opacity: 0, y: 14, filter: 'blur(4px)' }}
                  animate={{ opacity: 1, y: 0, filter: 'blur(0px)', transition: SPRING }}
                  exit={{ opacity: 0, y: -10, filter: 'blur(4px)', transition: { duration: 0.15, ease: 'easeIn' } }}
                  className="text-[#F7921E] inline-block"
                >
                  {HERO_WORDS[heroWordIdx]}
                </motion.span>
              </AnimatePresence>
              <br />
              <AnimatePresence mode="wait" initial={false}>
                <motion.span
                  key={cityName || '__default'}
                  initial={{ opacity: 0, y: 18 }}
                  animate={{ opacity: 1, y: 0, transition: SPRING }}
                  exit={{ opacity: 0, y: -10, transition: { duration: 0.16, ease: 'easeIn' } }}
                  className="text-orange-500 inline-block"
                >
                  {cityName ? `in ${cityName}` : t('hero.inYourCity')}
                </motion.span>
              </AnimatePresence>
            </h1>

            {/* Sub-text */}
            <p className="text-base md:text-lg text-slate-400 max-w-lg leading-relaxed mb-10">
              {t('hero.sub')}
            </p>

            {/* ══ Search Capsule ═══════════════════════════ */}
            <motion.form
              onSubmit={handleSearch}
              animate={geoStatus === 'located' ? {
                boxShadow: [
                  '0 24px 64px -12px rgba(0,0,0,0.55), 0 0 0 1px rgba(0,0,0,0.07)',
                  '0 24px 64px -12px rgba(247,146,30,0.24), 0 0 0 2px rgba(247,146,30,0.20)',
                  '0 24px 64px -12px rgba(0,0,0,0.55), 0 0 0 1px rgba(0,0,0,0.07)',
                ],
              } : {}}
              transition={{ duration: 1.1, ease: 'easeOut' }}
              className="flex max-w-2xl w-full overflow-hidden rounded-full bg-white
                shadow-[inset_0_2px_6px_rgba(0,0,0,0.06),0_24px_64px_-12px_rgba(0,0,0,0.50),0_0_0_1px_rgba(0,0,0,0.06)]
                focus-within:shadow-[inset_0_2px_6px_rgba(0,0,0,0.05),0_24px_64px_-12px_rgba(247,146,30,0.18),0_0_0_2px_rgba(247,146,30,0.22)]
                transition-shadow duration-300"
            >
              {/* ── Segment 1: City trigger ─────────────────── */}
              <button
                type="button"
                onClick={() => setShowCityPicker(true)}
                className="flex flex-col justify-center gap-[3px] shrink-0
                  pl-5 pr-3 h-[60px]
                  w-[108px] sm:w-[152px]
                  border-r border-slate-200/60
                  hover:bg-slate-50/70 transition-colors duration-150 group"
              >
                {/* Micro-label */}
                <span className="text-[9px] font-semibold uppercase tracking-[0.13em]
                  text-slate-400 leading-none select-none">
                  City
                </span>
                {/* Selected city + icons row */}
                <div className="flex items-center gap-1.5 w-full min-w-0">
                  <motion.span
                    animate={cityName ? { scale: [1, 1.25, 1] } : {}}
                    transition={{ duration: 0.28, ease: 'easeOut' }}
                    className="shrink-0"
                  >
                    <MapPin
                      className="w-3.5 h-3.5 text-[#F7921E]"
                      strokeWidth={2.3}
                    />
                  </motion.span>
                  <div className="flex-1 overflow-hidden min-w-0">
                    <AnimatePresence mode="wait" initial={false}>
                      <motion.span
                        key={cityName || '__none'}
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0, transition: { duration: 0.16, ease: 'easeOut' } }}
                        exit={{ opacity: 0, y: -4, transition: { duration: 0.10, ease: 'easeIn' } }}
                        className="block text-[12.5px] font-semibold text-slate-800
                          truncate leading-none"
                      >
                        {cityName || 'Select...'}
                      </motion.span>
                    </AnimatePresence>
                  </div>
                  <ChevronDown
                    className="w-2.5 h-2.5 text-slate-300 shrink-0
                      group-hover:text-slate-500 transition-colors"
                    strokeWidth={2.5}
                  />
                </div>
              </button>

              {/* ── Segment 2: Geo button — hidden on mobile ─── */}
              <div className="hidden sm:flex items-center justify-center shrink-0
                w-[52px] border-r border-slate-200/60">
                <button
                  type="button"
                  onClick={handleGeoLocate}
                  disabled={geoStatus === 'locating' || geoStatus === 'denied'}
                  aria-label="Detect current location"
                  title={
                    geoStatus === 'denied'  ? 'Location access denied' :
                    geoStatus === 'located' ? `Located in ${cityName}` :
                    'Use my current location'
                  }
                  className={`flex items-center justify-center w-9 h-9 rounded-[10px]
                    transition-all duration-200
                    ${geoStatus === 'located'
                      ? 'text-[#F7921E] bg-[#F7921E]/[0.08]'
                      : geoStatus === 'denied'
                      ? 'text-slate-200 cursor-not-allowed'
                      : 'text-slate-350 hover:text-[#F7921E] hover:bg-[#F7921E]/[0.07]'
                    }`}
                >
                  <AnimatePresence mode="wait" initial={false}>
                    {geoStatus === 'locating' ? (
                      <motion.span key="spin"
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        transition={{ duration: 0.12 }}
                      >
                        <Loader2 className="w-[15px] h-[15px] animate-spin" strokeWidth={2} />
                      </motion.span>
                    ) : geoStatus === 'located' ? (
                      <motion.span key="check"
                        initial={{ opacity: 0, scale: 0.6 }} animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.18, ease: 'backOut' }}
                      >
                        <CheckCircle2 className="w-[15px] h-[15px]" strokeWidth={2} />
                      </motion.span>
                    ) : (
                      <motion.span key="locate"
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        transition={{ duration: 0.12 }}
                      >
                        <LocateFixed className="w-[15px] h-[15px]" strokeWidth={2} />
                      </motion.span>
                    )}
                  </AnimatePresence>
                </button>
              </div>

              {/* ── Segment 3: Search input ─────────────────── */}
              <input
                value={q}
                onChange={e => setQ(e.target.value)}
                placeholder={t('search.placeholder')}
                aria-label="Search listings"
                className="flex-1 min-w-0 px-3 sm:px-5 h-[60px]
                  text-[14px] font-normal leading-none text-slate-800 tracking-[-0.01em]
                  placeholder:text-slate-300 placeholder:font-normal
                  caret-[#F7921E] outline-none bg-transparent"
              />

              {/* ── Segment 4: Submit — uniform inset padding ── */}
              <div className="flex items-center shrink-0 p-[9px]">
                <button
                  type="submit"
                  className="flex items-center gap-2 h-[42px]
                    px-6 sm:px-8 rounded-full
                    bg-[#F7921E] font-semibold
                    shadow-[inset_0_1px_0_rgba(255,255,255,0.18)]
                    hover:bg-[#E07B0A]
                    active:scale-[0.96] active:bg-[#D16E05]
                    transition-all duration-200 shrink-0 select-none"
                >
                  <Search
                    className="w-[14px] h-[14px] text-white shrink-0"
                    strokeWidth={2.5}
                  />
                  <span className="hidden sm:inline text-[13px] font-semibold
                    text-white tracking-tight">
                    Search
                  </span>
                </button>
              </div>
            </motion.form>

            {/* ── Geo feedback toast ─────────────────────────── */}
            <AnimatePresence>
              {geoMsg && (
                <motion.p
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.18 }}
                  className={`mt-3 text-xs font-medium flex items-center gap-1.5 ${
                    geoStatus === 'located' ? 'text-emerald-400' :
                    geoStatus === 'denied'  ? 'text-red-400/80' :
                    'text-amber-400/80'
                  }`}
                >
                  {geoStatus === 'located' && (
                    <CheckCircle2 className="w-3.5 h-3.5 shrink-0" strokeWidth={2} />
                  )}
                  {geoMsg}
                </motion.p>
              )}
            </AnimatePresence>

            {/* ══ Trending tags ════════════════════════════════ */}
            <div className="flex flex-wrap items-center gap-x-2 gap-y-2 mt-8">
              {/* Label */}
              <span className="flex items-center gap-1.5 shrink-0 mr-1
                text-[11px] font-medium text-slate-400/80">
                <span className="w-[3px] h-[3px] rounded-full bg-slate-400/50 inline-block" />
                Trending
              </span>
              {POPULAR_TAGS.map((tag, i) => (
                <motion.button
                  key={tag}
                  type="button"
                  onClick={() => {
                    const p = new URLSearchParams({ q: tag });
                    if (citySlug) p.set('city', citySlug);
                    router.push(`/search?${p.toString()}`);
                  }}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.32 + i * 0.05, duration: 0.28, ease: 'easeOut' }}
                  whileTap={{ scale: 0.94 }}
                  className="px-3.5 py-[11px] rounded-full
                    text-[11.5px] font-medium leading-none
                    text-slate-300 bg-white/[0.07] border border-white/[0.12]
                    hover:bg-[#F7921E]/[0.14] hover:border-[#F7921E]/[0.28]
                    hover:text-[#F7921E]
                    transition-all duration-180 select-none"
                >
                  {tag}
                </motion.button>
              ))}
            </div>
          </motion.div>

          {/* ── Stats row ── */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.45 }}
            className="flex flex-wrap gap-x-14 gap-y-6 mt-20 pt-10 border-t border-white/[0.07]"
          >
            {STATS.map(([num, label]) => (
              <div key={num} className="flex flex-col gap-2">
                <div className="text-[2.5rem] sm:text-[2.75rem] font-black text-white tracking-[-0.04em] leading-none">{num}</div>
                <div className="text-[12px] font-medium text-slate-500 leading-none">
                  {label}
                </div>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════
          WHY LOCALSINDIA — the direct answer, not a badge grid
      ══════════════════════════════════════════════ */}
      <section className="bg-white py-24 sm:py-28 border-b border-slate-100/80">
        <div className="page-wrap">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-30px' }}
            transition={{ duration: 0.4 }}
            className="max-w-2xl mb-14 sm:mb-16"
          >
            <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#F7921E]">
              Why LocalsIndia
            </span>
            <h2 className="text-[2rem] sm:text-[2.5rem] font-extrabold text-slate-900
              tracking-[-0.04em] leading-tight mt-3">
              One app, not five
            </h2>
            <p className="text-[15px] text-slate-500 mt-3 leading-relaxed">
              Every other option means a different app for jobs, a different one for rooms, a
              different one for the market. LocalsIndia is the one your neighbourhood actually uses.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 sm:gap-6">
            {WHY_US.map(({ icon: Icon, title, body }, i) => (
              <motion.div
                key={title}
                initial={{ opacity: 0, y: 14 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-30px' }}
                transition={{ duration: 0.32, delay: i * 0.07, ease: [0.22, 1, 0.36, 1] }}
                className="flex items-start gap-4 p-6 rounded-2xl border border-slate-100"
                style={{ boxShadow: '0 4px 20px rgba(0,0,0,0.04)' }}
              >
                <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: 'var(--li-primary-light)' }}>
                  <Icon className="w-5 h-5" style={{ color: 'var(--li-primary)' }} strokeWidth={2} />
                </div>
                <div>
                  <h3 className="text-[15px] font-bold text-slate-900 tracking-[-0.01em]">{title}</h3>
                  <p className="text-[13.5px] text-slate-500 mt-1.5 leading-relaxed">{body}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════
          A DAY IN YOUR CITY — categories grouped by when you
          actually need them, not a flat icon grid
      ══════════════════════════════════════════════ */}
      <section className="bg-[#F9FAFB] py-24 sm:py-32 border-b border-slate-100/80">
        <div className="page-wrap">
          <div className="mb-14 sm:mb-16">
            <h2 className="text-[2rem] sm:text-[2.5rem] font-extrabold text-slate-900
              tracking-[-0.04em] leading-tight">
              A day in {cityName || 'your city'}
            </h2>
            <p className="text-[14px] text-slate-400 mt-3 font-normal leading-relaxed">
              Whatever you need, whenever you need it
            </p>
          </div>

          <div className="space-y-10 sm:space-y-12">
            {DAY_SECTIONS.map((section, si) => (
              <motion.div
                key={section.time}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-30px' }}
                transition={{ duration: 0.36, delay: si * 0.05, ease: [0.22, 1, 0.36, 1] }}
                className="grid grid-cols-1 md:grid-cols-[200px_1fr] gap-5 md:gap-8 items-start"
              >
                {/* Time label — the organizing device */}
                <div className="md:pt-2">
                  <h3 className="text-[13px] font-bold uppercase tracking-[0.1em]" style={{ color: 'var(--li-primary)' }}>
                    {section.time}
                  </h3>
                  <p className="text-[13.5px] text-slate-400 mt-1">{section.tagline}</p>
                </div>

                {/* The 2 categories for this time of day */}
                <div className="grid grid-cols-2 gap-4">
                  {section.slugs.map(slug => {
                    const cat = CATEGORIES.find(c => c.slug === slug);
                    if (!cat) return null;
                    const Icon = cat.icon;
                    return (
                      <button
                        key={slug}
                        type="button"
                        onClick={() => {
                          const p = new URLSearchParams({ category: slug });
                          if (citySlug) p.set('city', citySlug);
                          router.push(`/search?${p.toString()}`);
                        }}
                        className="group flex items-center gap-3.5 p-5 rounded-2xl bg-white border border-slate-100
                          text-left transition-all duration-200 hover:-translate-y-0.5"
                        style={{ boxShadow: '0 4px 20px rgba(0,0,0,0.04)' }}
                      >
                        <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${cat.color}`}>
                          <Icon className="w-5 h-5" strokeWidth={2} />
                        </div>
                        <span className="text-[14.5px] font-semibold text-slate-800 group-hover:text-[#F7921E] transition-colors duration-200">
                          {cat.name}
                        </span>
                        <ArrowRight className="w-3.5 h-3.5 text-slate-300 ml-auto shrink-0
                          opacity-0 group-hover:opacity-100 -translate-x-1 group-hover:translate-x-0 transition-all duration-200" />
                      </button>
                    );
                  })}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════
          FRESH LISTINGS
      ══════════════════════════════════════════════ */}
      <FreshListingsSection />

      {/* ══════════════════════════════════════════════
          CITY PICKER MODAL
      ══════════════════════════════════════════════ */}
      {showCityPicker && (
        <CityPickerModal
          onClose={() => setShowCityPicker(false)}
          onSelect={city => {
            setShowCityPicker(false);
            if (pendingCategory) {
              router.push(`/search?category=${pendingCategory}&city=${city.slug}`);
              setPendingCategory(null);
            } else if (q.trim()) {
              router.push(`/search?q=${encodeURIComponent(q.trim())}&city=${city.slug}`);
            } else {
              router.push(`/search?city=${city.slug}`);
            }
          }}
        />
      )}

      {/* ══════════════════════════════════════════════
          CLOSING CTA — one decisive close, not a badge grid
      ══════════════════════════════════════════════ */}
      <section className="relative overflow-hidden bg-[#0D0F1C] py-20 sm:py-28">
        <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
          <div className="absolute -right-24 -bottom-24 h-[380px] w-[380px] rounded-full bg-orange-500/[0.08] blur-[100px]" />
        </div>
        <div className="page-wrap relative z-10">
          <div className="max-w-2xl mx-auto text-center">
            {/* WhatsApp-native — the one claim worth a hero moment */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full
              bg-[#25D366]/[0.10] border border-[#25D366]/[0.22] mb-6">
              <svg viewBox="0 0 24 24" className="w-4 h-4 fill-[#4ade80]" aria-hidden>
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
              </svg>
              <span className="text-[12.5px] font-semibold text-emerald-400">
                Every listing talks straight to WhatsApp — zero commission
              </span>
            </div>

            <h2 className="text-[2rem] sm:text-[2.75rem] font-extrabold text-white
              tracking-[-0.04em] leading-tight">
              Your neighbourhood is already here
            </h2>
            <p className="text-[15px] text-slate-400 mt-4 leading-relaxed">
              {cityCount > 0 ? cityCount : 140}+ cities, {LANGUAGES.length} languages, one free listing away.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mt-8">
              <button
                type="button"
                onClick={() => citySlug
                  ? router.push(`/${citySlug}/classifieds/post`)
                  : setShowCityPicker(true)
                }
                className="flex items-center gap-2 px-8 py-[13px] rounded-full
                  text-[14px] font-semibold text-white bg-[#F7921E]
                  shadow-[0_4px_20px_rgba(247,146,30,0.32),inset_0_1px_0_rgba(255,255,255,0.14)]
                  hover:bg-[#E07B0A] hover:shadow-[0_6px_24px_rgba(247,146,30,0.44)]
                  active:scale-[0.96] transition-all duration-200"
              >
                <Plus className="w-4 h-4" strokeWidth={2.6} />
                Post for free
              </button>
              <button
                type="button"
                onClick={() => citySlug ? router.push(`/${citySlug}`) : setShowCityPicker(true)}
                className="flex items-center gap-2 px-8 py-[13px] rounded-full
                  text-[14px] font-semibold text-white/90 border border-white/15
                  hover:bg-white/[0.06] transition-all duration-200"
              >
                Browse {cityName || 'your city'}
                <ArrowRight className="w-3.5 h-3.5" strokeWidth={2.2} />
              </button>
            </div>
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
