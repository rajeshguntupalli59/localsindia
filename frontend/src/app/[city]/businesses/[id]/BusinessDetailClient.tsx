'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, MapPin, Phone, Globe, Star, BadgeCheck, MessageCircle } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { api, ApiError } from '@/lib/api';
import type { Business } from '@/lib/types';

function StarPicker({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map(i => (
        <button
          key={i}
          type="button"
          onClick={() => onChange(i)}
          className="focus:outline-none"
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

  useEffect(() => {
    api.businesses.get(businessId)
      .then(setBusiness)
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
          <div className="flex gap-3 mt-5">
            {business.whatsapp_url && (
              <a
                href={business.whatsapp_url}
                target="_blank"
                rel="noopener noreferrer"
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
    </div>
  );
}
