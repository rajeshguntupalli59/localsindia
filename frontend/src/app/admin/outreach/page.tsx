'use client';

import { useCallback, useEffect, useState } from 'react';
import { Phone, MessageCircle, Copy, ExternalLink, PhoneCall, Mail, Send } from 'lucide-react';
import { toast } from 'sonner';
import AdminPager from '@/components/admin-pager/AdminPager';
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

interface EmailProgress {
  sent_total: number;
  sent_today: number;
  auto_sent_today: number;
  daily_limit: number;
  addresses_left: number;
  claimed_after_email: number;
  unsubscribed: number;
  bounced: number;
  last_sent_at: string | null;
}

const CLAIM_METHODS: Record<string, string> = {
  otp: 'SMS code',
  email_otp: 'Email code',
  documents: 'Documents',
  email: 'Proof by email',
};

const authHeaders = () => ({
  Authorization: `Bearer ${localStorage.getItem('access_token')}`,
  'Content-Type': 'application/json',
});

// JustDial-style owner outreach: call or WhatsApp each business yourself,
// one at a time, then log what happened. Claim emails also go out automatically
// (100/day, each address once) — the summary card shows where that's at.
export default function AdminOutreachPage() {
  const [cities, setCities] = useState<City[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [city, setCity] = useState('');  // all cities, so the tabs match the card's totals
  const [category, setCategory] = useState('');
  const [status, setStatus] = useState<OutreachStatus>('todo');
  const [items, setItems] = useState<OutreachItem[]>([]);
  const [counts, setCounts] = useState(EMPTY_COUNTS);
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(25);
  const [loading, setLoading] = useState(true);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [busyId, setBusyId] = useState<string | null>(null);
  const [emailDrafts, setEmailDrafts] = useState<Record<string, string>>({});
  const [progress, setProgress] = useState<EmailProgress | null>(null);

  const loadProgress = useCallback(() => {
    fetch(`${API_BASE}/api/v1/admin/outreach/email-progress`, { headers: authHeaders() })
      .then(r => (r.ok ? r.json() : null)).then(setProgress).catch(() => {});
  }, []);

  useEffect(() => {
    fetch(`${API_BASE}/api/v1/cities`).then(r => r.json()).then(setCities).catch(() => {});
    fetch(`${API_BASE}/api/v1/categories`).then(r => r.json()).then(setCategories).catch(() => {});
  }, []);

  const load = useCallback(async (p: number) => {
    setLoading(true);
    try {
      const qs = new URLSearchParams({ status, page: String(p), page_size: String(perPage) });
      if (city) qs.set('city_slug', city);
      if (category) qs.set('category_slug', category);
      const res = await fetch(`${API_BASE}/api/v1/admin/outreach?${qs}`, { headers: authHeaders() });
      if (!res.ok) throw new Error();
      const data: OutreachQueue = await res.json();
      setCounts(data.counts);
      setItems(data.items);
      setPage(p);
    } catch {
      toast.error('Failed to load the outreach list');
    } finally {
      setLoading(false);
    }
  }, [city, category, status, perPage]);

  useEffect(() => { load(1); loadProgress(); }, [load, loadProgress]);

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

  const saveEmail = async (item: OutreachItem) => {
    setBusyId(item.id);
    try {
      const res = await fetch(`${API_BASE}/api/v1/admin/outreach/${item.id}/email`, {
        method: 'PUT',
        headers: authHeaders(),
        body: JSON.stringify({ email: emailDrafts[item.id]?.trim() || null }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail);
      setItems(prev => prev.map(i => i.id === item.id ? { ...i, email: data.email } : i));
      setEmailDrafts(d => { const rest = { ...d }; delete rest[item.id]; return rest; });
      toast.success(data.email ? 'Email saved' : 'Email removed');
    } catch (e) {
      toast.error(e instanceof Error && e.message ? e.message : 'Could not save the email');
    } finally {
      setBusyId(null);
    }
  };

  // Sends ONE claim invite to this business; the server logs it as "Email sent"
  const sendEmail = async (item: OutreachItem) => {
    setBusyId(item.id);
    try {
      const res = await fetch(`${API_BASE}/api/v1/admin/outreach/${item.id}/send-email`, {
        method: 'POST',
        headers: authHeaders(),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail);
      if (status !== 'follow_up') {
        setItems(prev => prev.filter(i => i.id !== item.id));
        setCounts(c => ({ ...c, [status]: c[status] - 1, follow_up: c.follow_up + 1 }));
      } else {
        setItems(prev => prev.map(i => i.id === item.id
          ? { ...i, last_outcome: 'email_sent', last_contacted_at: new Date().toISOString(), attempts: i.attempts + 1 }
          : i));
      }
      toast.success(`Claim email sent to ${item.email}`);
      loadProgress();
    } catch (e) {
      toast.error(e instanceof Error && e.message ? e.message : 'Could not send the email');
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
          happened. WhatsApp opens with a message pre-filled — you press send. &ldquo;Send claim email&rdquo; emails one
          business at a time (with an unsubscribe link; max once per 30 days). Only message each business once; if they
          say stop, mark them &ldquo;Not interested&rdquo;.
        </p>
      </div>

      {progress && (
        <div className="rounded-2xl border bg-white p-4">
          <div className="flex items-center gap-2 mb-3">
            <Mail className="w-4 h-4 text-orange-500" />
            <span className="text-sm font-bold">Claim emails</span>
            <span className="text-xs text-muted-foreground">
              · {progress.daily_limit}/day go out automatically, each address once
              {progress.last_sent_at && <> · last sent {timeAgo(progress.last_sent_at)}</>}
            </span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
            <Stat label="Sent so far" value={progress.sent_total} />
            <Stat label="Sent today" value={`${progress.auto_sent_today} / ${progress.daily_limit}`}
              hint={progress.sent_today > progress.auto_sent_today ? `+${progress.sent_today - progress.auto_sent_today} by hand` : undefined} />
            <Stat label="Still to email" value={progress.addresses_left}
              hint={progress.addresses_left ? `~${Math.ceil(progress.addresses_left / progress.daily_limit)} days` : 'all done'} />
            <Stat label="Claimed after email" value={progress.claimed_after_email} good />
            <Stat label="Unsubscribed" value={progress.unsubscribed} />
            <Stat label="Bounced" value={progress.bounced}
              hint={progress.sent_total ? `${Math.round((progress.bounced / progress.sent_total) * 100)}% of sent` : undefined} />
          </div>
          <p className="text-[11px] text-muted-foreground mt-2">
            Emailed businesses move to the <strong>Follow up</strong> tab marked &ldquo;Email sent&rdquo; (automatic ones say &ldquo;Auto claim email&rdquo;).
            Bounced addresses are marked &ldquo;Wrong email&rdquo; once a day, before that day&rsquo;s emails go out, and are never emailed again.
          </p>
        </div>
      )}

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

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-36 bg-white rounded-xl animate-pulse" />)}
        </div>
      ) : items.length === 0 ? (
        <EmptyState icon={PhoneCall} title="Nothing here"
          description={status === 'todo' ? 'Every business with a phone number or email in this filter has been contacted' : 'No businesses in this list yet'} />
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
                    {status === 'claimed' && item.claim && (
                      <p className="text-xs mt-1 font-semibold text-emerald-700">
                        Claimed by {item.claim.owner_name}
                        {item.claim.owner_phone && <> · <a href={`tel:${item.claim.owner_phone}`} className="hover:underline">{item.claim.owner_phone}</a></>}
                        {item.claim.method && <> · {CLAIM_METHODS[item.claim.method] ?? item.claim.method}</>}
                        {item.claim.claimed_at && <> · {timeAgo(item.claim.claimed_at)}</>}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {item.phone && (
                      <a href={`tel:${item.mobile ?? item.phone}`}
                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border text-sm font-semibold">
                        <Phone className="w-4 h-4" /> {item.phone}
                      </a>
                    )}
                    {item.email && status !== 'claimed' && status !== 'closed' && (
                      <button disabled={busyId === item.id} onClick={() => sendEmail(item)}
                        title={`Send one claim invite to ${item.email}`}
                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold disabled:opacity-50">
                        <Send className="w-4 h-4" /> Send claim email
                      </button>
                    )}
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
                  <div className="mt-3 flex flex-col sm:flex-row sm:items-center gap-2">
                    <Mail className="hidden sm:block w-4 h-4 text-slate-400 shrink-0" />
                    <input type="email" aria-label="Owner email"
                      value={emailDrafts[item.id] ?? item.email ?? ''}
                      onChange={e => setEmailDrafts(d => ({ ...d, [item.id]: e.target.value }))}
                      placeholder="Owner email (from their website, Google, a call…)" maxLength={254}
                      className="flex-1 border rounded-lg px-3 py-2 text-sm" />
                    {item.email && item.email_shared_with > 0 && (
                      <span className="text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-2 py-1"
                        title="Same email on other listings — likely a chain head office or a duplicate listing. Check it belongs to THIS business before sending.">
                        Shared with {item.email_shared_with} other listing{item.email_shared_with > 1 ? 's' : ''}
                      </span>
                    )}
                    {item.id in emailDrafts && (emailDrafts[item.id].trim() !== (item.email ?? '')) && (
                      <button disabled={busyId === item.id} onClick={() => saveEmail(item)}
                        className="px-3 py-2 rounded-lg border text-xs font-semibold disabled:opacity-50">
                        Save email
                      </button>
                    )}
                  </div>
                )}

                {status !== 'claimed' && (
                  <div className="mt-2 flex flex-col lg:flex-row gap-2">
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
        </div>
      )}

      {!loading && (
        <AdminPager
          total={counts[status]}
          page={page}
          perPage={perPage}
          onPageChange={load}
          onPerPageChange={setPerPage}
        />
      )}
    </div>
  );
}

function Stat({ label, value, hint, good }: { label: string; value: number | string; hint?: string; good?: boolean }) {
  return (
    <div className="rounded-xl bg-slate-50 px-3 py-2">
      <div className={`text-lg font-black ${good ? 'text-emerald-600' : 'text-slate-900'}`}>{typeof value === 'number' ? value.toLocaleString('en-IN') : value}</div>
      <div className="text-[11px] font-semibold text-slate-500">{label}</div>
      {hint && <div className="text-[10px] text-slate-400">{hint}</div>}
    </div>
  );
}
