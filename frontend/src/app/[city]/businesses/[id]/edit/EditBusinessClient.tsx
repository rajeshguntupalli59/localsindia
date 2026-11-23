'use client';

// Owner (or admin) edits a business. Changes go live at once — the owner
// already proved ownership when claiming. Only changed fields are sent, so an
// old OpenStreetMap value the form can't validate (e.g. a landline) never
// blocks saving something else.

import { useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Camera, Clock, MapPin, Save, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { api, ApiError } from '@/lib/api';
import type { Business, ListingImage } from '@/lib/types';
import { rowsToOpeningHours, weekToRows, type DayRow } from '@/lib/openingHours';
import { toIndianMobile } from '@/lib/phone';
import { realImages } from '@/lib/utils';

const MapPinPicker = dynamic(() => import('@/components/map-pin-picker/MapPinPicker'), { ssr: false });

const DAY_LABELS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const DEFAULT_ROWS: DayRow[] = DAY_LABELS.map((_, i) => ({ closed: i === 6, open: '09:00', close: '21:00' }));
const MAX_PHOTOS = 5;

const blankToNull = (s: string) => (s.trim() ? s.trim() : null);

export default function EditBusinessClient() {
  const { city: citySlug, id } = useParams<{ city: string; id: string }>();
  const router = useRouter();
  const backHref = `/${citySlug}/businesses/${id}`;

  const [business, setBusiness] = useState<Business | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [whatsappUrl, setWhatsappUrl] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [pin, setPin] = useState<{ latitude: number; longitude: number } | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);

  // Hours: rows when the simple editor can show them; otherwise the raw text is
  // kept until the owner chooses to replace it
  const [rows, setRows] = useState<DayRow[]>(DEFAULT_ROWS);
  const [hoursTouched, setHoursTouched] = useState(false);
  const [rawHours, setRawHours] = useState<string | null>(null);   // set only when unsupported

  const [images, setImages] = useState<ListingImage[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (!token) { router.replace(`/auth/login?redirect=${encodeURIComponent(`${backHref}/edit`)}`); return; }
    let user: { id?: string; role?: string } = {};
    try { user = JSON.parse(localStorage.getItem('user') ?? '{}'); } catch { /* ignore */ }
    api.businesses.get(id)
      .then(b => {
        if (b.owner_id !== user.id && user.role !== 'admin') {
          toast.error('Only the owner can edit this business. Claim it first.');
          router.replace(backHref);
          return;
        }
        setBusiness(b);
        setName(b.name);
        setDescription(b.description ?? '');
        setAddress(b.address ?? '');
        setPhone(b.phone ?? '');
        setWhatsappUrl(b.whatsapp_url ?? '');
        setWebsiteUrl(b.website_url ?? '');
        if (b.latitude != null && b.longitude != null) setPin({ latitude: b.latitude, longitude: b.longitude });
        const parsed = weekToRows(b.opening_hours);
        if (parsed) setRows(parsed);
        else if (b.opening_hours) setRawHours(b.opening_hours);
        setImages(realImages(b.images ?? []));
      })
      .catch(() => { toast.error('Business not found'); router.replace(`/${citySlug}/businesses`); })
      .finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const setRow = (i: number, patch: Partial<DayRow>) => {
    setHoursTouched(true);
    setRows(prev => prev.map((r, j) => (j === i ? { ...r, ...patch } : r)));
  };

  const handleFiles = async (files: FileList | null) => {
    const token = localStorage.getItem('access_token');
    if (!files || !token || !business) return;
    const arr = Array.from(files).slice(0, MAX_PHOTOS - images.length);
    if (arr.some(f => f.size > 5 * 1024 * 1024)) { toast.error('Images must be under 5MB'); return; }
    setUploading(true);
    try {
      for (const file of arr) {
        const img = await api.upload.businessImage(business.id, file, token);
        setImages(prev => [...prev, img]);
      }
      toast.success('Photo added');
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Failed to upload photo');
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const removeImage = async (imageId: string) => {
    const token = localStorage.getItem('access_token');
    if (!token || !confirm('Remove this photo?')) return;
    try {
      await api.upload.deleteBusinessImage(imageId, token);
      setImages(prev => prev.filter(i => i.id !== imageId));
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Failed to remove photo');
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = localStorage.getItem('access_token');
    if (!token || !business) return;
    if (!name.trim()) { toast.error('Business name is required'); return; }

    const changes: Record<string, unknown> = {};
    const diff = (key: keyof Business, value: string | null) => {
      if (value !== (business[key] ?? null)) changes[key] = value;
    };
    diff('name', name.trim());
    diff('description', blankToNull(description));
    diff('address', blankToNull(address));
    diff('whatsapp_url', blankToNull(whatsappUrl));
    diff('website_url', blankToNull(websiteUrl));

    if (phone.trim() !== (business.phone ?? '')) {
      if (!phone.trim()) changes.phone = null;
      else {
        const normalised = toIndianMobile(phone);
        if (!normalised) { toast.error('Enter a 10-digit mobile number, e.g. 98765 43210'); return; }
        if (normalised !== business.phone) changes.phone = normalised;
      }
    }

    if (pin && (pin.latitude !== business.latitude || pin.longitude !== business.longitude)) {
      changes.latitude = Number(pin.latitude.toFixed(6));
      changes.longitude = Number(pin.longitude.toFixed(6));
    }

    if (hoursTouched) {
      const bad = rows.findIndex(r => !r.closed && (!r.open || !r.close || r.open === r.close));
      if (bad >= 0) { toast.error(`Check the hours for ${DAY_LABELS[bad]}`); return; }
      const hours = rowsToOpeningHours(rows);
      if (hours !== (business.opening_hours ?? null)) changes.opening_hours = hours;
    }

    if (Object.keys(changes).length === 0) { toast('Nothing changed'); router.push(backHref); return; }

    setSaving(true);
    try {
      await api.businesses.update(business.id, changes, token);
      toast.success('Saved. Your changes are live.');
      router.push(backHref);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Could not save, please try again');
    } finally {
      setSaving(false);
    }
  };

  if (loading || !business) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-4" aria-busy>
        {[0, 1, 2, 3].map(i => <div key={i} className="h-28 rounded-2xl bg-slate-100 animate-pulse" />)}
      </div>
    );
  }

  const section = 'bg-white rounded-2xl border border-slate-100 p-4 md:p-5 space-y-4';

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 pb-28">
      <Link href={backHref} className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 mb-4">
        <ArrowLeft className="w-4 h-4" /> Back to {business.name}
      </Link>
      <h1 className="text-2xl font-bold text-slate-900 mb-1">Edit business details</h1>
      <p className="text-sm text-slate-500 mb-6">Changes go live on your page as soon as you save.</p>

      <form onSubmit={handleSave} className="space-y-5">
        <section className={section}>
          <h2 className="font-semibold text-slate-800">About</h2>
          <div className="space-y-1.5">
            <Label htmlFor="name">Business name</Label>
            <Input id="name" value={name} maxLength={150} onChange={e => setName(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="description">Description</Label>
            <textarea
              id="description"
              rows={4}
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="What you offer, specialities, languages spoken…"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
        </section>

        <section className={section}>
          <h2 className="font-semibold text-slate-800">Location</h2>
          <div className="space-y-1.5">
            <Label htmlFor="address">Address</Label>
            <textarea
              id="address"
              rows={2}
              value={address}
              onChange={e => setAddress(e.target.value)}
              placeholder="Shop number, street, landmark, area, PIN code"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 px-3 py-3">
            <div className="flex items-center gap-2 text-sm text-slate-600 min-w-0">
              <MapPin className="w-4 h-4 shrink-0" style={{ color: 'var(--li-primary)' }} />
              <span className="truncate">
                {pin ? `Map pin set (${pin.latitude.toFixed(5)}, ${pin.longitude.toFixed(5)})` : 'No map pin yet'}
              </span>
            </div>
            <Button type="button" variant="outline" size="sm" onClick={() => setPickerOpen(true)}>
              {pin ? 'Move pin' : 'Set pin'}
            </Button>
          </div>
        </section>

        <section className={section}>
          <h2 className="font-semibold text-slate-800">Contact</h2>
          <div className="space-y-1.5">
            <Label htmlFor="phone">Mobile number</Label>
            <Input id="phone" type="tel" inputMode="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="98765 43210" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="whatsapp">WhatsApp link</Label>
            <Input id="whatsapp" value={whatsappUrl} onChange={e => setWhatsappUrl(e.target.value)} placeholder="https://wa.me/919876543210" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="website">Website</Label>
            <Input id="website" value={websiteUrl} onChange={e => setWebsiteUrl(e.target.value)} placeholder="yourbusiness.com" />
          </div>
        </section>

        <section className={section}>
          <h2 className="font-semibold text-slate-800 flex items-center gap-2"><Clock className="w-4 h-4" /> Opening hours</h2>
          {rawHours ? (
            <div className="space-y-3">
              <p className="text-sm text-slate-600">Current hours: <span className="font-mono">{rawHours}</span></p>
              <Button type="button" variant="outline" size="sm" onClick={() => { setRawHours(null); setHoursTouched(true); }}>
                Replace with simple hours
              </Button>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {rows.map((r, i) => (
                <div key={DAY_LABELS[i]} className="flex flex-wrap items-center gap-x-3 gap-y-2 py-2.5">
                  <span className="w-24 text-sm font-medium text-slate-700">{DAY_LABELS[i]}</span>
                  <label className="flex items-center gap-1.5 text-sm text-slate-500">
                    <input type="checkbox" checked={r.closed} onChange={e => setRow(i, { closed: e.target.checked })} />
                    Closed
                  </label>
                  {!r.closed && (
                    <div className="flex items-center gap-2 text-sm">
                      <input type="time" aria-label={`${DAY_LABELS[i]} opens`} value={r.open} onChange={e => setRow(i, { open: e.target.value })}
                        className="rounded-md border border-input px-2 py-1" />
                      <span className="text-slate-400">to</span>
                      <input type="time" aria-label={`${DAY_LABELS[i]} closes`} value={r.close === '24:00' ? '23:59' : r.close}
                        onChange={e => setRow(i, { close: e.target.value })} className="rounded-md border border-input px-2 py-1" />
                    </div>
                  )}
                </div>
              ))}
              {!hoursTouched && !business.opening_hours && (
                <p className="pt-3 text-xs text-slate-400">No hours on your page yet. Change any day to add them.</p>
              )}
            </div>
          )}
        </section>

        <section className={section}>
          <h2 className="font-semibold text-slate-800">Photos</h2>
          <p className="text-xs text-slate-400 -mt-2">Up to {MAX_PHOTOS} photos, JPEG/PNG/WebP under 5MB. Saved right away.</p>
          <div className="grid grid-cols-3 gap-3">
            {images.map(img => (
              <div key={img.id} className="relative aspect-square rounded-xl overflow-hidden bg-slate-100">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={img.url} alt="" width={200} height={200} className="w-full h-full object-cover" />
                <button type="button" onClick={() => removeImage(img.id)} aria-label="Remove photo"
                  className="absolute top-1.5 right-1.5 bg-black/60 text-white rounded-full p-1">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
            {images.length < MAX_PHOTOS && (
              <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading}
                className="aspect-square rounded-xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center gap-1 text-slate-400 hover:border-slate-300 disabled:opacity-50">
                <Camera className="w-6 h-6" />
                <span className="text-xs">{uploading ? 'Uploading…' : 'Add photo'}</span>
              </button>
            )}
          </div>
          <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" multiple hidden onChange={e => handleFiles(e.target.files)} />
        </section>

        <div className="fixed bottom-0 inset-x-0 z-40 bg-white border-t border-slate-100 p-3 md:static md:border-0 md:p-0 md:bg-transparent">
          <div className="max-w-2xl mx-auto">
            <Button type="submit" disabled={saving} className="w-full h-12 text-base font-semibold">
              <Save className="w-4 h-4 mr-2" /> {saving ? 'Saving…' : 'Save changes'}
            </Button>
          </div>
        </div>
      </form>

      {pickerOpen && (
        <MapPinPicker
          initialCenter={pin ? { lat: pin.latitude, lng: pin.longitude } : undefined}
          onClose={() => setPickerOpen(false)}
          onConfirm={p => { setPin(p); setPickerOpen(false); }}
        />
      )}
    </div>
  );
}
