'use client';

import { useState, useEffect, useCallback } from 'react';
import type { Listing } from '@/lib/types';

const STORAGE_KEY = 'localsindia_saved';
const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'https://localsindia-backend.azurewebsites.net';

function getToken() {
  try { return localStorage.getItem('access_token'); } catch { return null; }
}

// Sync a single toggle with backend (fire-and-forget, non-blocking)
async function syncToggle(listingId: string) {
  const token = getToken();
  if (!token) return;
  try {
    await fetch(`${API_BASE}/api/v1/favorites/${listingId}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });
  } catch { /* offline — localStorage is source of truth until online */ }
}

// Hydrate saved IDs from backend on mount when logged in
async function fetchSavedIds(): Promise<Set<string>> {
  const token = getToken();
  if (!token) return new Set();
  try {
    const r = await fetch(`${API_BASE}/api/v1/favorites/ids`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!r.ok) return new Set();
    const ids: string[] = await r.json();
    return new Set(ids);
  } catch { return new Set(); }
}

export function useSaved() {
  const [saved, setSaved] = useState<Listing[]>([]);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    // Load from localStorage immediately
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const parsed: Listing[] = raw ? JSON.parse(raw) : [];
      setSaved(parsed);
      setSavedIds(new Set(parsed.map(l => l.id)));
    } catch { /* ignore */ }

    // Merge with backend saved IDs (backend is authoritative for logged-in users)
    fetchSavedIds().then(ids => {
      if (ids.size > 0) setSavedIds(ids);
    });
  }, []);

  const toggle = useCallback((listing: Listing) => {
    setSaved(prev => {
      const exists = prev.some(l => l.id === listing.id);
      const next = exists ? prev.filter(l => l.id !== listing.id) : [...prev, listing];
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch { /* full */ }
      setSavedIds(new Set(next.map(l => l.id)));
      syncToggle(listing.id);
      return next;
    });
  }, []);

  const isSaved = useCallback((id: string) => savedIds.has(id), [savedIds]);

  return { saved, toggle, isSaved };
}
