'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Globe, Check, X } from 'lucide-react';
import { usePrefs } from '@/context/PrefsContext';
import type { LangCode } from '@/lib/prefs';

// ─── Language registry ───────────────────────────────────────
// Codes must match VALID_LANGS in lib/prefs.ts (the single source of truth) —
// TypeScript enforces this below, so this list can't silently drift out of
// sync with what's actually supported.
export const LANGUAGES: { code: LangCode; native: string; english: string; region: string }[] = [
  { code: 'en', native: 'English',   english: 'English',   region: 'All India'          },
  { code: 'te', native: 'తెలుగు',    english: 'Telugu',    region: 'Andhra · Telangana' },
  { code: 'ta', native: 'தமிழ்',     english: 'Tamil',     region: 'Tamil Nadu'         },
  { code: 'kn', native: 'ಕನ್ನಡ',    english: 'Kannada',   region: 'Karnataka'          },
  { code: 'ml', native: 'മലയാളം',   english: 'Malayalam', region: 'Kerala'             },
];

// ─── Chevron icon (no extra dependency) ─────────────────────
function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      viewBox="0 0 10 6"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`w-3 h-3 shrink-0 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
      aria-hidden
    >
      <path d="M1 1l4 4 4-4" />
    </svg>
  );
}

// ─── Language card ───────────────────────────────────────────
function LangCard({
  lang,
  isActive,
  onSelect,
}: {
  lang: (typeof LANGUAGES)[number];
  isActive: boolean;
  onSelect: () => void;
}) {
  return (
    <motion.button
      type="button"
      onClick={onSelect}
      whileTap={{ scale: 0.97 }}
      className={`relative flex flex-col items-start px-3 py-2.5 rounded-xl text-left w-full
        transition-colors duration-120
        ${isActive
          ? 'bg-orange-500 shadow-sm shadow-orange-200/60'
          : 'bg-slate-50 border border-slate-100 hover:bg-orange-50/50 hover:border-orange-200/60'
        }`}
    >
      {/* Active checkmark */}
      <AnimatePresence>
        {isActive && (
          <motion.span
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.5 }}
            transition={{ duration: 0.18, ease: 'backOut' }}
            className="absolute top-2 right-2"
          >
            <Check className="w-3 h-3 text-white/75" strokeWidth={2.8} />
          </motion.span>
        )}
      </AnimatePresence>

      {/* Native name — in its own script, most prominent */}
      <span
        className={`text-[13px] font-semibold leading-snug block pr-4
          ${isActive ? 'text-white' : 'text-slate-800'}`}
      >
        {lang.native}
      </span>

      {/* English label */}
      <span
        className={`text-[10px] font-medium mt-0.5 block
          ${isActive ? 'text-orange-100' : 'text-slate-400'}`}
      >
        {lang.english}
      </span>

      {/* Region */}
      <span
        className={`text-[9px] mt-0.5 block leading-tight
          ${isActive ? 'text-orange-200/75' : 'text-slate-300'}`}
      >
        {lang.region}
      </span>
    </motion.button>
  );
}

// ─── Panel content (shared between dropdown + sheet) ─────────
function PanelContent({
  currentLang,
  onSelect,
  onClose,
  isMobile,
}: {
  currentLang: LangCode;
  onSelect: (code: LangCode) => void;
  onClose: () => void;
  isMobile: boolean;
}) {
  return (
    <>
      {/* Drag handle — mobile only */}
      {isMobile && (
        <div className="flex justify-center pt-3 pb-1.5">
          <div className="w-9 h-[3px] rounded-full bg-slate-200" />
        </div>
      )}

      {/* Header */}
      <div
        className={`flex items-start justify-between border-b border-slate-100
          ${isMobile ? 'px-5 pt-4 pb-4' : 'px-5 pt-5 pb-4'}`}
      >
        <div>
          <p className="text-sm font-bold text-slate-900 leading-none tracking-tight">
            Select Language
          </p>
          <p className="text-[11px] text-slate-400 mt-1.5 leading-snug">
            Navigation &amp; listings in your preferred language
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close language selector"
          className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 -mt-0.5
            text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
        >
          <X className="w-3.5 h-3.5" strokeWidth={2.2} />
        </button>
      </div>

      {/* Scrollable area — grid + footer */}
      <div className="flex-1 overflow-y-auto overscroll-contain">
        <div className="p-4 grid grid-cols-3 gap-2">
          {LANGUAGES.map(lang => (
            <LangCard
              key={lang.code}
              lang={lang}
              isActive={lang.code === currentLang}
              onSelect={() => onSelect(lang.code)}
            />
          ))}
        </div>
        <p className="px-5 pb-6 text-[10px] text-slate-300 text-center leading-snug">
          More languages are added regularly.
        </p>
      </div>
    </>
  );
}

// ─── Main component ──────────────────────────────────────────
export default function LanguageSelector() {
  // Lang state is now owned by PrefsContext — no local cookie management needed.
  const { lang: currentLang, setLang } = usePrefs();
  const [isOpen, setIsOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Track viewport
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)');
    setIsMobile(mq.matches);
    const handler = (e: MediaQueryListEvent) => {
      setIsMobile(e.matches);
      setIsOpen(false);
    };
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  // Outside-click close (desktop only)
  useEffect(() => {
    if (!isOpen || isMobile) return;
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [isOpen, isMobile]);

  // Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [isOpen]);

  // Body scroll lock for mobile sheet
  useEffect(() => {
    document.body.style.overflow = isMobile && isOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [isMobile, isOpen]);

  const selectLang = (code: LangCode) => {
    setLang(code);
    setIsOpen(false);
  };

  const activeLang = LANGUAGES.find(l => l.code === currentLang)!;
  const isNonDefault = currentLang !== 'en';

  // ── Desktop: dropdown / Mobile: bottom-sheet ──────────────
  const desktopMotion = {
    initial: { opacity: 0, scale: 0.96, y: -8 },
    animate: { opacity: 1, scale: 1,    y:  0 },
    exit:    { opacity: 0, scale: 0.96, y: -6 },
  };
  const mobileMotion = {
    initial: { opacity: 0, y: 40 },
    animate: { opacity: 1, y:  0 },
    exit:    { opacity: 0, y: 40 },
  };

  return (
    <div className="relative shrink-0" ref={containerRef}>

      {/* ── Trigger button ─────────────────────────────────── */}
      <button
        type="button"
        onClick={() => setIsOpen(v => !v)}
        aria-label="Select language"
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        className={`relative flex items-center gap-1.5 rounded-xl transition-all duration-150
          focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400/40
          px-2.5 py-2
          ${isOpen ? 'bg-slate-100 text-slate-900' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'}`}
      >
        {/* Orange dot indicator for non-English */}
        {isNonDefault && (
          <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-orange-500 ring-[1.5px] ring-white" />
        )}

        <Globe
          className="w-4 h-4 shrink-0"
          style={{ color: isNonDefault ? 'var(--li-primary)' : undefined }}
          strokeWidth={1.8}
        />

        {/* Compact 2-char code — visible md+ */}
        <span className="hidden md:inline text-[12px] font-semibold tracking-wide leading-none uppercase">
          {activeLang.code}
        </span>

        {/* Chevron — desktop only */}
        <span className="hidden md:block text-slate-400">
          <ChevronIcon open={isOpen} />
        </span>
      </button>

      {/* ── Overlays ───────────────────────────────────────── */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Mobile: full-screen backdrop */}
            {isMobile && (
              <motion.div
                key="backdrop"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="fixed inset-0 bg-slate-900/50 backdrop-blur-[2px] z-40"
                onClick={() => setIsOpen(false)}
                aria-hidden
              />
            )}

            {/* Panel */}
            <motion.div
              key="panel"
              role="dialog"
              aria-label="Language selection"
              {...(isMobile ? mobileMotion : desktopMotion)}
              transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
              className={`bg-white z-50 flex flex-col
                ${isMobile
                  // Mobile: bottom sheet capped at 85vh so it never pushes off-screen
                  ? 'fixed bottom-0 left-0 right-0 rounded-t-3xl shadow-[0_-8px_40px_rgba(0,0,0,0.15)] max-h-[85vh] overflow-hidden'
                  // Desktop: anchored dropdown
                  : 'absolute right-0 top-full mt-2.5 w-[376px] rounded-2xl shadow-xl border border-slate-100/80 overflow-hidden'
                }`}
              style={{ transformOrigin: isMobile ? 'bottom center' : 'top right' }}
            >
              <PanelContent
                currentLang={currentLang}
                onSelect={selectLang}
                onClose={() => setIsOpen(false)}
                isMobile={isMobile}
              />
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
