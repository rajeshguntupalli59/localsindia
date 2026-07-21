'use client';

import { useState } from 'react';
import { ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import { loadRazorpay, openRazorpay } from '@/lib/razorpay';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000';
const RZP_KEY = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID ?? '';

const BADGE_PLANS: { key: string; label: string; price: string; days: number }[] = [
  { key: 'monthly',   label: '1 Month',  price: '₹499',   days: 30 },
  { key: 'quarterly', label: '3 Months', price: '₹1,299', days: 90 },
];

/**
 * Shared "Get Verified" badge purchase modal — used both on a business's own
 * detail page and inline right after creating a business, so the offer isn't
 * only discoverable if the owner happens to come back to their listing later.
 */
export default function GetVerifiedModal({
  businessId,
  onClose,
  onVerified,
}: {
  businessId: string;
  onClose: () => void;
  onVerified: () => void;
}) {
  const [paying, setPaying] = useState<string | null>(null);

  const startBadgePayment = async (planKey: string) => {
    const token = localStorage.getItem('access_token');
    if (!token) return;
    setPaying(planKey);
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
            onVerified();
          } catch {
            toast.error('Payment received but verification failed. Contact support.');
          }
        },
        modal: { ondismiss: () => setPaying(null) },
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Payment failed');
    } finally {
      setPaying(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-sm p-6 shadow-xl">
        <div className="flex items-center gap-2 mb-1">
          <ShieldCheck className="w-5 h-5 text-blue-600" />
          <h3 className="text-lg font-black text-slate-900">Get Verified</h3>
        </div>
        <p className="text-sm text-slate-500 mb-5">
          Your business is already live. Add the blue ✓ badge for priority ranking in search, or skip — you can get verified anytime from your business page.
        </p>

        <div className="space-y-3 mb-5">
          {BADGE_PLANS.map(plan => (
            <div key={plan.key} className="flex items-center justify-between p-4 rounded-xl border-2 border-slate-100 hover:border-blue-200 transition-colors">
              <div>
                <p className="font-bold text-slate-900">{plan.label}</p>
                <p className="text-xs text-slate-500">{plan.days} days · auto-renew anytime</p>
              </div>
              <button
                onClick={() => startBadgePayment(plan.key)}
                disabled={paying !== null}
                className="px-4 py-2 rounded-xl bg-blue-600 text-white text-sm font-bold hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {paying === plan.key ? 'Opening...' : plan.price}
              </button>
            </div>
          ))}
        </div>

        <button
          onClick={onClose}
          className="w-full py-2.5 rounded-xl border border-slate-200 text-sm text-slate-600 hover:bg-slate-50 transition-colors"
        >
          Skip for now — my business is already listed
        </button>
      </div>
    </div>
  );
}
