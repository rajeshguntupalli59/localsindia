import type {
  City,
  Category,
  Listing,
  ListingImage,
  User,
  AuthTokens,
  SearchResult,
  SearchParams,
  CreateListingInput,
} from './types';

export type { User };

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000';

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

async function req<T>(
  path: string,
  init?: RequestInit & { token?: string }
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
  },
  listings: {
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
    sendOtp: (phone: string) =>
      req<{ otp_request_id: string }>('/api/v1/auth/otp/send', {
        method: 'POST',
        body: JSON.stringify({ phone }),
      }),
    verifyOtp: (data: { otp_request_id: string; otp: string }) =>
      req<AuthTokens>('/api/v1/auth/otp/verify', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
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
