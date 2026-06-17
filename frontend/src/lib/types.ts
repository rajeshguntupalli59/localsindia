export interface ListingReview {
  id: string;
  listing_id: string;
  user_id: string;
  rating: number;
  body: string | null;
  created_at: string;
}

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
  website_url: string | null;
  social_url: string | null;
  area: string | null;
  wa_verified: boolean;
  view_count?: number;
  contact_click_count?: number;
  last_renewed_at?: string | null;
  status: 'active' | 'pending' | 'flagged' | 'fulfilled' | 'expired';
  is_featured: boolean;
  expires_at: string;
  created_at: string;
  city_id: string;
  category_id: string;
  user_id: string;
  images?: ListingImage[];
  category_name?: string | null;
  category_slug?: string | null;
  seller_name?: string | null;
}

export interface User {
  id: string;
  phone: string | null;
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
  sort?: string;
}

export interface Event {
  id: string;
  title: string;
  description: string;
  venue: string;
  event_date: string;
  is_free: boolean;
  ticket_url: string | null;
  status: string;
  city_id: string;
  user_id: string;
  category_id: string | null;
  created_at: string;
}

export interface Review {
  id: string;
  rating: number;
  body: string | null;
  user_id: string;
  created_at: string;
}

export interface Business {
  id: string;
  name: string;
  description: string | null;
  address: string | null;
  phone: string | null;
  whatsapp_url: string | null;
  website_url: string | null;
  verified: boolean;
  avg_rating: number | null;
  review_count: number;
  city_id: string;
  category_id: string | null;
  owner_id: string | null;
  created_at: string;
  reviews?: Review[];
}

export interface SellerProfile {
  id: string;
  name: string | null;
  avatar_url: string | null;
  member_since: string;
  active_listings_count: number;
  listings: Listing[];
}

export interface CreateListingInput {
  title: string;
  description: string;
  category_id: string;
  city_id: string;
  contact_phone: string;
  price?: number;
  whatsapp_url?: string;
  website_url?: string;
  social_url?: string;
  area?: string;
}
