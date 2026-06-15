import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'localsindia_saved';

export function useSaved() {
  const [saved, setSaved] = useState<any[]>([]);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then(raw => { if (raw) setSaved(JSON.parse(raw)); })
      .catch(() => {});
  }, []);

  const toggle = useCallback((listing: any) => {
    setSaved(prev => {
      const exists = prev.some(l => l.id === listing.id);
      const next = exists ? prev.filter(l => l.id !== listing.id) : [...prev, listing];
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)).catch(() => {});
      return next;
    });
  }, []);

  const isSaved = useCallback((id: string) => saved.some(l => l.id === id), [saved]);

  return { saved, toggle, isSaved };
}
