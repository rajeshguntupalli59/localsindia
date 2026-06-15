'use client';

import { useState, useEffect, useCallback } from 'react';
import type { Listing } from '@/lib/types';

const STORAGE_KEY = 'localsindia_saved';
const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'https://localsindia-backend.azurewebsites.net';

async function pruneStale(listings: Listing[]): Promise<Listing[]> {
  if (listings.length === 0) return listings;
  const results = await Promise.allSettled(
    listings.map(l =>
      fetch(`${API_BASE}/api/v1/listings/${l.id}`, { method: 'HEAD' }).then(r => ({ id: l.id, ok: r.ok }))
    )
  );
  const validIds = new Set(
    results
      .filter((r): r is PromiseFulfilledResult<{ id: string; ok: boolean }> => r.status === 'fulfilled' && r.value.ok)
      .map(r => r.value.id)
  );
  return listings.filter(l => validIds.has(l.id));
}

export function useSaved() {
  const [saved, setSaved] = useState<Listing[]>([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const parsed: Listing[] = raw ? JSON.parse(raw) : [];
      setSaved(parsed);
      // Silently prune any stale listings (404 from backend)
      if (parsed.length > 0) {
        pruneStale(parsed).then(valid => {
          if (valid.length !== parsed.length) {
            setSaved(valid);
            try { localStorage.setItem(STORAGE_KEY, JSON.stringify(valid)); } catch { /* full */ }
          }
        }).catch(() => {});
      }
    } catch {
      setSaved([]);
    }
  }, []);

  const toggle = useCallback((listing: Listing) => {
    setSaved(prev => {
      const exists = prev.some(l => l.id === listing.id);
      const next = exists ? prev.filter(l => l.id !== listing.id) : [...prev, listing];
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch { /* storage full */ }
      return next;
    });
  }, []);

  const isSaved = useCallback((id: string) => saved.some(l => l.id === id), [saved]);

  return { saved, toggle, isSaved };
}
