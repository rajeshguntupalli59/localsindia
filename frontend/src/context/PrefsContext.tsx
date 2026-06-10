'use client';

/**
 * PrefsContext — single source of truth for user preferences (city + language).
 *
 * Why a context:
 * - Eliminates prop drilling: header, hero, city picker, search bar all need city/lang.
 * - Single API call for cities — fetched once, shared everywhere.
 * - Persistence handled here: all writes go through setCity/setLang which sync to
 *   localStorage + cookie simultaneously, no component needs to know how.
 * - No layout shifts: lang and city are read synchronously on first client render
 *   via lazy useState initializers — there is no "loading then update" flash.
 */

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
} from 'react';
import {
  getCitySlug, setCitySlug,
  getLangCode, setLangCode,
  getRecentSlugs, pushRecentSlug,
  type LangCode,
} from '@/lib/prefs';
import { makeT, type TranslationKey } from '@/lib/translations';
import { api } from '@/lib/api';
import type { City } from '@/lib/types';

// ── Context shape ─────────────────────────────────────────────────────────────
interface PrefsCtx {
  // City
  citySlug: string;
  cityName: string;
  recentSlugs: string[];
  setCity: (city: City) => void;
  clearCity: () => void;
  // Language
  lang: LangCode;
  setLang: (code: LangCode) => void;
  // Translation accessor — typed, interpolation-capable
  t: (key: TranslationKey, vars?: Record<string, string>) => string;
  // City list
  cities: City[];
  citiesLoading: boolean;
}

const PrefsContext = createContext<PrefsCtx | null>(null);

// ── Provider ──────────────────────────────────────────────────────────────────
export function PrefsProvider({ children }: { children: React.ReactNode }) {
  /**
   * City and lang are initialised with empty defaults on every render
   * (server + first client frame), then updated from storage in useEffect.
   *
   * This avoids the React hydration mismatch warning that would occur if we
   * read localStorage in the useState initializer (server returns '', client
   * returns saved value → mismatch). The update fires synchronously after
   * mount — one imperceptible frame before the page is interactive.
   */
  const [citySlug, setCitySlugState] = useState<string>('');
  const [lang, setLangState] = useState<LangCode>('en');
  const [recentSlugs, setRecentSlugs] = useState<string[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [citiesLoading, setCitiesLoading] = useState(true);

  // Hydrate from storage after mount (client-only)
  useEffect(() => {
    setCitySlugState(getCitySlug());
    setLangState(getLangCode());
    setRecentSlugs(getRecentSlugs());
  }, []);

  // Fetch city list once per page session
  useEffect(() => {
    api.cities.list()
      .then(data => setCities(data))
      .catch(() => {})
      .finally(() => setCitiesLoading(false));
  }, []);

  // Derived: name of the currently selected city
  const cityName = useMemo(
    () => cities.find(c => c.slug === citySlug)?.name ?? '',
    [cities, citySlug],
  );

  // ── Setters (update state + persist in one call) ───────────────────────────
  const setCity = useCallback((city: City) => {
    setCitySlug(city.slug);
    const next = pushRecentSlug(city.slug);
    setCitySlugState(city.slug);
    setRecentSlugs(next);
  }, []);

  const clearCity = useCallback(() => {
    setCitySlug('');
    setCitySlugState('');
  }, []);

  const setLang = useCallback((code: LangCode) => {
    setLangCode(code);
    setLangState(code);
  }, []);

  // Translation accessor — recreated only when lang changes
  const t = useMemo(() => makeT(lang), [lang]);

  const value = useMemo<PrefsCtx>(
    () => ({
      citySlug, cityName, recentSlugs, setCity, clearCity,
      lang, setLang, t,
      cities, citiesLoading,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [citySlug, cityName, recentSlugs, lang, cities, citiesLoading],
  );

  return (
    <PrefsContext.Provider value={value}>
      {children}
    </PrefsContext.Provider>
  );
}

// ── Consumer hook ─────────────────────────────────────────────────────────────
export function usePrefs(): PrefsCtx {
  const ctx = useContext(PrefsContext);
  if (!ctx) throw new Error('usePrefs() must be called inside <PrefsProvider>');
  return ctx;
}
