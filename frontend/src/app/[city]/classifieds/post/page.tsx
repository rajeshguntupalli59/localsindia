'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, X, CheckCircle, ArrowLeft, ArrowRight, Sparkles, Lightbulb, Camera, MapPin, Tag, UtensilsCrossed, Building2, Briefcase, Car, Smartphone, CalendarDays, Store, GraduationCap } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import Link from 'next/link';
import { api, ApiError } from '@/lib/api';
import type { Category, City } from '@/lib/types';
import SiteHeader from '@/components/site-header/SiteHeader';
import { toast } from 'sonner';

const STEPS = [
  { label: 'Details', desc: 'Title, category, description' },
  { label: 'Photos', desc: 'Up to 5 photos' },
  { label: 'Contact', desc: 'Phone & WhatsApp' },
];

const CATEGORY_ICONS: Record<string, LucideIcon> = {
  tiffin: UtensilsCrossed, 'pg-roommate': Building2, jobs: Briefcase, vehicles: Car,
  electronics: Smartphone, events: CalendarDays, businesses: Store, education: GraduationCap,
};

interface FormData {
  title: string;
  description: string;
  category_id: string;
  price: string;
  contact_phone: string;
  whatsapp_toggle: boolean;
}

const EMPTY: FormData = {
  title: '', description: '', category_id: '', price: '',
  contact_phone: '', whatsapp_toggle: true,
};

const PHONE_RE = /^\+91[6-9]\d{9}$/;

