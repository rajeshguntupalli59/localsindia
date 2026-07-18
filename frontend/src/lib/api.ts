import type {
  City,
  Category,
  Listing,
  ListingImage,
  User,
  AuthTokens,
  OtpVerifyResult,
  SearchResult,
  SearchParams,
  CreateListingInput,
  ListingReview,
  Event,
  Business,
  Review,
  SellerProfile,
  BuyerRequestOut,
} from './types';

export type { User, Event, Business, Review };

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'https://localsindia-backend.azurewebsites.net';

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

function clearSession() {
  localStorage.removeItem('access_token');
  localStorage.removeItem('refresh_token');
  localStorage.removeItem('user');
  window.location.href = '/auth/login';
}

async function tryRefresh(): Promise<string | null> {
  const refreshToken = localStorage.getItem('refresh_token');
  if (!refreshToken) return null;
  try {
    const res = await fetch(`${API_BASE}/api/v1/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    localStorage.setItem('access_token', data.access_token);
    if (data.refresh_token) localStorage.setItem('refresh_token', data.refresh_token);
    return data.access_token as string;
  } catch {
    return null;
  }
}

async function req<T>(
  path: string,
  init?: RequestInit & { token?: string },
  _retry = true,
): Promise<T> {
  const { token, ...rest } = init ?? {};
  const headers: Record<string, string> = {
    ...((rest.headers ?? {}) as Record<string, string>),
  };
  if (!(init?.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${path}`, { ...rest, headers });

  // Auto-refresh on 401 then retry once
  if (res.status === 401 && _retry && token) {
    const newToken = await tryRefresh();
    if (newToken) {
      return req<T>(path, { ...init, token: newToken }, false);
    }
    // Refresh failed — session expired, force logout
    clearSession();
    throw new ApiError(401, 'Session expired. Please sign in again.');
  }

  if (!res.ok) {
    const data = await res.json().catch(() => ({ detail: res.statusText }));
    const msg = (data as { detail?: string }).detail ?? 'Request failed';
    throw new ApiError(res.status, msg);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

function qs(params: Record<string, string | undefined>): string {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined) p.set(k, v);
  }
  const s = p.toString();
  return s ? `?${s}` : '';
}

export const api = {
  categories: {
    list: () => req<Category[]>('/api/v1/categories'),
  },
  cities: {
    list: () => req<City[]>('/api/v1/cities'),
    get: (slug: string) => req<City>(`/api/v1/cities/${slug}`),
    listings: (slug: string, params?: Record<string, string>) =>
      req<Listing[]>(`/api/v1/cities/${slug}/listings${params ? qs(params) : ''}`),
    todayCount: (slug: string) =>
      req<{ count: number }>(`/api/v1/cities/${slug}/listings/today-count`),
    trending: (slug: string) =>
      req<Listing[]>(`/api/v1/cities/${slug}/listings/trending`),
  },
  listings: {
    mine: (token: string) =>
      req<Listing[]>('/api/v1/listings/mine', { token }),
    create: (data: CreateListingInput, token: string) =>
      req<Listing>('/api/v1/listings', {
        method: 'POST',
        body: JSON.stringify(data),
        token,
      }),
    get: (id: string) => req<Listing>(`/api/v1/listings/${id}`),
    update: (id: string, data: Partial<CreateListingInput>, token: string) =>
      req<Listing>(`/api/v1/listings/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
        token,
      }),
    delete: (id: string, token: string) =>
      req<void>(`/api/v1/listings/${id}`, { method: 'DELETE', token }),
    report: (id: string, reason: string, token: string) =>
      req<{ message: string }>(`/api/v1/listings/${id}/report`, {
        method: 'POST',
        body: JSON.stringify({ reason }),
        token,
      }),
    view: (id: string) =>
      req<void>(`/api/v1/listings/${id}/view`, { method: 'POST' }).catch(() => {}),
    waClick: (id: string) =>
      req<void>(`/api/v1/listings/${id}/wa-click`, { method: 'POST' }).catch(() => {}),
    reviews: (id: string) =>
      req<ListingReview[]>(`/api/v1/listings/${id}/reviews`),
    submitReview: (id: string, rating: number, body: string | null, token: string) =>
      req<ListingReview>(`/api/v1/listings/${id}/reviews`, {
        method: 'POST',
        body: JSON.stringify({ rating, body }),
        token,
      }),
    fulfill: (id: string, token: string) =>
      req<Listing>(`/api/v1/listings/${id}/fulfill`, { method: 'POST', token }),
    renew: (id: string, token: string) =>
      req<Listing>(`/api/v1/listings/${id}/renew`, { method: 'POST', token }),
  },
  search: {
    query: (params: SearchParams) =>
      req<SearchResult>(`/api/v1/search${qs(params as unknown as Record<string, string>)}`),
  },
  auth: {
    devLogin: () =>
      req<AuthTokens>('/api/v1/auth/dev-login', { method: 'POST' }),
    login: (phone: string, password: string) =>
      req<AuthTokens & { is_new_user: boolean }>('/api/v1/auth/login', {
        method: 'POST',
        body: JSON.stringify({ phone, password }),
      }),
    sendOtp: (phone: string) =>
      req<{ message: string; otp?: string }>('/api/v1/auth/otp/send', {
        method: 'POST',
        body: JSON.stringify({ phone }),
      }),
    verifyOtp: (data: { phone: string; otp: string; ref_code?: string }) =>
      req<OtpVerifyResult>('/api/v1/auth/otp/verify', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    setPassword: (setupToken: string, password: string) =>
      req<AuthTokens & { is_new_user: boolean }>('/api/v1/auth/password/set', {
        method: 'POST',
        body: JSON.stringify({ setup_token: setupToken, password }),
      }),
    getMe: (token: string) =>
      req<User>('/api/v1/auth/me', { token }),
    updateProfile: (data: { name?: string }, token: string) =>
      req<User>('/api/v1/auth/me', {
        method: 'PATCH',
        body: JSON.stringify(data),
        token,
      }),
    deleteAccount: (token: string) =>
      req<void>('/api/v1/auth/me', { method: 'DELETE', token }),
  },
  events: {
    list: (citySlug: string, params?: Record<string, string>) =>
      req<Event[]>(`/api/v1/events${qs({ city_slug: citySlug, ...params })}`),
    get: (id: string) => req<Event>(`/api/v1/events/${id}`),
    create: (data: object, token: string) =>
      req<Event>('/api/v1/events', { method: 'POST', body: JSON.stringify(data), token }),
    update: (id: string, data: object, token: string) =>
      req<Event>(`/api/v1/events/${id}`, { method: 'PATCH', body: JSON.stringify(data), token }),
    delete: (id: string, token: string) =>
      req<void>(`/api/v1/events/${id}`, { method: 'DELETE', token }),
  },
  businesses: {
    list: (citySlug: string, params?: Record<string, string>) =>
      req<Business[]>(`/api/v1/businesses${qs({ city_slug: citySlug, ...params })}`),
    get: (id: string) => req<Business>(`/api/v1/businesses/${id}`),
    create: (data: object, token: string) =>
      req<Business>('/api/v1/businesses', { method: 'POST', body: JSON.stringify(data), token }),
    update: (id: string, data: object, token: string) =>
      req<Business>(`/api/v1/businesses/${id}`, { method: 'PATCH', body: JSON.stringify(data), token }),
    claim: (id: string, token: string) =>
      req<Business>(`/api/v1/businesses/${id}/claim`, { method: 'POST', token }),
    addReview: (id: string, data: { rating: number; body?: string }, token: string) =>
      req<Review>(`/api/v1/businesses/${id}/reviews`, { method: 'POST', body: JSON.stringify(data), token }),
  },
  users: {
    publicProfile: (userId: string) =>
      req<SellerProfile>(`/api/v1/users/${userId}/public-profile`),
  },
  savedSearches: {
    list: (token: string) =>
      req<{ id: string; city_slug: string; query_text: string | null; category_slug: string | null; created_at: string }[]>('/api/v1/saved-searches', { token }),
    create: (data: { city_slug: string; query_text?: string; category_slug?: string }, token: string) =>
      req<{ id: string }>('/api/v1/saved-searches', { method: 'POST', body: JSON.stringify(data), token }),
    delete: (id: string, token: string) =>
      req<void>(`/api/v1/saved-searches/${id}`, { method: 'DELETE', token }),
  },
  buyerRequests: {
    list: (citySlug: string) =>
      req<BuyerRequestOut[]>(`/api/v1/buyer-requests/cities/${citySlug}`),
    create: (data: { city_slug: string; category_slug: string; description: string; budget?: number; contact_phone: string }, token: string) =>
      req<BuyerRequestOut>('/api/v1/buyer-requests', { method: 'POST', body: JSON.stringify(data), token }),
    fulfill: (id: string, token: string) =>
      req<BuyerRequestOut>(`/api/v1/buyer-requests/${id}/fulfill`, { method: 'PATCH', token }),
    delete: (id: string, token: string) =>
      req<void>(`/api/v1/buyer-requests/${id}`, { method: 'DELETE', token }),
  },
  upload: {
    image: (listingId: string, file: File, token: string) => {
      const form = new FormData();
      form.append('file', file);
      return req<ListingImage>(`/api/v1/upload/image/${listingId}`, {
        method: 'POST',
        body: form,
        token,
      });
    },
    deleteImage: (imageId: string, token: string) =>
      req<void>(`/api/v1/upload/image/${imageId}`, { method: 'DELETE', token }),
  },
};
