import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';

async function getItem(key: string): Promise<string | null> {
  if (Platform.OS === 'web') return localStorage.getItem(key);
  try { return await SecureStore.getItemAsync(key); } catch { return null; }
}

async function setItem(key: string, value: string): Promise<void> {
  if (Platform.OS === 'web') { localStorage.setItem(key, value); return; }
  try { await SecureStore.setItemAsync(key, value); } catch {}
}

async function deleteItem(key: string): Promise<void> {
  if (Platform.OS === 'web') { localStorage.removeItem(key); return; }
  try { await SecureStore.deleteItemAsync(key); } catch {}
}

export const storage = {
  setTokens: async (access: string, refresh: string) => {
    await setItem('access_token', access);
    await setItem('refresh_token', refresh);
  },
  getAccessToken: () => getItem('access_token'),
  getRefreshToken: () => getItem('refresh_token'),
  clear: async () => {
    await deleteItem('access_token');
    await deleteItem('refresh_token');
    await deleteItem('user');
    await deleteItem('biometric_enabled');
  },
  setUser: (user: object) => setItem('user', JSON.stringify(user)),
  getUser: async () => {
    const raw = await getItem('user');
    return raw ? JSON.parse(raw) : null;
  },
  getBiometricEnabled: async (): Promise<boolean> => {
    const val = await getItem('biometric_enabled');
    return val === 'true';
  },
  setBiometricEnabled: (enabled: boolean) => setItem('biometric_enabled', String(enabled)),
  setCity: (slug: string, name: string) => setItem('city', JSON.stringify({ slug, name })),
  getCity: async (): Promise<{ slug: string; name: string } | null> => {
    const raw = await getItem('city');
    return raw ? JSON.parse(raw) : null;
  },
  setReferralRefCode: (code: string) => setItem('li_ref_code', code),
  getReferralRefCode: () => getItem('li_ref_code'),
  // Store-review prompt: ask once at a genuine happy-path moment (first
  // WhatsApp contact, or first listing approval), never on launch/onboarding.
  // The OS itself throttles how often the actual dialog can show — this flag
  // just stops the app from calling the API repeatedly once we've tried.
  hasPromptedStoreReview: async (): Promise<boolean> => {
    const val = await getItem('review_prompted');
    return val === 'true';
  },
  setPromptedStoreReview: () => setItem('review_prompted', 'true'),
  recentlyViewed: {
    get: async (citySlug: string): Promise<any[]> => {
      try {
        const raw = Platform.OS === 'web'
          ? localStorage.getItem('li_rv')
          : await AsyncStorage.getItem('li_rv');
        if (!raw) return [];
        const all: any[] = JSON.parse(raw);
        return all.filter(l => l._city === citySlug).slice(0, 10);
      } catch { return []; }
    },
    add: async (listing: any, citySlug: string): Promise<void> => {
      try {
        const raw = Platform.OS === 'web'
          ? localStorage.getItem('li_rv')
          : await AsyncStorage.getItem('li_rv');
        const all: any[] = raw ? JSON.parse(raw) : [];
        const updated = [{ ...listing, _city: citySlug }, ...all.filter(l => l.id !== listing.id)].slice(0, 30);
        const json = JSON.stringify(updated);
        if (Platform.OS === 'web') localStorage.setItem('li_rv', json);
        else await AsyncStorage.setItem('li_rv', json);
      } catch {}
    },
  },
};