export default function PostListingPage() {
  const { city: citySlug } = useParams<{ city: string }>();
  const router = useRouter();

  const [step, setStep] = useState(0);
  const [form, setForm] = useState<FormData>(EMPTY);
  const [errors, setErrors] = useState<Partial<FormData>>({});
  const [categories, setCategories] = useState<Category[]>([]);
  const [city, setCity] = useState<City | null>(null);
  const [photos, setPhotos] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!localStorage.getItem('access_token')) {
      router.replace(`/auth/login?next=/${citySlug}/classifieds/post`);
      return;
    }
    const stored = localStorage.getItem('li_post_form');
    if (stored) { try { setForm(JSON.parse(stored)); } catch { /* */ } }
    api.categories.list().then(setCategories).catch(() => {});
    api.cities.get(citySlug).then(setCity).catch(() => {});
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

  const validateStep1 = () => {
    const e: Partial<FormData> = {};
    if (!form.title.trim() || form.title.trim().length < 5) e.title = 'Min 5 characters required';
    if (!form.category_id) e.category_id = 'Please pick a category';
    if (!form.description.trim() || form.description.length < 20) e.description = 'At least 20 characters';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const validateStep3 = () => {
    const e: Partial<FormData> = {};
    const phone = form.contact_phone.trim().startsWith('+91')
      ? form.contact_phone.trim()
      : `+91${form.contact_phone.trim()}`;
    if (!PHONE_RE.test(phone)) e.contact_phone = 'Enter a valid Indian mobile number (+91XXXXXXXXXX)';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleNext = () => {
    if (step === 0 && !validateStep1()) return;
    if (step === 2) { handleSubmit(); return; }
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
    if (!validateStep3()) return;
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
        price: form.price ? parseFloat(form.price) : undefined,
        whatsapp_url: form.whatsapp_toggle ? `https://wa.me/91${phone.replace('+91', '')}` : undefined,
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
        <div className="page-wrap py-6">
          <div className="flex items-center gap-0">
            {STEPS.map((s, i) => (
              <div key={i} className="flex items-center flex-1">
                {/* Step bubble */}
                <div className="flex items-center gap-3 shrink-0">
                  <div
                    className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-black transition-all"
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
                      className="text-sm font-bold"
                      style={{ color: i === step ? 'var(--li-primary)' : i < step ? 'var(--li-text)' : 'var(--li-muted)' }}
                    >
                      {s.label}
                    </p>
                    <p className="text-xs" style={{ color: 'var(--li-muted)' }}>{s.desc}</p>
                  </div>
                </div>
                {/* Connector */}
                {i < STEPS.length - 1 && (
                  <div
                    className="flex-1 h-0.5 mx-4 rounded-full"
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

          {/* ── STEP 1: DETAILS ── */}
          {step === 0 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="grid grid-cols-[1fr_360px] gap-8 items-start"
            >
              {/* Left: Title + Category + Description */}
              <div className="space-y-6">
                <div className="bg-white rounded-3xl p-6 border" style={{ borderColor: 'var(--li-border)' }}>
                  <h2 className="text-lg font-black mb-5" style={{ color: 'var(--li-text)' }}>What are you selling?</h2>

                  <div className="space-y-5">
                    <div>
                      <label className="text-sm font-bold mb-2 block" style={{ color: 'var(--li-text)' }}>
                        Title <span style={{ color: '#EF4444' }}>*</span>
                      </label>
                      <input
                        value={form.title}
                        onChange={e => save({ title: e.target.value })}
                        placeholder="e.g. 'Honda Activa 6G 2022 — Low Mileage'"
                        className="w-full rounded-xl px-4 py-3 text-sm outline-none focus:border-orange-400 transition-colors"
                        style={{ border: `2px solid ${errors.title ? '#EF4444' : 'var(--li-border)'}`, color: 'var(--li-text)' }}
                      />
                      {errors.title && <p className="text-xs mt-1.5" style={{ color: '#EF4444' }}>{errors.title}</p>}
                    </div>

                    <div>
                      <label className="text-sm font-bold mb-2 block" style={{ color: 'var(--li-text)' }}>
                        Description <span style={{ color: '#EF4444' }}>*</span>
                      </label>
                      <textarea
                        value={form.description}
                        onChange={e => save({ description: e.target.value })}
                        placeholder="Describe your item in detail — condition, age, any defects, reason for selling..."
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

                {/* Category */}
                <div className="bg-white rounded-3xl p-6 border" style={{ borderColor: `${errors.category_id ? '#EF4444' : 'var(--li-border)'}` }}>
                  <h2 className="text-lg font-black mb-5" style={{ color: 'var(--li-text)' }}>
                    Pick a category <span style={{ color: '#EF4444' }}>*</span>
                  </h2>
                  <div className="grid grid-cols-4 gap-3">
                    {categories.map(cat => {
                      const Icon = CATEGORY_ICONS[cat.slug] ?? Tag;
                      const isActive = form.category_id === cat.id;
                      return (
                        <motion.button
                          key={cat.id}
                          whileHover={{ y: -2 }}
                          whileTap={{ scale: 0.97 }}
                          onClick={() => save({ category_id: cat.id })}
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
              </div>

              {/* Right: Price + preview tip */}
              <div className="space-y-5 sticky top-24">
                <div className="bg-white rounded-3xl p-6 border" style={{ borderColor: 'var(--li-border)' }}>
                  <h2 className="text-base font-bold mb-4" style={{ color: 'var(--li-text)' }}>Set a price</h2>
                  <label className="text-sm font-medium mb-2 block" style={{ color: 'var(--li-muted)' }}>
                    Price (optional)
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
                    Leave blank to show &quot;Price on request&quot;
                  </p>
                </div>

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

          {/* ── STEP 2: PHOTOS ── */}
          {step === 1 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="grid grid-cols-[1fr_360px] gap-8 items-start"
            >
              <div className="bg-white rounded-3xl p-6 border" style={{ borderColor: 'var(--li-border)' }}>
                <h2 className="text-lg font-black mb-2" style={{ color: 'var(--li-text)' }}>Add photos</h2>
                <p className="text-sm mb-6" style={{ color: 'var(--li-muted)' }}>
                  Listings with photos get 5× more inquiries. Add up to 5 — first photo is the cover.
                </p>

                {photos.length < 5 && (
                  <button
                    onClick={() => fileRef.current?.click()}
                    className="w-full border-2 border-dashed rounded-3xl p-12 flex flex-col items-center gap-3 transition-colors hover:border-orange-400 hover:bg-orange-50 mb-5"
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
                          onClick={() => removePhoto(i)}
                          className="absolute top-2 right-2 w-6 h-6 rounded-full bg-black/60 flex items-center justify-center"
                        >
                          <X className="w-3.5 h-3.5 text-white" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="sticky top-24">
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
          {step === 2 && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="grid grid-cols-[1fr_360px] gap-8 items-start"
            >
              <div className="bg-white rounded-3xl p-6 border space-y-6" style={{ borderColor: 'var(--li-border)' }}>
                <h2 className="text-lg font-black" style={{ color: 'var(--li-text)' }}>Contact details</h2>

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
                    onClick={() => save({ whatsapp_toggle: !form.whatsapp_toggle })}
                    className="w-12 h-7 rounded-full relative shrink-0 transition-colors"
                    style={{ background: form.whatsapp_toggle ? 'var(--li-wa-green)' : '#D1D5DB' }}
                  >
                    <span
                      className="absolute top-0.5 w-6 h-6 bg-white rounded-full shadow-md transition-transform"
                      style={{ transform: form.whatsapp_toggle ? 'translateX(20px)' : 'translateX(2px)' }}
                    />
                  </button>
                </div>
              </div>

              <div className="space-y-5 sticky top-24">
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
                  {form.price && (
                    <p className="font-black text-lg" style={{ color: 'var(--li-primary)' }}>
                      ₹{parseFloat(form.price).toLocaleString('en-IN')}
                    </p>
                  )}
                  {city && (
                    <p className="flex items-center gap-1 text-xs mt-2" style={{ color: 'var(--li-muted)' }}>
                      <MapPin className="w-3 h-3 shrink-0" strokeWidth={2} />
                      {city.name}, {city.state}
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
            onClick={() => step === 0 ? router.back() : setStep(s => s - 1)}
            className="flex items-center gap-2 px-6 py-3 rounded-2xl border font-semibold text-sm transition-colors hover:border-orange-400"
            style={{ borderColor: 'var(--li-border)', color: 'var(--li-text)' }}
          >
            <ArrowLeft className="w-4 h-4" />
            {step === 0 ? 'Cancel' : 'Back'}
          </button>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleNext}
            disabled={submitting}
            className="flex items-center gap-2 px-8 py-3 rounded-2xl font-bold text-sm text-white disabled:opacity-60 transition-opacity"
            style={{ background: 'var(--li-primary)' }}
          >
            {submitting ? 'Posting...' : step === 2 ? <><Sparkles className="w-4 h-4" strokeWidth={2} /> Post Free Listing</> : <>Next <ArrowRight className="w-4 h-4" /></>}
          </motion.button>
        </div>
      </div>
    </div>
  );
}
