'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Calendar, MapPin } from 'lucide-react';
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
  });

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
      await api.events.create(
        {
          title: form.title,
          description: form.description,
          venue: form.venue,
          event_date: new Date(form.event_date).toISOString(),
          city_id: city.id,
          is_free: form.is_free,
          ticket_url: form.is_free ? null : form.ticket_url || null,
        },
        token,
      );
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
              <div className="space-y-1.5">
                <Label>Ticket URL</Label>
                <Input
                  type="url"
                  placeholder="https://bookmyshow.com/..."
                  value={form.ticket_url}
                  onChange={e => setForm(p => ({ ...p, ticket_url: e.target.value }))}
                />
              </div>
            )}

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
