import axios from 'axios';
import * as SecureStore from 'expo-secure-store';

const API_BASE = 'https://localsindia-backend.azurewebsites.net/api/v1';

const api = axios.create({ baseURL: API_BASE });

api.interceptors.request.use(async config => {
  const token = await SecureStore.getItemAsync('access_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Auto-refresh on 401
api.interceptors.response.use(
  res => res,
  async error => {
    if (error.response?.status === 401 && !error.config._retry) {
      error.config._retry = true;
      try {
        const refresh = await SecureStore.getItemAsync('refresh_token');
        if (!refresh) throw new Error('no refresh token');
        const { data } = await axios.post(`${API_BASE}/auth/refresh`, { refresh_token: refresh });
        await SecureStore.setItemAsync('access_token', data.access_token);
        error.config.headers.Authorization = `Bearer ${data.access_token}`;
        return api(error.config);
      } catch {
        await SecureStore.deleteItemAsync('access_token');
        await SecureStore.deleteItemAsync('refresh_token');
      }
    }
    return Promise.reject(error);
  }
);

export const listingsApi = {
  byCitySlug: (citySlug: string, params?: Record<string, string>) =>
    api.get(`/cities/${citySlug}/listings`, { params }).then(r => r.data),

  getById: (id: string) =>
    api.get(`/listings/${id}`).then(r => r.data),

  create: (data: Record<string, unknown>) =>
    api.post('/listings', data).then(r => r.data),

  search: (q: string, citySlug: string, params?: Record<string, string>) =>
    api.get('/search', { params: { q, city_slug: citySlug, ...params } }).then(r => r.data),

  waClick: (id: string) =>
    api.post(`/listings/${id}/wa-click`).catch(() => {}),
};

export const authApi = {
  sendOtp: (phone: string) =>
    api.post('/auth/otp/send', { phone }).then(r => r.data),

  verifyOtp: (phone: string, otp: string) =>
    api.post('/auth/otp/verify', { phone, otp }).then(r => r.data),

  getMe: () =>
    api.get('/auth/me').then(r => r.data),

  updateName: (name: string) =>
    api.patch('/auth/me', { name }).then(r => r.data),
};

export const citiesApi = {
  list: () => api.get('/cities').then(r => r.data),
  get: (slug: string) => api.get(`/cities/${slug}`).then(r => r.data),
};

export const categoriesApi = {
  list: () => api.get('/categories').then(r => r.data),
};

export const usersApi = {
  publicProfile: (userId: string) =>
    api.get(`/users/${userId}/public-profile`).then(r => r.data),
};

export default api;
