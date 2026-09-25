'use client';

import { useCallback, useEffect, useState } from 'react';
import { Phone, MessageCircle, Copy, ExternalLink, PhoneCall } from 'lucide-react';
import { toast } from 'sonner';
import EmptyState from '@/components/empty-state/EmptyState';
import { timeAgo } from '@/lib/utils';
import { OUTCOME_LABELS, businessUrl, outreachMessage, whatsappLink } from '@/lib/outreach';
import type { Category, City, OutreachItem, OutreachQueue, OutreachStatus } from '@/lib/types';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000';

const TABS: { key: OutreachStatus; label: string }[] = [
  { key: 'todo', label: 'To contact' },
  { key: 'follow_up', label: 'Follow up' },
  { key: 'closed', label: 'Closed' },
  { key: 'claimed', label: 'Claimed' },
];
const CALL_OUTCOMES = ['no_answer', 'callback', 'interested', 'not_interested', 'wrong_number'];
const CLOSED = new Set(['not_interested', 'wrong_number']);
const EMPTY_COUNTS: Record<OutreachStatus, number> = { todo: 0, follow_up: 0, closed: 0, claimed: 0 };

const authHeaders = () => ({
  Authorization: `Bearer ${localStorage.getItem('access_token')}`,
  'Content-Type': 'application/json',
});

