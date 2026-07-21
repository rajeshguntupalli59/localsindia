'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, X, CheckCircle, ArrowLeft, ArrowRight, Sparkles, Lightbulb, Camera, MapPin, Tag, UtensilsCrossed, Building2, Briefcase, Car, Smartphone, CalendarDays, Store, GraduationCap, Globe, Share2, Stethoscope, Wrench, Home, Package, ShoppingBag } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import Link from 'next/link';
import { api, ApiError } from '@/lib/api';
import type { Category } from '@/lib/types';
import SiteHeader from '@/components/site-header/SiteHeader';
import { toast } from 'sonner';
import { usePrefs } from '@/context/PrefsContext';

const CATEGORY_ICONS: Record<string, LucideIcon> = {
  tiffin: UtensilsCrossed,
  'pg-roommate': Building2,
  jobs: Briefcase,
  vehicles: Car,
  electronics: Smartphone,
  events: CalendarDays,
  businesses: Store,
  education: GraduationCap,
  doctors: Stethoscope,
  services: Wrench,
  classifieds: Tag,
  'real-estate': Home,
  furniture: Package,
  fashion: ShoppingBag,
};

// Category-specific questions shown on their own step, right after picking a
// category. Keys match the backend's per-category *_details table columns
// 1:1 (backend/app/models/listing_details.py), so these are sent straight
// through as `category_details` on create — same field-set as the mobile
// app's PostScreen.tsx, kept in sync for parity across platforms.
type DetailField =
  | { key: string; label: string; type: 'text'; placeholder?: string }
  | { key: string; label: string; type: 'number'; placeholder?: string }
  | { key: string; label: string; type: 'select'; options: string[] }
  | { key: string; label: string; type: 'multiselect'; options: string[] }
  | { key: string; label: string; type: 'switch' };

const CATEGORY_DETAIL_FIELDS: Record<string, DetailField[]> = {
  vehicles: [
    { key: 'brand', label: 'Brand', type: 'text', placeholder: 'e.g. Honda, Maruti Suzuki' },
    { key: 'model', label: 'Model', type: 'text', placeholder: 'e.g. Activa 6G, Swift' },
    { key: 'year', label: 'Year', type: 'number', placeholder: 'e.g. 2022' },
    { key: 'km_driven', label: 'KM Driven', type: 'number', placeholder: 'e.g. 15000' },
    { key: 'fuel_type', label: 'Fuel Type', type: 'select', options: ['Petrol', 'Diesel', 'Electric', 'CNG', 'Hybrid'] },
    { key: 'transmission', label: 'Transmission', type: 'select', options: ['Manual', 'Automatic'] },
    { key: 'owners_count', label: 'Number of Owners', type: 'number', placeholder: 'e.g. 1' },
  ],
  jobs: [
    { key: 'company_name', label: 'Company Name', type: 'text', placeholder: 'e.g. Acme Pvt Ltd' },
    { key: 'salary_min', label: 'Min Salary (₹/month)', type: 'number', placeholder: 'e.g. 15000' },
    { key: 'salary_max', label: 'Max Salary (₹/month)', type: 'number', placeholder: 'e.g. 25000' },
    { key: 'job_type', label: 'Job Type', type: 'select', options: ['Full-time', 'Part-time', 'Contract', 'Internship'] },
    { key: 'experience_required', label: 'Experience Required', type: 'text', placeholder: 'e.g. 1-2 years' },
    { key: 'work_mode', label: 'Work Mode', type: 'select', options: ['On-site', 'Remote', 'Hybrid'] },
  ],
  'pg-roommate': [
    { key: 'room_type', label: 'Room Type', type: 'select', options: ['Single', 'Sharing', '1RK', '1BHK'] },
    { key: 'gender_preference', label: 'Gender Preference', type: 'select', options: ['Male', 'Female', 'Any'] },
    { key: 'deposit_amount', label: 'Deposit Amount (₹)', type: 'number', placeholder: 'e.g. 10000' },
    { key: 'amenities', label: 'Amenities', type: 'multiselect', options: ['WiFi', 'AC', 'Food', 'Laundry', 'Parking'] },
  ],
  'real-estate': [
    { key: 'property_type', label: 'Property Type', type: 'select', options: ['Apartment', 'Villa', 'Plot', 'Commercial'] },
    { key: 'bhk', label: 'BHK', type: 'number', placeholder: 'e.g. 2' },
    { key: 'sqft', label: 'Area (sq.ft)', type: 'number', placeholder: 'e.g. 1200' },
    { key: 'furnishing', label: 'Furnishing', type: 'select', options: ['Furnished', 'Semi-furnished', 'Unfurnished'] },
    { key: 'listing_type', label: 'Listing Type', type: 'select', options: ['Rent', 'Sale'] },
  ],
  electronics: [
    { key: 'brand', label: 'Brand', type: 'text', placeholder: 'e.g. Samsung, Apple' },
    { key: 'model', label: 'Model', type: 'text', placeholder: 'e.g. Galaxy S23' },
    { key: 'condition', label: 'Condition', type: 'select', options: ['New', 'Like New', 'Good', 'Fair'] },
    { key: 'warranty_remaining', label: 'Warranty Remaining', type: 'text', placeholder: 'e.g. 6 months' },
  ],
  furniture: [
    { key: 'material', label: 'Material', type: 'text', placeholder: 'e.g. Wood, Metal' },
    { key: 'dimensions', label: 'Dimensions', type: 'text', placeholder: 'e.g. 6ft x 4ft' },
    { key: 'condition', label: 'Condition', type: 'select', options: ['New', 'Like New', 'Good', 'Fair'] },
  ],
  fashion: [
    { key: 'brand', label: 'Brand', type: 'text', placeholder: 'e.g. Nike, Zara' },
    { key: 'size', label: 'Size', type: 'text', placeholder: 'e.g. M, 32, UK 8' },
    { key: 'gender', label: 'Gender', type: 'select', options: ['Men', 'Women', 'Unisex', 'Kids'] },
  ],
  education: [
    { key: 'course_type', label: 'Course Type', type: 'text', placeholder: 'e.g. Spoken English, Maths Tuition' },
    { key: 'mode', label: 'Mode', type: 'select', options: ['Online', 'Offline', 'Hybrid'] },
    { key: 'duration', label: 'Duration', type: 'text', placeholder: 'e.g. 3 months' },
  ],
  doctors: [
    { key: 'specialization', label: 'Specialization', type: 'text', placeholder: 'e.g. Dentist, Cardiologist' },
    { key: 'consultation_fee', label: 'Consultation Fee (₹)', type: 'number', placeholder: 'e.g. 500' },
    { key: 'available_timings', label: 'Available Timings', type: 'text', placeholder: 'e.g. Mon-Sat 10am-6pm' },
  ],
  services: [
    { key: 'service_type', label: 'Service Type', type: 'text', placeholder: 'e.g. Plumber, Electrician' },
    { key: 'experience_years', label: 'Experience (years)', type: 'number', placeholder: 'e.g. 5' },
  ],
  tiffin: [
    { key: 'meal_type', label: 'Meal Type', type: 'select', options: ['Veg', 'Non-Veg', 'Both'] },
    { key: 'delivery_area', label: 'Delivery Area', type: 'text', placeholder: 'e.g. Within 5km of Kukatpally' },
    { key: 'subscription_available', label: 'Subscription Available', type: 'switch' },
  ],
};

