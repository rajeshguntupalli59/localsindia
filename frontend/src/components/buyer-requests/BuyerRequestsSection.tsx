'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Send, MessageCircle, Search, Utensils, Home, Briefcase, Car,
  Smartphone, Calendar, Store, GraduationCap, Wrench, Tag, Building2, Sofa, Shirt, Flag, Check, Trash2,
  type LucideIcon,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { api, ApiError } from '@/lib/api';
import type { BuyerRequestOut, Category } from '@/lib/types';
import { timeAgo, formatPrice } from '@/lib/utils';
import { toast } from 'sonner';

interface Props {
  citySlug: string;
}

const CATEGORY_ICONS: Record<string, LucideIcon> = {
  tiffin: Utensils, 'pg-roommate': Home, jobs: Briefcase, vehicles: Car,
  electronics: Smartphone, events: Calendar, businesses: Store, education: GraduationCap,
  services: Wrench, classifieds: Tag, 'real-estate': Building2, furniture: Sofa, fashion: Shirt,
};

export default function BuyerRequestsSection({ citySlug }: Props) {
  const router = useRouter();
  const [requests, setRequests] = useState<BuyerRequestOut[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ category_slug: '', description: '', budget: '', contact_phone: '' });
  const [submitting, setSubmitting] = useState(false);
  const [reportedIds, setReportedIds] = useState<Set<string>>(new Set());
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    api.buyerRequests.list(citySlug).then(setRequests).catch(() => {});
    api.categories.list().then(setCategories).catch(() => {});
    try {
      const user = JSON.parse(localStorage.getItem('user') ?? 'null');
      setCurrentUserId(user?.id ?? null);
    } catch { /* no-op */ }
  }, [citySlug]);

  const handleFulfill = async (id: string) => {
    const token = localStorage.getItem('access_token');
    if (!token) return;
    try {
      await api.buyerRequests.fulfill(id, token);
      setRequests(prev => prev.filter(r => r.id !== id));
      toast.success('Marked as fulfilled');
    } catch {
      toast.error('Could not update request');
    }
  };

  const handleDelete = async (id: string) => {
    const token = localStorage.getItem('access_token');
    if (!token) return;
    try {
      await api.buyerRequests.delete(id, token);
      setRequests(prev => prev.filter(r => r.id !== id));
      toast.success('Request deleted');
    } catch {
      toast.error('Could not delete request');
    }
  };

  const handleReport = async (id: string) => {
    const token = localStorage.getItem('access_token');
    if (!token) { router.push('/auth/login'); return; }
    try {
      await api.buyerRequests.report(id, 'spam', token);
      setReportedIds(prev => new Set(prev).add(id));
      toast.success('Report submitted');
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Failed to report');
    }
  };

  const openModal = () => {
    try {
      const user = JSON.parse(localStorage.getItem('user') ?? 'null');
      // Pre-fill from the account's phone as a starting suggestion, but this
      // request may need a different number to reach the poster — always
      // shown and editable, never silently sent behind the scenes.
      const digits = (user?.phone ?? '').replace('+91', '');
      setForm(f => ({ ...f, contact_phone: digits }));
    } catch { /* no-op */ }
    setShowModal(true);
  };

  const handlePost = async () => {
    if (!form.category_slug) { toast.error('Pick a category'); return; }
    if (form.description.trim().length < 10) { toast.error('Describe what you need (10+ chars)'); return; }
    if (!/^[6-9]\d{9}$/.test(form.contact_phone)) { toast.error('Enter a valid 10-digit mobile number for buyers to contact you'); return; }
    const token = localStorage.getItem('access_token');
    if (!token) { toast.error('Please login to post a request'); return; }

    setSubmitting(true);
    try {
      const r = await api.buyerRequests.create({
        city_slug: citySlug,
        category_slug: form.category_slug,
        description: form.description.trim(),
        budget: form.budget ? parseFloat(form.budget) : undefined,
        contact_phone: `+91${form.contact_phone}`,
      }, token);
      setRequests(prev => [r, ...prev]);
      setShowModal(false);
      setForm({ category_slug: '', description: '', budget: '', contact_phone: '' });
      toast.success('Request posted! Sellers will reach out on WhatsApp.');
    } catch {
      toast.error('Could not post request');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mt-6">
      {/* Header row */}
      <div className="flex items-center justify-between px-4 mb-3">
        <div>
          <h2 className="font-black text-base flex items-center gap-1.5" style={{ color: 'var(--li-text)' }}>
            <Search size={16} /> Wanted
          </h2>
          <p className="text-xs" style={{ color: 'var(--li-muted)' }}>People looking to buy — reach out if you have it</p>
        </div>
        <button
          onClick={openModal}
          className="text-xs font-bold px-3 py-1.5 rounded-full text-white"
          style={{ background: 'var(--li-primary)' }}
        >
          + I&apos;m looking for...
        </button>
      </div>

      {/* Request cards — horizontal scroll */}
      {requests.length > 0 ? (
        <div className="flex gap-3 overflow-x-auto px-4 pb-2 snap-x" style={{ scrollbarWidth: 'none' }}>
          {requests.map(r => {
            const isOwner = currentUserId !== null && r.user_id === currentUserId;
            return (
            <div
              key={r.id}
              className="shrink-0 w-52 bg-white rounded-2xl border p-3 snap-start"
              style={{ borderColor: 'var(--li-border)' }}
            >
              <div className="flex items-center justify-between gap-2 mb-2">
                <div className="flex items-center gap-2">
                  {(() => {
                    const Icon = CATEGORY_ICONS[r.category_slug ?? ''] ?? Search;
                    return <Icon size={18} style={{ color: 'var(--li-primary)' }} />;
                  })()}
                  <span className="text-xs font-semibold" style={{ color: 'var(--li-muted)' }}>{r.category_name}</span>
                </div>
                {!isOwner && (
                  <button
                    type="button"
                    onClick={() => handleReport(r.id)}
                    disabled={reportedIds.has(r.id)}
                    aria-label="Report this request"
                    title={reportedIds.has(r.id) ? 'Reported' : 'Report this request'}
                    className="shrink-0 transition-colors disabled:cursor-default"
                    style={{ color: reportedIds.has(r.id) ? '#EF4444' : 'var(--li-muted)' }}
                  >
                    <Flag className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
              <p className="text-sm font-semibold line-clamp-2 mb-1" style={{ color: 'var(--li-text)' }}>
                {r.description}
              </p>
              {r.budget && (
                <p className="text-xs font-bold mb-2" style={{ color: 'var(--li-primary)' }}>
                  Budget: {formatPrice(r.budget)}
                </p>
              )}
              <p className="text-[10px] mb-2" style={{ color: 'var(--li-muted)' }}>{timeAgo(r.created_at)}</p>
              {isOwner ? (
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => handleFulfill(r.id)}
                    className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-xl text-xs font-bold text-white"
                    style={{ background: 'var(--li-primary)' }}
                  >
                    <Check className="w-3.5 h-3.5" /> Fulfilled
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(r.id)}
                    aria-label="Delete request"
                    title="Delete request"
                    className="px-2.5 rounded-xl border"
                    style={{ borderColor: 'var(--li-border)', color: 'var(--li-muted)' }}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <a
                  href={`https://wa.me/${r.contact_phone.replace('+', '')}?text=${encodeURIComponent(`Hi! I saw your request on LocalIndia for "${r.description.slice(0, 50)}" — I can help!`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-1.5 w-full py-1.5 rounded-xl text-xs font-bold text-white"
                  style={{ background: '#25D366' }}
                >
                  <MessageCircle className="w-3.5 h-3.5" /> I have this!
                </a>
              )}
            </div>
            );
          })}
        </div>
      ) : (
        <p className="px-4 text-sm" style={{ color: 'var(--li-muted)' }}>
          No requests yet — be the first to post what you&apos;re looking for.
        </p>
      )}

      {/* Post request modal */}
      <AnimatePresence>
        {showModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
            style={{ background: 'rgba(0,0,0,0.5)' }}
            onClick={e => e.target === e.currentTarget && setShowModal(false)}
          >
            <motion.div
              initial={{ y: 40, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 40, opacity: 0 }}
              className="w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl"
            >
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-lg font-black" style={{ color: 'var(--li-text)' }}>What are you looking for?</h2>
                <button onClick={() => setShowModal(false)} aria-label="Close">
                  <X className="w-5 h-5" style={{ color: 'var(--li-muted)' }} />
                </button>
              </div>

              {/* Category chips */}
              <p className="text-xs font-semibold mb-2" style={{ color: 'var(--li-muted)' }}>Category</p>
              <div className="flex flex-wrap gap-2 mb-4">
                {categories.map(cat => {
                  const Icon = CATEGORY_ICONS[cat.slug] ?? Tag;
                  const active = form.category_slug === cat.slug;
                  return (
                    <button
                      key={cat.id}
                      onClick={() => setForm(f => ({ ...f, category_slug: cat.slug }))}
                      className="px-3 py-1.5 rounded-full text-sm font-semibold border-2 transition-all flex items-center gap-1.5"
                      style={active
                        ? { borderColor: 'var(--li-primary)', background: 'var(--li-primary-light)', color: 'var(--li-primary)' }
                        : { borderColor: 'var(--li-border)', color: 'var(--li-muted)' }}
                      aria-pressed={active}
                    >
                      <Icon size={14} /> {cat.name}
                    </button>
                  );
                })}
              </div>

              {/* Description */}
              <p className="text-xs font-semibold mb-2" style={{ color: 'var(--li-muted)' }}>Describe what you need</p>
              <textarea
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                placeholder="e.g. Looking for a 2BHK PG for females in Banjara Hills under ₹7000, meals included"
                rows={3}
                className="w-full rounded-xl px-4 py-3 text-sm resize-none outline-none mb-4"
                style={{ border: '2px solid var(--li-border)', color: 'var(--li-text)' }}
              />

              {/* Budget */}
              <p className="text-xs font-semibold mb-2" style={{ color: 'var(--li-muted)' }}>Budget (optional)</p>
              <div className="relative mb-4">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-bold" style={{ color: 'var(--li-muted)' }}>₹</span>
                <input
                  type="number"
                  value={form.budget}
                  onChange={e => setForm(f => ({ ...f, budget: e.target.value }))}
                  placeholder="0"
                  className="w-full rounded-xl pl-8 pr-4 py-3 text-sm outline-none"
                  style={{ border: '2px solid var(--li-border)', color: 'var(--li-text)' }}
                />
              </div>

              {/* Contact number — always shown and editable, never silently
                  sent from the account's phone behind the scenes */}
              <p className="text-xs font-semibold mb-2" style={{ color: 'var(--li-muted)' }}>Contact number</p>
              <div className="flex items-center gap-2 rounded-xl px-4 mb-2" style={{ border: '2px solid var(--li-border)' }}>
                <span className="text-sm font-bold" style={{ color: 'var(--li-text)' }}>🇮🇳 +91</span>
                <input
                  type="tel"
                  value={form.contact_phone}
                  onChange={e => setForm(f => ({ ...f, contact_phone: e.target.value.replace(/\D/g, '').slice(0, 10) }))}
                  placeholder="10-digit number"
                  className="flex-1 py-3 text-sm outline-none"
                  style={{ color: 'var(--li-text)' }}
                />
              </div>
              <p className="text-xs mb-5" style={{ color: 'var(--li-muted)' }}>
                Buyers will see and message this number on WhatsApp — change it if you&apos;d rather they reach a different one.
              </p>

              <button
                onClick={handlePost}
                disabled={submitting}
                className="w-full py-3 rounded-2xl font-bold text-sm text-white flex items-center justify-center gap-2 disabled:opacity-60"
                style={{ background: 'var(--li-primary)' }}
              >
                <Send className="w-4 h-4" />
                {submitting ? 'Posting...' : 'Post Request'}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
