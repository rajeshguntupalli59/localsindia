/**
 * useCities — fetches the city list with a module-level in-memory cache.
 *
 * Why a separate hook (and not just usePrefs()):
 * - Components that only need the city list (e.g. a standalone city picker
 *   outside the prefs tree) can use this without a context dependency.
 * - The module-level cache (_cache) survives React re-mounts within the same
 *   browser tab — a second mount reads from cache and never calls the API again.
 * - PrefsContext uses usePrefs() internally; this hook is for everyone else.
 */

import { useState, useEffect } from 'react';
import type { City } from '@/lib/types';
import { api } from '@/lib/api';

// Module-level cache — persists for the tab's lifetime.
let _cache: City[] | null = null;
let _inflight: Promise<City[]> | null = null;

export function useCities() {
  const [cities, setCities] = useState<City[]>(_cache ?? []);
  const [loading, setLoading] = useState<boolean>(_cache === null);

  useEffect(() => {
    if (_cache !== null) return; // already have data

    const req = _inflight ?? (_inflight = api.cities.list());

    req
      .then(data => {
        _cache = data;
        setCities(data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return { cities, loading } as const;
}

/** Imperatively invalidate the cache (e.g. after admin adds a city). */
export function invalidateCitiesCache() {
  _cache = null;
  _inflight = null;
}