// Copy for the generic Listing step (Title/Description/Price) — tailored per
// category so it reads like it's actually about a PG, a job, a course, etc.,
// instead of a one-size-fits-all "What are you selling?". Categories that
// already ask for pricing in their specific questions (Jobs -> salary,
// Doctors -> consultation fee) skip the generic price field entirely rather
// than asking twice. Kept in sync with the mobile app's PostScreen.tsx.
interface ListingCopy {
  cardTitle: string;
  titleLabel: string;
  titlePlaceholder: string;
  descLabel: string;
  descPlaceholder: string;
  showPrice: boolean;
  priceLabel?: string;
  priceHint?: string;
}

const LISTING_COPY: Record<string, ListingCopy> = {
  classifieds: {
    cardTitle: 'What are you selling?', titleLabel: 'Title',
    titlePlaceholder: "e.g. Study table with drawer, barely used",
    descLabel: 'Description', descPlaceholder: 'Describe your item — condition, age, any defects, reason for selling...',
    showPrice: true, priceLabel: 'Price (₹)', priceHint: "Leave blank to show \"Price on request\"",
  },
  vehicles: {
    cardTitle: 'Tell buyers about your vehicle', titleLabel: 'Listing Title',
    titlePlaceholder: "e.g. Honda Activa 6G 2022 — Low Mileage",
    descLabel: 'Description', descPlaceholder: "Describe the vehicle's condition, service history, accessories, reason for selling...",
    showPrice: true, priceLabel: 'Price (₹)', priceHint: "Leave blank to show \"Price on request\"",
  },
  jobs: {
    cardTitle: 'Tell candidates about this job', titleLabel: 'Job Title',
    titlePlaceholder: 'e.g. Field Sales Executive, Delivery Partner',
    descLabel: 'Job Description', descPlaceholder: 'Responsibilities, working hours, who this role is right for...',
    showPrice: false,
  },
  'pg-roommate': {
    cardTitle: 'Tell seekers about this PG / Room', titleLabel: 'PG / Room Title',
    titlePlaceholder: 'e.g. Cozy PG for Working Women near Hitech City',
    descLabel: 'Description', descPlaceholder: 'Describe the PG — food, amenities, house rules, nearby landmarks...',
    showPrice: true, priceLabel: 'Monthly Rent (₹)', priceHint: "Leave blank to show \"Price on request\"",
  },
  'real-estate': {
    cardTitle: 'Tell buyers about this property', titleLabel: 'Property Title',
    titlePlaceholder: 'e.g. Spacious 2BHK near Metro Station',
    descLabel: 'Description', descPlaceholder: "Describe the property — layout, condition, nearby landmarks, why you're renting/selling...",
    showPrice: true, priceLabel: 'Price (₹)', priceHint: 'Monthly rent, or total sale price',
  },
  electronics: {
    cardTitle: 'Tell buyers about this item', titleLabel: 'Title',
    titlePlaceholder: 'e.g. Samsung Galaxy S23, 128GB',
    descLabel: 'Description', descPlaceholder: 'Condition, accessories included, reason for selling...',
    showPrice: true, priceLabel: 'Price (₹)', priceHint: "Leave blank to show \"Price on request\"",
  },
  furniture: {
    cardTitle: 'Tell buyers about this item', titleLabel: 'Title',
    titlePlaceholder: 'e.g. 6-Seater Wooden Dining Table',
    descLabel: 'Description', descPlaceholder: 'Condition, age, reason for selling...',
    showPrice: true, priceLabel: 'Price (₹)', priceHint: "Leave blank to show \"Price on request\"",
  },
  fashion: {
    cardTitle: 'Tell buyers about this item', titleLabel: 'Title',
    titlePlaceholder: 'e.g. Nike Air Max, UK 9, worn twice',
    descLabel: 'Description', descPlaceholder: 'Condition, fit, reason for selling...',
    showPrice: true, priceLabel: 'Price (₹)', priceHint: "Leave blank to show \"Price on request\"",
  },
  education: {
    cardTitle: 'Tell students about this course', titleLabel: 'Course Title',
    titlePlaceholder: 'e.g. Spoken English for Beginners',
    descLabel: 'Description', descPlaceholder: "What this course covers, who it's for, batch timings...",
    showPrice: true, priceLabel: 'Course Fee (₹)', priceHint: "Leave blank to show \"Price on request\"",
  },
  doctors: {
    cardTitle: 'Tell patients about this practice', titleLabel: 'Practice / Clinic Title',
    titlePlaceholder: "e.g. Dr. Sharma's Dental Clinic",
    descLabel: 'Description', descPlaceholder: 'Services offered, experience, why patients should choose you...',
    showPrice: false,
  },
  services: {
    cardTitle: 'Tell customers about this service', titleLabel: 'Service Title',
    titlePlaceholder: 'e.g. Home AC Repair & Servicing',
    descLabel: 'Description', descPlaceholder: 'What you offer, your experience, service area...',
    showPrice: true, priceLabel: 'Starting Price (₹)', priceHint: "Leave blank to show \"Price on request\"",
  },
  tiffin: {
    cardTitle: 'Tell customers about your tiffin service', titleLabel: 'Service Title',
    titlePlaceholder: 'e.g. Home-style North Indian Tiffin',
    descLabel: 'Description', descPlaceholder: 'Menu variety, hygiene, delivery timings...',
    showPrice: true, priceLabel: 'Price per meal/plan (₹)', priceHint: "Leave blank to show \"Price on request\"",
  },
  businesses: {
    cardTitle: 'Tell customers about your business', titleLabel: 'Business Name',
    titlePlaceholder: 'e.g. Sharma Electricals & Repairs',
    descLabel: 'Description', descPlaceholder: 'What you offer, specialities, years in business...',
    showPrice: false,
  },
  events: {
    cardTitle: 'Tell people about your event', titleLabel: 'Event Title',
    titlePlaceholder: 'e.g. Sankranti Mela at LB Stadium',
    descLabel: 'Description', descPlaceholder: "What's happening, who it's for, why people should come...",
    showPrice: false,
  },
};

