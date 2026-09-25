'use client';

import { useEffect, useState } from 'react';
import { X, MessageSquare, FileText, CheckCircle2, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { api, ApiError } from '@/lib/api';
import type { ClaimOptions } from '@/lib/types';
import ReviewInvite from '@/components/review-invite/ReviewInvite';

type Tab = 'otp' | 'documents';

/**
 * Ways to prove you own a business:
 *  - SMS code to the business's listed mobile (instant)
 *  - Document + shopfront photo (+ optional visiting card), reviewed by our team,
 *    who may call the contact number given here
 *  - Or email the same proof to support; admin approves it from /admin/business-claims
 */
export default function ClaimBusinessModal({
  businessId,
  businessName,
  onClose,
  onClaimed,
}: {
  businessId: string;
  businessName: string;
  onClose: () => void;
  onClaimed: () => void;
}) {
  const [opts, setOpts] = useState<ClaimOptions | null>(null);
  const [tab, setTab] = useState<Tab>('otp');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<'approved' | 'pending' | null>(null);

  // OTP
  const [codeSent, setCodeSent] = useState(false);
  const [otp, setOtp] = useState('');

  // Documents
  const [docType, setDocType] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [note, setNote] = useState('');
  const [documentFile, setDocumentFile] = useState<File | null>(null);
  const [shopPhoto, setShopPhoto] = useState<File | null>(null);
  const [visitingCard, setVisitingCard] = useState<File | null>(null);

  const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;

  // Email fallback: owner sends proof to support, admin grants ownership from
  // /admin/business-claims. Their account phone is how the admin finds them.
  const emailHref = (() => {
    let accountPhone = '';
    try { accountPhone = JSON.parse(localStorage.getItem('user') ?? 'null')?.phone ?? ''; } catch { /* ignore */ }
    const subject = `Business claim: ${businessName} (${businessId})`;
    const body = [
      `Business: ${businessName}`,
      `Business ID: ${businessId}`,
      `My LocalsIndia account mobile: ${accountPhone}`,
      'Number you can call me on: ',
      '',
      'Attached:',
      '- A document showing the business name (GST, trade licence, FSSAI, Udyam, utility bill, etc.)',
      '- A photo of the shopfront with the name board visible',
      '- My visiting card (optional)',
    ].join('\n');
    return `mailto:support@localsindia.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  })();

  useEffect(() => {
    if (!token) return;
    try {
      const u = JSON.parse(localStorage.getItem('user') ?? 'null');
      if (u?.phone && /^\+91[6-9]\d{9}$/.test(u.phone)) setContactPhone(u.phone.slice(3));
    } catch { /* ignore */ }
    api.businesses.claimOptions(businessId, token)
      .then(o => { setOpts(o); setTab(o.otp_available ? 'otp' : 'documents'); })
      .catch(err => toast.error(err instanceof ApiError ? err.message : 'Could not load claim options'));
  }, [businessId, token]);

  const sendCode = async () => {
    if (!token) return;
    setBusy(true);
    try {
      const res = await api.businesses.sendClaimOtp(businessId, token);
      setCodeSent(true);
      toast.success(`Code sent to ${res.masked_phone}`);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Could not send the code');
    } finally {
      setBusy(false);
    }
  };

  const verifyCode = async () => {
    if (!token) return;
    setBusy(true);
    try {
      await api.businesses.verifyClaimOtp(businessId, otp.trim(), token);
      setDone('approved');
      onClaimed();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Could not verify the code');
    } finally {
      setBusy(false);
    }
  };

  const submitDocuments = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    if (!docType || !documentFile || !shopPhoto) {
      toast.error('Choose a document type and add the document and shop photo');
      return;
    }
    const form = new FormData();
    form.append('doc_type', docType);
    form.append('contact_phone', contactPhone);
    if (note.trim()) form.append('note', note.trim());
    form.append('document', documentFile);
    form.append('shop_photo', shopPhoto);
    if (visitingCard) form.append('visiting_card', visitingCard);
    setBusy(true);
    try {
      await api.businesses.submitClaimDocuments(businessId, form, token);
      setDone('pending');
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Could not submit your documents');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center p-0 sm:p-4" role="dialog" aria-modal="true">
      <div className="bg-white w-full sm:max-w-lg rounded-t-3xl sm:rounded-3xl max-h-[92vh] overflow-y-auto p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-lg font-black" style={{ color: 'var(--li-text)' }}>Claim {businessName}</h2>
            <p className="text-xs mt-0.5" style={{ color: 'var(--li-muted)' }}>
              Prove you own or manage this business to edit it and reply to customers.
            </p>
          </div>
          <button onClick={onClose} aria-label="Close" className="p-1 text-slate-400 hover:text-slate-700">
            <X className="w-5 h-5" />
          </button>
        </div>

        {done === 'approved' ? (
          <Result icon={<CheckCircle2 className="w-10 h-10 text-emerald-500" />} title="You now manage this business"
            body="You can edit the details, add photos and see your analytics." onClose={onClose}>
            <ReviewInvite businessName={businessName}
              url={`https://www.localsindia.com${window.location.pathname}`} />
          </Result>
        ) : done === 'pending' || opts?.pending_claim ? (
          <Result icon={<Clock className="w-10 h-10 text-amber-500" />} title="Your claim is under review"
            body="Our team checks claims within 1–2 days and may call the number you gave. You'll get a notification with the result."
            onClose={onClose} />
        ) : !opts ? (
          <div className="h-40 rounded-2xl bg-slate-100 animate-pulse" />
        ) : (
          <>
            {opts.claimed && (
              <p className="text-xs rounded-xl p-3 mb-4" style={{ background: '#FFFBEB', color: '#78350F' }}>
                Someone already manages this listing. If it&apos;s really yours, send documents — our team will review
                and can transfer ownership.
              </p>
            )}

            {opts.otp_available && (
              <div className="grid grid-cols-2 gap-2 mb-5 p-1 rounded-xl bg-slate-100">
                <TabButton active={tab === 'otp'} onClick={() => setTab('otp')} icon={<MessageSquare className="w-4 h-4" />}>
                  SMS code
                </TabButton>
                <TabButton active={tab === 'documents'} onClick={() => setTab('documents')} icon={<FileText className="w-4 h-4" />}>
                  Documents
                </TabButton>
              </div>
            )}

            {tab === 'otp' && opts.otp_available ? (
              <div className="space-y-4">
                <p className="text-sm" style={{ color: 'var(--li-text)' }}>
                  We&apos;ll text a 6-digit code to the business&apos;s listed number <strong>{opts.masked_phone}</strong>.
                </p>
                {!codeSent ? (
                  <button onClick={sendCode} disabled={busy}
                    className="w-full py-3 rounded-xl text-white font-semibold text-sm disabled:opacity-50"
                    style={{ background: 'var(--li-primary)' }}>
                    {busy ? 'Sending…' : 'Send code'}
                  </button>
                ) : (
                  <div className="space-y-3">
                    <input value={otp} onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      inputMode="numeric" autoComplete="one-time-code" placeholder="Enter 6-digit code"
                      className="w-full border rounded-xl px-4 py-3 text-center text-lg tracking-[0.4em]" />
                    <button onClick={verifyCode} disabled={busy || otp.length < 4}
                      className="w-full py-3 rounded-xl text-white font-semibold text-sm disabled:opacity-50"
                      style={{ background: 'var(--li-primary)' }}>
                      {busy ? 'Checking…' : 'Verify and claim'}
                    </button>
                    <button onClick={sendCode} disabled={busy} className="w-full text-xs font-semibold underline" style={{ color: 'var(--li-muted)' }}>
                      Resend code
                    </button>
                  </div>
                )}
                <button onClick={() => setTab('documents')} className="w-full text-xs font-semibold" style={{ color: 'var(--li-primary)' }}>
                  Don&apos;t have this number any more? Verify with documents instead →
                </button>
              </div>
            ) : (
              <form onSubmit={submitDocuments} className="space-y-4">
                <Field label="Document type">
                  <select value={docType} onChange={e => setDocType(e.target.value)} required
                    className="w-full border rounded-xl px-3 py-2.5 text-sm bg-white">
                    <option value="">Choose one that shows the business name…</option>
                    {opts.doc_types.map(d => <option key={d.key} value={d.key}>{d.label}</option>)}
                  </select>
                </Field>

                <FileField label="Photo of the document" hint="Business name (and address if shown) must be readable"
                  file={documentFile} onChange={setDocumentFile} required />
                <FileField label="Shopfront photo" hint="Take it at the shop with the name board visible"
                  file={shopPhoto} onChange={setShopPhoto} required capture />
                <FileField label="Visiting card (optional)" hint="Helps us match your name and number"
                  file={visitingCard} onChange={setVisitingCard} />

                <Field label="Mobile number our team can call">
                  <div className="flex items-center border rounded-xl overflow-hidden">
                    <span className="px-3 text-sm text-slate-500 bg-slate-50 self-stretch flex items-center">+91</span>
                    <input value={contactPhone} onChange={e => setContactPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                      inputMode="numeric" required pattern="[6-9][0-9]{9}" placeholder="10-digit mobile"
                      className="flex-1 px-3 py-2.5 text-sm outline-none" />
                  </div>
                </Field>

                <Field label="Anything we should know? (optional)">
                  <textarea value={note} onChange={e => setNote(e.target.value)} rows={2} maxLength={500}
                    placeholder="e.g. The listed number is our old landline"
                    className="w-full border rounded-xl px-3 py-2 text-sm" />
                </Field>

                <p className="text-[11px]" style={{ color: 'var(--li-muted)' }}>
                  Your documents are private — only the LocalsIndia review team can see them. They are never shown on the site.
                </p>

                <button type="submit" disabled={busy}
                  className="w-full py-3 rounded-xl text-white font-semibold text-sm disabled:opacity-50"
                  style={{ background: 'var(--li-primary)' }}>
                  {busy ? 'Uploading…' : 'Submit for review'}
                </button>
              </form>
            )}

            <div className="mt-5 pt-4 border-t text-center" style={{ borderColor: 'var(--li-border)' }}>
              <p className="text-xs" style={{ color: 'var(--li-muted)' }}>
                Prefer email? Send the same documents to{' '}
                <a href={emailHref} className="font-semibold underline" style={{ color: 'var(--li-primary)' }}>
                  support@localsindia.com
                </a>
                {' '}— we&apos;ll fill in the business details for you.
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function TabButton({ active, onClick, icon, children }: { active: boolean; onClick: () => void; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick}
      className={`flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-semibold transition-colors ${active ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500'}`}>
      {icon}{children}
    </button>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--li-text)' }}>{label}</span>
      {children}
    </label>
  );
}

function FileField({ label, hint, file, onChange, required, capture }: {
  label: string; hint: string; file: File | null; onChange: (f: File | null) => void; required?: boolean; capture?: boolean;
}) {
  return (
    <Field label={label}>
      <input type="file" accept="image/jpeg,image/png,image/webp" required={required}
        {...(capture ? { capture: 'environment' as const } : {})}
        onChange={e => {
          const f = e.target.files?.[0] ?? null;
          if (f && f.size > 5 * 1024 * 1024) { toast.error('Each photo must be under 5 MB'); e.target.value = ''; return; }
          onChange(f);
        }}
        className="block w-full text-xs file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:bg-orange-50 file:text-orange-700 file:font-semibold" />
      <span className="block text-[11px] mt-1" style={{ color: 'var(--li-muted)' }}>{file ? `✓ ${file.name}` : hint}</span>
    </Field>
  );
}

function Result({ icon, title, body, onClose, children }: {
  icon: React.ReactNode; title: string; body: string; onClose: () => void; children?: React.ReactNode;
}) {
  return (
    <div className="text-center py-6">
      <div className="flex justify-center mb-3">{icon}</div>
      <p className="font-bold" style={{ color: 'var(--li-text)' }}>{title}</p>
      <p className="text-sm mt-1 mb-5" style={{ color: 'var(--li-muted)' }}>{body}</p>
      {children && <div className="mb-5">{children}</div>}
      <button onClick={onClose} className="px-6 py-2.5 rounded-xl border text-sm font-semibold">Close</button>
    </div>
  );
}
