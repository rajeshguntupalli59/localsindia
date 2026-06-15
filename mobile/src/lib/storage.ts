import * as SecureStore from 'expo-secure-store';

export const storage = {
  setTokens: async (access: string, refresh: string) => {
    await SecureStore.setItemAsync('access_token', access);
    await SecureStore.setItemAsync('refresh_token', refresh);
  },
  getAccessToken: () => SecureStore.getItemAsync('access_token'),
  clear: async () => {
    await SecureStore.deleteItemAsync('access_token');
    await SecureStore.deleteItemAsync('refresh_token');
    await SecureStore.deleteItemAsync('user');
  },
  setUser: (user: object) =>
    SecureStore.setItemAsync('user', JSON.stringify(user)),
  getUser: async () => {
    const raw = await SecureStore.getItemAsync('user');
    return raw ? JSON.parse(raw) : null;
  },
};
