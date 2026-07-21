import {
  View, Text, TextInput, ScrollView, TouchableOpacity,
  StyleSheet, Alert, Image, ActivityIndicator,
  KeyboardAvoidingView, Platform, Switch,
} from 'react-native';
import { useState, useEffect } from 'react';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { listingsApi, categoriesApi, citiesApi, businessesApi, eventsApi } from '../lib/api';
import { storage } from '../lib/storage';
import { getApproxLocationWithArea } from '../lib/location';

const CATEGORY_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  tiffin:        'restaurant-outline',
  'pg-roommate': 'home-outline',
  jobs:          'briefcase-outline',
  vehicles:      'car-outline',
  electronics:   'phone-portrait-outline',
  education:     'school-outline',
  events:        'calendar-outline',
  businesses:    'storefront-outline',
  classifieds:   'pricetags-outline',
  services:      'construct-outline',
  'real-estate': 'business-outline',
  furniture:     'cube-outline',
  fashion:       'shirt-outline',
  doctors:       'medical-outline',
};

// Same palette as HomeScreen's "Browse by Category" grid, for visual consistency.
const CATEGORY_COLORS: Record<string, string> = {
  tiffin:        '#f97316',
  'pg-roommate': '#3b82f6',
  jobs:          '#10b981',
  vehicles:      '#ef4444',
  electronics:   '#8b5cf6',
  education:     '#f59e0b',
  events:        '#ec4899',
  businesses:    '#06b6d4',
  classifieds:   '#64748b',
  services:      '#0d9488',
  'real-estate': '#a21caf',
  furniture:     '#92400e',
  fashion:       '#db2777',
  doctors:       '#0284c7',
};

const API_BASE = 'https://localsindia-backend.azurewebsites.net/api/v1';

type Category = { id: string; name: string; slug: string; icon: string };

// Category-specific questions shown on the Details step, right above the
// generic Title/Description fields. Keys match the backend's per-category
// *_details table columns (models/listing_details.py) 1:1, so these can be
// sent straight through as `category_details` on create — no renaming layer.
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
// than asking twice.
type ListingCopy = {
  cardTitle: string;
  titleLabel: string;
  titlePlaceholder: string;
  descLabel: string;
  descPlaceholder: string;
  showPrice: boolean;
  priceLabel?: string;
  priceHint?: string;
};

const LISTING_COPY: Record<string, ListingCopy> = {
  classifieds: {
    cardTitle: 'What are you selling?', titleLabel: 'Title',
    titlePlaceholder: 'e.g. Study table with drawer, barely used',
    descLabel: 'Description', descPlaceholder: 'Describe your item — condition, age, any defects, reason for selling...',
    showPrice: true, priceLabel: 'Price (₹)', priceHint: "Leave blank to show 'Price on request'",
  },
  vehicles: {
    cardTitle: 'Tell buyers about your vehicle', titleLabel: 'Listing Title',
    titlePlaceholder: 'e.g. Honda Activa 6G 2022 — Low Mileage',
    descLabel: 'Description', descPlaceholder: "Describe the vehicle's condition, service history, accessories, reason for selling...",
    showPrice: true, priceLabel: 'Price (₹)', priceHint: "Leave blank to show 'Price on request'",
  },
  jobs: {
    cardTitle: 'Tell candidates about this job', titleLabel: 'Job Title',
    titlePlaceholder: 'e.g. Field Sales Executive, Delivery Partner',
    descLabel: 'Job Description', descPlaceholder: "Responsibilities, working hours, who this role is right for...",
    showPrice: false,
  },
  'pg-roommate': {
    cardTitle: 'Tell seekers about this PG / Room', titleLabel: 'PG / Room Title',
    titlePlaceholder: 'e.g. Cozy PG for Working Women near Hitech City',
    descLabel: 'Description', descPlaceholder: 'Describe the PG — food, amenities, house rules, nearby landmarks...',
    showPrice: true, priceLabel: 'Monthly Rent (₹)', priceHint: "Leave blank to show 'Price on request'",
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
    showPrice: true, priceLabel: 'Price (₹)', priceHint: "Leave blank to show 'Price on request'",
  },
  furniture: {
    cardTitle: 'Tell buyers about this item', titleLabel: 'Title',
    titlePlaceholder: 'e.g. 6-Seater Wooden Dining Table',
    descLabel: 'Description', descPlaceholder: 'Condition, age, reason for selling...',
    showPrice: true, priceLabel: 'Price (₹)', priceHint: "Leave blank to show 'Price on request'",
  },
  fashion: {
    cardTitle: 'Tell buyers about this item', titleLabel: 'Title',
    titlePlaceholder: 'e.g. Nike Air Max, UK 9, worn twice',
    descLabel: 'Description', descPlaceholder: 'Condition, fit, reason for selling...',
    showPrice: true, priceLabel: 'Price (₹)', priceHint: "Leave blank to show 'Price on request'",
  },
  education: {
    cardTitle: 'Tell students about this course', titleLabel: 'Course Title',
    titlePlaceholder: 'e.g. Spoken English for Beginners',
    descLabel: 'Description', descPlaceholder: "What this course covers, who it's for, batch timings...",
    showPrice: true, priceLabel: 'Course Fee (₹)', priceHint: "Leave blank to show 'Price on request'",
  },
  doctors: {
    cardTitle: 'Tell patients about this practice', titleLabel: 'Practice / Clinic Title',
    titlePlaceholder: "e.g. Dr. Sharma's Dental Clinic",
    descLabel: 'Description', descPlaceholder: "Services offered, experience, why patients should choose you...",
    showPrice: false,
  },
  services: {
    cardTitle: 'Tell customers about this service', titleLabel: 'Service Title',
    titlePlaceholder: 'e.g. Home AC Repair & Servicing',
    descLabel: 'Description', descPlaceholder: 'What you offer, your experience, service area...',
    showPrice: true, priceLabel: 'Starting Price (₹)', priceHint: "Leave blank to show 'Price on request'",
  },
  tiffin: {
    cardTitle: 'Tell customers about your tiffin service', titleLabel: 'Service Title',
    titlePlaceholder: 'e.g. Home-style North Indian Tiffin',
    descLabel: 'Description', descPlaceholder: 'Menu variety, hygiene, delivery timings...',
    showPrice: true, priceLabel: 'Price per meal/plan (₹)', priceHint: "Leave blank to show 'Price on request'",
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
    showPrice: false, // events use their own Free/Paid + ticket price fields below, not the generic price
  },
};

