'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import {
  Search, MapPin, ChevronDown, X,
  Utensils, Home, Briefcase, Car,
  Smartphone, Calendar, Store, GraduationCap,
  Zap, MessageCircle, Globe, Languages,
  LocateFixed, Loader2, CheckCircle2, ArrowRight,
  type LucideIcon,
} from 'lucide-react';
import Link from 'next/link';
import { api } from '@/lib/api';
import type { City } from '@/lib/types';
import SiteFooter from '@/components/site-footer/SiteFooter';
import LanguageSelector from '@/components/language-selector/LanguageSelector';
import FreshListingsSection from '@/components/fresh-listings/FreshListingsSection';

// ─── types ───────────────────────────────────────────────────
interface CategoryDef { icon: LucideIcon; name: string; color: string; count: string }
interface TrustDef { icon: LucideIcon; title: string; subtitle: string; iconBg: string; iconColor: string; isWhatsApp?: true }
type GeoStatus = 'idle' | 'locating' | 'located' | 'denied' | 'failed';

// ─── static data ─────────────────────────────────────────────
const STATE_ORDER = [
  'Telangana', 'Andhra Pradesh', 'Karnataka', 'Tamil Nadu',
  'Kerala', 'Goa', 'Puducherry', 'Metro',
];

const CATEGORIES: CategoryDef[] = [
  { icon: Utensils,      name: 'Tiffin & Food', color: 'text-amber-500 bg-amber-500/10',     count: '2,840' },
  { icon: Home,          name: 'PG / Rooms',    color: 'text-blue-500 bg-blue-500/10',       count: '5,120' },
  { icon: Briefcase,     name: 'Jobs',          color: 'text-emerald-500 bg-emerald-500/10', count: '3,460' },
  { icon: Car,           name: 'Vehicles',      color: 'text-orange-500 bg-orange-500/10',   count: '4,780' },
  { icon: Smartphone,    name: 'Electronics',   color: 'text-purple-500 bg-purple-500/10',   count: '6,910' },
  { icon: Calendar,      name: 'Events',        color: 'text-rose-500 bg-rose-500/10',       count: '890'   },
  { icon: Store,         name: 'Businesses',    color: 'text-cyan-500 bg-cyan-500/10',       count: '1,230' },
  { icon: GraduationCap, name: 'Education',     color: 'text-indigo-500 bg-indigo-500/10',   count: '2,100' },
];

const POPULAR_TAGS = ['Tiffin Service', 'PG for Boys', 'Used Laptop', 'Honda Activa', 'Home Tutor', '2BHK Flat'];

const STATS: [string, string][] = [
  ['1.2L+', 'Active Listings'],
  ['496+', 'Cities'],
  ['3.8L+', 'Users'],
  ['11', 'Languages'],
];

const TRUST: TrustDef[] = [
  { icon: Zap,          title: 'Instant Posting',      subtitle: 'Go live in under a minute with verified reach.', iconBg: 'bg-orange-500/[0.15]',  iconColor: 'text-orange-400'  },
  { icon: MessageCircle,title: 'WhatsApp Native',       subtitle: 'Contact sellers directly — no middlemen.',       iconBg: 'bg-emerald-500/[0.15]', iconColor: 'text-emerald-400', isWhatsApp: true },
  { icon: MapPin,       title: 'Localized Scale',       subtitle: '496+ cities across India.',                iconBg: 'bg-blue-500/[0.15]',    iconColor: 'text-blue-400'    },
  { icon: Languages,    title: 'Multilingual Support',  subtitle: '11 native languages, your way.',                 iconBg: 'bg-violet-500/[0.15]',  iconColor: 'text-violet-400'  },
];

// spring easing for the headline swap
const SPRING = { duration: 0.3, ease: [0.22, 1, 0.36, 1] } as const;

