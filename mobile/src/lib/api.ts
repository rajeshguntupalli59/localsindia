import axios from 'axios';
import { storage } from './storage';

const API_BASE = 'https://localsindia-backend.azurewebsites.net/api/v1';

const api = axios.create({ baseURL: API_BASE });

api.interceptors.request.use(async config => {
  const token = await storage.getAccessToken();
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
        const refresh = await storage.getRefreshToken();
        if (!refresh) throw new Error('no refresh token');
        const { data } = await axios.post(`${API_BASE}/auth/refresh`, { refresh_token: refresh });
        await storage.setTokens(data.access_token, data.refresh_token ?? refresh);
        error.config.headers.Authorization = `Bearer ${data.access_token}`;
        return api(error.config);
      } catch {
        await storage.clear();
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

  view: (id: string) =>
    api.post(`/listings/${id}/view`).catch(() => {}),

  mine: () =>
    api.get('/listings/mine').then(r => r.data),

  renew: (id: string) =>
    api.post(`/listings/${id}/renew`).then(r => r.data),

  fulfill: (id: string) =>
    api.post(`/listings/${id}/fulfill`).then(r => r.data),

  delete: (id: string) =>
    api.delete(`/listings/${id}`).then(r => r.data),
};

export const authApi = {
  adminLogin: (username: string, password: string) =>
    api.post('/auth/admin-login', { username, password }).then(r => r.data),

  signin: (phone: string) =>
    api.post('/auth/signin', { phone }).then(r => r.data),

  sendOtp: (phone: string) =>
    api.post('/auth/otp/send', { phone }).then(r => r.data),

  verifyOtp: (phone: string, otp: string) =>
    api.post('/auth/otp/verify', { phone, otp }).then(r => r.data),

  getMe: () =>
    api.get('/auth/me').then(r => r.data),

  getMeWithToken: (token: string) =>
    api.get('/auth/me', { headers: { Authorization: `Bearer ${token}` } }).then(r => r.data),

  updateName: (name: string) =>
    api.patch('/auth/me', { name }).then(r => r.data),
};

export const citiesApi = {
  list: () => api.get('/cities').then(r => r.data),
  get: (slug: string) => api.get(`/cities/${slug}`).then(r => r.data),
  todayCount: (slug: string) =>
    api.get(`/cities/${slug}/listings/today-count`).then(r => r.data as { count: number }),
  trending: (slug: string) =>
    api.get(`/cities/${slug}/listings/trending`).then(r => r.data as any[]),
};

export const categoriesApi = {
  list: () => api.get('/categories').then(r => r.data),
};

export const usersApi = {
  publicProfile: (userId: string) =>
    api.get(`/users/${userId}/public-profile`).then(r => r.data),
};

export const adminApi = {
  pendingListings: () =>
    api.get('/admin/listings/pending').then(r => r.data),

  listingsByStatus: (status: string) =>
    api.get('/admin/listings', { params: { status } }).then(r => r.data),

  approveListing: (id: string) =>
    api.patch(`/admin/listings/${id}/approve`).then(r => r.data),

  rejectListing: (id: string) =>
    api.patch(`/admin/listings/${id}/reject`).then(r => r.data),
};

export const chatApi = {
  send: (message: string, citySlug?: string, history: {role: string; content: string}[] = []) =>
    api.post('/chat', { message, city_slug: citySlug, history }).then(r => r.data),
};

export const notificationsApi = {
  list: (limit = 20) =>
    api.get(`/notifications?limit=${limit}`).then(r => r.data),
  unreadCount: () =>
    api.get('/notifications/unread-count').then(r => r.data as { count: number }),
  markRead: (id: string) =>
    api.post(`/notifications/read/${id}`).then(r => r.data),
  markAllRead: () =>
    api.post('/notifications/read-all').then(r => r.data),
};

export const favoritesApi = {
  toggle: (listingId: string) =>
    api.post(`/favorites/${listingId}`).then(r => r.data as { saved: boolean }),
  ids: () =>
    api.get('/favorites/ids').then(r => r.data as string[]),
  list: () =>
    api.get('/favorites').then(r => r.data),
  count: (listingId: string) =>
    api.get(`/favorites/count/${listingId}`).then(r => r.data as { count: number }),
};

export const preferencesApi = {
  get: () =>
    api.get('/preferences').then(r => r.data),
  upsert: (data: Record<string, unknown>) =>
    api.post('/preferences', data).then(r => r.data),
};

export const paymentsApi = {
  createOrder: (listingId: string, plan: 'week' | 'month') =>
    api.post('/payments/featured/create-order', { listing_id: listingId, plan }).then(r => r.data),
  verify: (data: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string; listing_id: string; plan: string }) =>
    api.post('/payments/featured/verify', data).then(r => r.data),
};

export const businessesApi = {
  getById: (id: string) =>
    api.get(`/businesses/${id}`).then(r => r.data),

  createBadgeOrder: (businessId: string, plan: 'monthly' | 'quarterly') =>
    api.post('/payments/business-badge/create-order', { business_id: businessId, plan }).then(r => r.data),

  verifyBadge: (data: {
    razorpay_order_id: string;
    razorpay_payment_id: string;
    razorpay_signature: string;
    business_id: string;
    plan: string;
  }) => api.post('/payments/business-badge/verify', data).then(r => r.data),

  submitReview: (businessId: string, data: { rating: number; body: string }) =>
    api.post(`/businesses/${businessId}/reviews`, data).then(r => r.data),
};

export default api;
