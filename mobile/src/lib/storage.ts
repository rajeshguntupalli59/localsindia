import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

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
  },
  setUser: (user: object) => setItem('user', JSON.stringify(user)),
  getUser: async () => {
    const raw = await getItem('user');
    return raw ? JSON.parse(raw) : null;
  },
};
