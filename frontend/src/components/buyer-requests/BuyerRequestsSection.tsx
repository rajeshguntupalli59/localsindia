'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Send, MessageCircle } from 'lucide-react';
import { api } from '@/lib/api';
import type { BuyerRequestOut, Category } from '@/lib/types';
import { timeAgo, formatPrice } from '@/lib/utils';
import { toast } from 'sonner';

interface Props {
  citySlug: string;
}

const CATEGORY_ICONS: Record<string, string> = {
  tiffin: '🍱', 'pg-roommate': '🏠', jobs: '💼', vehicles: '🚗',
  electronics: '📱', events: '🎉', businesses: '🏪', education: '📚',
  services: '🛠️', classifieds: '🏷️', 'real-estate': '🏗️', furniture: '🛋️', fashion: '👗',
};

export default function BuyerRequestsSection({ citySlug }: Props) {
  const [requests, setRequests] = useState<BuyerRequestOut[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ category_slug: '', description: '', budget: '' });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    api.buyerRequests.list(citySlug).then(setRequests).catch(() => {});
    api.categories.list().then(setCategories).catch(() => {});
  }, [citySlug]);

  const handlePost = async () => {
    if (!form.category_slug) { toast.error('Pick a category'); return; }
    if (form.description.trim().length < 10) { toast.error('Describe what you need (10+ chars)'); return; }
    const token = localStorage.getItem('access_token');
    if (!token) { toast.error('Please login to post a request'); return; }
    const user = JSON.parse(localStorage.getItem('user') ?? '{}');
    if (!user.phone) { toast.error('Please add your phone number in profile'); return; }

    setSubmitting(true);
    try {
      const r = await api.buyerRequests.create({
        city_slug: citySlug,
        category_slug: form.category_slug,
        description: form.description.trim(),
        budget: form.budget ? parseFloat(form.budget) : undefined,
        contact_phone: user.phone,
      }, token);
      setRequests(prev => [r, ...prev]);
      setShowModal(false);
      setForm({ category_slug: '', description: '', budget: '' });
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
          <h2 className="font-black text-base" style={{ color: 'var(--li-text)' }}>🔍 Wanted</h2>
          <p className="text-xs" style={{ color: 'var(--li-muted)' }}>People looking to buy — reach out if you have it</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="text-xs font-bold px-3 py-1.5 rounded-full text-white"
          style={{ background: 'var(--li-primary)' }}
        >
          + I'm looking for...
        </button>
      </div>

      {/* Request cards — horizontal scroll */}
      {requests.length > 0 ? (
        <div className="flex gap-3 overflow-x-auto px-4 pb-2 snap-x" style={{ scrollbarWidth: 'none' }}>
          {requests.map(r => (
            <div
              key={r.id}
              className="shrink-0 w-52 bg-white rounded-2xl border p-3 snap-start"
              style={{ borderColor: 'var(--li-border)' }}
            >
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xl">{CATEGORY_ICONS[r.category_slug ?? ''] ?? '🔍'}</span>
                <span className="text-xs font-semibold" style={{ color: 'var(--li-muted)' }}>{r.category_name}</span>
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
              <a
                href={`https://wa.me/${r.contact_phone.replace('+', '')}?text=${encodeURIComponent(`Hi! I saw your request on LocalIndia for "${r.description.slice(0, 50)}" — I can help!`)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-1.5 w-full py-1.5 rounded-xl text-xs font-bold text-white"
                style={{ background: '#25D366' }}
              >
                <MessageCircle className="w-3.5 h-3.5" /> I have this!
              </a>
            </div>
          ))}
        </div>
      ) : (
        <p className="px-4 text-sm" style={{ color: 'var(--li-muted)' }}>
          No requests yet — be the first to post what you're looking for.
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
                <button onClick={() => setShowModal(false)}><X className="w-5 h-5" style={{ color: 'var(--li-muted)' }} /></button>
              </div>

              {/* Category chips */}
              <p className="text-xs font-semibold mb-2" style={{ color: 'var(--li-muted)' }}>Category</p>
              <div className="flex flex-wrap gap-2 mb-4">
                {categories.map(cat => (
                  <button
                    key={cat.id}
                    onClick={() => setForm(f => ({ ...f, category_slug: cat.slug }))}
                    className="px-3 py-1.5 rounded-full text-sm font-semibold border-2 transition-all"
                    style={form.category_slug === cat.slug
                      ? { borderColor: 'var(--li-primary)', background: 'var(--li-primary-light)', color: 'var(--li-primary)' }
                      : { borderColor: 'var(--li-border)', color: 'var(--li-muted)' }}
                  >
                    {CATEGORY_ICONS[cat.slug] ?? '🏷️'} {cat.name}
                  </button>
                ))}
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
              <div className="relative mb-5">
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

              <button
                onClick={handlePost}
                disabled={submitting}
                className="w-full py-3 rounded-2xl font-bold text-sm text-white flex items-center justify-center gap-2 disabled:opacity-60"
                style={{ background: 'var(--li-primary)' }}
              >
                <Send className="w-4 h-4" />
                {submitting ? 'Posting...' : 'Post Request'}
              </button>
              <p className="text-xs text-center mt-3" style={{ color: 'var(--li-muted)' }}>
                Sellers in your city will contact you on WhatsApp
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
