'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, ShieldCheck, PartyPopper, Upload, X } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { api, ApiError } from '@/lib/api';
import type { City } from '@/lib/types';
import GetVerifiedModal from '@/components/get-verified-modal/GetVerifiedModal';

export default function AddBusinessPage() {
  const params = useParams();
  const router = useRouter();
  const citySlug = params.city as string;

  const [city, setCity] = useState<City | null>(null);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: '',
    description: '',
    address: '',
    phone: '',
    whatsapp_url: '',
    website_url: '',
  });

  const [photos, setPhotos] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);

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

  // Set once the business is created — switches the screen into the
  // "get verified now, or skip" upsell instead of navigating away immediately.
  const [createdBusinessId, setCreatedBusinessId] = useState<string | null>(null);
  const [badgeModal, setBadgeModal] = useState(false);

  useEffect(() => {
    api.cities.get(citySlug).then(setCity).catch(() => {});
  }, [citySlug]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = localStorage.getItem('access_token');
    if (!token) { router.push('/auth/login'); return; }
    if (!city) return;
    setLoading(true);
    try {
      const biz = await api.businesses.create(
        {
          name: form.name,
          description: form.description || null,
          address: form.address || null,
          phone: form.phone || null,
          whatsapp_url: form.whatsapp_url || null,
          website_url: form.website_url || null,
          city_id: city.id,
        },
        token,
      );
      for (const photo of photos) {
        try { await api.upload.businessImage(biz.id, photo, token); } catch { /* non-fatal */ }
      }

      toast.success('Business listed!');
      setCreatedBusinessId(biz.id);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Failed to add business');
    } finally {
      setLoading(false);
    }
  };

  const goToBusiness = () => router.push(`/${citySlug}/businesses/${createdBusinessId}`);

  // ── Post-creation: get verified now, or skip ──────────────────────────────
  if (createdBusinessId) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4" style={{ background: 'var(--li-page-bg)' }}>
        <div className="w-full max-w-sm bg-white rounded-2xl shadow-sm border border-slate-100 p-6 text-center">
          <PartyPopper className="w-10 h-10 mx-auto text-orange-500" />
          <h1 className="text-xl font-black mt-3" style={{ color: 'var(--li-text)' }}>Business listed!</h1>
          <p className="text-sm text-slate-500 mt-1">{form.name} is now live in {city?.name || citySlug}.</p>

          <div className="mt-5 p-4 rounded-xl border-2 border-blue-100 bg-blue-50 text-left flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-blue-900">Want to stand out?</p>
              <p className="text-xs text-blue-700 mt-0.5">Get Verified — blue ✓ badge and priority ranking. Starts at ₹499/month.</p>
            </div>
          </div>

          <Button
            type="button"
            className="w-full text-white mt-4"
            style={{ background: 'var(--li-primary)' }}
            onClick={() => setBadgeModal(true)}
          >
            Get Verified Now
          </Button>
          <button
            type="button"
            onClick={goToBusiness}
            className="w-full py-2.5 mt-2 text-sm text-slate-500 hover:text-slate-800 transition-colors"
          >
            Skip for now
          </button>
        </div>

        {badgeModal && (
          <GetVerifiedModal
            businessId={createdBusinessId}
            onClose={() => setBadgeModal(false)}
            onVerified={goToBusiness}
          />
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: 'var(--li-page-bg)' }}>
      <div className="max-w-lg mx-auto px-4 py-10">
        <Link
          href={`/${citySlug}/businesses`}
          className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-800 mb-6"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Businesses
        </Link>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
          <h1 className="text-2xl font-black mb-1" style={{ color: 'var(--li-text)' }}>Add Your Business</h1>
          <p className="text-sm text-slate-500 mb-6">Get discovered by local customers in {city?.name || citySlug}</p>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-1.5">
              <Label>Business Name *</Label>
              <Input
                placeholder="e.g. Sri Venkateshwara Tiffin Centre"
                value={form.name}
                onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                required minLength={2} maxLength={150}
              />
            </div>

            <div className="space-y-1.5">
              <Label>Description</Label>
              <textarea
                className="w-full rounded-lg border border-input px-3 py-2 text-sm min-h-[80px] resize-none outline-none focus:ring-2 focus:ring-ring"
                placeholder="What do you offer?"
                value={form.description}
                onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
              />
            </div>

            <div className="space-y-1.5">
              <Label>Address</Label>
              <Input
                placeholder="Street, Area, City"
                value={form.address}
                onChange={e => setForm(p => ({ ...p, address: e.target.value }))}
              />
            </div>

            <div className="space-y-1.5">
              <Label>Phone</Label>
              <Input
                placeholder="+91 9876543210"
                value={form.phone}
                onChange={e => setForm(p => ({ ...p, phone: e.target.value }))}
              />
            </div>

            <div className="space-y-1.5">
              <Label>WhatsApp URL</Label>
              <Input
                placeholder="https://wa.me/919876543210"
                value={form.whatsapp_url}
                onChange={e => setForm(p => ({ ...p, whatsapp_url: e.target.value }))}
              />
              <p className="text-xs text-slate-400">Format: https://wa.me/91XXXXXXXXXX</p>
            </div>

            <div className="space-y-1.5">
              <Label>Website URL</Label>
              <Input
                type="url"
                placeholder="https://yourbusiness.com"
                value={form.website_url}
                onChange={e => setForm(p => ({ ...p, website_url: e.target.value }))}
              />
            </div>

            <div className="space-y-1.5">
              <Label>Photos <span className="font-normal text-xs text-slate-400">(optional, up to 5)</span></Label>

              {photos.length < 5 && (
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="w-full border-2 border-dashed rounded-xl p-5 flex flex-col items-center gap-2 transition-colors hover:border-orange-400 hover:bg-orange-50"
                  style={{ borderColor: 'var(--li-border)' }}
                >
                  <Upload className="w-5 h-5 text-slate-400" />
                  <span className="text-xs text-slate-500">Tap to add photos — JPEG, PNG, max 5MB each</span>
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
                    <div key={i} className="relative rounded-lg overflow-hidden bg-slate-100" style={{ aspectRatio: '4/3' }}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={url} alt="" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => removePhoto(i)}
                        className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/60 flex items-center justify-center"
                        aria-label={`Remove photo ${i + 1}`}
                      >
                        <X className="w-3 h-3 text-white" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <Button
              type="submit"
              className="w-full text-white"
              style={{ background: 'var(--li-primary)' }}
              disabled={loading}
            >
              {loading ? 'Adding...' : 'Add Business →'}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