// JustDial-style owner outreach: call or WhatsApp each business yourself,
// one at a time, then log what happened. Nothing is sent automatically.
export default function AdminOutreachPage() {
  const [cities, setCities] = useState<City[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [city, setCity] = useState('hyderabad');
  const [category, setCategory] = useState('');
  const [status, setStatus] = useState<OutreachStatus>('todo');
  const [items, setItems] = useState<OutreachItem[]>([]);
  const [counts, setCounts] = useState(EMPTY_COUNTS);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    fetch(`${API_BASE}/api/v1/cities`).then(r => r.json()).then(setCities).catch(() => {});
    fetch(`${API_BASE}/api/v1/categories`).then(r => r.json()).then(setCategories).catch(() => {});
  }, []);

  const load = useCallback(async (p: number) => {
    setLoading(true);
    try {
      const qs = new URLSearchParams({ status, page: String(p) });
      if (city) qs.set('city_slug', city);
      if (category) qs.set('category_slug', category);
      const res = await fetch(`${API_BASE}/api/v1/admin/outreach?${qs}`, { headers: authHeaders() });
      if (!res.ok) throw new Error();
      const data: OutreachQueue = await res.json();
      setCounts(data.counts);
      setItems(prev => (p === 1 ? data.items : [...prev, ...data.items]));
      setPage(p);
    } catch {
      toast.error('Failed to load the outreach list');
    } finally {
      setLoading(false);
    }
  }, [city, category, status]);

  useEffect(() => { load(1); }, [load]);

  const logOutcome = async (item: OutreachItem, outcome: string) => {
    setBusyId(item.id);
    try {
      const res = await fetch(`${API_BASE}/api/v1/admin/outreach/${item.id}`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ outcome, note: notes[item.id]?.trim() || null }),
      });
      if (!res.ok) throw new Error();
      const next: OutreachStatus = CLOSED.has(outcome) ? 'closed' : 'follow_up';
      if (next !== status) {
        setItems(prev => prev.filter(i => i.id !== item.id));
        setCounts(c => ({ ...c, [status]: c[status] - 1, [next]: c[next] + 1 }));
      } else {
        setItems(prev => prev.map(i => i.id === item.id
          ? { ...i, last_outcome: outcome, last_note: notes[item.id]?.trim() || null, last_contacted_at: new Date().toISOString(), attempts: i.attempts + 1 }
          : i));
      }
      setNotes(n => ({ ...n, [item.id]: '' }));
      toast.success(`${item.name}: ${OUTCOME_LABELS[outcome]}`);
    } catch {
      toast.error('Could not save — try again');
    } finally {
      setBusyId(null);
    }
  };

  const copyMessage = async (item: OutreachItem) => {
    try {
      await navigator.clipboard.writeText(outreachMessage(item));
      toast.success('Message copied');
    } catch {
      toast.error('Could not copy');
    }
  };

  return (
    <div className="p-6">
      <div className="mb-5">
        <h1 className="text-xl font-bold">Owner Outreach</h1>
        <p className="text-sm text-muted-foreground max-w-3xl">
          Invite businesses to claim their free listing. Call or WhatsApp them yourself, one at a time, and log what
          happened. WhatsApp opens with a message pre-filled — you press send. Only message each business once; if they
          say stop, mark them &ldquo;Not interested&rdquo;.
        </p>
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        <select value={city} onChange={e => setCity(e.target.value)} aria-label="City"
          className="border rounded-lg px-3 py-2 text-sm bg-white">
          <option value="">All cities</option>
          {cities.map(c => <option key={c.slug} value={c.slug}>{c.name}</option>)}
        </select>
        <select value={category} onChange={e => setCategory(e.target.value)} aria-label="Category"
          className="border rounded-lg px-3 py-2 text-sm bg-white">
          <option value="">All categories</option>
          {categories.map(c => <option key={c.slug} value={c.slug}>{c.name}</option>)}
        </select>
      </div>

      <div className="flex flex-wrap gap-1 mb-5 border-b">
        {TABS.map(t => (
          <button key={t.key} onClick={() => setStatus(t.key)}
            className={`px-4 py-2 text-sm font-semibold -mb-px border-b-2 ${status === t.key ? 'border-amber-500 text-slate-900' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
            {t.label} <span className="ml-1 text-xs font-normal text-slate-400">{counts[t.key].toLocaleString('en-IN')}</span>
          </button>
        ))}
      </div>

      {loading && page === 1 ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-36 bg-white rounded-xl animate-pulse" />)}
        </div>
      ) : items.length === 0 ? (
        <EmptyState icon={PhoneCall} title="Nothing here"
          description={status === 'todo' ? 'Every business with a phone number in this filter has been contacted' : 'No businesses in this list yet'} />
      ) : (
        <div className="space-y-3">
          {items.map(item => {
            const wa = whatsappLink(item.mobile, outreachMessage(item));
            return (
              <div key={item.id} className="bg-white rounded-xl border p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <a href={businessUrl(item)} target="_blank" rel="noopener noreferrer"
                      className="font-bold hover:underline inline-flex items-center gap-1">
                      {item.name} <ExternalLink className="w-3.5 h-3.5 opacity-50" />
                    </a>
                    <p className="text-xs text-muted-foreground">
                      {[item.category_name, item.city_name, item.address].filter(Boolean).join(' · ')}
                    </p>
                    {item.last_outcome && (
                      <p className="text-xs mt-1">
                        <span className="font-semibold">{OUTCOME_LABELS[item.last_outcome] ?? item.last_outcome}</span>
                        {item.last_contacted_at && <> · {timeAgo(item.last_contacted_at)}</>}
                        {item.attempts > 1 && <> · {item.attempts} attempts</>}
                        {item.last_note && <span className="text-slate-500"> · &ldquo;{item.last_note}&rdquo;</span>}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <a href={`tel:${item.mobile ?? item.phone}`}
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border text-sm font-semibold">
                      <Phone className="w-4 h-4" /> {item.phone}
                    </a>
                    {wa && (
                      <a href={wa} target="_blank" rel="noopener noreferrer"
                        onClick={() => logOutcome(item, 'whatsapp_sent')}
                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-white text-sm font-semibold"
                        style={{ background: '#25D366' }}>
                        <MessageCircle className="w-4 h-4" /> WhatsApp
                      </a>
                    )}
                    <button onClick={() => copyMessage(item)} title="Copy the invite message"
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border text-sm">
                      <Copy className="w-4 h-4" /> Message
                    </button>
                  </div>
                </div>

                {status !== 'claimed' && (
                  <div className="mt-3 flex flex-col lg:flex-row gap-2">
                    <input value={notes[item.id] ?? ''} onChange={e => setNotes(n => ({ ...n, [item.id]: e.target.value }))}
                      placeholder="Note (optional), e.g. owner is Ramesh, call after 6pm" maxLength={500}
                      className="flex-1 border rounded-lg px-3 py-2 text-sm" />
                    <div className="flex flex-wrap gap-1.5">
                      {CALL_OUTCOMES.map(o => (
                        <button key={o} disabled={busyId === item.id} onClick={() => logOutcome(item, o)}
                          className={`px-3 py-2 rounded-lg border text-xs font-semibold disabled:opacity-50 ${CLOSED.has(o) ? 'text-red-600 border-red-200' : o === 'interested' ? 'text-emerald-700 border-emerald-200' : ''}`}>
                          {OUTCOME_LABELS[o]}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
          {items.length < counts[status] && (
            <button onClick={() => load(page + 1)} disabled={loading}
              className="w-full py-3 rounded-xl border bg-white text-sm font-semibold disabled:opacity-50">
              {loading ? 'Loading…' : `Load more (${(counts[status] - items.length).toLocaleString('en-IN')} left)`}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
