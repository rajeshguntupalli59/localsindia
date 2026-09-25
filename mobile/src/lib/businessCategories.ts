// Business-directory categories — same slugs as the website/backend.
export const BUSINESS_CATEGORY_LABEL: Record<string, string> = {
  doctors: 'Doctors & Clinics',
  tiffin: 'Tiffin & Food',
  businesses: 'Shops & Stores',
  education: 'Schools & Tutors',
  fashion: 'Fashion',
  electronics: 'Electronics',
  vehicles: 'Vehicles & Garages',
  services: 'Services',
  events: 'Function Halls',
  'pg-roommate': 'PG & Hostels',
  furniture: 'Furniture',
  'real-estate': 'Real Estate',
  jobs: 'Job Agencies',
};

export const businessCategoryLabel = (slug?: string | null) =>
  (slug && BUSINESS_CATEGORY_LABEL[slug]) || 'Local business';
