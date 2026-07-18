'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, MapPin, Phone, Globe, Star, BadgeCheck, MessageCircle, ShieldCheck } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { api, ApiError } from '@/lib/api';
import type { Business } from '@/lib/types';

import { loadRazorpay, openRazorpay } from '@/lib/razorpay';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000';
const RZP_KEY = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID ?? '';

const BADGE_PLANS: { key: string; label: string; price: string; days: number }[] = [
  { key: 'monthly',   label: '1 Month',   price: '₹499', days: 30 },
  { key: 'quarterly', label: '3 Months',  price: '₹1,299', days: 90 },
];

function StarPicker({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map(i => (
        <button
          key={i}
          type="button"
          onClick={() => onChange(i)}
          className="focus:outline-none"
          aria-label={`Rate ${i} star${i !== 1 ? 's' : ''}`}
          aria-pressed={i <= value}
        >
          <Star
            className={`w-7 h-7 transition-colors ${
              i <= value ? 'fill-amber-400 text-amber-400' : 'text-slate-300 hover:text-amber-300'
            }`}
          />
        </button>
      ))}
    </div>
  );
}

export default function BusinessDetailPage() {
  const params = useParams();
  const router = useRouter();
  const citySlug = params.city as string;
  const businessId = params.id as string;

  const [business, setBusiness] = useState<Business | null>(null);
  const [loading, setLoading] = useState(true);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewBody, setReviewBody] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const [badgeModal, setBadgeModal] = useState(false);
  const [badgePaying, setBadgePaying] = useState<string | null>(null);

  useEffect(() => {
    api.businesses.get(businessId)
      .then(b => {
        setBusiness(b);
        api.businesses.view(businessId); // fire-and-forget view count
      })
      .catch(() => router.push(`/${citySlug}/businesses`))
      .finally(() => setLoading(false));
  }, [businessId, citySlug, router]);

  const submitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = localStorage.getItem('access_token');
    if (!token) { router.push('/auth/login'); return; }
    setSubmittingReview(true);
    try {
      await api.businesses.addReview(businessId, { rating: reviewRating, body: reviewBody || undefined }, token);
      toast.success('Review submitted!');
      const updated = await api.businesses.get(businessId);
      setBusiness(updated);
      setReviewBody('');
      setReviewRating(5);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Failed to submit review');
    } finally {
      setSubmittingReview(false);
    }
  };

  const claimBusiness = async () => {
    const token = localStorage.getItem('access_token');
    if (!token) { router.push('/auth/login'); return; }
    setClaiming(true);
    try {
      const updated = await api.businesses.claim(businessId, token);
      setBusiness(updated);
      toast.success('Business claimed! Our team will verify it soon.');
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Failed to claim business');
    } finally {
      setClaiming(false);
    }
  };

  const startBadgePayment = async (planKey: string) => {
    const token = localStorage.getItem('access_token');
    if (!token) { router.push('/auth/login'); return; }
    setBadgePaying(planKey);
    try {
      const loaded = await loadRazorpay();
      if (!loaded) { toast.error('Payment gateway failed to load'); return; }

      const res = await fetch(`${API_BASE}/api/v1/payments/business-badge/create-order`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ business_id: businessId, plan: planKey }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail ?? 'Order creation failed');
      }
      const order = await res.json();

      openRazorpay({
        key: RZP_KEY || order.key_id,
        amount: order.amount,
        currency: order.currency,
        order_id: order.order_id,
        name: 'LocalsIndia',
        description: `Verified Business Badge — ${planKey === 'monthly' ? '1 Month' : '3 Months'}`,
        theme: { color: '#1A1A2E' },
        handler: async (response) => {
          try {
            const verifyRes = await fetch(`${API_BASE}/api/v1/payments/business-badge/verify`, {
              method: 'POST',
              headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                business_id: businessId,
                plan: planKey,
              }),
            });
            if (!verifyRes.ok) throw new Error('Verification failed');
            toast.success('Verified badge activated! Blue checkmark now shows on your business.');
            const updated = await api.businesses.get(businessId);
            setBusiness(updated);
            setBadgeModal(false);
          } catch {
            toast.error('Payment received but verification failed. Contact support.');
          }
        },
        modal: { ondismiss: () => setBadgePaying(null) },
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Payment failed');
    } finally {
      setBadgePaying(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--li-page-bg)' }}>
        <div className="animate-spin w-8 h-8 border-4 border-slate-200 border-t-orange-500 rounded-full" />
      </div>
    );
  }

  if (!business) return null;

  return (
    <div className="min-h-screen" style={{ background: 'var(--li-page-bg)' }}>
      <div className="max-w-2xl mx-auto px-4 py-8 pb-24">
        <Link
          href={`/${citySlug}/businesses`}
          className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-800 mb-6"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Businesses
        </Link>

        {/* Business card */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 mb-6">
          <div className="flex items-start justify-between mb-3">
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-black" style={{ color: 'var(--li-text)' }}>{business.name}</h1>
                {business.verified && (
                  <BadgeCheck className="w-5 h-5 text-blue-500" />
                )}
              </div>
              {business.avg_rating && business.review_count > 0 && (
                <div className="flex items-center gap-2 mt-1">
                  <div className="flex gap-0.5">
                    {[1, 2, 3, 4, 5].map(i => (
                      <Star
                        key={i}
                        className={`w-4 h-4 ${i <= Math.round(business.avg_rating!) ? 'fill-amber-400 text-amber-400' : 'text-slate-200'}`}
                      />
                    ))}
                  </div>
                  <span className="text-sm text-slate-600">
                    {business.avg_rating.toFixed(1)} · {business.review_count} review{business.review_count !== 1 ? 's' : ''}
                  </span>
                </div>
              )}
            </div>
          </div>

          {business.description && (
            <p className="text-slate-600 text-sm mb-4">{business.description}</p>
          )}

          <div className="space-y-2 text-sm">
            {business.address && (
              <div className="flex items-start gap-2 text-slate-600">
                <MapPin className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>{business.address}</span>
              </div>
            )}
            {business.phone && (
              <div className="flex items-center gap-2 text-slate-600">
                <Phone className="w-4 h-4 flex-shrink-0" />
                <a href={`tel:${business.phone}`} className="hover:underline">{business.phone}</a>
              </div>
            )}
            {business.website_url && (
              <div className="flex items-center gap-2 text-slate-600">
                <Globe className="w-4 h-4 flex-shrink-0" />
                <a href={business.website_url} target="_blank" rel="noopener noreferrer" className="hover:underline truncate">
                  {business.website_url.replace(/^https?:\/\//, '')}
                </a>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-3 mt-5 flex-wrap">
            {business.whatsapp_url && (
              <a
                href={business.whatsapp_url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => api.businesses.waClick(businessId)}
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-white font-semibold text-sm"
                style={{ background: '#25D366' }}
              >
                <MessageCircle className="w-4 h-4" />
                Chat on WhatsApp
              </a>
            )}
            {!business.owner_id && (
              <Button
                variant="outline"
                className="flex-1"
                onClick={claimBusiness}
                disabled={claiming}
              >
                {claiming ? 'Claiming...' : 'Claim this Business'}
              </Button>
            )}
          </div>

          {/* Analytics dashboard link — shown once the business has an owner on record */}
          {business.owner_id && (
            <Link
              href={`/${citySlug}/businesses/${businessId}/dashboard`}
              className="mt-3 flex items-center justify-center gap-2 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
            >
              View Analytics
            </Link>
          )}

          {/* Get Verified CTA — shown to owner if not yet verified */}
          {business.owner_id && !business.verified && (
            <div className="mt-4 p-4 rounded-xl border-2 border-blue-100 bg-blue-50 flex items-start gap-3">
              <ShieldCheck className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-semibold text-blue-900">Get Verified</p>
                <p className="text-xs text-blue-700 mt-0.5">Show the blue ✓ badge and rank higher in search. Starts at ₹499/month.</p>
              </div>
              <button
                onClick={() => setBadgeModal(true)}
                className="shrink-0 px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 transition-colors"
              >
                Get Verified
              </button>
            </div>
          )}

          {/* Badge expiry info for verified businesses */}
          {business.verified && business.badge_expires_at && (
            <div className="mt-3 flex items-center gap-2 text-xs text-green-700">
              <BadgeCheck className="w-4 h-4 text-blue-500" />
              Verified badge active · expires {new Date(business.badge_expires_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
              <button onClick={() => setBadgeModal(true)} className="underline text-blue-600 ml-1">Renew</button>
            </div>
          )}
        </div>

        {/* Reviews */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 mb-6">
          <h2 className="text-lg font-bold mb-4" style={{ color: 'var(--li-text)' }}>
            Reviews {business.review_count > 0 && `(${business.review_count})`}
          </h2>

          {business.reviews && business.reviews.length > 0 ? (
            <div className="space-y-4 mb-6">
              {business.reviews.map(review => (
                <div key={review.id} className="border-b border-slate-100 pb-4 last:border-0 last:pb-0">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="flex gap-0.5">
                      {[1, 2, 3, 4, 5].map(i => (
                        <Star key={i} className={`w-3.5 h-3.5 ${i <= review.rating ? 'fill-amber-400 text-amber-400' : 'text-slate-200'}`} />
                      ))}
                    </div>
                    <span className="text-xs text-slate-400">
                      {new Date(review.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </span>
                  </div>
                  {review.body && <p className="text-sm text-slate-600">{review.body}</p>}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-500 mb-6">No reviews yet. Be the first!</p>
          )}

          {/* Write review */}
          <form onSubmit={submitReview} className="space-y-4 pt-4 border-t border-slate-100">
            <h3 className="font-semibold text-slate-800">Write a Review</h3>
            <div className="space-y-1.5">
              <Label>Your Rating</Label>
              <StarPicker value={reviewRating} onChange={setReviewRating} />
            </div>
            <div className="space-y-1.5">
              <Label>Your Review (optional)</Label>
              <textarea
                className="w-full rounded-lg border border-input px-3 py-2 text-sm min-h-[80px] resize-none outline-none focus:ring-2 focus:ring-ring"
                placeholder="Share your experience..."
                value={reviewBody}
                onChange={e => setReviewBody(e.target.value)}
              />
            </div>
            <Button
              type="submit"
              className="w-full text-white"
              style={{ background: 'var(--li-primary)' }}
              disabled={submittingReview}
            >
              {submittingReview ? 'Submitting...' : 'Submit Review'}
            </Button>
          </form>
        </div>
      </div>

      {/* Badge plan selection modal */}
      {badgeModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setBadgeModal(false)} />
          <div className="relative bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-sm p-6 shadow-xl">
            <div className="flex items-center gap-2 mb-1">
              <ShieldCheck className="w-5 h-5 text-blue-600" />
              <h3 className="text-lg font-black text-slate-900">Get Verified</h3>
            </div>
            <p className="text-sm text-slate-500 mb-5">Blue ✓ badge on your profile, priority ranking in search.</p>

            <div className="space-y-3 mb-5">
              {BADGE_PLANS.map(plan => (
                <div key={plan.key} className="flex items-center justify-between p-4 rounded-xl border-2 border-slate-100 hover:border-blue-200 transition-colors">
                  <div>
                    <p className="font-bold text-slate-900">{plan.label}</p>
                    <p className="text-xs text-slate-500">{plan.days} days · auto-renew anytime</p>
                  </div>
                  <button
                    onClick={() => startBadgePayment(plan.key)}
                    disabled={badgePaying !== null}
                    className="px-4 py-2 rounded-xl bg-blue-600 text-white text-sm font-bold hover:bg-blue-700 disabled:opacity-50 transition-colors"
                  >
                    {badgePaying === plan.key ? 'Opening...' : plan.price}
                  </button>
                </div>
              ))}
            </div>

            <button
              onClick={() => setBadgeModal(false)}
              className="w-full py-2.5 rounded-xl border border-slate-200 text-sm text-slate-600 hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
