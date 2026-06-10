'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Globe, Save, Share2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { api, ApiError } from '@/lib/api';
import type { Listing } from '@/lib/types';

export default function EditListingPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [listing, setListing] = useState<Listing | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [whatsappUrl, setWhatsappUrl] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [socialUrl, setSocialUrl] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (!token) { router.replace('/auth/login'); return; }
    loadListing();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const loadListing = async () => {
    setLoading(true);
    try {
      const data = await api.listings.get(id);
      // Verify ownership
      const user = JSON.parse(localStorage.getItem('user') ?? '{}');
      if (data.user_id !== user.id && user.role !== 'admin') {
        toast.error('Not authorised to edit this listing');
        router.replace('/profile/listings');
        return;
      }
      setListing(data);
      setTitle(data.title);
      setDescription(data.description);
      setPrice(data.price !== null ? String(data.price) : '');
      setWhatsappUrl(data.whatsapp_url ?? '');
      setWebsiteUrl(data.website_url ?? '');
      setSocialUrl(data.social_url ?? '');
    } catch {
      toast.error('Listing not found');
      router.replace('/profile/listings');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = localStorage.getItem('access_token');
    if (!token || !listing) return;

    setSaving(true);
    try {
      await api.listings.update(id, {
        title: title.trim(),
        description: description.trim(),
        price: price ? parseFloat(price) : undefined,
        whatsapp_url: whatsappUrl.trim() || undefined,
        website_url: websiteUrl.trim() || undefined,
        social_url: socialUrl.trim() || undefined,
      }, token);
      toast.success('Listing updated!');
      router.push('/profile/listings');
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Failed to update listing');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen" style={{ background: 'var(--li-page-bg)' }}>
        <div className="sticky top-0 z-30 bg-white border-b px-4 py-3 flex items-center gap-3">
          <div className="w-5 h-5 rounded bg-muted animate-pulse" />
          <div className="h-5 w-32 bg-muted animate-pulse rounded" />
        </div>
        <div className="p-4 space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-14 bg-white rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-20" style={{ background: 'var(--li-page-bg)' }}>
      {/* Header */}
      <div className="sticky top-0 z-30 bg-white border-b px-4 py-3 flex items-center gap-3">
        <button onClick={() => router.back()} className="text-muted-foreground">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="font-semibold">Edit Listing</h1>
      </div>

      <form onSubmit={handleSave} className="p-4 space-y-5 max-w-lg mx-auto">

        {/* Status note */}
        <div className="px-4 py-3 rounded-xl bg-amber-50 border border-amber-200 text-sm text-amber-800">
          Saving changes will resubmit the listing for review.
        </div>

        {/* Title */}
        <div className="space-y-2">
          <Label htmlFor="title">Title</Label>
          <Input
            id="title"
            value={title}
            onChange={e => setTitle(e.target.value)}
            maxLength={150}
            required
            placeholder="e.g. Sony Bravia 55 inch 4K TV"
          />
          <p className="text-xs text-muted-foreground">{title.length}/150</p>
        </div>

        {/* Description */}
        <div className="space-y-2">
          <Label htmlFor="description">Description</Label>
          <textarea
            id="description"
            value={description}
            onChange={e => setDescription(e.target.value)}
            rows={4}
            required
            placeholder="Describe the item, condition, reason for selling..."
            className="w-full border rounded-xl px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-orange-400"
          />
        </div>

        {/* Price */}
        <div className="space-y-2">
          <Label htmlFor="price">Price (₹) <span className="text-muted-foreground font-normal">— optional</span></Label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-muted-foreground">₹</span>
            <Input
              id="price"
              type="number"
              min={0}
              className="pl-7"
              value={price}
              onChange={e => setPrice(e.target.value)}
              placeholder="Leave blank for price on request"
            />
          </div>
        </div>

        {/* WhatsApp URL */}
        <div className="space-y-2">
          <Label htmlFor="wa">WhatsApp URL <span className="text-muted-foreground font-normal">— optional</span></Label>
          <Input
            id="wa"
            value={whatsappUrl}
            onChange={e => setWhatsappUrl(e.target.value)}
            placeholder="https://wa.me/91XXXXXXXXXX"
          />
        </div>

        {/* Online presence */}
        <div className="space-y-3">
          <Label className="text-sm font-medium">Online Presence <span className="text-muted-foreground font-normal">— optional</span></Label>
          <div className="flex items-center gap-2">
            <Globe className="w-4 h-4 shrink-0" style={{ color: 'var(--li-primary)' }} />
            <Input
              value={websiteUrl}
              onChange={e => setWebsiteUrl(e.target.value)}
              placeholder="https://yourwebsite.com"
              type="url"
            />
          </div>
          <div className="flex items-center gap-2">
            <Share2 className="w-4 h-4 shrink-0" style={{ color: 'var(--li-primary)' }} />
            <Input
              value={socialUrl}
              onChange={e => setSocialUrl(e.target.value)}
              placeholder="instagram.com/... or facebook.com/..."
            />
          </div>
        </div>

        {/* Save */}
        <Button
          type="submit"
          className="w-full text-white gap-2"
          style={{ background: 'var(--li-primary)' }}
          disabled={saving}
        >
          <Save className="w-4 h-4" />
          {saving ? 'Saving...' : 'Save Changes'}
        </Button>

      </form>
    </div>
  );
}
