'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Search, MapPin, LogOut, List, User,
  ChevronDown, Plus,
} from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import LanguageSelector from '@/components/language-selector/LanguageSelector';
import SiteLogo from '@/components/site-logo/SiteLogo';

// ── Types ─────────────────────────────────────────────────────────────────────
interface Props {
  citySlug?: string;
  cityName?: string;
}

interface StoredUser {
  name?: string;
  phone?: string;
  email?: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function titleCase(slug: string): string {
  return slug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

function getInitials(name: string): string {
  return name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
}

// ── Shared CTA — used in both authenticated and guest states ──────────────────
function PostListingCta({ href }: { href: string }) {
  return (
    <Link
      href={href}
      className="flex items-center gap-1.5 shrink-0
        pl-[14px] pr-[18px] py-[9px] rounded-[10px]
        text-[13px] font-semibold tracking-tight text-white
        bg-[#F7921E]
        shadow-[0_2px_12px_rgba(247,146,30,0.28),inset_0_1px_0_rgba(255,255,255,0.14)]
        hover:bg-[#E07B0A]
        hover:shadow-[0_4px_20px_rgba(247,146,30,0.44),inset_0_1px_0_rgba(255,255,255,0.10)]
        hover:-translate-y-px
        active:translate-y-0 active:scale-[0.985]
        active:shadow-[0_1px_6px_rgba(247,146,30,0.22)]
        transition-all duration-200 select-none"
    >
      <Plus className="w-[13px] h-[13px] shrink-0" strokeWidth={2.8} aria-hidden />
      <span className="hidden sm:inline">Post Listing</span>
      <span className="sm:hidden">Post</span>
    </Link>
  );
}

// ── Vertical hairline divider ─────────────────────────────────────────────────
function NavDivider() {
  return <div className="hidden md:block w-px h-[14px] bg-slate-200/70 mx-2 shrink-0" />;
}

// ── Ghost nav button/link base classes ─────────────────────────────────────────
const ghostLink =
  'hidden md:flex items-center h-8 px-3 rounded-xl text-[12.5px] font-medium ' +
  'text-slate-500 hover:text-slate-900 hover:bg-slate-50 transition-colors duration-150';

// ── Component ─────────────────────────────────────────────────────────────────
export default function SiteHeader({ citySlug, cityName }: Props) {
  const router = useRouter();
  const [q, setQ] = useState('');
  const [user, setUser] = useState<StoredUser | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Hydrate user from localStorage
  useEffect(() => {
    const stored = localStorage.getItem('user');
    if (stored) try { setUser(JSON.parse(stored)); } catch { /* ignore */ }
  }, []);

  // Close user menu on outside click
  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [menuOpen]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!q.trim()) return;
    router.push(citySlug
      ? `/${citySlug}/search?q=${encodeURIComponent(q.trim())}`
      : '/'
    );
  };

  const logout = () => {
    ['access_token', 'refresh_token', 'user'].forEach(k => localStorage.removeItem(k));
    setUser(null);
    setMenuOpen(false);
    router.push('/');
  };

  const displayName = user?.name && !user.name.startsWith('+91')
    ? user.name
    : user?.email?.split('@')[0] ?? 'Me';

  const postHref = citySlug ? `/${citySlug}/classifieds/post` : '/';

  const cityLabel = cityName
    ?? (citySlug ? titleCase(citySlug) : 'All India');

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <header className="sticky top-0 z-50 bg-white/[0.98] backdrop-blur-md border-b border-slate-200/60">
      <div className="page-wrap h-16 flex items-center gap-4">

        {/* ── Logo ─────────────────────────────────────────── */}
        <SiteLogo href="/" size="sm" variant="default" className="shrink-0" />

        {/* ── Search bar (visible on city pages, desktop only) */}
        {citySlug && (
          <form
            onSubmit={handleSearch}
            className="hidden md:flex flex-1 max-w-[360px]"
          >
            <label className="flex items-center gap-2.5 w-full h-9 px-3.5
              rounded-2xl border cursor-text
              bg-slate-50 border-slate-100/80
              focus-within:bg-white focus-within:border-orange-300/50
              focus-within:ring-[3px] focus-within:ring-[#F7921E]/[0.07]
              transition-all duration-200">
              <Search
                className="w-[14px] h-[14px] text-slate-400 shrink-0"
                strokeWidth={1.9}
                aria-hidden
              />
              <input
                value={q}
                onChange={e => setQ(e.target.value)}
                placeholder={`Search in ${cityLabel}...`}
                aria-label={`Search in ${cityLabel}`}
                className="flex-1 bg-transparent text-[13px] text-slate-800
                  placeholder:text-slate-400 outline-none"
              />
            </label>
          </form>
        )}

        {/* Flex spacer — pushes nav to the right */}
        <div className="flex-1" />

        {/* ── Right nav ────────────────────────────────────── */}
        <nav className="flex items-center gap-0.5" aria-label="Site navigation">

          {/* City chip — shows current city or "All India" */}
          <button
            type="button"
            onClick={() => router.push('/')}
            title="Change city"
            className="hidden md:flex items-center gap-1.5 h-8 px-3.5 rounded-full shrink-0
              text-[12.5px] font-medium
              text-slate-600 bg-slate-50 border border-slate-100/80
              hover:bg-[#FEF3E2] hover:border-orange-200/60 hover:text-[#E07B0A]
              transition-all duration-150"
          >
            <MapPin
              className="w-3 h-3 text-[#F7921E] shrink-0"
              strokeWidth={2.5}
              aria-hidden
            />
            <span className="max-w-[88px] truncate">{cityLabel}</span>
            <ChevronDown
              className="w-2.5 h-2.5 text-slate-350 shrink-0"
              strokeWidth={2.5}
              aria-hidden
            />
          </button>

          {/* Browse link */}
          <Link href={citySlug ? `/${citySlug}` : '/'} className={ghostLink}>
            Browse
          </Link>

          <NavDivider />

          {/* Language selector */}
          <LanguageSelector />

          {/* ── Auth ─────────────────────────────────────── */}
          {user ? (
            /* Logged-in: avatar + name + dropdown */
            <div className="relative hidden md:block" ref={menuRef}>
              <button
                type="button"
                onClick={() => setMenuOpen(v => !v)}
                aria-expanded={menuOpen}
                aria-haspopup="menu"
                aria-label="Account menu"
                className={`flex items-center gap-2 pl-1.5 pr-2.5 py-1.5
                  rounded-xl transition-colors duration-150
                  ${menuOpen ? 'bg-slate-100' : 'hover:bg-slate-50'}`}
              >
                {/* Avatar */}
                <span
                  className="w-7 h-7 rounded-lg flex items-center justify-center
                    text-[11px] font-bold text-white shrink-0"
                  style={{ background: 'var(--li-primary)' }}
                  aria-hidden
                >
                  {getInitials(displayName)}
                </span>
                {/* Name */}
                <span className="text-[12.5px] font-medium text-slate-700
                  max-w-[76px] truncate leading-none">
                  {displayName}
                </span>
                {/* Chevron */}
                <ChevronDown
                  className={`w-3 h-3 text-slate-400 transition-transform duration-200
                    ${menuOpen ? 'rotate-180' : ''}`}
                  strokeWidth={2.5}
                  aria-hidden
                />
              </button>

              {/* Dropdown */}
              <AnimatePresence>
                {menuOpen && (
                  <motion.div
                    role="menu"
                    initial={{ opacity: 0, scale: 0.96, y: -6 }}
                    animate={{ opacity: 1, scale: 1,    y:  0 }}
                    exit={{ opacity: 0,   scale: 0.96, y: -4 }}
                    transition={{ duration: 0.16, ease: [0.22, 1, 0.36, 1] }}
                    style={{ transformOrigin: 'top right' }}
                    className="absolute right-0 top-[calc(100%+8px)] w-48 z-50
                      bg-white rounded-2xl p-1.5
                      shadow-[0_8px_32px_rgba(0,0,0,0.09),0_0_0_1px_rgba(0,0,0,0.04)]"
                  >
                    <Link
                      href="/profile"
                      role="menuitem"
                      onClick={() => setMenuOpen(false)}
                      className="flex items-center gap-2.5 px-3 py-2 rounded-xl
                        text-[12.5px] font-medium text-slate-700
                        hover:bg-slate-50 hover:text-slate-900 transition-colors duration-100"
                    >
                      <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      My Profile
                    </Link>
                    <Link
                      href="/profile/listings"
                      role="menuitem"
                      onClick={() => setMenuOpen(false)}
                      className="flex items-center gap-2.5 px-3 py-2 rounded-xl
                        text-[12.5px] font-medium text-slate-700
                        hover:bg-slate-50 hover:text-slate-900 transition-colors duration-100"
                    >
                      <List className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      My Listings
                    </Link>
                    <div className="h-px bg-slate-100 mx-1 my-1.5" />
                    <button
                      type="button"
                      role="menuitem"
                      onClick={logout}
                      className="flex items-center gap-2.5 px-3 py-2 rounded-xl w-full text-left
                        text-[12.5px] font-medium text-rose-500
                        hover:bg-rose-50 transition-colors duration-100"
                    >
                      <LogOut className="w-3.5 h-3.5 shrink-0" />
                      Sign Out
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ) : (
            /* Guest: Sign in ghost link */
            <Link href="/auth/login" className={`${ghostLink} ml-0.5`}>
              Sign in
            </Link>
          )}

          {/* Post Listing — primary CTA */}
          <div className="ml-2 shrink-0">
            <PostListingCta href={postHref} />
          </div>
        </nav>
      </div>
    </header>
  );
}