// ─── component ───────────────────────────────────────────────
export default function HomePage() {
  const router = useRouter();
  const [q, setQ] = useState('');
  const [cities, setCities] = useState<City[]>([]);
  const [selectedCity, setSelectedCity] = useState('');
  const [citySearch, setCitySearch] = useState('');
  const [showCityPicker, setShowCityPicker] = useState(false);
  const [recentSlugs, setRecentSlugs] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  // geolocation
  const [geoStatus, setGeoStatus] = useState<GeoStatus>('idle');
  const [geoMsg, setGeoMsg] = useState('');
  const geoTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    api.cities.list().then(c => { setCities(c); setLoading(false); }).catch(() => setLoading(false));
    try { setRecentSlugs(JSON.parse(localStorage.getItem('recentCities') ?? '[]')); } catch { /* */ }
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

  const handleCitySelect = (city: City) => {
    setSelectedCity(city.slug);
    const next = [city.slug, ...recentSlugs.filter(s => s !== city.slug)].slice(0, 3);
    setRecentSlugs(next);
    localStorage.setItem('recentCities', JSON.stringify(next));
    setShowCityPicker(false);
    if (q.trim()) router.push(`/${city.slug}/search?q=${encodeURIComponent(q.trim())}`);
    else router.push(`/${city.slug}`);
  };

  // Geo: set city WITHOUT navigating — let user compose their search first
  const handleGeoSetCity = (city: City) => {
    setSelectedCity(city.slug);
    const next = [city.slug, ...recentSlugs.filter(s => s !== city.slug)].slice(0, 3);
    setRecentSlugs(next);
    localStorage.setItem('recentCities', JSON.stringify(next));
    setShowCityPicker(false);
  };

  const handleGeoLocate = () => {
    if (geoStatus === 'locating') return;
    if (!('geolocation' in navigator)) {
      flashMsg('Geolocation not supported by this browser', 'failed');
      return;
    }
    setGeoStatus('locating');
    setGeoMsg('');

    navigator.geolocation.getCurrentPosition(
      async ({ coords: { latitude, longitude } }) => {
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`,
            { headers: { 'Accept-Language': 'en-IN,en' } }
          );
          const data = await res.json();
          const raw: string = (
            data.address?.city || data.address?.town || data.address?.county || ''
          ).trim();
          const lc = raw.toLowerCase();

          // fuzzy match against our city list
          const match = cities.find(c => {
            const cn = c.name.toLowerCase();
            return (
              cn === lc ||
              lc.startsWith(cn) ||
              cn.startsWith(lc.split(' ')[0])
            );
          });

          if (match) {
            handleGeoSetCity(match);
            flashMsg(`Located in ${match.name}`, 'located');
          } else {
            flashMsg(raw ? `"${raw}" isn't in our city list yet` : 'City not detected', 'failed');
          }
        } catch {
          flashMsg('Location lookup failed — check your connection', 'failed');
        }
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          flashMsg('Location access denied — enable it in browser settings', 'denied');
        } else {
          flashMsg("Couldn't get your location, please try again", 'failed');
        }
      },
      { timeout: 10_000, maximumAge: 60_000 }
    );
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCity) { setShowCityPicker(true); return; }
    if (q.trim()) router.push(`/${selectedCity}/search?q=${encodeURIComponent(q.trim())}`);
    else router.push(`/${selectedCity}`);
  };

  // ── derived data ──────────────────────────────────────────────
  const recentCities = cities.filter(c => recentSlugs.includes(c.slug));
  const grouped: Record<string, City[]> = {};
  const search = citySearch.toLowerCase();
  for (const s of STATE_ORDER) {
    const sc = cities.filter(c => c.state === s && c.name.toLowerCase().includes(search));
    if (sc.length) grouped[s] = sc;
  }
  const otherStates = Array.from(new Set(cities.map(c => c.state)))
    .filter(s => !STATE_ORDER.includes(s))
    .sort();
  for (const s of otherStates) {
    const sc = cities.filter(c => c.state === s && c.name.toLowerCase().includes(search));
    if (sc.length) grouped[s] = sc;
  }
  const selectedCityName = cities.find(c => c.slug === selectedCity)?.name;

  // ─────────────────────────────────────────────────────────────
  return (
    <div className="bg-slate-50">

      {/* ══════════════════════════════════════════════
          HEADER
      ══════════════════════════════════════════════ */}
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-sm border-b border-slate-100 shadow-sm shadow-slate-900/[0.04]">
        <div className="page-wrap h-16 flex items-center gap-6">
          <Link href="/" className="shrink-0 flex flex-col leading-none">
            <span className="text-xl font-extrabold tracking-tight text-slate-900">
              Locals<span className="text-orange-500">India</span>
            </span>
            <span className="text-[10px] font-medium text-slate-400 tracking-wide">localsindia.com</span>
          </Link>

          <div className="flex-1" />

          <nav className="flex items-center gap-1">
            <button
              onClick={() => setShowCityPicker(true)}
              className="hidden md:flex px-3 py-2 rounded-lg text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors"
            >
              Browse Cities
            </button>
            <Link
              href="/auth/login"
              className="hidden md:flex px-3 py-2 rounded-lg text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors"
            >
              Login
            </Link>

            {/* Language selector */}
            <LanguageSelector />

            <button
              onClick={() => setShowCityPicker(true)}
              className="ml-1 px-4 py-2 rounded-xl text-sm font-semibold text-white bg-orange-500 hover:bg-orange-600 transition-colors shadow-sm shadow-orange-500/25"
            >
              <span className="hidden sm:inline">Post a Listing</span>
              <span className="sm:hidden">+ Post</span>
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
            {/* Eyebrow badge */}
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full mb-7
              bg-orange-500/[0.12] border border-orange-500/[0.2] text-orange-300 text-xs font-medium tracking-wide">
              <Globe className="w-3.5 h-3.5 shrink-0" strokeWidth={2} />
              South India&apos;s Hyperlocal Community Platform
            </div>

            {/* ── Dynamic Headline ──────────────────────── */}
            <h1 className="text-4xl sm:text-5xl md:text-[3.75rem] font-extrabold text-white
              leading-[1.05] tracking-[-0.03em] mb-5">
              Buy. Sell. Connect.<br />
              <AnimatePresence mode="wait" initial={false}>
                <motion.span
                  key={selectedCityName ?? '__default'}
                  initial={{ opacity: 0, y: 18 }}
                  animate={{ opacity: 1, y: 0, transition: SPRING }}
                  exit={{ opacity: 0, y: -10, transition: { duration: 0.16, ease: 'easeIn' } }}
                  className="text-orange-500 inline-block"
                >
                  {selectedCityName ? `In ${selectedCityName}.` : 'In Your City.'}
                </motion.span>
              </AnimatePresence>
            </h1>

            {/* Sub-text */}
            <p className="text-base md:text-lg text-slate-400 max-w-lg leading-relaxed mb-10">
              Post listings, find PGs, discover local services —<br className="hidden sm:block" />
              in your language, in your neighbourhood.
            </p>

            {/* ── Unified Search Bar ─────────────────────── */}
            <motion.form
              onSubmit={handleSearch}
              animate={geoStatus === 'located' ? {
                boxShadow: [
                  '0 25px 50px -12px rgba(0,0,0,0.4)',
                  '0 25px 50px -12px rgba(249,115,22,0.25), 0 0 0 3px rgba(249,115,22,0.2)',
                  '0 25px 50px -12px rgba(0,0,0,0.4)',
                ],
              } : {}}
              transition={{ duration: 0.9, ease: 'easeOut' }}
              className="flex max-w-2xl w-full rounded-[20px] bg-white
                shadow-[0_20px_60px_-10px_rgba(0,0,0,0.45)]
                ring-1 ring-black/[0.07]
                focus-within:ring-[3px] focus-within:ring-orange-500/[0.22]
                focus-within:shadow-[0_20px_60px_-10px_rgba(249,115,22,0.15)]
                transition-[box-shadow,ring] duration-300"
            >
              {/* ── City trigger + Geo button ── */}
              <div className="flex items-center border-r border-slate-100 shrink-0">
                <button
                  type="button"
                  onClick={() => setShowCityPicker(true)}
                  className="flex items-center gap-2 pl-5 pr-2 h-[58px] rounded-l-2xl
                    min-w-[108px] sm:min-w-[136px]
                    hover:bg-slate-50/80 transition-colors duration-150 group"
                >
                  {/* Pin icon pulses briefly when city changes */}
                  <motion.span
                    animate={selectedCityName ? { scale: [1, 1.35, 1] } : {}}
                    transition={{ duration: 0.35, ease: 'easeOut' }}
                  >
                    <MapPin className="w-4 h-4 text-orange-500 shrink-0" strokeWidth={2.2} />
                  </motion.span>

                  {/* Animated city label */}
                  <div className="flex-1 overflow-hidden text-left">
                    <AnimatePresence mode="wait" initial={false}>
                      <motion.span
                        key={selectedCityName ?? '__none'}
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0, transition: { duration: 0.2, ease: 'easeOut' } }}
                        exit={{ opacity: 0, y: -6, transition: { duration: 0.12, ease: 'easeIn' } }}
                        className="block text-sm font-semibold text-slate-800 truncate"
                      >
                        {selectedCityName ?? 'Select City'}
                      </motion.span>
                    </AnimatePresence>
                  </div>

                  <ChevronDown
                    className="w-3.5 h-3.5 text-slate-400 shrink-0 group-hover:text-slate-600 transition-colors ml-1"
                    strokeWidth={2}
                  />
                </button>

                {/* Thin rule between city button and geo icon */}
                <div className="h-5 w-px bg-slate-200/80 mx-1 shrink-0" />

                {/* Geo locate button */}
                <button
                  type="button"
                  onClick={handleGeoLocate}
                  disabled={geoStatus === 'locating' || geoStatus === 'denied'}
                  title={
                    geoStatus === 'denied'  ? 'Location denied — enable in browser settings' :
                    geoStatus === 'located' ? `Located in ${selectedCityName}` :
                    'Use my current location'
                  }
                  aria-label="Detect current location"
                  className={`flex items-center justify-center w-9 h-9 mr-2 rounded-xl shrink-0
                    transition-all duration-200
                    ${geoStatus === 'located'
                      ? 'text-orange-500 bg-orange-50'
                      : geoStatus === 'denied'
                      ? 'text-slate-300 cursor-not-allowed'
                      : 'text-slate-400 hover:text-orange-500 hover:bg-orange-50'
                    }`}
                >
                  <AnimatePresence mode="wait" initial={false}>
                    {geoStatus === 'locating' ? (
                      <motion.span key="spin"
                        initial={{ opacity: 0, rotate: -90 }} animate={{ opacity: 1, rotate: 0 }} exit={{ opacity: 0 }}
                        transition={{ duration: 0.15 }}
                      >
                        <Loader2 className="w-4 h-4 animate-spin" strokeWidth={2} />
                      </motion.span>
                    ) : geoStatus === 'located' ? (
                      <motion.span key="check"
                        initial={{ opacity: 0, scale: 0.6 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
                        transition={{ duration: 0.2, ease: 'backOut' }}
                      >
                        <CheckCircle2 className="w-4 h-4" strokeWidth={2} />
                      </motion.span>
                    ) : (
                      <motion.span key="locate"
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        transition={{ duration: 0.15 }}
                      >
                        <LocateFixed className="w-4 h-4" strokeWidth={2} />
                      </motion.span>
                    )}
                  </AnimatePresence>
                </button>
              </div>

              {/* ── Search input ── */}
              <input
                value={q}
                onChange={e => setQ(e.target.value)}
                placeholder="Search tiffin, PG, laptop, Honda Activa..."
                className="flex-1 min-w-0 px-5 h-[58px]
                  text-[15px] font-normal leading-none text-slate-800 tracking-[-0.01em]
                  placeholder:text-slate-400/45 placeholder:font-light placeholder:tracking-[0.02em]
                  caret-orange-500 outline-none bg-transparent"
              />

              {/* ── Submit button — floating pill inset from form edge ── */}
              <div className="flex items-center shrink-0 pr-[7px]">
                <button
                  type="submit"
                  className="flex items-center gap-2 px-5 sm:px-6 h-[44px] rounded-[13px]
                    bg-gradient-to-br from-orange-500 to-orange-600 text-white
                    text-[13px] font-semibold tracking-wide
                    shadow-md shadow-orange-500/35
                    hover:from-orange-500 hover:to-orange-700
                    hover:shadow-lg hover:shadow-orange-500/40
                    active:scale-[0.97] transition-all duration-200 shrink-0"
                >
                  <Search className="w-3.5 h-3.5 shrink-0" strokeWidth={2.5} />
                  <span className="hidden sm:inline">Search</span>
                </button>
              </div>
            </motion.form>

            {/* ── Geo feedback message ── */}
            <AnimatePresence>
              {geoMsg && (
                <motion.p
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.2 }}
                  className={`mt-3 text-xs font-medium flex items-center gap-1.5 ${
                    geoStatus === 'located' ? 'text-emerald-400' :
                    geoStatus === 'denied'  ? 'text-red-400/80' :
                    'text-amber-400/80'
                  }`}
                >
                  {geoStatus === 'located' && <CheckCircle2 className="w-3.5 h-3.5 shrink-0" strokeWidth={2} />}
                  {geoMsg}
                </motion.p>
              )}
            </AnimatePresence>

            {/* ── Popular tags ── */}
            <div className="flex flex-wrap items-center gap-x-2 gap-y-2 mt-5
              justify-center sm:justify-start">
              <span className="w-full sm:w-auto text-center sm:text-left
                text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500/70 sm:mr-1">
                Popular searches
              </span>
              {POPULAR_TAGS.map(t => (
                <motion.button
                  key={t}
                  type="button"
                  onClick={() => setQ(t)}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="group flex items-center gap-1 px-3.5 py-[7px]
                    text-[11px] font-semibold text-slate-300/75
                    bg-white/[0.05] backdrop-blur-sm
                    border border-white/[0.1]
                    rounded-full
                    hover:bg-orange-500/[0.14] hover:border-orange-400/[0.3]
                    hover:text-orange-300
                    transition-colors duration-200"
                >
                  {t}
                  <ArrowRight
                    className="w-2.5 h-2.5 shrink-0 opacity-0 -translate-x-1
                      group-hover:opacity-100 group-hover:translate-x-0
                      transition-all duration-200"
                    strokeWidth={2.5}
                  />
                </motion.button>
              ))}
            </div>
          </motion.div>

          {/* ── Stats row ── */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.45 }}
            className="flex flex-wrap gap-x-12 gap-y-5 mt-16 pt-8 border-t border-white/[0.07]"
          >
            {STATS.map(([num, label]) => (
              <div key={num} className="flex flex-col gap-1.5">
                <div className="text-3xl font-black text-white tracking-tight leading-none">{num}</div>
                <div className="text-[11px] font-medium text-slate-500 uppercase tracking-widest leading-none">
                  {label}
                </div>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════
          CATEGORY GRID
      ══════════════════════════════════════════════ */}
      <section className="bg-white border-b border-slate-100">
        <div className="page-wrap py-14 sm:py-16">

          {/* Section header */}
          <div className="flex items-end justify-between mb-8">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-orange-500 mb-2">
                What are you looking for?
              </p>
              <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
                Browse by Category
              </h2>
            </div>
            <span className="hidden sm:block text-[11px] font-medium text-slate-400 pb-0.5">
              {CATEGORIES.length} categories
            </span>
          </div>

          {/* Grid: 2-col mobile → 4-col desktop, gap tightens on mobile */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
            {CATEGORIES.map(({ icon: Icon, name, color, count }) => (
              <motion.div
                key={name}
                onClick={() => setShowCityPicker(true)}
                whileHover={{ y: -4 }}
                whileTap={{ scale: 0.97 }}
                transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
                className="group relative bg-white rounded-2xl border border-slate-100
                  cursor-pointer overflow-hidden
                  shadow-[0_1px_4px_rgba(0,0,0,0.06)]
                  hover:shadow-[0_14px_36px_-6px_rgba(0,0,0,0.10)]
                  hover:border-transparent
                  transition-[box-shadow,border-color] duration-300"
              >
                {/* Very subtle orange gradient wash on hover */}
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100
                  transition-opacity duration-300 pointer-events-none
                  bg-gradient-to-br from-transparent via-transparent to-orange-500/[0.04]" />

                {/* Card body — flex-col with flex-1 spacer pins text to bottom */}
                <div className="relative flex flex-col p-5 sm:p-6
                  min-h-[152px] sm:min-h-[172px]">

                  {/* Icon — top-anchored */}
                  <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl shrink-0
                    flex items-center justify-center ${color}
                    transition-transform duration-200
                    group-hover:scale-110`}>
                    <Icon className="w-[18px] h-[18px] sm:w-5 sm:h-5" />
                  </div>

                  {/* Spacer fills available height */}
                  <div className="flex-1" />

                  {/* Name + count — bottom-anchored, always aligned */}
                  <div>
                    <h3 className="text-sm sm:text-[15px] font-semibold text-slate-800
                      leading-snug group-hover:text-orange-500
                      transition-colors duration-200">
                      {name}
                    </h3>
                    <div className="flex items-center justify-between mt-1.5">
                      <p className="text-[11px] font-medium text-slate-400/80
                        tabular-nums tracking-[0.005em]">
                        {count} listings
                      </p>
                      {/* Arrow slides in from left on hover */}
                      <ArrowRight
                        className="w-3 h-3 text-orange-400 shrink-0
                          opacity-0 -translate-x-1
                          group-hover:opacity-100 group-hover:translate-x-0
                          transition-all duration-200"
                        strokeWidth={2.5}
                      />
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════
          FRESH LISTINGS
      ══════════════════════════════════════════════ */}
      <FreshListingsSection onCityPickerOpen={() => setShowCityPicker(true)} />

      {/* ══════════════════════════════════════════════
          CITY PICKER MODAL
      ══════════════════════════════════════════════ */}
      <AnimatePresence>
        {showCityPicker && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
              onClick={() => setShowCityPicker(false)}
            />

            {/* Modal */}
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 12 }}
              transition={{ duration: 0.18, ease: 'easeOut' }}
              className="relative bg-white rounded-3xl w-full max-w-2xl max-h-[82vh] overflow-hidden
                shadow-2xl shadow-slate-900/20 ring-1 ring-slate-900/[0.05]"
            >
              {/* Header */}
              <div className="px-6 pt-6 pb-4 border-b border-slate-100">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-base font-bold text-slate-900">Select your city</h2>
                  <button
                    onClick={() => setShowCityPicker(false)}
                    className="w-8 h-8 rounded-full flex items-center justify-center
                      text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                  >
                    <X className="w-4 h-4" strokeWidth={2} />
                  </button>
                </div>

                {/* Search input */}
                <div className="flex items-center gap-3 rounded-xl bg-slate-50 px-4 py-2.5
                  border border-slate-200 transition-all duration-200
                  focus-within:border-orange-400 focus-within:ring-2 focus-within:ring-orange-500/10">
                  <Search className="w-4 h-4 text-slate-400 shrink-0" strokeWidth={2} />
                  <input
                    autoFocus
                    value={citySearch}
                    onChange={e => setCitySearch(e.target.value)}
                    placeholder="Search city..."
                    className="flex-1 bg-transparent text-sm text-slate-800 placeholder:text-slate-400 outline-none"
                  />
                </div>

                {/* Use Current Location button */}
                <motion.button
                  type="button"
                  onClick={handleGeoLocate}
                  disabled={geoStatus === 'locating' || geoStatus === 'denied'}
                  whileTap={geoStatus !== 'locating' && geoStatus !== 'denied' ? { scale: 0.98 } : {}}
                  className={`mt-3 w-full flex items-center gap-3 px-4 py-2.5 rounded-xl
                    text-sm font-semibold border transition-all duration-200 ${
                      geoStatus === 'locating'
                        ? 'border-orange-200 bg-orange-50 text-orange-500 cursor-wait'
                        : geoStatus === 'denied'
                        ? 'border-slate-100 bg-slate-50 text-slate-400 cursor-not-allowed'
                        : geoStatus === 'located'
                        ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                        : 'border-dashed border-orange-200 bg-orange-50/60 text-orange-600 hover:bg-orange-100 hover:border-orange-300'
                    }`}
                >
                  <span className="shrink-0">
                    {geoStatus === 'locating'
                      ? <Loader2 className="w-4 h-4 animate-spin" />
                      : geoStatus === 'located'
                      ? <CheckCircle2 className="w-4 h-4" />
                      : <LocateFixed className="w-4 h-4" />
                    }
                  </span>
                  <span>
                    {geoStatus === 'locating' ? 'Detecting your location...' :
                     geoStatus === 'located'  ? `Located in ${selectedCityName}` :
                     geoStatus === 'denied'   ? 'Location access denied' :
                     'Use Current Location'}
                  </span>
                </motion.button>
              </div>

              {/* Body */}
              <div className="overflow-y-auto max-h-[56vh] p-6 space-y-6">
                {/* Recent cities */}
                {recentCities.length > 0 && !citySearch && (
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-3">Recent</p>
                    <div className="flex gap-2 flex-wrap">
                      {recentCities.map(c => (
                        <button
                          key={c.slug}
                          onClick={() => handleCitySelect(c)}
                          className="px-4 py-2 rounded-full text-sm font-semibold
                            border border-orange-200 bg-orange-50 text-orange-600
                            hover:bg-orange-100 transition-colors"
                        >
                          {c.name}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Grouped cities */}
                {loading ? (
                  <div className="grid grid-cols-3 gap-2">
                    {Array.from({ length: 12 }).map((_, i) => (
                      <div key={i} className="h-10 bg-slate-100 rounded-xl animate-pulse" />
                    ))}
                  </div>
                ) : (
                  Object.entries(grouped).map(([state, stateCities]) => (
                    <div key={state}>
                      <div className="flex items-center gap-2 mb-3">
                        <MapPin className="w-3.5 h-3.5 text-orange-500 shrink-0" strokeWidth={2} />
                        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{state}</p>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        {stateCities.map(c => (
                          <motion.button
                            key={c.slug}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => handleCitySelect(c)}
                            className="px-3 py-2.5 rounded-xl border border-slate-100
                              text-sm font-medium text-slate-700 text-left
                              hover:border-orange-300 hover:text-orange-600 hover:bg-orange-50
                              transition-all duration-150"
                          >
                            {c.name}
                          </motion.button>
                        ))}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ══════════════════════════════════════════════
          TRUST BADGES
      ══════════════════════════════════════════════ */}
      <section className="bg-[#0D0F1C] py-14">
        <div className="page-wrap">
          <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-600 mb-6">
            Why LocalsIndia
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {TRUST.map(({ icon: Icon, title, subtitle, iconBg, iconColor, isWhatsApp }) =>
              isWhatsApp ? (

                /* ── WhatsApp Native — hero card ────────────────── */
                <div
                  key={title}
                  className="relative flex items-start gap-4 p-5 rounded-2xl overflow-hidden
                    bg-[#25D366]/[0.07] border border-[#25D366]/[0.18]
                    hover:bg-[#25D366]/[0.10] transition-colors duration-200"
                >
                  {/* Atmospheric corner glow */}
                  <div
                    className="absolute -right-5 -top-5 w-20 h-20 rounded-full
                      bg-[#25D366]/[0.12] blur-2xl pointer-events-none"
                    aria-hidden
                  />

                  {/* Icon with slow pulsing ring */}
                  <div className="relative shrink-0">
                    <motion.div
                      animate={{ scale: [1, 1.7, 1], opacity: [0.28, 0, 0.28] }}
                      transition={{
                        duration: 2.8,
                        repeat: Infinity,
                        ease: 'easeOut',
                        repeatDelay: 1,
                      }}
                      className="absolute inset-0 rounded-xl bg-[#25D366]/[0.35]"
                      aria-hidden
                    />
                    <div className="relative w-10 h-10 rounded-xl bg-[#25D366]/[0.22]
                      flex items-center justify-center">
                      <svg
                        viewBox="0 0 24 24"
                        className="w-5 h-5 fill-[#4ade80]"
                        aria-hidden
                      >
                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                      </svg>
                    </div>
                  </div>

                  {/* Text */}
                  <div className="relative">
                    {/* Title + live pill */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-semibold text-white leading-none">
                        WhatsApp Native
                      </p>
                      <span className="inline-flex items-center gap-[5px] px-[7px] py-[3px]
                        rounded-full bg-[#25D366]/[0.16] border border-[#25D366]/[0.28]">
                        <span className="relative flex h-[6px] w-[6px]">
                          <span className="animate-ping absolute inset-0 rounded-full
                            bg-emerald-400 opacity-65" />
                          <span className="relative inline-flex rounded-full h-[6px] w-[6px]
                            bg-emerald-400" />
                        </span>
                        <span className="text-[9px] font-bold uppercase tracking-[0.08em]
                          text-emerald-400 leading-none">
                          Live
                        </span>
                      </span>
                    </div>

                    {/* Subtitle — key phrase highlighted */}
                    <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
                      Contact sellers directly —{' '}
                      <span className="text-emerald-400/80 font-medium">
                        zero middlemen, zero commissions.
                      </span>
                    </p>
                  </div>
                </div>

              ) : (

                /* ── Standard trust cards ───────────────────────── */
                <div
                  key={title}
                  className="flex items-start gap-4 p-5 rounded-2xl
                    bg-white/[0.04] border border-white/[0.06]
                    hover:bg-white/[0.07] transition-colors duration-200"
                >
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${iconBg}`}>
                    <Icon className={`w-5 h-5 ${iconColor}`} strokeWidth={1.8} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white">{title}</p>
                    <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">{subtitle}</p>
                  </div>
                </div>

              )
            )}
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
