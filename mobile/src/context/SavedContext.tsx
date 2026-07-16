import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { favoritesApi } from '../lib/api';
import { storage } from '../lib/storage';

const STORAGE_KEY = 'localsindia_saved';

interface SavedContextValue {
  savedIds: Set<string>;
  savedCount: number;
  savedListings: any[];
  toggle: (listing: any) => void;
  isSaved: (id: string) => boolean;
}

const SavedContext = createContext<SavedContextValue>({
  savedIds: new Set(),
  savedCount: 0,
  savedListings: [],
  toggle: () => {},
  isSaved: () => false,
});

export function SavedProvider({ children }: { children: React.ReactNode }) {
  const [savedListings, setSavedListings] = useState<any[]>([]);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then(raw => {
        if (raw) {
          const parsed = JSON.parse(raw);
          setSavedListings(parsed);
          setSavedIds(new Set(parsed.map((l: any) => l.id)));
        }
      })
      .catch(() => {});

    storage.getAccessToken().then(token => {
      if (!token) return;
      // The server is the source of truth once logged in — the local cache can
      // be stale (a previous session, another device, or a save/unsave that
      // only ever reached this AsyncStorage cache and never the server, or
      // vice versa). Replace both savedListings and savedIds together so the
      // Saved tab's list/count and every heart icon agree with each other.
      favoritesApi.list()
        .then(listings => {
          setSavedListings(listings);
          setSavedIds(new Set(listings.map((l: any) => l.id)));
          AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(listings)).catch(() => {});
        })
        .catch(() => {});
    });
  }, []);

  const toggle = useCallback((listing: any) => {
    setSavedListings(prev => {
      const exists = prev.some((l: any) => l.id === listing.id);
      const next = exists ? prev.filter((l: any) => l.id !== listing.id) : [...prev, listing];
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)).catch(() => {});
      setSavedIds(new Set(next.map((l: any) => l.id)));
      storage.getAccessToken().then(token => {
        if (token) favoritesApi.toggle(listing.id).catch(() => {});
      });
      return next;
    });
  }, []);

  const isSaved = useCallback((id: string) => savedIds.has(id), [savedIds]);

  return (
    <SavedContext.Provider value={{ savedIds, savedCount: savedListings.length, savedListings, toggle, isSaved }}>
      {children}
    </SavedContext.Provider>
  );
}

export const useSavedContext = () => useContext(SavedContext);
