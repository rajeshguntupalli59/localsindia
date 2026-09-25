import {
  Utensils, Home, Briefcase, Car, Smartphone, Wrench, Sofa, BookOpen, Stethoscope, Shirt, PartyPopper,
  Building2, Store, type LucideIcon,
} from 'lucide-react';

// Keys are the URL segment (/{city}/{key}); keep app/sitemap.ts CATEGORY_SLUGS in sync.
// businessSlug = the business-directory category shown on the page (real
// local businesses, mostly from OpenStreetMap).
export const SEO_CATEGORIES: Record<string, {
  title: string;
  headline: string;
  description: string;
  categorySlug?: string;
  searchFallback?: string;
  businessSlug: string;
  icon: LucideIcon;
}> = {
  tiffin: {
    title: 'Tiffin Services',
    headline: 'Tiffin, Meals & Restaurants',
    description: 'Find affordable, hygienic home-cooked tiffin, meal delivery services and local restaurants near you.',
    categorySlug: 'services',
    searchFallback: 'tiffin',
    businessSlug: 'tiffin',
    icon: Utensils,
  },
  'pg-roommate': {
    title: 'PG & Hostels',
    headline: 'PG Accommodation, Hostels & Roommates',
    description: 'Find paying guest accommodation, hostels, shared flats and roommates for rent.',
    categorySlug: 'pg-roommate',
    businessSlug: 'pg-roommate',
    icon: Home,
  },
  jobs: {
    title: 'Jobs',
    headline: 'Local Job Openings',
    description: 'Find jobs, employment and career opportunities posted by local businesses and employers.',
    categorySlug: 'jobs',
    businessSlug: 'jobs',
    icon: Briefcase,
  },
  vehicles: {
    title: 'Vehicles',
    headline: 'Cars, Bikes, Scooters & Garages',
    description: 'Buy and sell used cars, motorbikes and scooters, and find local garages and vehicle showrooms.',
    categorySlug: 'vehicles',
    businessSlug: 'vehicles',
    icon: Car,
  },
  electronics: {
    title: 'Electronics',
    headline: 'Mobile Phones, Laptops & Electronics Shops',
    description: 'Buy and sell used phones, laptops and gadgets, and find local mobile and electronics shops.',
    categorySlug: 'electronics',
    businessSlug: 'electronics',
    icon: Smartphone,
  },
  services: {
    title: 'Local Services',
    headline: 'Trusted Local Services',
    description: 'Find salons, laundries, opticians, plumbers, electricians and other local services.',
    categorySlug: 'services',
    businessSlug: 'services',
    icon: Wrench,
  },
  furniture: {
    title: 'Furniture',
    headline: 'Furniture Shops & Home Decor',
    description: 'Buy and sell used furniture and find local furniture and home decor shops.',
    searchFallback: 'furniture',
    businessSlug: 'furniture',
    icon: Sofa,
  },
  tutors: {
    title: 'Schools, Tutors & Classes',
    headline: 'Schools, Colleges, Tutors & Coaching',
    description: 'Find schools, colleges, coaching centres and tutors for all subjects near you.',
    searchFallback: 'tutor',
    businessSlug: 'education',
    icon: BookOpen,
  },
  doctors: {
    title: 'Doctors & Clinics',
    headline: 'Hospitals, Clinics & Pharmacies',
    description: 'Find hospitals, clinics, dentists, diagnostic centres and pharmacies near you, with addresses and phone numbers.',
    businessSlug: 'doctors',
    icon: Stethoscope,
  },
  fashion: {
    title: 'Fashion & Textiles',
    headline: 'Clothing, Textiles, Tailors & Jewellery',
    description: 'Find local clothing stores, textile and saree shops, tailors, footwear and jewellery shops.',
    businessSlug: 'fashion',
    icon: Shirt,
  },
  'event-venues': {
    title: 'Function Halls & Venues',
    headline: 'Function Halls, Banquet Halls & Event Venues',
    description: 'Find function halls, convention centres and banquet halls for weddings and events.',
    businessSlug: 'events',
    icon: PartyPopper,
  },
  'real-estate': {
    title: 'Real Estate',
    headline: 'Real Estate Agents & Properties',
    description: 'Find local real estate agents, builders and property listings.',
    businessSlug: 'real-estate',
    icon: Building2,
  },
  shops: {
    title: 'Shops & Stores',
    headline: 'Local Shops & Stores',
    description: 'Find local supermarkets, kirana, hardware, stationery and general stores near you.',
    businessSlug: 'businesses',
    icon: Store,
  },
};


// business-directory category slug -> SEO category page key
export const SEO_PAGE_FOR_BUSINESS_CATEGORY: Record<string, string> = Object.fromEntries(
  Object.entries(SEO_CATEGORIES).map(([key, m]) => [m.businessSlug, key]),
);

// An area page (/[city]/area/[area], /[city]/[category]/[area]) needs at least
// this many real businesses — matches MIN_AREA_BUSINESSES in routers/businesses.py.
export const MIN_AREA_BUSINESSES = 3;