export default function PostScreen({ navigation, route }: any) {
  const insets = useSafeAreaInsets();
  const [user, setUser] = useState<any>(undefined);
  const [citySlug, setCitySlug] = useState('hyderabad');
  const [cityName, setCityName] = useState('Hyderabad');
  const [categories, setCategories] = useState<Category[]>([]);
  const [cities, setCities] = useState<{ name: string; slug: string }[]>([]);
  const [step, setStep] = useState(0);

  // Form fields
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [area, setArea] = useState('');
  const [categorySlug, setCategorySlug] = useState('');
  const [categoryDetails, setCategoryDetails] = useState<Record<string, any>>({});
  const [phone, setPhone] = useState('');
  const [whatsappOn, setWhatsappOn] = useState(true);
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [socialUrl, setSocialUrl] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [includeLocation, setIncludeLocation] = useState(false);
  const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [locationLoading, setLocationLoading] = useState(false);

  // Event-only fields
  const [venue, setVenue] = useState('');
  const [eventDate, setEventDate] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [isEventFree, setIsEventFree] = useState(true);
  const [ticketPrice, setTicketPrice] = useState('');
  const [ticketUrl, setTicketUrl] = useState('');

  // UI state
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState('');
  const [success, setSuccess] = useState(false);

  // Step layout depends on whether the picked category has its own specific
  // questions — those get a dedicated step, separate from the generic
  // Title/Description step, instead of both living on one scrollable screen.
  const detailFields = CATEGORY_DETAIL_FIELDS[categorySlug] ?? null;
  const hasDetailsStep = !!detailFields;
  const STEPS = hasDetailsStep
    ? ['Category', 'Details', 'Listing', 'Photos', 'Contact']
    : ['Category', 'Listing', 'Photos', 'Contact'];
  const STEP_CATEGORY = 0;
  const STEP_DETAILS = hasDetailsStep ? 1 : -1;
  const STEP_LISTING = hasDetailsStep ? 2 : 1;
  const STEP_PHOTOS = STEP_LISTING + 1;
  const STEP_CONTACT = STEP_PHOTOS + 1;
  const listingCopy = LISTING_COPY[categorySlug] ?? LISTING_COPY.classifieds;

  useEffect(() => {
    storage.getUser().then(u => {
      setUser(u);
      if (u?.phone) {
        const digits = u.phone.replace('+91', '');
        setPhone(digits);
      }
    }).catch(() => setUser(null));
    storage.getCity().then(c => {
      if (c) { setCitySlug(c.slug); setCityName(c.name); }
    });
    categoriesApi.list().then(setCategories).catch(() => {
      Alert.alert('Could not load categories', 'Check your internet connection and try again.');
    });
    citiesApi.list().then(setCities).catch(() => {});
    if (route?.params?.presetCategory) setCategorySlug(route.params.presetCategory);
  }, []);

  const toggleIncludeLocation = async () => {
    if (includeLocation) {
      setIncludeLocation(false);
      setLocation(null);
      return;
    }
    setLocationLoading(true);
    const loc = await getApproxLocationWithArea();
    setLocationLoading(false);
    if (!loc) {
      Alert.alert(
        'Location unavailable',
        'Turn on location permission for LocalsIndia in your phone settings to include your location.',
      );
      return;
    }
    setLocation({ latitude: loc.latitude, longitude: loc.longitude });
    setIncludeLocation(true);
    // Only pre-fill Area if the user hasn't already typed something —
    // never overwrite what they entered themselves.
    if (loc.areaGuess && !area.trim()) {
      setArea(loc.areaGuess);
    }
    // Auto-pick the posting city from the geocoded city/district name — only
    // if it exact-matches one of our actual seeded cities. No match (e.g. a
    // village we don't have) just leaves the city exactly as it was, so this
    // can never force the wrong city onto a listing; the "Posting in" chip
    // above is always there to change it manually either way.
    if (loc.cityGuess) {
      const match = cities.find(c => c.name.toLowerCase() === loc.cityGuess!.toLowerCase());
      if (match) {
        setCitySlug(match.slug);
        setCityName(match.name);
      }
    }
  };

  const pickImage = async () => {
    if (images.length >= 5) { Alert.alert('Max 5 photos allowed'); return; }
    const remaining = 5 - images.length;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      selectionLimit: remaining,
      quality: 0.7,
    });
    if (!result.canceled && result.assets.length > 0) {
      setImages(prev => [...prev, ...result.assets.map(a => a.uri)].slice(0, 5));
    }
  };

  const onEventDateChange = (event: any, selected?: Date) => {
    setShowDatePicker(false);
    if (event.type === 'dismissed' || !selected) return;
    setEventDate(prev => {
      const merged = new Date(selected);
      if (prev) merged.setHours(prev.getHours(), prev.getMinutes());
      return merged;
    });
    setShowTimePicker(true);
  };

  const onEventTimeChange = (event: any, selected?: Date) => {
    setShowTimePicker(false);
    if (event.type === 'dismissed' || !selected) return;
    setEventDate(prev => {
      const base = prev ?? new Date();
      const merged = new Date(base);
      merged.setHours(selected.getHours(), selected.getMinutes());
      return merged;
    });
  };

  const validateCategoryStep = () => {
    const e: Record<string, string> = {};
    if (!categorySlug) e.category = 'Please pick a category';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const validateListingStep = () => {
    const e: Record<string, string> = {};
    if (!title.trim() || title.trim().length < 5) e.title = 'Minimum 5 characters';
    if (!description.trim() || description.trim().length < 20) e.description = 'At least 20 characters';
    if (categorySlug === 'events') {
      if (!venue.trim() || venue.trim().length < 3) e.venue = 'Minimum 3 characters';
      if (!eventDate) e.eventDate = 'Please pick a date & time';
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const validateContactStep = () => {
    if (categorySlug === 'events') return true; // events have no contact-info step
    const e: Record<string, string> = {};
    if (!/^[6-9]\d{9}$/.test(phone)) e.phone = 'Enter a valid 10-digit Indian mobile number';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleNext = () => {
    if (step === STEP_CATEGORY && !validateCategoryStep()) return;
    if (step === STEP_LISTING && !validateListingStep()) return;
    if (step === STEP_CONTACT) { submit(); return; }
    setErrors({});
    setStep(s => s + 1);
  };

  const setDetailField = (key: string, value: any) => {
    setCategoryDetails(prev => ({ ...prev, [key]: value }));
  };

  const buildCategoryDetailsPayload = () => {
    const fields = CATEGORY_DETAIL_FIELDS[categorySlug];
    if (!fields) return null;
    const out: Record<string, any> = {};
    for (const f of fields) {
      const v = categoryDetails[f.key];
      if (v === undefined || v === null || v === '' || (Array.isArray(v) && v.length === 0)) continue;
      out[f.key] = f.type === 'number' ? Number(v) : v;
    }
    return Object.keys(out).length > 0 ? out : null;
  };

  const renderDetailField = (field: DetailField) => {
    const value = categoryDetails[field.key];

    if (field.type === 'select' || field.type === 'multiselect') {
      const selected: string[] = field.type === 'multiselect'
        ? (Array.isArray(value) ? value : [])
        : (value ? [value] : []);
      return (
        <>
          <Text style={styles.label}>{field.label}</Text>
          <View style={styles.chipRow}>
            {field.options.map(opt => {
              const active = selected.includes(opt);
              return (
                <TouchableOpacity
                  key={opt}
                  style={[styles.chip, active && styles.chipActive]}
                  onPress={() => {
                    if (field.type === 'multiselect') {
                      const next = active ? selected.filter(o => o !== opt) : [...selected, opt];
                      setDetailField(field.key, next);
                    } else {
                      setDetailField(field.key, opt);
                    }
                  }}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                >
                  <Text style={[styles.chipText, active && styles.chipTextActive]}>{opt}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </>
      );
    }

    if (field.type === 'switch') {
      return (
        <View style={styles.detailSwitchRow}>
          <Text style={[styles.label, { marginBottom: 0 }]}>{field.label}</Text>
          <Switch
            value={!!value}
            onValueChange={v => setDetailField(field.key, v)}
            trackColor={{ false: '#d1d5db', true: '#25D366' }}
            thumbColor="white"
          />
        </View>
      );
    }

    return (
      <>
        <Text style={styles.label}>{field.label}</Text>
        <TextInput
          style={styles.input}
          value={value != null ? String(value) : ''}
          onChangeText={t => setDetailField(field.key, field.type === 'number' ? t.replace(/[^0-9.]/g, '') : t)}
          placeholder={field.placeholder}
          keyboardType={field.type === 'number' ? 'numeric' : 'default'}
        />
      </>
    );
  };

  const uploadPhoto = async (listingId: string, uri: string, index: number) => {
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
      throw new Error(`Photo ${index + 1} upload failed: ${detail}`);
    }
  };

  const submit = async () => {
    if (!validateContactStep()) return;
    setLoading(true);
    try {
      // "Businesses" category creates a real, badge-eligible Business Directory
      // entry instead of a plain classified — same wizard, different backend
      // table. Businesses have no photo storage and no approval queue (they're
      // live immediately), so we land straight on the business's own page
      // instead of the classifieds "under review" success screen.
      if (categorySlug === 'businesses') {
        const city = await citiesApi.get(citySlug);
        const business = await businessesApi.create({
          name: title.trim(),
          city_id: city.id,
          description: description.trim() || null,
          address: area.trim() || null,
          phone: `+91${phone}`,
          whatsapp_url: whatsappOn ? `https://wa.me/91${phone}` : null,
          website_url: websiteUrl.trim() || null,
        });
        // promptVerify tells BusinessDetailScreen to surface the Get Verified
        // offer immediately, instead of only being discoverable later.
        // Must be `navigate`, not `replace`: PostScreen lives inside the tab
        // navigator, so a `replace` bubbles up and swaps out the ENTIRE "Main"
        // stack entry (tabs + their history) for BusinessDetail alone, leaving
        // nothing for the back button to return to. `navigate` pushes
        // BusinessDetail on top instead, so back correctly pops back to Main.
        resetForm();
        navigation.navigate('BusinessDetail', { businessId: business.id, promptVerify: true });
        return;
      }

      // "Events" category creates a real Event Calendar entry instead of a
      // classified. Unlike Businesses, events go into the same admin
      // moderation queue as listings (status='pending'), so this lands on
      // the generic "submitted, under review" success screen rather than
      // navigating straight to the event's own page.
      if (categorySlug === 'events') {
        const city = await citiesApi.get(citySlug);
        await eventsApi.create({
          title: title.trim(),
          description: description.trim(),
          venue: venue.trim(),
          event_date: eventDate!.toISOString(),
          city_id: city.id,
          is_free: isEventFree,
          ticket_url: isEventFree ? null : (ticketPrice.trim() ? null : (ticketUrl.trim() || null)),
          ticket_price: isEventFree ? null : (ticketPrice.trim() ? Number(ticketPrice) : null),
        });
        setSuccess(true);
        return;
      }

      const listing = await listingsApi.create({
        title: title.trim(),
        description: description.trim(),
        price: listingCopy.showPrice && price ? parseInt(price, 10) : null,
        area: area.trim() || null,
        category_slug: categorySlug,
        contact_phone: `+91${phone}`,
        city_slug: citySlug,
        whatsapp_url: whatsappOn ? `https://wa.me/91${phone}` : null,
        website_url: websiteUrl.trim() || null,
        social_url: socialUrl.trim() || null,
        latitude: location?.latitude ?? null,
        longitude: location?.longitude ?? null,
        category_details: buildCategoryDetailsPayload(),
      });

      if (images.length > 0) {
        for (let i = 0; i < images.length; i++) {
          setUploadProgress(`Uploading photo ${i + 1}/${images.length}...`);
          await uploadPhoto(listing.id, images[i], i);
        }
        setUploadProgress('');
      }

      setSuccess(true);
    } catch (err: any) {
      const status = err?.response?.status;
      if (status === 401) {
        await storage.clear();
        Alert.alert('Session expired', 'Please sign in again.', [
          { text: 'Sign In', onPress: () => navigation.replace('Login') },
        ]);
        return;
      }
      const detail = err?.response?.data?.detail || err?.message || 'Please try again.';
      Alert.alert('Error', `Failed to post listing: ${detail}`);
    } finally {
      setLoading(false);
      setUploadProgress('');
    }
  };

  // ── LOADING STATE ──
  if (user === undefined) return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: 'white' }}>
      <ActivityIndicator size="large" color="#f97316" />
    </View>
  );

  // ── AUTH GATE ──
  if (!user) {
    return (
      <View style={styles.gateContainer}>
        <Ionicons name="lock-closed-outline" size={56} color="#e5e7eb" />
        <Text style={styles.gateTitle}>Sign in to post</Text>
        <Text style={styles.gateText}>Create a free account to post listings and reach thousands of local buyers.</Text>
        <TouchableOpacity style={styles.gateBtn} onPress={() => navigation.navigate('Login')}>
          <Text style={styles.gateBtnText}>Sign in with Phone OTP</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const handleCitySelect = (c: any) => {
    // Local to this post only — does not change the city the user is browsing
    // elsewhere in the app (Home/Search keep their own selection in storage).
    setCitySlug(c.slug);
    setCityName(c.name);
  };

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setPrice('');
    setArea('');
    setCategorySlug('');
    setCategoryDetails({});
    setImages([]);
    setWebsiteUrl('');
    setSocialUrl('');
    setVenue('');
    setEventDate(null);
    setIsEventFree(true);
    setTicketPrice('');
    setTicketUrl('');
    setErrors({});
    setStep(0);
    setSuccess(false);
  };

  // ── SUCCESS SCREEN ──
  if (success) {
    return (
      <View style={styles.successContainer}>
        <View style={styles.successIconWrap}>
          <Ionicons name="checkmark" size={48} color="#f97316" />
        </View>
        <Text style={styles.successTitle}>{categorySlug === 'events' ? 'Event submitted!' : 'Listing submitted!'}</Text>
        <Text style={styles.successText}>
          {categorySlug === 'events'
            ? "Your event is under review. It'll go live shortly — usually within a few hours."
            : "Your listing is under review. We'll activate it shortly — usually within an hour."}
        </Text>
        <TouchableOpacity style={styles.doneBtn} onPress={resetForm}>
          <Text style={styles.doneBtnText}>{categorySlug === 'events' ? '+ Post Another Event' : '+ Post Another Listing'}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.homeLink}
          onPress={() => {
            // `navigate`, not `replace` — see the same note on the Business
            // creation branch above: `replace` from inside the tab navigator
            // bubbles up and wipes the whole "Main" (tabs) stack entry,
            // breaking the back button on the destination screen.
            resetForm();
            if (categorySlug === 'events') {
              navigation.navigate('Events', { citySlug, cityName });
            } else {
              navigation.navigate('Home');
            }
          }}
        >
          <Text style={styles.homeLinkText}>{categorySlug === 'events' ? 'Back to Events' : 'Back to Home'}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* Header */}
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 12) + 8 }]}>
        <TouchableOpacity
          onPress={() => step === 0 ? navigation.goBack() : setStep(s => s - 1)}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityRole="button"
          accessibilityLabel={step === 0 ? 'Cancel and go back' : 'Previous step'}
        >
          <Ionicons name="arrow-back" size={20} color="#374151" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Post Listing</Text>
        <View style={{ width: 20 }} />
      </View>

      {/* Posting-city selector — lets the user post into a different city than
          the one they're currently browsing (e.g. a hometown listing) */}
      <TouchableOpacity
        style={styles.cityRow}
        onPress={() => navigation.navigate('CityPicker', { onSelect: handleCitySelect })}
        accessibilityRole="button"
        accessibilityLabel={`Change the city you're posting in, currently ${cityName}`}
      >
        <Ionicons name="location-outline" size={14} color="#f97316" />
        <Text style={styles.cityRowText}>Posting in <Text style={styles.cityRowTextBold}>{cityName}</Text></Text>
        <Ionicons name="chevron-down" size={13} color="#9ca3af" />
      </TouchableOpacity>

      {/* Optional location — helps buyers using "Near Me" find this listing.
          Visible and opt-in, unlike a silent permission prompt at submit time. */}
      <TouchableOpacity
        style={styles.locationRow}
        onPress={toggleIncludeLocation}
        disabled={locationLoading}
        accessibilityRole="button"
        accessibilityLabel={includeLocation ? 'Location included — tap to remove it' : 'Include my location so nearby buyers can find this listing'}
        accessibilityState={{ checked: includeLocation }}
      >
        {locationLoading ? (
          <ActivityIndicator size="small" color="#f97316" />
        ) : (
          <Ionicons
            name={includeLocation ? 'checkmark-circle' : 'navigate-outline'}
            size={16}
            color={includeLocation ? '#16a34a' : '#6b7280'}
          />
        )}
        <Text style={[styles.locationRowText, includeLocation && styles.locationRowTextActive]}>
          {includeLocation ? 'Location included — buyers nearby can find this' : 'Include my location (helps buyers find you nearby)'}
        </Text>
      </TouchableOpacity>

      {/* Step bubbles */}
      <View style={styles.stepsRow}>
        {STEPS.map((label, i) => (
          <View key={label} style={styles.stepItem}>
            <View style={[styles.stepBubble, i <= step ? styles.stepBubbleActive : styles.stepBubbleInactive]}>
              {i < step
                ? <Ionicons name="checkmark" size={14} color="white" />
                : <Text style={[styles.stepNum, i === step ? styles.stepNumActive : styles.stepNumInactive]}>{i + 1}</Text>
              }
            </View>
            <Text style={[styles.stepLabel, i === step ? styles.stepLabelActive : styles.stepLabelInactive]}>{label}</Text>
            {i < STEPS.length - 1 && (
              <View style={[styles.stepConnector, i < step ? styles.stepConnectorDone : styles.stepConnectorPending]} />
            )}
          </View>
        ))}
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.body}
        keyboardShouldPersistTaps="handled"
      >

        {/* ── STEP: CATEGORY ── */}
        {step === STEP_CATEGORY && (
          <>
            <View style={[styles.card, errors.category && styles.cardError]}>
              <Text style={styles.cardTitle}>
                What are you posting? <Text style={styles.required}>*</Text>
              </Text>
              <Text style={styles.cardSubtitle}>Pick a category — we'll ask the right questions for it next.</Text>
              <View style={styles.catGrid}>
                {categories.map(c => {
                  const active = categorySlug === c.slug;
                  const bg = CATEGORY_COLORS[c.slug] ?? '#94a3b8';
                  return (
                    <TouchableOpacity
                      key={c.slug}
                      style={[
                        styles.catCard,
                        { backgroundColor: bg, opacity: active ? 1 : 0.85 },
                        active && styles.catCardActive,
                      ]}
                      onPress={() => {
                        setCategorySlug(c.slug);
                        setCategoryDetails({});
                        setErrors(e => ({ ...e, category: '' }));
                      }}
                      accessibilityRole="button"
                      accessibilityLabel={`Category: ${c.name}`}
                      accessibilityState={{ selected: active }}
                    >
                      {active && (
                        <View style={styles.catCheck}>
                          <Ionicons name="checkmark" size={12} color={bg} />
                        </View>
                      )}
                      <Ionicons
                        name={CATEGORY_ICONS[c.slug] ?? 'pricetag-outline'}
                        size={22}
                        color="white"
                      />
                      <Text style={styles.catLabel}>{c.name}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
              {errors.category ? <Text style={[styles.errorText, { marginTop: 8 }]}>{errors.category}</Text> : null}
            </View>
          </>
        )}

        {/* ── STEP: CATEGORY-SPECIFIC DETAILS (only for categories with their own questions) ── */}
        {hasDetailsStep && step === STEP_DETAILS && detailFields && (
          <>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>
                {categories.find(c => c.slug === categorySlug)?.name ?? 'Category'} details
              </Text>
              <Text style={styles.cardSubtitle}>A few quick questions specific to this category.</Text>
              {detailFields.map(field => (
                <View key={field.key} style={{ marginTop: 14 }}>
                  {renderDetailField(field)}
                </View>
              ))}
            </View>
          </>
        )}

        {/* ── STEP: LISTING INFO (generic title/description + price/area or event fields) ── */}
        {step === STEP_LISTING && (
          <>
            {/* Title + Description */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>{listingCopy.cardTitle}</Text>

              <Text style={styles.label}>{listingCopy.titleLabel} <Text style={styles.required}>*</Text></Text>
              <TextInput
                style={[styles.input, errors.title && styles.inputError]}
                value={title}
                onChangeText={t => { setTitle(t); if (errors.title) setErrors(e => ({ ...e, title: '' })); }}
                placeholder={listingCopy.titlePlaceholder}
                maxLength={100}
              />
              {errors.title ? <Text style={styles.errorText}>{errors.title}</Text> : null}

              <Text style={[styles.label, { marginTop: 16 }]}>{listingCopy.descLabel} <Text style={styles.required}>*</Text></Text>
              <TextInput
                style={[styles.input, styles.textarea, errors.description && styles.inputError]}
                value={description}
                onChangeText={t => { setDescription(t); if (errors.description) setErrors(e => ({ ...e, description: '' })); }}
                placeholder={listingCopy.descPlaceholder}
                multiline
                numberOfLines={5}
                maxLength={1000}
                textAlignVertical="top"
              />
              <View style={styles.descRow}>
                {errors.description ? <Text style={styles.errorText}>{errors.description}</Text> : <Text />}
                <Text style={styles.charCount}>{description.length}/1000</Text>
              </View>
            </View>

            {categorySlug === 'events' ? (
              <View style={[styles.card, errors.venue && styles.cardError]}>
                <Text style={styles.label}>Venue <Text style={styles.required}>*</Text></Text>
                <TextInput
                  style={[styles.input, errors.venue && styles.inputError]}
                  value={venue}
                  onChangeText={t => { setVenue(t); if (errors.venue) setErrors(e => ({ ...e, venue: '' })); }}
                  placeholder="e.g. LB Stadium, Hyderabad"
                  maxLength={200}
                />
                {errors.venue ? <Text style={styles.errorText}>{errors.venue}</Text> : null}

                <Text style={[styles.label, { marginTop: 16 }]}>Date & Time <Text style={styles.required}>*</Text></Text>
                <TouchableOpacity
                  style={[styles.input, errors.eventDate && styles.inputError]}
                  onPress={() => setShowDatePicker(true)}
                  accessibilityRole="button"
                  accessibilityLabel="Pick event date and time"
                >
                  <Text style={eventDate ? undefined : { color: '#9ca3af' }}>
                    {eventDate
                      ? eventDate.toLocaleString('en-IN', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
                      : 'Select date & time'}
                  </Text>
                </TouchableOpacity>
                {errors.eventDate ? <Text style={styles.errorText}>{errors.eventDate}</Text> : null}
                {showDatePicker && (
                  <DateTimePicker
                    value={eventDate ?? new Date()}
                    mode="date"
                    minimumDate={new Date()}
                    onChange={onEventDateChange}
                  />
                )}
                {showTimePicker && (
                  <DateTimePicker
                    value={eventDate ?? new Date()}
                    mode="time"
                    onChange={onEventTimeChange}
                  />
                )}

                <Text style={[styles.label, { marginTop: 16 }]}>Admission</Text>
                <View style={styles.admissionRow}>
                  <TouchableOpacity
                    onPress={() => setIsEventFree(true)}
                    style={[styles.admissionBtn, isEventFree && styles.admissionBtnFreeActive]}
                  >
                    <Text style={[styles.admissionBtnText, isEventFree && { color: '#15803d' }]}>Free Entry</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => setIsEventFree(false)}
                    style={[styles.admissionBtn, !isEventFree && styles.admissionBtnPaidActive]}
                  >
                    <Text style={[styles.admissionBtnText, !isEventFree && { color: '#b45309' }]}>Paid / Ticketed</Text>
                  </TouchableOpacity>
                </View>

                {!isEventFree && (
                  <>
                    <Text style={[styles.label, { marginTop: 16 }]}>Sell tickets in-app (₹) <Text style={styles.optional}>(optional)</Text></Text>
                    <TextInput
                      style={styles.input}
                      value={ticketPrice}
                      onChangeText={setTicketPrice}
                      placeholder="e.g. 299"
                      keyboardType="numeric"
                    />
                    <Text style={styles.hint}>Buyers pay in-app and get a QR ticket. Leave blank to link externally instead.</Text>

                    <Text style={[styles.label, { marginTop: 16 }]}>Or: External Ticket URL</Text>
                    <TextInput
                      style={styles.input}
                      value={ticketUrl}
                      onChangeText={setTicketUrl}
                      placeholder="https://bookmyshow.com/..."
                      keyboardType="url"
                      autoCapitalize="none"
                      editable={!ticketPrice.trim()}
                    />
                  </>
                )}
              </View>
            ) : (
              /* Price + Area (hidden/relabeled per category — see LISTING_COPY) */
              <View style={styles.card}>
                {listingCopy.showPrice && (
                  <>
                    <Text style={styles.label}>{listingCopy.priceLabel} <Text style={styles.optional}>(optional)</Text></Text>
                    <View style={styles.priceRow}>
                      <Text style={styles.pricePrefix}>₹</Text>
                      <TextInput
                        style={[styles.input, { flex: 1 }]}
                        value={price}
                        onChangeText={setPrice}
                        placeholder={`0 — ${listingCopy.priceHint}`}
                        keyboardType="numeric"
                      />
                    </View>
                  </>
                )}

                <Text style={[styles.label, listingCopy.showPrice && { marginTop: 16 }]}>
                  {categorySlug === 'businesses' ? 'Address' : 'Area / Locality'} <Text style={styles.optional}>(optional)</Text>
                </Text>
                <TextInput
                  style={styles.input}
                  value={area}
                  onChangeText={setArea}
                  placeholder={categorySlug === 'businesses' ? 'Street, Area, City' : 'e.g. Koramangala, Banjara Hills'}
                  maxLength={100}
                />
                <Text style={styles.hint}>
                  {categorySlug === 'businesses' ? 'Shown on your business page' : 'Helps buyers find listings near them'}
                </Text>
              </View>
            )}

            {/* Tip card */}
            <View style={styles.tipCard}>
              <View style={styles.tipHeader}>
                <Ionicons name="bulb-outline" size={16} color="#166534" />
                <Text style={styles.tipTitle}>Tips for more inquiries</Text>
              </View>
              {['Use a specific title (model, brand, year)', 'Write 3-4 sentences of description', 'Set a fair price to get quick responses'].map(t => (
                <Text key={t} style={styles.tipItem}>• {t}</Text>
              ))}
            </View>
          </>
        )}

        {/* ── STEP: PHOTOS (Businesses and Events don't support photos yet) ── */}
        {step === STEP_PHOTOS && (
          categorySlug === 'businesses' || categorySlug === 'events' ? (
            <View style={styles.card}>
              <Ionicons name="images-outline" size={28} color="#9ca3af" />
              <Text style={[styles.cardTitle, { marginTop: 10 }]}>
                {categorySlug === 'businesses' ? "Photos aren't available for Businesses yet" : "Photos aren't available for Events yet"}
              </Text>
              <Text style={styles.cardSubtitle}>
                {categorySlug === 'businesses'
                  ? 'You can still add your business now — photo support for the Business Directory is coming soon.'
                  : 'You can still post your event now — photo support for Events is coming soon.'}
              </Text>
            </View>
          ) : (
          <>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Add photos</Text>
              <Text style={styles.cardSubtitle}>Listings with photos get 5× more inquiries. Add up to 5 — first photo is the cover.</Text>

              {images.length < 5 && (
                <TouchableOpacity style={styles.uploadZone} onPress={pickImage}>
                  <View style={styles.uploadIconWrap}>
                    <Ionicons name="cloud-upload-outline" size={28} color="#f97316" />
                  </View>
                  <Text style={styles.uploadTitle}>Tap to add photos</Text>
                  <Text style={styles.uploadSubtitle}>JPEG, PNG — max 5MB each</Text>
                </TouchableOpacity>
              )}

              {images.length > 0 && (
                <View style={styles.photoGrid}>
                  {images.map((uri, i) => (
                    <View key={uri} style={styles.photoWrapper}>
                      <Image source={{ uri }} style={styles.photo} />
                      {i === 0 && (
                        <View style={styles.coverBadge}>
                          <Text style={styles.coverBadgeText}>Cover</Text>
                        </View>
                      )}
                      <TouchableOpacity
                        style={styles.removePhoto}
                        onPress={() => setImages(prev => prev.filter((_, idx) => idx !== i))}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        accessibilityRole="button"
                        accessibilityLabel={`Remove photo ${i + 1}`}
                      >
                        <Ionicons name="close-circle" size={22} color="white" />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              )}

              <Text style={styles.photoCount}>{images.length}/5 photos added</Text>
            </View>

            {/* Photo tips */}
            <View style={[styles.tipCard, { borderColor: '#FDE68A', backgroundColor: '#FFFBEB' }]}>
              <View style={styles.tipHeader}>
                <Ionicons name="camera-outline" size={16} color="#92400E" />
                <Text style={[styles.tipTitle, { color: '#92400E' }]}>Photo tips</Text>
              </View>
              {[
                'Shoot in natural light near a window',
                'Show all angles of the item',
                'Include any defects or wear clearly',
                'Clean the item before photographing',
              ].map(t => (
                <Text key={t} style={[styles.tipItem, { color: '#78350F' }]}>• {t}</Text>
              ))}
            </View>
          </>
          )
        )}

        {/* ── STEP: CONTACT ── */}
        {step === STEP_CONTACT && (
          <>
            {/* Mini listing summary */}
            {(title || images.length > 0) && (
              <View style={styles.summaryCard}>
                <Text style={styles.summaryLabel}>
                  {categorySlug === 'businesses' ? 'YOUR BUSINESS SUMMARY' : categorySlug === 'events' ? 'YOUR EVENT SUMMARY' : 'YOUR LISTING SUMMARY'}
                </Text>
                {images.length > 0 && (
                  <Image source={{ uri: images[0] }} style={styles.summaryThumb} />
                )}
                {title ? <Text style={styles.summaryTitle} numberOfLines={2}>{title}</Text> : null}
                {price && listingCopy.showPrice && categorySlug !== 'events' ? (
                  <Text style={styles.summaryPrice}>₹{parseInt(price, 10).toLocaleString('en-IN')}</Text>
                ) : null}
                {categorySlug === 'events' && eventDate ? (
                  <Text style={styles.summaryPrice}>
                    {eventDate.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })} · {venue}
                  </Text>
                ) : null}
                <Text style={styles.summaryCity}>
                  <Ionicons name="location-outline" size={12} /> {area ? `${area}, ` : ''}{cityName}
                </Text>
              </View>
            )}

            {categorySlug === 'events' ? (
              <View style={styles.card}>
                <Ionicons name="checkmark-circle-outline" size={28} color="#22c55e" />
                <Text style={[styles.cardTitle, { marginTop: 10 }]}>Ready to submit</Text>
                <Text style={styles.cardSubtitle}>
                  Your event will go live after a quick review — usually within a few hours.
                </Text>
              </View>
            ) : (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Contact details</Text>

              <Text style={styles.label}>WhatsApp / Mobile Number <Text style={styles.required}>*</Text></Text>
              <View style={[styles.phoneRow, errors.phone && styles.inputError]}>
                <Text style={styles.countryCode}>🇮🇳 +91</Text>
                <TextInput
                  style={styles.phoneInput}
                  value={phone}
                  onChangeText={t => { setPhone(t.replace(/\D/g, '').slice(0, 10)); if (errors.phone) setErrors(e => ({ ...e, phone: '' })); }}
                  placeholder="98765 43210"
                  keyboardType="phone-pad"
                  maxLength={10}
                />
              </View>
              {errors.phone ? <Text style={styles.errorText}>{errors.phone}</Text> : null}

              {/* WhatsApp toggle */}
              <View style={styles.toggleRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.toggleTitle}>Enable WhatsApp contact</Text>
                  <Text style={styles.toggleSubtitle}>Buyers can message you directly on WhatsApp</Text>
                </View>
                <Switch
                  value={whatsappOn}
                  onValueChange={setWhatsappOn}
                  trackColor={{ false: '#d1d5db', true: '#25D366' }}
                  thumbColor="white"
                />
              </View>

              {/* Optional online presence */}
              <Text style={[styles.label, { marginTop: 20 }]}>
                Online presence <Text style={styles.optional}>(optional)</Text>
              </Text>
              <Text style={styles.hint}>Add your website or social page so buyers can learn more</Text>

              <View style={styles.urlRow}>
                <Ionicons name="globe-outline" size={18} color="#9ca3af" style={styles.urlIcon} />
                <TextInput
                  style={[styles.input, { flex: 1 }]}
                  value={websiteUrl}
                  onChangeText={setWebsiteUrl}
                  placeholder="https://yourwebsite.com"
                  keyboardType="url"
                  autoCapitalize="none"
                />
              </View>

              <View style={[styles.urlRow, { marginTop: 10 }]}>
                <Ionicons name="share-social-outline" size={18} color="#9ca3af" style={styles.urlIcon} />
                <TextInput
                  style={[styles.input, { flex: 1 }]}
                  value={socialUrl}
                  onChangeText={setSocialUrl}
                  placeholder="https://instagram.com/yourpage"
                  keyboardType="url"
                  autoCapitalize="none"
                />
              </View>
            </View>
            )}
          </>
        )}

        <View style={{ height: 24 }} />
      </ScrollView>

      {/* Footer nav */}
      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 16) }]}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => step === 0 ? navigation.goBack() : setStep(s => s - 1)}
          accessibilityRole="button"
          accessibilityLabel={step === 0 ? 'Cancel and go back' : 'Previous step'}
        >
          <Ionicons name="arrow-back" size={18} color="#374151" />
          <Text style={styles.backBtnText}>{step === 0 ? 'Cancel' : 'Back'}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.nextBtn, loading && styles.btnDisabled]}
          onPress={handleNext}
          disabled={loading}
          accessibilityRole="button"
          accessibilityLabel={step === STEP_CONTACT ? (categorySlug === 'businesses' ? 'Add business' : categorySlug === 'events' ? 'Post event' : 'Post listing') : 'Next step'}
          accessibilityState={{ disabled: loading }}
        >
          {loading
            ? <Text style={styles.nextBtnText}>{uploadProgress || (categorySlug === 'businesses' ? 'Adding...' : categorySlug === 'events' ? 'Submitting...' : 'Posting...')}</Text>
            : step === STEP_CONTACT
              ? <><Text style={styles.nextBtnText}>{categorySlug === 'businesses' ? '✦ Add Business' : categorySlug === 'events' ? '✦ Post Event' : '✦ Post Listing'}</Text></>
              : <Text style={styles.nextBtnText}>Next →</Text>}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  headerTitle: { fontSize: 16, fontWeight: 'bold', color: '#111827' },

  cityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    backgroundColor: '#fff7ed',
    borderBottomWidth: 1,
    borderBottomColor: '#ffedd5',
  },
  cityRowText: { fontSize: 12.5, color: '#78350f' },
  cityRowTextBold: { fontWeight: '700', color: '#ea6d0a' },

  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 9,
    backgroundColor: '#f9fafb',
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  locationRowText: { fontSize: 12, color: '#6b7280' },
  locationRowTextActive: { color: '#16a34a', fontWeight: '600' },

  // Step bubbles
  stepsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  stepItem: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  stepBubble: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 6,
  },
  stepBubbleActive: { backgroundColor: '#f97316' },
  stepBubbleInactive: { backgroundColor: '#f3f4f6' },
  stepNum: { fontSize: 13, fontWeight: '700' },
  stepNumActive: { color: 'white' },
  stepNumInactive: { color: '#9ca3af' },
  stepLabel: { fontSize: 12, fontWeight: '600', marginRight: 4 },
  stepLabelActive: { color: '#f97316' },
  stepLabelInactive: { color: '#9ca3af' },
  stepConnector: { flex: 1, height: 2, borderRadius: 1 },
  stepConnectorDone: { backgroundColor: '#f97316' },
  stepConnectorPending: { backgroundColor: '#e5e7eb' },

  // Body
  body: { padding: 16 },

  // Cards
  card: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#f3f4f6',
  },
  cardError: { borderColor: '#ef4444' },
  cardTitle: { fontSize: 16, fontWeight: 'bold', color: '#111827', marginBottom: 16 },
  cardSubtitle: { fontSize: 13, color: '#6b7280', marginBottom: 16 },

  // Form
  label: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 8 },
  required: { color: '#ef4444' },
  optional: { fontWeight: '400', color: '#9ca3af', fontSize: 12 },
  hint: { fontSize: 12, color: '#9ca3af', marginTop: 4 },
  input: {
    borderWidth: 1.5,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    backgroundColor: '#fafafa',
    color: '#111827',
  },
  inputError: { borderColor: '#ef4444' },
  textarea: { minHeight: 110, textAlignVertical: 'top' },
  errorText: { fontSize: 12, color: '#ef4444', marginTop: 4 },
  descRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
  charCount: { fontSize: 12, color: '#9ca3af' },

  // Category
  catGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  catCard: {
    width: '22%',
    aspectRatio: 0.9,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingHorizontal: 4,
  },
  catCardActive: {
    borderWidth: 2.5,
    borderColor: 'white',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 3,
  },
  catCheck: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: 'white',
    alignItems: 'center',
    justifyContent: 'center',
  },
  catEmoji: { fontSize: 22 },
  catLabel: { fontSize: 10, color: 'white', fontWeight: '700', marginTop: 3, textAlign: 'center' },

  // Category-specific detail fields (select / multiselect chips, switch row)
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#e5e7eb',
    backgroundColor: '#fafafa',
  },
  chipActive: { borderColor: '#f97316', backgroundColor: '#fff7ed' },
  chipText: { fontSize: 13, fontWeight: '600', color: '#6b7280' },
  chipTextActive: { color: '#f97316' },
  detailSwitchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },

  // Price
  priceRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  pricePrefix: { fontSize: 18, fontWeight: '700', color: '#374151' },
  admissionRow: { flexDirection: 'row', gap: 10 },
  admissionBtn: {
    flex: 1, paddingVertical: 12, borderRadius: 12, borderWidth: 2,
    borderColor: '#e5e7eb', alignItems: 'center',
  },
  admissionBtnFreeActive: { borderColor: '#22c55e', backgroundColor: '#f0fdf4' },
  admissionBtnPaidActive: { borderColor: '#f59e0b', backgroundColor: '#fffbeb' },
  admissionBtnText: { fontSize: 13, fontWeight: '700', color: '#6b7280' },

  // Photos
  uploadZone: {
    borderWidth: 2,
    borderColor: '#e5e7eb',
    borderStyle: 'dashed',
    borderRadius: 16,
    padding: 28,
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
    backgroundColor: '#fafafa',
  },
  uploadIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: '#fff7ed',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  uploadTitle: { fontSize: 14, fontWeight: '700', color: '#111827' },
  uploadSubtitle: { fontSize: 12, color: '#9ca3af' },
  photoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 12 },
  photoWrapper: { position: 'relative' },
  photo: { width: 96, height: 96, borderRadius: 12 },
  coverBadge: {
    position: 'absolute',
    bottom: 6,
    left: 6,
    backgroundColor: '#f97316',
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  coverBadgeText: { color: 'white', fontSize: 10, fontWeight: '700' },
  removePhoto: {
    position: 'absolute',
    top: -6,
    right: -6,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 12,
  },
  photoCount: { fontSize: 12, color: '#9ca3af', textAlign: 'right' },

  // Contact
  summaryCard: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#f3f4f6',
  },
  summaryLabel: { fontSize: 10, fontWeight: '700', color: '#9ca3af', letterSpacing: 1, marginBottom: 12 },
  summaryThumb: { width: '100%', height: 140, borderRadius: 14, marginBottom: 10 },
  summaryTitle: { fontSize: 15, fontWeight: 'bold', color: '#111827', marginBottom: 4 },
  summaryPrice: { fontSize: 20, fontWeight: '900', color: '#f97316', marginBottom: 4 },
  summaryCity: { fontSize: 12, color: '#9ca3af' },

  phoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    paddingHorizontal: 12,
    backgroundColor: '#fafafa',
    marginBottom: 4,
  },
  countryCode: { fontSize: 16, marginRight: 8, color: '#374151' },
  phoneInput: { flex: 1, fontSize: 17, paddingVertical: 12, letterSpacing: 0.5, color: '#111827' },

  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 14,
    padding: 14,
    marginTop: 16,
    gap: 12,
  },
  toggleTitle: { fontSize: 14, fontWeight: '600', color: '#111827' },
  toggleSubtitle: { fontSize: 12, color: '#9ca3af', marginTop: 2 },

  urlRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 12 },
  urlIcon: { flexShrink: 0 },

  // Tip cards
  tipCard: {
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#86EFAC',
    backgroundColor: '#F0FDF4',
    marginBottom: 16,
  },
  tipHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  tipTitle: { fontSize: 13, fontWeight: '700', color: '#166534' },
  tipItem: { fontSize: 12, color: '#166534', lineHeight: 20, paddingLeft: 4 },

  // Footer
  footer: {
    flexDirection: 'row',
    gap: 12,
    padding: 16,
    paddingBottom: Platform.OS === 'ios' ? 28 : 16,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#e5e7eb',
  },
  backBtnText: { fontSize: 14, fontWeight: '600', color: '#374151' },
  nextBtn: { flex: 1, backgroundColor: '#f97316', borderRadius: 14, padding: 16, alignItems: 'center' },
  btnDisabled: { backgroundColor: '#fdba74' },
  nextBtnText: { color: 'white', fontSize: 16, fontWeight: '700' },

  // Auth gate
  gateContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: 'white', padding: 32 },
  gateTitle: { fontSize: 22, fontWeight: 'bold', color: '#111827', marginTop: 16, marginBottom: 8 },
  gateText: { fontSize: 14, color: '#9ca3af', textAlign: 'center', lineHeight: 20, marginBottom: 28 },
  gateBtn: { backgroundColor: '#f97316', borderRadius: 12, paddingHorizontal: 28, paddingVertical: 14 },
  gateBtnText: { color: 'white', fontWeight: '700', fontSize: 16 },

  // Success
  successContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: 'white', padding: 32 },
  successIconWrap: {
    width: 96,
    height: 96,
    borderRadius: 28,
    backgroundColor: '#fff7ed',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  successTitle: { fontSize: 26, fontWeight: 'bold', color: '#111827', marginBottom: 10 },
  successText: { fontSize: 14, color: '#9ca3af', textAlign: 'center', lineHeight: 22, marginBottom: 32 },
  doneBtn: { backgroundColor: '#f97316', borderRadius: 14, paddingHorizontal: 36, paddingVertical: 16, marginBottom: 14 },
  doneBtnText: { color: 'white', fontWeight: '700', fontSize: 16 },
  homeLink: { paddingVertical: 8 },
  homeLinkText: { color: '#9ca3af', fontSize: 14, fontWeight: '500' },
});
