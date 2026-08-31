import axios from 'axios';
import * as FileSystem from 'expo-file-system/legacy';
import { storage } from './storage';
import { reportError } from './errorReporting';

const API_BASE = 'https://localsindia-backend-in.azurewebsites.net/api/v1';

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
    if (!error.response || error.response.status >= 500) {
      const url = error.config?.url ?? 'unknown';
      reportError(
        new Error(error.response ? `HTTP ${error.response.status} on ${url}` : `Network error on ${url}`),
        url,
      );
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

  update: (id: string, data: Record<string, unknown>) =>
    api.patch(`/listings/${id}`, data).then(r => r.data),

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

  login: (phone: string, password: string) =>
    api.post('/auth/login', { phone, password }).then(r => r.data),

  checkPhone: (phone: string) =>
    api.post('/auth/phone/check', { phone }).then(r => r.data),

  sendOtp: (phone: string, recaptchaToken?: string) =>
    api.post('/auth/otp/send', { phone, recaptcha_token: recaptchaToken }).then(r => r.data),

  verifyOtp: (phone: string, otp: string, refCode?: string | null) =>
    api.post('/auth/otp/verify', { phone, otp, ref_code: refCode ?? undefined }).then(r => r.data),

  setPassword: (setupToken: string, password: string) =>
    api.post('/auth/password/set', { setup_token: setupToken, password }).then(r => r.data),

  getMe: () =>
    api.get('/auth/me').then(r => r.data),

  getMeWithToken: (token: string) =>
    api.get('/auth/me', { headers: { Authorization: `Bearer ${token}` } }).then(r => r.data),

  updateName: (name: string) =>
    api.patch('/auth/me', { name }).then(r => r.data),

  deleteAccount: () =>
    api.delete('/auth/me').then(r => r.data),
};

export const uploadsApi = {
  image: async (listingId: string, uri: string) => {
    const token = await storage.getAccessToken();
    const result = await FileSystem.uploadAsync(
      `${API_BASE}/upload/image/${listingId}`,
      uri,
      {
        fieldName: 'file',
        httpMethod: 'POST',
        uploadType: (FileSystem.FileSystemUploadType?.MULTIPART ?? 1) as any,
        headers: { Authorization: `Bearer ${token ?? ''}` },
      }
    );
    if (result.status >= 400) {
      let detail = `HTTP ${result.status}`;
      try { detail = JSON.parse(result.body)?.detail ?? detail; } catch {}
      throw new Error(detail);
    }
    return JSON.parse(result.body) as { id: string; url: string; cloudinary_id: string };
  },

  deleteImage: (imageId: string) =>
    api.delete(`/upload/image/${imageId}`).then(r => r.data),
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

  scanTicket: (qrToken: string) =>
    api.post('/admin/tickets/scan', { qr_token: qrToken }).then(r => r.data),
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
  registerDevice: (token: string) =>
    api.post('/notifications/device-token', { token }).then(r => r.data),
  unregisterDevice: (token: string) =>
    api.delete('/notifications/device-token', { params: { token } }).then(r => r.data),
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
  list: (citySlug: string) =>
    api.get('/businesses', { params: { city_slug: citySlug } }).then(r => r.data),

  getById: (id: string) =>
    api.get(`/businesses/${id}`).then(r => r.data),

  create: (data: {
    name: string;
    city_id: string;
    description?: string | null;
    address?: string | null;
    phone?: string | null;
    whatsapp_url?: string | null;
    website_url?: string | null;
  }) => api.post('/businesses', data).then(r => r.data),

  claim: (businessId: string) =>
    api.post(`/businesses/${businessId}/claim`).then(r => r.data),

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

  analytics: (businessId: string) =>
    api.get(`/analytics/business/${businessId}`).then(r => r.data),
};

export const eventsApi = {
  list: (citySlug: string) =>
    api.get('/events', { params: { city_slug: citySlug } }).then(r => r.data),

  getById: (id: string) =>
    api.get(`/events/${id}`).then(r => r.data),

  create: (data: {
    title: string;
    description: string;
    venue: string;
    event_date: string;
    city_id: string;
    is_free: boolean;
    ticket_url?: string | null;
    ticket_price?: number | null;
  }) => api.post('/events', data).then(r => r.data),
};

export const ticketsApi = {
  createOrder: (eventId: string) =>
    api.post('/tickets/create-order', { event_id: eventId }).then(r => r.data),

  verify: (data: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string; event_id: string }) =>
    api.post('/tickets/verify', data).then(r => r.data),

  getById: (id: string) =>
    api.get(`/tickets/${id}`).then(r => r.data),

  my: () =>
    api.get('/tickets/my').then(r => r.data),
};

export const savedSearchesApi = {
  list: () =>
    api.get('/saved-searches').then(r => r.data),

  create: (data: { city_slug: string; query_text?: string; category_slug?: string }) =>
    api.post('/saved-searches', data).then(r => r.data),

  delete: (id: string) =>
    api.delete(`/saved-searches/${id}`).then(r => r.data),
};

export const buyerRequestsApi = {
  list: (citySlug: string) =>
    api.get(`/buyer-requests/cities/${citySlug}`).then(r => r.data),

  create: (data: { city_slug: string; category_slug: string; description: string; budget?: number; contact_phone: string }) =>
    api.post('/buyer-requests', data).then(r => r.data),

  report: (id: string, reason: string) =>
    api.post(`/buyer-requests/${id}/report`, { reason }).then(r => r.data),

  fulfill: (id: string) =>
    api.patch(`/buyer-requests/${id}/fulfill`).then(r => r.data),

  delete: (id: string) =>
    api.delete(`/buyer-requests/${id}`).then(r => r.data),
};
