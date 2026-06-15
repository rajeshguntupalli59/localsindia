'use client';

import { useState, useEffect, useCallback } from 'react';
import type { Listing } from '@/lib/types';

const STORAGE_KEY = 'localsindia_saved';

export function useSaved() {
  const [saved, setSaved] = useState<Listing[]>([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setSaved(JSON.parse(raw));
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
