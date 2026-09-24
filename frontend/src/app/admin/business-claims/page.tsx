'use client';

import { useCallback, useEffect, useState } from 'react';
import { FileCheck, Phone, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import EmptyState from '@/components/empty-state/EmptyState';
import type { AdminBusinessClaim } from '@/lib/types';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000';

// Document links are signed and expire ~10 minutes after the list loads —
// hit Refresh if an image stops opening.
export default function AdminBusinessClaimsPage() {
  const [claims, setClaims] = useState<AdminBusinessClaim[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [rejecting, setRejecting] = useState<string | null>(null);
  const [reason, setReason] = useState('');

  // Email claims: owner emailed proof to support; admin grants ownership here
  const [emailBizId, setEmailBizId] = useState('');
  const [emailPhone, setEmailPhone] = useState('');
  const [emailNote, setEmailNote] = useState('');
  const [emailBusy, setEmailBusy] = useState(false);

  const approveEmailClaim = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = localStorage.getItem('access_token');
    setEmailBusy(true);
    try {
      const res = await fetch(`${API_BASE}/api/v1/admin/business-claims/email`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ business_id: emailBizId.trim(), phone: emailPhone.trim(), note: emailNote.trim() || null }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const detail = Array.isArray(data.detail) ? 'Check the business ID' : data.detail;
        throw new Error(detail ?? 'Could not approve');
      }
      toast.success(`${data.owner ?? 'Owner'} now manages ${data.business}`);
      setEmailBizId(''); setEmailPhone(''); setEmailNote('');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not approve');
    } finally {
      setEmailBusy(false);
    }
  };

  const load = useCallback(async () => {
    const token = localStorage.getItem('access_token');
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/v1/admin/business-claims?status=pending`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error();
      setClaims(await res.json());
    } catch {
      toast.error('Failed to load claims');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const act = async (id: string, action: 'approve' | 'reject') => {
    const token = localStorage.getItem('access_token');
    setBusyId(id);
    try {
      const res = await fetch(`${API_BASE}/api/v1/admin/business-claims/${id}/${action}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: action === 'reject' ? JSON.stringify({ reason }) : undefined,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail ?? 'Action failed');
      }
      toast.success(action === 'approve' ? 'Approved — owner notified' : 'Rejected — claimant notified');
      setRejecting(null);
      setReason('');
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Action failed');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold">Business Claims</h1>
          <p className="text-sm text-muted-foreground">
            Check the document name and address match the business, the shop photo shows the signboard,
            and call the contact number if unsure.
          </p>
        </div>
        <button onClick={load} className="text-sm font-semibold px-3 py-1.5 rounded-lg border hover:bg-slate-50">
          Refresh
        </button>
      </div>

      <form onSubmit={approveEmailClaim} className="bg-white rounded-xl border p-5 mb-6">
        <p className="font-semibold text-sm">Approve an email claim</p>
        <p className="text-xs text-muted-foreground mb-3">
          For owners who emailed their documents to support@localsindia.com. The subject has the business ID;
          the owner must have signed up with the mobile number they gave.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-[2fr_1fr_2fr_auto] gap-2">
          <input value={emailBizId} onChange={e => setEmailBizId(e.target.value)} required
            placeholder="Business ID" className="border rounded-lg px-3 py-2 text-sm font-mono" />
          <input value={emailPhone} onChange={e => setEmailPhone(e.target.value)} required
            placeholder="Account mobile" inputMode="tel" className="border rounded-lg px-3 py-2 text-sm" />
          <input value={emailNote} onChange={e => setEmailNote(e.target.value)}
            placeholder="Note, e.g. GST cert + shop photo" className="border rounded-lg px-3 py-2 text-sm" />
          <button disabled={emailBusy} className="px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-semibold disabled:opacity-50">
            {emailBusy ? 'Saving…' : 'Make owner'}
          </button>
        </div>
      </form>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-48 bg-white rounded-xl animate-pulse" />)}
        </div>
      ) : claims.length === 0 ? (
        <EmptyState icon={FileCheck} title="No claims waiting" description="New ownership claims with documents will appear here" />
      ) : (
        <div className="space-y-4">
          {claims.map(c => (
            <div key={c.id} className="bg-white rounded-xl border p-5">
              <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
                <div>
                  <a
                    href={`/${c.business.city_slug}/businesses/${c.business.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-bold hover:underline inline-flex items-center gap-1"
                  >
                    {c.business.name} <ExternalLink className="w-3.5 h-3.5 opacity-50" />
                  </a>
                  <p className="text-xs text-muted-foreground">
                    {c.business.address ?? 'No address'} · listed phone {c.business.phone ?? '—'}
                  </p>
                  {c.business.already_claimed && (
                    <p className="text-xs font-semibold text-amber-700 mt-1">
                      Already has an owner — approving transfers ownership to this claimant
                    </p>
                  )}
                </div>
                <div className="text-right text-sm">
                  <p className="font-semibold">{c.claimant.name ?? 'Unnamed user'}</p>
                  <p className="text-xs text-muted-foreground">account {c.claimant.phone ?? '—'}</p>
                  {c.contact_phone && (
                    <a href={`tel:${c.contact_phone}`} className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 mt-1">
                      <Phone className="w-3 h-3" /> Call {c.contact_phone}
                    </a>
                  )}
                </div>
              </div>

              <p className="text-sm mb-2"><span className="font-semibold">Document:</span> {c.doc_label}</p>
              {c.note && <p className="text-sm text-slate-600 mb-3">&ldquo;{c.note}&rdquo;</p>}

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
                {[
                  ['Document', c.document_url],
                  ['Shop photo', c.shop_photo_url],
                  ['Visiting card', c.visiting_card_url],
                ].map(([label, url]) => (
                  <div key={label} className="text-xs">
                    <p className="font-semibold mb-1">{label}</p>
                    {url ? (
                      <a href={url} target="_blank" rel="noopener noreferrer">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={url} alt={label ?? ''} className="w-full h-40 object-cover rounded-lg border" />
                      </a>
                    ) : (
                      <div className="h-40 rounded-lg border border-dashed flex items-center justify-center text-muted-foreground">
                        Not provided
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {rejecting === c.id ? (
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    value={reason}
                    onChange={e => setReason(e.target.value)}
                    placeholder="Reason the claimant will see, e.g. name on bill doesn't match"
                    className="flex-1 border rounded-lg px-3 py-2 text-sm"
                  />
                  <button
                    disabled={busyId === c.id || !reason.trim()}
                    onClick={() => act(c.id, 'reject')}
                    className="px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-semibold disabled:opacity-50"
                  >
                    Confirm reject
                  </button>
                  <button onClick={() => setRejecting(null)} className="px-4 py-2 rounded-lg border text-sm">Cancel</button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <button
                    disabled={busyId === c.id}
                    onClick={() => act(c.id, 'approve')}
                    className="px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-semibold disabled:opacity-50"
                  >
                    Approve
                  </button>
                  <button
                    disabled={busyId === c.id}
                    onClick={() => { setRejecting(c.id); setReason(''); }}
                    className="px-4 py-2 rounded-lg border border-red-200 text-red-600 text-sm font-semibold"
                  >
                    Reject
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
