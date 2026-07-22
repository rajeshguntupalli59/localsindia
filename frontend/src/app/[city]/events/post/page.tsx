'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Calendar, MapPin, Upload, X } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { api, ApiError } from '@/lib/api';
import type { City } from '@/lib/types';

export default function PostEventPage() {
  const params = useParams();
  const router = useRouter();
  const citySlug = params.city as string;

  const [city, setCity] = useState<City | null>(null);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    title: '',
    description: '',
    venue: '',
    event_date: '',
    is_free: true,
    ticket_url: '',
    ticket_price: '',
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

  useEffect(() => {
    api.cities.get(citySlug).then(setCity).catch(() => {});
  }, [citySlug]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = localStorage.getItem('access_token');
    if (!token) {
      router.push('/auth/login');
      return;
    }
    if (!city) return;
    setLoading(true);
    try {
      const event = await api.events.create(
        {
          title: form.title,
          description: form.description,
          venue: form.venue,
          event_date: new Date(form.event_date).toISOString(),
          city_id: city.id,
          is_free: form.is_free,
          ticket_url: form.is_free ? null : form.ticket_url || null,
          ticket_price: form.is_free ? null : (form.ticket_price ? Number(form.ticket_price) : null),
        },
        token,
      );

      for (const photo of photos) {
        try { await api.upload.eventImage(event.id, photo, token); } catch { /* non-fatal */ }
      }

      toast.success('Event submitted for review!');
      router.push(`/${citySlug}/events`);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Failed to post event');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen" style={{ background: 'var(--li-page-bg)' }}>
      <div className="max-w-lg mx-auto px-4 py-10">
        <Link
          href={`/${citySlug}/events`}
          className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-800 mb-6"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Events
        </Link>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
          <h1 className="text-2xl font-black mb-1" style={{ color: 'var(--li-text)' }}>Post an Event</h1>
          <p className="text-sm text-slate-500 mb-6">Events go live after review — usually within a few hours</p>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-1.5">
              <Label>Event Title *</Label>
              <Input
                placeholder="e.g. Sankranti Mela 2026"
                value={form.title}
                onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
                required
                minLength={3}
                maxLength={150}
              />
            </div>

            <div className="space-y-1.5">
              <Label>Description *</Label>
              <textarea
                className="w-full rounded-lg border border-input px-3 py-2 text-sm min-h-[100px] resize-none outline-none focus:ring-2 focus:ring-ring"
                placeholder="What's happening? Who is it for?"
                value={form.description}
                onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                required
                minLength={10}
              />
            </div>

            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5" /> Venue *
              </Label>
              <Input
                placeholder="e.g. LB Stadium, Hyderabad"
                value={form.venue}
                onChange={e => setForm(p => ({ ...p, venue: e.target.value }))}
                required
                minLength={3}
              />
            </div>

            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5" /> Date & Time *
              </Label>
              <Input
                type="datetime-local"
                value={form.event_date}
                onChange={e => setForm(p => ({ ...p, event_date: e.target.value }))}
                required
              />
            </div>

            <div className="space-y-2">
              <Label>Admission</Label>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setForm(p => ({ ...p, is_free: true }))}
                  className={`flex-1 py-2.5 rounded-xl border-2 text-sm font-semibold transition-colors ${
                    form.is_free
                      ? 'border-green-500 bg-green-50 text-green-700'
                      : 'border-slate-200 text-slate-500'
                  }`}
                >
                  Free Entry
                </button>
                <button
                  type="button"
                  onClick={() => setForm(p => ({ ...p, is_free: false }))}
                  className={`flex-1 py-2.5 rounded-xl border-2 text-sm font-semibold transition-colors ${
                    !form.is_free
                      ? 'border-amber-500 bg-amber-50 text-amber-700'
                      : 'border-slate-200 text-slate-500'
                  }`}
                >
                  Paid / Ticketed
                </button>
              </div>
            </div>

            {!form.is_free && (
              <>
                <div className="space-y-1.5">
                  <Label>Sell tickets in-app (₹)</Label>
                  <Input
                    type="number"
                    min="1"
                    step="1"
                    placeholder="e.g. 299"
                    value={form.ticket_price}
                    onChange={e => setForm(p => ({ ...p, ticket_price: e.target.value }))}
                  />
                  <p className="text-xs text-slate-400">
                    Buyers pay in-app and get a QR ticket. Leave blank if you&apos;d rather link to an external ticketing site below.
                  </p>
                </div>
                <div className="space-y-1.5">
                  <Label>Or: External Ticket URL</Label>
                  <Input
                    type="url"
                    placeholder="https://bookmyshow.com/..."
                    value={form.ticket_url}
                    onChange={e => setForm(p => ({ ...p, ticket_url: e.target.value }))}
                    disabled={!!form.ticket_price}
                  />
                </div>
              </>
            )}

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
              {loading ? 'Submitting...' : 'Submit Event →'}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