interface FormData {
  title: string;
  description: string;
  category_id: string;
  price: string;
  contact_phone: string;
  whatsapp_toggle: boolean;
  website_url: string;
  social_url: string;
  area: string;
  category_details: Record<string, unknown>;
}

const EMPTY: FormData = {
  title: '', description: '', category_id: '', price: '',
  contact_phone: '', whatsapp_toggle: true,
  website_url: '', social_url: '', area: '', category_details: {},
};

const PHONE_RE = /^\+91[6-9]\d{9}$/;

export default function PostListingPage() {
  const { city: citySlug } = useParams<{ city: string }>();
  const router = useRouter();

  const [step, setStep] = useState(0);
  const [form, setForm] = useState<FormData>(EMPTY);
  const [errors, setErrors] = useState<Partial<FormData>>({});
  const [categories, setCategories] = useState<Category[]>([]);
  const { cities } = usePrefs();
  const city = cities.find(c => c.slug === citySlug) ?? null;
  const [photos, setPhotos] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // Step layout depends on whether the picked category has its own specific
  // questions — those get a dedicated step, separate from the generic
  // Title/Description step, instead of both living on one scrollable screen.
  const selectedCategory = categories.find(c => c.id === form.category_id) ?? null;
  const detailFields = selectedCategory ? CATEGORY_DETAIL_FIELDS[selectedCategory.slug] ?? null : null;
  const hasDetailsStep = !!detailFields;
  const STEPS = hasDetailsStep
    ? [
        { label: 'Category', desc: 'What are you posting?' },
        { label: 'Details', desc: 'Category-specific questions' },
        { label: 'Listing', desc: 'Title & description' },
        { label: 'Photos', desc: 'Up to 5 photos' },
        { label: 'Contact', desc: 'Phone & WhatsApp' },
      ]
    : [
        { label: 'Category', desc: 'What are you posting?' },
        { label: 'Listing', desc: 'Title & description' },
        { label: 'Photos', desc: 'Up to 5 photos' },
        { label: 'Contact', desc: 'Phone & WhatsApp' },
      ];
  const STEP_CATEGORY = 0;
  const STEP_DETAILS = hasDetailsStep ? 1 : -1;
  const STEP_LISTING = hasDetailsStep ? 2 : 1;
  const STEP_PHOTOS = STEP_LISTING + 1;
  const STEP_CONTACT = STEP_PHOTOS + 1;
  const listingCopy = (selectedCategory ? LISTING_COPY[selectedCategory.slug] : null) ?? LISTING_COPY.classifieds;

  useEffect(() => {
    if (!localStorage.getItem('access_token')) {
      router.replace(`/auth/login?next=/${citySlug}/classifieds/post`);
      return;
    }
    const stored = localStorage.getItem('li_post_form');
    if (stored) {
      try {
        const draft = JSON.parse(stored);
        // Merge with EMPTY so any field missing from an older draft version gets a safe default.
        // category_details must always be an object — if absent from the stored draft, accessing
        // category_details[key] in the field renderer throws "Cannot read properties of undefined".
        setForm({ ...EMPTY, ...draft, category_details: draft.category_details ?? {} });
      } catch {
        // Corrupted JSON — discard the draft rather than crash on every page load
        localStorage.removeItem('li_post_form');
      }
    }
    api.categories.list().then(setCategories).catch(() => {});
    try {
      const u = JSON.parse(localStorage.getItem('user') ?? '{}');
      if (u.phone) setForm(f => ({ ...f, contact_phone: u.phone }));
    } catch { /* */ }
  }, [citySlug, router]);

  const save = (next: Partial<FormData>) => {
    const merged = { ...form, ...next };
    setForm(merged);
    localStorage.setItem('li_post_form', JSON.stringify(merged));
  };

  const setDetailField = (key: string, value: unknown) => {
    save({ category_details: { ...form.category_details, [key]: value } });
  };

  const renderDetailField = (field: DetailField) => {
    const value = form.category_details[field.key];

    if (field.type === 'select' || field.type === 'multiselect') {
      const selected: string[] = field.type === 'multiselect'
        ? (Array.isArray(value) ? value as string[] : [])
        : (typeof value === 'string' && value ? [value] : []);
      return (
        <div>
          <p className="text-sm font-bold mb-2" style={{ color: 'var(--li-text)' }}>{field.label}</p>
          <div className="flex flex-wrap gap-2">
            {field.options.map(opt => {
              const active = selected.includes(opt);
              return (
                <button
                  key={opt}
                  type="button"
                  onClick={() => {
                    if (field.type === 'multiselect') {
                      const next = active ? selected.filter(o => o !== opt) : [...selected, opt];
                      setDetailField(field.key, next);
                    } else {
                      setDetailField(field.key, opt);
                    }
                  }}
                  className="px-3 py-1.5 rounded-full text-sm font-semibold border-2 transition-all"
                  style={active
                    ? { borderColor: 'var(--li-primary)', background: 'var(--li-primary-light)', color: 'var(--li-primary)' }
                    : { borderColor: 'var(--li-border)', color: 'var(--li-muted)' }}
                >
                  {opt}
                </button>
              );
            })}
          </div>
        </div>
      );
    }

    if (field.type === 'switch') {
      return (
        <div className="flex items-center justify-between">
          <p className="text-sm font-bold" style={{ color: 'var(--li-text)' }}>{field.label}</p>
          <button
            type="button"
            onClick={() => setDetailField(field.key, !value)}
            className="relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors duration-200 focus:outline-none"
            style={{ background: value ? 'var(--li-wa-green)' : '#D1D5DB' }}
          >
            <span
              className="inline-block h-5 w-5 rounded-full bg-white shadow-md transition-transform duration-200"
              style={{ transform: value ? 'translateX(22px)' : 'translateX(2px)' }}
            />
          </button>
        </div>
      );
    }

    return (
      <div>
        <label className="text-sm font-bold mb-2 block" style={{ color: 'var(--li-text)' }}>{field.label}</label>
        <input
          type={field.type === 'number' ? 'number' : 'text'}
          value={value != null ? String(value) : ''}
          onChange={e => setDetailField(field.key, e.target.value)}
          placeholder={field.placeholder}
          className="w-full rounded-xl px-4 py-3 text-sm outline-none focus:border-orange-400 transition-colors"
          style={{ border: '2px solid var(--li-border)', color: 'var(--li-text)' }}
        />
      </div>
    );
  };

  const validateCategoryStep = () => {
    const e: Partial<FormData> = {};
    if (!form.category_id) e.category_id = 'Please pick a category';
    setErrors(e);
    if (Object.keys(e).length > 0) toast.error('Pick a category to continue');
    return Object.keys(e).length === 0;
  };

  const validateListingStep = () => {
    const e: Partial<FormData> = {};
    if (!form.title.trim() || form.title.trim().length < 5) e.title = 'Min 5 characters required';
    if (!form.description.trim() || form.description.length < 20) e.description = 'At least 20 characters';
    setErrors(e);
    if (Object.keys(e).length > 0) {
      const msgs = [];
      if (e.title) msgs.push('Title too short');
      if (e.description) msgs.push('Description too short (20+ chars)');
      toast.error(msgs.join(' · '));
      document.querySelector('[data-listing-form]')?.scrollIntoView({ behavior: 'smooth' });
    }
    return Object.keys(e).length === 0;
  };

  const validateContactStep = () => {
    const e: Partial<FormData> = {};
    const phone = form.contact_phone.trim().startsWith('+91')
      ? form.contact_phone.trim()
      : `+91${form.contact_phone.trim()}`;
    if (!PHONE_RE.test(phone)) e.contact_phone = 'Enter a valid Indian mobile number (+91XXXXXXXXXX)';
    setErrors(e);
    if (Object.keys(e).length > 0) toast.error('Enter a valid 10-digit mobile number');
    return Object.keys(e).length === 0;
  };

  const buildCategoryDetailsPayload = (): Record<string, unknown> | null => {
    if (!detailFields) return null;
    const out: Record<string, unknown> = {};
    for (const f of detailFields) {
      const v = form.category_details[f.key];
      if (v === undefined || v === null || v === '' || (Array.isArray(v) && v.length === 0)) continue;
      out[f.key] = f.type === 'number' ? Number(v) : v;
    }
    return Object.keys(out).length > 0 ? out : null;
  };

  const handleNext = () => {
    if (step === STEP_CATEGORY && !validateCategoryStep()) return;
    if (step === STEP_LISTING && !validateListingStep()) return;
    if (step === STEP_CONTACT) { handleSubmit(); return; }
    setStep(s => s + 1);
  };

  const handleFiles = (files: FileList | null) => {
    if (!files) return;
    const arr = Array.from(files).slice(0, 5 - photos.length);
    const oversized = arr.filter(f => f.size > 5 * 1024 * 1024);
    if (oversized.length) { toast.error('Images must be under 5MB'); return; }
    const newPhotos = [...photos, ...arr].slice(0, 5);
    setPhotos(newPhotos);
    setPreviews(newPhotos.map(f => URL.createObjectURL(f)));
  };

  const removePhoto = (i: number) => {
    const next = photos.filter((_, idx) => idx !== i);
    setPhotos(next);
    setPreviews(next.map(f => URL.createObjectURL(f)));
  };

  const handleSubmit = async () => {
    if (!validateContactStep()) return;
    const token = localStorage.getItem('access_token');
    if (!token) { router.push('/auth/login'); return; }
    if (!city) { toast.error('City not loaded, please refresh'); return; }
    setSubmitting(true);
    try {
      const phone = form.contact_phone.trim().startsWith('+91')
        ? form.contact_phone.trim()
        : `+91${form.contact_phone.trim()}`;

      const listing = await api.listings.create({
        title: form.title.trim(),
        description: form.description.trim(),
        category_id: form.category_id,
        city_id: city.id,
        contact_phone: phone,
        price: listingCopy.showPrice && form.price ? parseFloat(form.price) : undefined,
        whatsapp_url: form.whatsapp_toggle ? `https://wa.me/91${phone.replace('+91', '')}` : undefined,
        website_url: form.website_url.trim() || undefined,
        social_url: form.social_url.trim() || undefined,
        area: form.area.trim() || undefined,
        category_details: buildCategoryDetailsPayload(),
      }, token);

      for (const photo of photos) {
        try { await api.upload.image(listing.id, photo, token); } catch { /* non-fatal */ }
      }

      localStorage.removeItem('li_post_form');
      setDone(true);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Failed to post listing');
    } finally {
      setSubmitting(false);
    }
  };

  // ── SUCCESS SCREEN ──
  if (done) {
    return (
      <div style={{ background: 'var(--li-page-bg)', minHeight: '100vh' }}>
        <SiteHeader citySlug={citySlug} />
        <div className="flex flex-col items-center justify-center py-24 px-4 text-center">
          <motion.div
            initial={{ scale: 0.7, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 180 }}
          >
            <div
              className="w-24 h-24 rounded-3xl flex items-center justify-center mx-auto mb-6"
              style={{ background: 'var(--li-primary-light)' }}
            >
              <CheckCircle className="w-12 h-12" style={{ color: 'var(--li-primary)' }} />
            </div>
            <h1 className="text-3xl font-black mb-3" style={{ color: 'var(--li-text)' }}>Listing submitted!</h1>
            <p className="text-base mb-8 max-w-sm mx-auto" style={{ color: 'var(--li-muted)' }}>
              Your listing is under review. We&apos;ll activate it shortly — usually within an hour.
            </p>
            <div className="flex items-center gap-4 justify-center">
              <Link
                href="/profile/listings"
                className="cta-btn px-8 py-3 rounded-2xl font-bold"
              >
                View my listings
              </Link>
              <Link
                href={`/${citySlug}`}
                className="px-8 py-3 rounded-2xl border-2 font-bold transition-colors hover:border-orange-400"
                style={{ borderColor: 'var(--li-border)', color: 'var(--li-text)' }}
              >
                Back to {citySlug.charAt(0).toUpperCase() + citySlug.slice(1)}
              </Link>
            </div>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ background: 'var(--li-page-bg)', minHeight: '100vh' }}>
      <SiteHeader citySlug={citySlug} />

      {/* ── STEP PROGRESS BAR ── */}
      <div className="bg-white border-b" style={{ borderColor: 'var(--li-border)' }}>
        <div className="page-wrap py-4 sm:py-6">
          <div className="flex items-center gap-0">
            {STEPS.map((s, i) => (
              <div key={i} className="flex items-center flex-1">
                {/* Step bubble */}
                <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                  <div
                    className="w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center text-sm font-black transition-all"
                    style={
                      i < step
                        ? { background: 'var(--li-primary)', color: 'white' }
                        : i === step
                        ? { background: 'var(--li-primary)', color: 'white', boxShadow: '0 0 0 4px rgba(255,107,53,0.2)' }
                        : { background: '#F3F4F6', color: 'var(--li-muted)' }
                    }
                  >
                    {i < step ? '✓' : i + 1}
                  </div>
                  <div>
                    <p
                      className="text-xs sm:text-sm font-bold"
                      style={{ color: i === step ? 'var(--li-primary)' : i < step ? 'var(--li-text)' : 'var(--li-muted)' }}
                    >
                      {s.label}
                    </p>
                    <p className="hidden sm:block text-xs" style={{ color: 'var(--li-muted)' }}>{s.desc}</p>
                  </div>
                </div>
                {/* Connector */}
                {i < STEPS.length - 1 && (
                  <div
                    className="flex-1 h-0.5 mx-2 sm:mx-4 rounded-full"
                    style={{ background: i < step ? 'var(--li-primary)' : '#E5E7EB' }}
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="page-wrap py-8">
        <AnimatePresence mode="wait">

          {/* ── STEP: CATEGORY ── */}
          {step === STEP_CATEGORY && (
            <motion.div
              key="stepCategory"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="max-w-3xl mx-auto"
            >
              <div className="bg-white rounded-3xl p-6 border" style={{ borderColor: `${errors.category_id ? '#EF4444' : 'var(--li-border)'}` }}>
                <h2 className="text-lg font-black mb-1" style={{ color: 'var(--li-text)' }}>
                  What are you posting? <span style={{ color: '#EF4444' }}>*</span>
                </h2>
                <p className="text-sm mb-5" style={{ color: 'var(--li-muted)' }}>
                  Pick a category — we&apos;ll ask the right questions for it next.
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {categories.map(cat => {
                    const Icon = CATEGORY_ICONS[cat.slug] ?? Tag;
                    const isActive = form.category_id === cat.id;
                    return (
                      <motion.button
                        key={cat.id}
                        whileHover={{ y: -2 }}
                        whileTap={{ scale: 0.97 }}
                        onClick={() => save({ category_id: cat.id, category_details: {} })}
                        className="flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all"
                        style={
                          isActive
                            ? { borderColor: 'var(--li-primary)', background: 'var(--li-primary-light)' }
                            : { borderColor: 'var(--li-border)' }
                        }
                      >
                        <div
                          className="w-10 h-10 rounded-xl flex items-center justify-center transition-colors"
                          style={{ background: isActive ? 'rgba(255,107,53,0.15)' : '#F3F4F6' }}
                        >
                          <Icon
                            className="w-5 h-5"
                            style={{ color: isActive ? 'var(--li-primary)' : 'var(--li-muted)' }}
                            strokeWidth={1.8}
                          />
                        </div>
                        <span
                          className="text-xs font-bold text-center leading-tight"
                          style={{ color: isActive ? 'var(--li-primary)' : 'var(--li-text)' }}
                        >
                          {cat.name}
                        </span>
                      </motion.button>
                    );
                  })}
                </div>
                {errors.category_id && <p className="text-xs mt-3" style={{ color: '#EF4444' }}>{errors.category_id}</p>}
              </div>
            </motion.div>
          )}

          {/* ── STEP: CATEGORY-SPECIFIC DETAILS (only for categories with their own questions) ── */}
          {hasDetailsStep && step === STEP_DETAILS && detailFields && selectedCategory && (
            <motion.div
              key="stepDetails"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="max-w-3xl mx-auto"
            >
              <div className="bg-white rounded-3xl p-6 border" style={{ borderColor: 'var(--li-border)' }}>
                <h2 className="text-lg font-black mb-1" style={{ color: 'var(--li-text)' }}>
                  {selectedCategory.name} details
                </h2>
                <p className="text-sm mb-5" style={{ color: 'var(--li-muted)' }}>
                  A few quick questions specific to this category.
                </p>
                <div className="space-y-5">
                  {detailFields.map(field => (
                    <div key={field.key}>{renderDetailField(field)}</div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {/* ── STEP: LISTING INFO (generic title/description + price) ── */}
          {step === STEP_LISTING && (
            <motion.div
              key="stepListing"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="grid grid-cols-1 md:grid-cols-[1fr_360px] gap-6 md:gap-8 items-start"
            >
              {/* Left: Title + Description */}
              <div className="space-y-6" data-listing-form>
                <div className="bg-white rounded-3xl p-6 border" style={{ borderColor: 'var(--li-border)' }}>
                  <h2 className="text-lg font-black mb-5" style={{ color: 'var(--li-text)' }}>{listingCopy.cardTitle}</h2>

                  <div className="space-y-5">
                    <div>
                      <label className="text-sm font-bold mb-2 block" style={{ color: 'var(--li-text)' }}>
                        {listingCopy.titleLabel} <span style={{ color: '#EF4444' }}>*</span>
                      </label>
                      <input
                        value={form.title}
                        onChange={e => save({ title: e.target.value })}
                        placeholder={listingCopy.titlePlaceholder}
                        className="w-full rounded-xl px-4 py-3 text-sm outline-none focus:border-orange-400 transition-colors"
                        style={{ border: `2px solid ${errors.title ? '#EF4444' : 'var(--li-border)'}`, color: 'var(--li-text)' }}
                      />
                      {errors.title && <p className="text-xs mt-1.5" style={{ color: '#EF4444' }}>{errors.title}</p>}
                    </div>

                    <div>
                      <label className="text-sm font-bold mb-2 block" style={{ color: 'var(--li-text)' }}>
                        {listingCopy.descLabel} <span style={{ color: '#EF4444' }}>*</span>
                      </label>
                      <textarea
                        value={form.description}
                        onChange={e => save({ description: e.target.value })}
                        placeholder={listingCopy.descPlaceholder}
                        rows={5}
                        className="w-full rounded-xl px-4 py-3 text-sm resize-none outline-none focus:border-orange-400 transition-colors"
                        style={{ border: `2px solid ${errors.description ? '#EF4444' : 'var(--li-border)'}`, color: 'var(--li-text)' }}
                      />
                      <div className="flex justify-between mt-1">
                        {errors.description ? <p className="text-xs" style={{ color: '#EF4444' }}>{errors.description}</p> : <span />}
                        <p className="text-xs" style={{ color: 'var(--li-muted)' }}>{form.description.length}/500</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right: Price + preview tip */}
              <div className="space-y-5 md:sticky md:top-24">
                {listingCopy.showPrice && (
                <div className="bg-white rounded-3xl p-6 border" style={{ borderColor: 'var(--li-border)' }}>
                  <h2 className="text-base font-bold mb-4" style={{ color: 'var(--li-text)' }}>Set a price</h2>
                  <label className="text-sm font-medium mb-2 block" style={{ color: 'var(--li-muted)' }}>
                    {listingCopy.priceLabel} <span className="font-normal">(optional)</span>
                  </label>
                  <div className="relative">
                    <span
                      className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-bold"
                      style={{ color: 'var(--li-muted)' }}
                    >₹</span>
                    <input
                      type="number"
                      value={form.price}
                      onChange={e => save({ price: e.target.value })}
                      placeholder="0"
                      className="w-full rounded-xl pl-8 pr-4 py-3 text-sm outline-none focus:border-orange-400"
                      style={{ border: '2px solid var(--li-border)', color: 'var(--li-text)' }}
                    />
                  </div>
                  <p className="text-xs mt-2" style={{ color: 'var(--li-muted)' }}>
                    {listingCopy.priceHint}
                  </p>
                </div>
                )}

                <div
                  className="rounded-3xl p-5 border"
                  style={{ background: '#F0FDF4', borderColor: '#86EFAC' }}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <Lightbulb className="w-4 h-4 shrink-0" style={{ color: '#166534' }} strokeWidth={2} />
                    <p className="text-sm font-bold" style={{ color: '#166534' }}>Tips for more inquiries</p>
                  </div>
                  <ul className="space-y-1.5">
                    {['Use a specific title (model, brand, year)', 'Write 3-4 sentences of description', 'Set a fair price to get quick responses'].map(tip => (
                      <li key={tip} className="flex items-start gap-2 text-xs" style={{ color: '#166534' }}>
                        <span>•</span>{tip}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </motion.div>
          )}

          {/* ── STEP: PHOTOS ── */}
          {step === STEP_PHOTOS && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="grid grid-cols-1 md:grid-cols-[1fr_360px] gap-6 md:gap-8 items-start"
            >
              <div className="bg-white rounded-3xl p-6 border" style={{ borderColor: 'var(--li-border)' }}>
                <h2 className="text-lg font-black mb-2" style={{ color: 'var(--li-text)' }}>Add photos</h2>
                <p className="text-sm mb-6" style={{ color: 'var(--li-muted)' }}>
                  Listings with photos get 5× more inquiries. Add up to 5 — first photo is the cover.
                </p>

                {photos.length < 5 && (
                  <button
                    onClick={() => fileRef.current?.click()}
                    className="w-full border-2 border-dashed rounded-3xl p-8 sm:p-12 flex flex-col items-center gap-3 transition-colors hover:border-orange-400 hover:bg-orange-50 mb-5"
                    style={{ borderColor: 'var(--li-border)' }}
                  >
                    <div
                      className="w-16 h-16 rounded-2xl flex items-center justify-center"
                      style={{ background: 'var(--li-primary-light)' }}
                    >
                      <Upload className="w-7 h-7" style={{ color: 'var(--li-primary)' }} />
                    </div>
                    <div className="text-center">
                      <p className="font-bold text-sm" style={{ color: 'var(--li-text)' }}>Click to upload photos</p>
                      <p className="text-xs mt-1" style={{ color: 'var(--li-muted)' }}>JPEG, PNG, WebP — max 5MB each</p>
                    </div>
                  </button>
                )}

                <input
                  ref={fileRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  multiple
                  className="hidden"
                  onChange={e => handleFiles(e.target.files)}
                />

                {previews.length > 0 && (
                  <div className="grid grid-cols-3 gap-3">
                    {previews.map((url, i) => (
                      <div key={i} className="relative rounded-2xl overflow-hidden bg-gray-100" style={{ aspectRatio: '4/3' }}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={url} alt="" className="w-full h-full object-cover" />
                        {i === 0 && (
                          <span
                            className="absolute bottom-2 left-2 text-xs font-bold px-2.5 py-1 rounded-lg"
                            style={{ background: 'var(--li-primary)', color: 'white' }}
                          >
                            Cover
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={() => removePhoto(i)}
                          className="absolute top-2 right-2 w-6 h-6 rounded-full bg-black/60 flex items-center justify-center"
                          aria-label={`Remove photo ${i + 1}`}
                        >
                          <X className="w-3.5 h-3.5 text-white" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="md:sticky md:top-24">
                <div
                  className="rounded-3xl p-5 border"
                  style={{ background: '#FFFBEB', borderColor: '#FDE68A' }}
                >
                  <div className="flex items-center gap-2 mb-3">
                    <Camera className="w-4 h-4 shrink-0" style={{ color: '#92400E' }} strokeWidth={2} />
                    <p className="text-sm font-bold" style={{ color: '#92400E' }}>Photo tips</p>
                  </div>
                  <ul className="space-y-2">
                    {[
                      'Shoot in natural light near a window',
                      'Show all angles of the item',
                      'Include any defects or wear clearly',
                      'Clean the item before photographing',
                    ].map(t => (
                      <li key={t} className="flex items-start gap-2 text-xs" style={{ color: '#78350F' }}>
                        <span>•</span>{t}
                      </li>
                    ))}
                  </ul>
                  <p className="text-xs mt-3" style={{ color: 'var(--li-muted)' }}>{photos.length}/5 photos added</p>
                </div>
              </div>
            </motion.div>
          )}

          {/* ── STEP 3: CONTACT ── */}
          {step === STEP_CONTACT && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="grid grid-cols-1 md:grid-cols-[1fr_360px] gap-6 md:gap-8 items-start"
            >
              <div className="bg-white rounded-3xl p-6 border space-y-6" style={{ borderColor: 'var(--li-border)' }}>
                <h2 className="text-lg font-black" style={{ color: 'var(--li-text)' }}>Contact details</h2>

                <div>
                  <label className="text-sm font-bold mb-2 block" style={{ color: 'var(--li-text)' }}>
                    Area / Neighbourhood <span className="font-normal text-xs" style={{ color: 'var(--li-muted)' }}>(optional)</span>
                  </label>
                  <div className="flex rounded-xl border-2 overflow-hidden" style={{ borderColor: 'var(--li-border)' }}>
                    <span
                      className="flex items-center px-3 border-r-2 shrink-0"
                      style={{ background: '#F3F4F6', borderColor: 'var(--li-border)' }}
                    >
                      <MapPin className="w-4 h-4" style={{ color: 'var(--li-muted)' }} />
                    </span>
                    <input
                      type="text"
                      value={form.area}
                      onChange={e => save({ area: e.target.value })}
                      placeholder="e.g. Koramangala, Banjara Hills, Andheri West..."
                      className="flex-1 px-3 py-3 text-sm outline-none bg-white"
                      style={{ color: 'var(--li-text)' }}
                      maxLength={100}
                    />
                  </div>
                  <p className="text-xs mt-1.5" style={{ color: 'var(--li-muted)' }}>
                    Helps buyers find listings near them — beats city-only searches
                  </p>
                </div>

                <div>
                  <label className="text-sm font-bold mb-2 block" style={{ color: 'var(--li-text)' }}>
                    Your mobile number <span style={{ color: '#EF4444' }}>*</span>
                  </label>
                  <div className="flex">
                    <span
                      className="flex items-center px-4 rounded-l-xl text-sm font-bold border-r-0 border-2"
                      style={{ background: '#F3F4F6', color: 'var(--li-muted)', borderColor: 'var(--li-border)' }}
                    >
                      +91
                    </span>
                    <input
                      type="tel"
                      value={form.contact_phone.replace('+91', '')}
                      onChange={e => save({ contact_phone: `+91${e.target.value}` })}
                      placeholder="9876543210"
                      className="flex-1 rounded-r-xl px-4 py-3 text-sm outline-none border-l-0"
                      style={{ border: `2px solid ${errors.contact_phone ? '#EF4444' : 'var(--li-border)'}`, color: 'var(--li-text)' }}
                    />
                  </div>
                  {errors.contact_phone && <p className="text-xs mt-1.5" style={{ color: '#EF4444' }}>{errors.contact_phone}</p>}
                </div>

                <div
                  className="flex items-center justify-between p-5 rounded-2xl border"
                  style={{ borderColor: 'var(--li-border)' }}
                >
                  <div>
                    <p className="text-sm font-bold" style={{ color: 'var(--li-text)' }}>Enable WhatsApp contact</p>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--li-muted)' }}>
                      Buyers can message you directly on WhatsApp
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => save({ whatsapp_toggle: !form.whatsapp_toggle })}
                    className="relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors duration-200 focus:outline-none"
                    style={{ background: form.whatsapp_toggle ? 'var(--li-wa-green)' : '#D1D5DB' }}
                  >
                    <span
                      className="inline-block h-5 w-5 rounded-full bg-white shadow-md transition-transform duration-200"
                      style={{ transform: form.whatsapp_toggle ? 'translateX(22px)' : 'translateX(2px)' }}
                    />
                  </button>
                </div>

                {/* Optional: Website + Social links */}
                <div className="pt-2">
                  <p className="text-sm font-bold mb-1" style={{ color: 'var(--li-text)' }}>
                    Online presence <span className="font-normal text-xs" style={{ color: 'var(--li-muted)' }}>(optional)</span>
                  </p>
                  <p className="text-xs mb-4" style={{ color: 'var(--li-muted)' }}>
                    Add your website or social page so buyers can learn more about you
                  </p>
                  <div className="space-y-3">
                    <div className="flex rounded-xl border-2 overflow-hidden" style={{ borderColor: 'var(--li-border)' }}>
                      <span
                        className="flex items-center px-3 border-r-2 shrink-0"
                        style={{ background: '#F3F4F6', borderColor: 'var(--li-border)' }}
                      >
                        <Globe className="w-4 h-4" style={{ color: 'var(--li-muted)' }} />
                      </span>
                      <input
                        type="url"
                        value={form.website_url}
                        onChange={e => save({ website_url: e.target.value })}
                        placeholder="https://yourwebsite.com"
                        className="flex-1 px-3 py-3 text-sm outline-none bg-white"
                        style={{ color: 'var(--li-text)' }}
                      />
                    </div>
                    <div className="flex rounded-xl border-2 overflow-hidden" style={{ borderColor: 'var(--li-border)' }}>
                      <span
                        className="flex items-center px-3 border-r-2 shrink-0"
                        style={{ background: '#F3F4F6', borderColor: 'var(--li-border)' }}
                      >
                        <Share2 className="w-4 h-4" style={{ color: 'var(--li-muted)' }} />
                      </span>
                      <input
                        type="url"
                        value={form.social_url}
                        onChange={e => save({ social_url: e.target.value })}
                        placeholder="https://instagram.com/yourpage or facebook.com/..."
                        className="flex-1 px-3 py-3 text-sm outline-none bg-white"
                        style={{ color: 'var(--li-text)' }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-5 md:sticky md:top-24">
                {/* Listing preview summary */}
                <div className="bg-white rounded-3xl p-5 border" style={{ borderColor: 'var(--li-border)' }}>
                  <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: 'var(--li-muted)' }}>
                    Your listing summary
                  </p>
                  {previews[0] && (
                    <div className="rounded-2xl overflow-hidden mb-3" style={{ aspectRatio: '16/9' }}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={previews[0]} alt="" className="w-full h-full object-cover" />
                    </div>
                  )}
                  <p className="font-bold text-sm mb-1" style={{ color: 'var(--li-text)' }}>{form.title || '—'}</p>
                  {listingCopy.showPrice && form.price && (
                    <p className="font-black text-lg" style={{ color: 'var(--li-primary)' }}>
                      ₹{parseFloat(form.price).toLocaleString('en-IN')}
                    </p>
                  )}
                  {city && (
                    <p className="flex items-center gap-1 text-xs mt-2" style={{ color: 'var(--li-muted)' }}>
                      <MapPin className="w-3 h-3 shrink-0" strokeWidth={2} />
                      {form.area ? `${form.area}, ` : ''}{city.name}, {city.state}
                    </p>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── STEP NAVIGATION ── */}
        <div
          className="flex items-center justify-between mt-10 pt-6 border-t"
          style={{ borderColor: 'var(--li-border)' }}
        >
          <button
            onClick={() => step === STEP_CATEGORY ? router.back() : setStep(s => s - 1)}
            className="flex items-center gap-2 px-6 py-3 rounded-2xl border font-semibold text-sm transition-colors hover:border-orange-400"
            style={{ borderColor: 'var(--li-border)', color: 'var(--li-text)' }}
          >
            <ArrowLeft className="w-4 h-4" />
            {step === STEP_CATEGORY ? 'Cancel' : 'Back'}
          </button>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleNext}
            disabled={submitting}
            className="flex items-center gap-2 px-8 py-3 rounded-2xl font-bold text-sm text-white disabled:opacity-60 transition-opacity"
            style={{ background: 'var(--li-primary)' }}
          >
            {submitting ? 'Posting...' : step === STEP_CONTACT ? <><Sparkles className="w-4 h-4" strokeWidth={2} /> Post Listing</> : <>Next <ArrowRight className="w-4 h-4" /></>}
          </motion.button>
        </div>
      </div>
    </div>
  );
}
