'use client';

/**
 * CityPickerModal — accessible, instant-filter city selector.
 *
 * Zero input latency: useDeferredValue splits the work into two priorities —
 *   1. The <input> re-renders immediately on every keystroke (high priority).
 *   2. The filtered city list re-renders in a deferred, lower-priority pass.
 * The user always sees their characters appear instantly; the list follows in
 * the next available frame without blocking the input.
 *
 * Keyboard support:
 *   ArrowDown / ArrowUp — navigate the list
 *   Enter               — select the focused city
 *   Escape              — close
 *
 * ARIA: dialog > listbox > option pattern per WAI-ARIA combobox spec.
 */

import {
  useState,
  useEffect,
  useRef,
  useDeferredValue,
  useMemo,
  useCallback,
  useId,
} from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, MapPin, X, Clock, LocateFixed, Loader2 } from 'lucide-react';
import { usePrefs } from '@/context/PrefsContext';
import type { City } from '@/lib/types';

// South India + metro shown first; remaining states follow alphabetically.
const STATE_ORDER = [
  'Telangana', 'Andhra Pradesh', 'Karnataka', 'Tamil Nadu',
  'Kerala', 'Goa', 'Puducherry', 'Metro',
];

// ── Types ─────────────────────────────────────────────────────────────────────
interface Props {
  onClose: () => void;
  /**
   * Called after the city is persisted to PrefsContext.
   * Use this to navigate or do post-selection work.
   */
  onSelect?: (city: City) => void;
}

type GeoState = 'idle' | 'locating' | 'located' | 'denied' | 'error';

