export interface City {
  id: string;
  name: string;
  state: string;
  slug: string;
  lang_default: string;
  active: boolean;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  icon: string | null;
  sort_order: number;
}

export interface ListingImage {
  id: string;
  url: string;
  display_order: number;
}

export interface Listing {
  id: string;
  title: string;
  description: string;
  price: number | null;
  contact_phone: string;
  whatsapp_url: string | null;
  status: 'active' | 'pending' | 'flagged' | 'fulfilled' | 'expired';
  is_featured: boolean;
  expires_at: string;
  created_at: string;
  city_id: string;
  category_id: string;
  user_id: string;
  images?: ListingImage[];
}

export interface User {
  id: string;
  phone: string;
  name: string | null;
  email: string | null;
  avatar_url: string | null;
  role: 'user' | 'admin';
  is_active: boolean;
}

export interface AuthTokens {
  access_token: string;
  refresh_token: string;
  user: User;
}

export interface SearchResult {
  items: Listing[];
  total: number;
  page: number;
  page_size: number;
}

export interface SearchParams {
  q: string;
  city_slug: string;
  category_id?: string;
  page?: string;
  page_size?: string;
}

export interface CreateListingInput {
  title: string;
  description: string;
  category_id: string;
  city_id: string;
  contact_phone: string;
  price?: number;
  whatsapp_url?: string;
}
