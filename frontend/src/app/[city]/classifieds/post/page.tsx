'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Upload, X, CheckCircle } from 'lucide-react';
import { api, ApiError } from '@/lib/api';
import type { Category, City } from '@/lib/types';
import { toast } from 'sonner';

const STEPS = ['Details', 'Photos', 'Contact'];

interface FormData {
  title: string;
  description: string;
  category_id: string;
  price: string;
  contact_phone: string;
  whatsapp_url: string;
  whatsapp_toggle: boolean;
}

const EMPTY: FormData = {
  title: '',
  description: '',
  category_id: '',
  price: '',
  contact_phone: '',
  whatsapp_url: '',
  whatsapp_toggle: false,
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
    const stored = localStorage.getItem('li_post_form');
    if (stored) { try { setForm(JSON.parse(stored)); } catch { /* ignore */ } }
    api.categories.list().then(setCategories).catch(() => {});
    api.cities.get(citySlug).then(setCity).catch(() => {});
    const user = localStorage.getItem('user');
    if (user) {
      try {
        const u = JSON.parse(user);
        setForm(f => ({ ...f, contact_phone: u.phone ?? '' }));
      } catch { /* ignore */ }
    }
  }, [citySlug]);

  const save = (next: Partial<FormData>) => {
    const merged = { ...form, ...next };
    setForm(merged);
    localStorage.setItem('li_post_form', JSON.stringify(merged));
  };

  const validateStep1 = () => {
    const e: Partial<FormData> = {};
    if (!form.title.trim()) e.title = 'Required';
    if (form.title.trim().length < 5) e.title = 'Too short (min 5 chars)';
    if (!form.category_id) e.category_id = 'Pick a category';
    if (!form.description.trim() || form.description.length < 20) e.description = 'At least 20 characters';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const validateStep3 = () => {
    const e: Partial<FormData> = {};
    const phone = form.contact_phone.trim().startsWith('+91') ? form.contact_phone.trim() : `+91${form.contact_phone.trim()}`;
    if (!PHONE_RE.test(phone)) e.contact_phone = 'Enter a valid Indian mobile number';
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
    const urls = newPhotos.map(f => URL.createObjectURL(f));
    setPreviews(urls);
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
    setSubmitting(true);
    try {
      const phone = form.contact_phone.trim().startsWith('+91')
        ? form.contact_phone.trim()
        : `+91${form.contact_phone.trim()}`;

      if (!city) throw new Error('City not loaded');

      const listing = await api.listings.create({
        title: form.title.trim(),
        description: form.description.trim(),
        category_id: form.category_id,
        city_id: city.id,
        contact_phone: phone,
        price: form.price ? parseFloat(form.price) : undefined,
        whatsapp_url: form.whatsapp_toggle && phone
          ? `https://wa.me/91${phone.replace('+91', '')}`
          : undefined,
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

  if (done) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center" style={{ background: 'var(--li-page-bg)' }}>
        <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', stiffness: 200 }}>
          <CheckCircle className="w-20 h-20 mx-auto mb-4" style={{ color: 'var(--li-primary)' }} />
          <h1 className="text-2xl font-bold mb-2">You&apos;re live!</h1>
          <p className="text-muted-foreground mb-8">Your listing is under review. We&apos;ll activate it shortly.</p>
          <div className="flex flex-col gap-3 w-full max-w-xs mx-auto">
            <button
              onClick={() => router.push('/profile/listings')}
              className="py-3 rounded-xl text-white font-semibold"
              style={{ background: 'var(--li-primary)' }}
            >
              View my listings
            </button>
            <button
              onClick={() => router.push(`/${citySlug}`)}
              className="py-3 rounded-xl border font-semibold"
            >
              Back to {citySlug}
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-28" style={{ background: 'var(--li-page-bg)' }}>
      {/* Header */}
      <div className="sticky top-0 z-40 bg-white border-b px-4 py-3">
        <div className="flex items-center gap-3 mb-3">
          <button onClick={() => step === 0 ? router.back() : setStep(s => s - 1)} className="text-muted-foreground">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="font-semibold">Post Free Listing</h1>
        </div>
        {/* Progress bar */}
        <div className="flex gap-1.5">
          {STEPS.map((label, i) => (
            <div key={i} className="flex-1">
              <div className={`h-1.5 rounded-full transition-all duration-300 ${i <= step ? 'bg-[var(--li-primary)]' : 'bg-muted'}`} />
              <p className={`text-[10px] mt-1 ${i === step ? 'text-[var(--li-primary)] font-semibold' : 'text-muted-foreground'}`}>{label}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="p-4">
        <AnimatePresence mode="wait">
          {step === 0 && (
            <motion.div key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-5">
              <div>
                <label className="text-sm font-semibold mb-1.5 block">Title <span className="text-destructive">*</span></label>
                <input
                  value={form.title}
                  onChange={e => save({ title: e.target.value })}
                  placeholder="What are you selling?"
                  className={`w-full border rounded-xl px-4 py-3 text-sm ${errors.title ? 'border-destructive' : 'border-input'}`}
                />
                {errors.title && <p className="text-xs text-destructive mt-1">{errors.title}</p>}
              </div>

              <div>
                <label className="text-sm font-semibold mb-2 block">Category <span className="text-destructive">*</span></label>
                <div className="grid grid-cols-3 gap-2">
                  {categories.map(cat => (
                    <button
                      key={cat.id}
                      onClick={() => save({ category_id: cat.id })}
                      className={`p-3 rounded-xl border text-center transition-all ${
                        form.category_id === cat.id
                          ? 'border-[var(--li-primary)] bg-orange-50 scale-[1.02]'
                          : 'border-muted hover:border-muted-foreground'
                      }`}
                    >
                      <span className="text-2xl block mb-1">{cat.icon ?? '🏷️'}</span>
                      <span className="text-xs font-medium leading-tight">{cat.name}</span>
                    </button>
                  ))}
                </div>
                {errors.category_id && <p className="text-xs text-destructive mt-1">{errors.category_id}</p>}
              </div>

              <div>
                <label className="text-sm font-semibold mb-1.5 block">Description <span className="text-destructive">*</span></label>
                <textarea
                  value={form.description}
                  onChange={e => save({ description: e.target.value })}
                  placeholder="Describe your item — condition, size, age, why selling..."
                  rows={4}
                  className={`w-full border rounded-xl px-4 py-3 text-sm resize-none ${errors.description ? 'border-destructive' : 'border-input'}`}
                />
                <div className="flex justify-between mt-1">
                  {errors.description ? <p className="text-xs text-destructive">{errors.description}</p> : <span />}
                  <p className="text-xs text-muted-foreground">{form.description.length}/500</p>
                </div>
              </div>

              <div>
                <label className="text-sm font-semibold mb-1.5 block">Price (optional)</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-semibold">₹</span>
                  <input
                    type="number"
                    value={form.price}
                    onChange={e => save({ price: e.target.value })}
                    placeholder="Leave blank for 'Price on request'"
                    className="w-full border rounded-xl pl-8 pr-4 py-3 text-sm border-input"
                  />
                </div>
              </div>
            </motion.div>
          )}

          {step === 1 && (
            <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
              <p className="text-sm text-muted-foreground">Add up to 5 photos. First photo is the cover.</p>

              {photos.length < 5 && (
                <button
                  onClick={() => fileRef.current?.click()}
                  className="w-full border-2 border-dashed rounded-xl p-8 flex flex-col items-center gap-2 text-muted-foreground hover:border-[var(--li-primary)] hover:text-[var(--li-primary)] transition-colors"
                >
                  <Upload className="w-8 h-8" />
                  <p className="text-sm font-medium">Tap to add photos</p>
                  <p className="text-xs">JPEG, PNG, WebP — max 5MB each</p>
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
                <div className="grid grid-cols-3 gap-2">
                  {previews.map((url, i) => (
                    <div key={i} className="relative aspect-square rounded-xl overflow-hidden bg-muted">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={url} alt="" className="w-full h-full object-cover" />
                      {i === 0 && (
                        <span className="absolute bottom-1 left-1 text-[10px] bg-black/60 text-white px-1.5 py-0.5 rounded">Cover</span>
                      )}
                      <button
                        onClick={() => removePhoto(i)}
                        className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/60 flex items-center justify-center"
                      >
                        <X className="w-3 h-3 text-white" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <p className="text-xs text-muted-foreground text-center">{photos.length}/5 photos added</p>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div key="step3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-5">
              <div>
                <label className="text-sm font-semibold mb-1.5 block">Your mobile number <span className="text-destructive">*</span></label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">+91</span>
                  <input
                    type="tel"
                    value={form.contact_phone.replace('+91', '')}
                    onChange={e => save({ contact_phone: `+91${e.target.value}` })}
                    placeholder="9876543210"
                    className={`w-full border rounded-xl pl-12 pr-4 py-3 text-sm ${errors.contact_phone ? 'border-destructive' : 'border-input'}`}
                  />
                </div>
                {errors.contact_phone && <p className="text-xs text-destructive mt-1">{errors.contact_phone}</p>}
              </div>

              <div className="flex items-center justify-between p-4 rounded-xl border">
                <div>
                  <p className="text-sm font-semibold">Enable WhatsApp</p>
                  <p className="text-xs text-muted-foreground">Buyers can message you instantly</p>
                </div>
                <button
                  onClick={() => save({ whatsapp_toggle: !form.whatsapp_toggle })}
                  className={`w-11 h-6 rounded-full transition-colors relative ${form.whatsapp_toggle ? 'bg-[var(--li-wa-green)]' : 'bg-muted'}`}
                >
                  <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${form.whatsapp_toggle ? 'translate-x-5' : 'translate-x-0.5'}`} />
                </button>
              </div>

              {city && (
                <div className="p-4 rounded-xl border bg-muted/30">
                  <p className="text-xs text-muted-foreground mb-1">Posting in</p>
                  <p className="text-sm font-semibold">{city.name}, {city.state}</p>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Fixed CTA */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t z-40">
        <button
          onClick={handleNext}
          disabled={submitting}
          className="w-full py-3.5 rounded-xl text-white font-semibold text-sm disabled:opacity-60 transition-opacity"
          style={{ background: 'var(--li-primary)' }}
        >
          {submitting ? 'Posting...' : step === 2 ? 'Post Free Listing' : 'Next →'}
        </button>
      </div>
    </div>
  );
}