// ── Component ─────────────────────────────────────────────────────────────────
export default function CityPickerModal({ onClose, onSelect }: Props) {
  const { cities, recentSlugs, citySlug: currentSlug, setCity, t } = usePrefs();

  const [query, setQuery]       = useState('');
  const [activeIdx, setActiveIdx] = useState(-1);
  const [geoState, setGeoState] = useState<GeoState>('idle');

  // useDeferredValue: input renders at high priority, list filters at low priority.
  const deferredQuery = useDeferredValue(query);

  const inputRef     = useRef<HTMLInputElement>(null);
  const listRef      = useRef<HTMLDivElement>(null);
  const titleId      = useId();
  const listboxId    = useId();

  // ── Lifecycle ───────────────────────────────────────────────────────────────
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);

  // ── Derived data ────────────────────────────────────────────────────────────
  const recentCities = useMemo(
    () => cities.filter(c => recentSlugs.includes(c.slug)),
    [cities, recentSlugs],
  );

  // Grouped city list — recomputed only when deferredQuery or cities change.
  const grouped = useMemo<Array<{ state: string; cities: City[] }>>(() => {
    const lc = deferredQuery.toLowerCase().trim();
    const result: Array<{ state: string; cities: City[] }> = [];
    const seen = new Set<string>();

    const pushGroup = (state: string) => {
      if (seen.has(state)) return;
      seen.add(state);
      const matches = cities.filter(
        c => c.state === state && c.name.toLowerCase().includes(lc),
      );
      if (matches.length) result.push({ state, cities: matches });
    };

    STATE_ORDER.forEach(pushGroup);

    Array.from(new Set(cities.map(c => c.state)))
      .filter(s => !STATE_ORDER.includes(s))
      .sort()
      .forEach(pushGroup);

    return result;
  }, [cities, deferredQuery]);

  // Flat list for keyboard index tracking
  const flatList = useMemo(
    () => grouped.flatMap(g => g.cities),
    [grouped],
  );

  // ── Keyboard navigation ─────────────────────────────────────────────────────
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActiveIdx(i => Math.min(i + 1, flatList.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActiveIdx(i => Math.max(i - 1, 0));
      } else if (e.key === 'Enter' && activeIdx >= 0) {
        e.preventDefault();
        const city = flatList[activeIdx];
        if (city) handleSelect(city);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [flatList, activeIdx],
  );

  // Scroll active option into view whenever activeIdx changes
  useEffect(() => {
    const el = listRef.current?.querySelector<HTMLElement>(
      `[data-list-idx="${activeIdx}"]`,
    );
    el?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [activeIdx]);

  // Reset active index when the deferred filter result changes
  useEffect(() => { setActiveIdx(-1); }, [flatList]);

  // ── Actions ─────────────────────────────────────────────────────────────────
  const handleSelect = useCallback(
    (city: City) => {
      setCity(city);
      onSelect?.(city);
      onClose();
    },
    [setCity, onSelect, onClose],
  );

  const handleGeoLocate = useCallback(() => {
    if (geoState === 'locating') return;
    if (!('geolocation' in navigator)) {
      setGeoState('error');
      return;
    }
    setGeoState('locating');
    navigator.geolocation.getCurrentPosition(
      async ({ coords: { latitude, longitude } }) => {
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`,
            { headers: { 'Accept-Language': 'en-IN,en' } },
          );
          const data = await res.json() as {
            address?: { city?: string; town?: string; county?: string }
          };
          const raw = (
            data.address?.city ?? data.address?.town ?? data.address?.county ?? ''
          ).trim().toLowerCase();

          const match = cities.find(c => {
            const cn = c.name.toLowerCase();
            return cn === raw || raw.startsWith(cn) || cn.startsWith(raw.split(' ')[0]);
          });

          if (match) {
            setGeoState('located');
            handleSelect(match);
          } else {
            setGeoState('error');
          }
        } catch {
          setGeoState('error');
        }
      },
      (err) => {
        setGeoState(err.code === err.PERMISSION_DENIED ? 'denied' : 'error');
      },
      { timeout: 10_000, maximumAge: 60_000 },
    );
  }, [geoState, cities, handleSelect]);

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <AnimatePresence>
      {/* ── Backdrop ─────────────────────────────────────────── */}
      <motion.div
        key="backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.18 }}
        className="fixed inset-0 z-50 bg-black/50 backdrop-blur-[2px]"
        onClick={onClose}
        aria-hidden
      />

      {/* ── Panel ────────────────────────────────────────────── */}
      <motion.div
        key="panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        initial={{ opacity: 0, scale: 0.96, y: 16 }}
        animate={{ opacity: 1, scale: 1,    y: 0  }}
        exit={{ opacity: 0,  scale: 0.95,   y: 8  }}
        transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
        style={{ transformOrigin: 'top center' }}
        className={[
          // Mobile: nearly full screen from top 8%
          // Desktop: centered, fixed width
          'fixed inset-x-4 top-[8%]',
          'md:inset-x-auto md:left-1/2 md:-translate-x-1/2 md:w-[540px]',
          'z-50 bg-white rounded-2xl shadow-2xl',
          'flex flex-col max-h-[82vh] overflow-hidden',
        ].join(' ')}
        onKeyDown={handleKeyDown}
      >

        {/* ── Search header ──────────────────────────────────── */}
        <div className="flex items-center gap-3 px-4 pt-4 pb-3 border-b border-slate-100 shrink-0">
          <Search
            className="w-4 h-4 text-slate-400 shrink-0"
            strokeWidth={2}
            aria-hidden
          />

          <input
            ref={inputRef}
            type="search"
            autoComplete="off"
            spellCheck={false}
            id={titleId}
            placeholder={t('city.search')}
            value={query}
            onChange={e => setQuery(e.target.value)}
            className="flex-1 text-sm text-slate-900 placeholder:text-slate-400
              bg-transparent border-none outline-none min-w-0"
            aria-label={t('city.select')}
            aria-controls={listboxId}
            aria-autocomplete="list"
            aria-activedescendant={
              activeIdx >= 0 ? `city-opt-${activeIdx}` : undefined
            }
          />

          {/* Geo-locate button */}
          <button
            type="button"
            onClick={handleGeoLocate}
            disabled={geoState === 'locating' || geoState === 'denied'}
            title={t('city.locate')}
            aria-label={t('city.locate')}
            className={[
              'w-8 h-8 rounded-xl flex items-center justify-center shrink-0',
              'transition-all duration-150',
              geoState === 'locating'
                ? 'text-orange-400 bg-orange-50'
                : geoState === 'located'
                ? 'text-orange-500 bg-orange-50'
                : geoState === 'denied'
                ? 'text-slate-200 cursor-not-allowed'
                : 'text-slate-300 hover:text-orange-500 hover:bg-orange-50',
            ].join(' ')}
          >
            {geoState === 'locating' ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" strokeWidth={2} />
            ) : (
              <LocateFixed className="w-3.5 h-3.5" strokeWidth={2} />
            )}
          </button>

          {/* Clear input */}
          {query && (
            <button
              type="button"
              onClick={() => {
                setQuery('');
                inputRef.current?.focus();
              }}
              aria-label="Clear search"
              className="w-5 h-5 rounded-full flex items-center justify-center
                bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
            >
              <X className="w-3 h-3" strokeWidth={2.5} />
            </button>
          )}

          {/* Close */}
          <button
            type="button"
            onClick={onClose}
            aria-label="Close city picker"
            className="w-7 h-7 rounded-full flex items-center justify-center
              text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
          >
            <X className="w-3.5 h-3.5" strokeWidth={2} />
          </button>
        </div>

        {/* ── Recent cities ──────────────────────────────────── */}
        {!query && recentCities.length > 0 && (
          <div className="px-4 py-3 border-b border-slate-50 shrink-0">
            <p className="flex items-center gap-1.5 text-[10px] font-semibold
              text-slate-400 uppercase tracking-wider mb-2.5">
              <Clock className="w-3 h-3" aria-hidden />
              {t('city.recent')}
            </p>
            <div className="flex flex-wrap gap-2">
              {recentCities.map(city => (
                <button
                  key={city.slug}
                  type="button"
                  onClick={() => handleSelect(city)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full
                    text-[12px] font-medium text-slate-600
                    bg-slate-100 hover:bg-orange-50 hover:text-orange-600
                    transition-colors duration-150"
                >
                  <MapPin className="w-3 h-3 shrink-0" strokeWidth={2} />
                  {city.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── City list ──────────────────────────────────────── */}
        <div
          ref={listRef}
          id={listboxId}
          role="listbox"
          aria-label={t('city.select')}
          className="flex-1 overflow-y-auto overscroll-contain scrollbar-none py-1"
        >
          {grouped.length === 0 ? (
            <p className="py-14 text-center text-sm text-slate-400">
              {t('city.notFound', { query: query || deferredQuery })}
            </p>
          ) : (
            grouped.map(({ state, cities: stateCities }) => (
              <div key={state}>
                {/* Sticky state header */}
                <div
                  className="px-4 py-1.5 sticky top-0 z-10
                    bg-white/95 backdrop-blur-sm"
                  aria-hidden
                >
                  <span className="text-[10px] font-semibold text-slate-400
                    uppercase tracking-wider">
                    {state}
                  </span>
                </div>

                {/* City options */}
                {stateCities.map(city => {
                  const idx    = flatList.indexOf(city);
                  const isActive  = idx === activeIdx;
                  const isCurrent = city.slug === currentSlug;

                  return (
                    <button
                      key={city.slug}
                      type="button"
                      id={`city-opt-${idx}`}
                      data-list-idx={idx}
                      role="option"
                      aria-selected={isCurrent}
                      onClick={() => handleSelect(city)}
                      onMouseEnter={() => setActiveIdx(idx)}
                      className={[
                        'w-full flex items-center gap-3 px-4 py-2.5 text-left',
                        'text-sm transition-colors duration-100',
                        isActive
                          ? 'bg-orange-50 text-orange-600'
                          : 'text-slate-700 hover:bg-slate-50',
                      ].join(' ')}
                    >
                      <MapPin
                        className={`w-3.5 h-3.5 shrink-0 transition-colors
                          ${isActive ? 'text-orange-500' : isCurrent ? 'text-orange-400' : 'text-slate-200'}`}
                        strokeWidth={2}
                        aria-hidden
                      />
                      <span className="font-medium flex-1 truncate">
                        {city.name}
                      </span>
                      {isCurrent && !isActive && (
                        <span className="text-[10px] font-semibold text-orange-400
                          bg-orange-50 px-2 py-0.5 rounded-full shrink-0">
                          Current
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
