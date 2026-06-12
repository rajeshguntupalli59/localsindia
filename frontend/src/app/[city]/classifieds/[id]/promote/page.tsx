'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Star, Zap, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { loadRazorpay, openRazorpay } from '@/lib/razorpay';

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000';

const PLANS = [
  {
    id: 'week',
    label: '1 Week',
    price: 99,
    originalPrice: 199,
    perks: ['Top of city listing page', 'Featured badge', 'More visibility on WhatsApp shares'],
    popular: false,
  },
  {
    id: 'month',
    label: '1 Month',
    price: 199,
    originalPrice: 499,
    perks: ['Top of city listing page', 'Featured badge', 'More visibility on WhatsApp shares', 'Priority in search results', 'Best value for sellers'],
    popular: true,
  },
];

export default function PromotePage() {
  const { city, id } = useParams<{ city: string; id: string }>();
  const router = useRouter();
  const [selectedPlan, setSelectedPlan] = useState<'week' | 'month'>('month');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    loadRazorpay();
  }, []);

  const handlePayment = async () => {
    const token = localStorage.getItem('access_token');
    if (!token) {
      toast.error('Please sign in to promote your listing.');
      router.push(`/auth/login`);
      return;
    }

    setLoading(true);
    try {
      // 1. Create Razorpay order
      const res = await fetch(`${BACKEND_URL}/api/v1/payments/featured/create-order`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ listing_id: id, plan: selectedPlan }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail ?? 'Failed to create order');
      }
      const order = await res.json();

      const loaded = await loadRazorpay();
      if (!loaded) throw new Error('Razorpay failed to load. Check your connection.');

      const user = JSON.parse(localStorage.getItem('user') ?? '{}');

      // 2. Open Razorpay checkout
      openRazorpay({
        key: order.key_id,
        amount: order.amount,
        currency: 'INR',
        name: 'LocalsIndia',
        description: `Featured Listing — ${selectedPlan === 'week' ? '1 Week' : '1 Month'}`,
        order_id: order.order_id,
        prefill: {
          name: user.name ?? '',
          contact: user.phone ?? '',
        },
        theme: { color: '#F7921E' },
        handler: async (response) => {
          // 3. Verify payment on backend
          try {
            const vRes = await fetch(`${BACKEND_URL}/api/v1/payments/featured/verify`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                listing_id: id,
                plan: selectedPlan,
              }),
            });
            if (!vRes.ok) throw new Error('Verification failed');
            setSuccess(true);
          } catch {
            toast.error('Payment received but verification failed. Contact support.');
          }
        },
        modal: {
          ondismiss: () => setLoading(false),
        },
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Something went wrong');
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4 bg-[#FAFAFA]">
        <div className="w-full max-w-sm text-center">
          <div className="w-20 h-20 rounded-full bg-emerald-50 flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="w-10 h-10 text-emerald-500" strokeWidth={1.5} />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mb-2">Your listing is now Featured!</h1>
          <p className="text-slate-500 text-sm mb-8">
            It will appear at the top of {city.replace(/-/g, ' ')} listings for {selectedPlan === 'week' ? '7 days' : '30 days'}.
          </p>
          <Link
            href={`/${city}/classifieds/${id}`}
            className="inline-flex items-center justify-center w-full h-12 rounded-2xl bg-[#F7921E] text-white font-semibold text-sm"
          >
            View Your Listing
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAFAFA]">
      <div className="max-w-lg mx-auto px-4 py-10">

        <Link
          href={`/${city}/classifieds/${id}`}
          className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-800 mb-8"
        >
          <ArrowLeft className="w-4 h-4" /> Back to listing
        </Link>

        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-2">
            <Zap className="w-5 h-5 text-[#F7B731]" />
            <span className="text-xs font-bold uppercase tracking-widest text-[#F7B731]">Boost Your Listing</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Get more responses, faster</h1>
          <p className="text-slate-500 text-sm mt-1">Featured listings get 5× more views and appear at the top of search results.</p>
        </div>

        {/* Plan cards */}
        <div className="space-y-4 mb-8">
          {PLANS.map(plan => (
            <button
              key={plan.id}
              type="button"
              onClick={() => setSelectedPlan(plan.id as 'week' | 'month')}
              className={[
                'w-full text-left rounded-2xl border-2 p-5 transition-all duration-150',
                selectedPlan === plan.id
                  ? 'border-[#F7921E] bg-[#FEF3E2]/60'
                  : 'border-slate-200 bg-white hover:border-slate-300',
              ].join(' ')}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-bold text-slate-900">{plan.label}</span>
                    {plan.popular && (
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#F7921E] text-white">
                        Best Value
                      </span>
                    )}
                  </div>
                  <ul className="space-y-1 mt-2">
                    {plan.perks.map(p => (
                      <li key={p} className="flex items-center gap-2 text-xs text-slate-600">
                        <Star className="w-3 h-3 text-[#F7B731] shrink-0" fill="currentColor" />
                        {p}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-2xl font-extrabold text-slate-900">₹{plan.price}</div>
                  <div className="text-xs text-slate-400 line-through">₹{plan.originalPrice}</div>
                </div>
              </div>

              {/* Selected indicator */}
              <div className={[
                'mt-4 h-1 rounded-full transition-all duration-200',
                selectedPlan === plan.id ? 'bg-[#F7921E]' : 'bg-transparent',
              ].join(' ')} />
            </button>
          ))}
        </div>

        {/* Pay button */}
        <button
          type="button"
          onClick={handlePayment}
          disabled={loading}
          className="w-full h-14 rounded-2xl bg-[#F7921E] text-white font-bold text-base
            hover:bg-[#E07B0A] transition-colors duration-150 disabled:opacity-60
            flex items-center justify-center gap-2 shadow-[0_8px_24px_-6px_rgba(247,146,30,0.5)]"
        >
          {loading ? 'Opening payment...' : `Pay ₹${PLANS.find(p => p.id === selectedPlan)?.price} — Secure Checkout`}
        </button>

        <p className="text-center text-xs text-slate-400 mt-4">
          Powered by Razorpay · UPI, Cards, Net Banking accepted
        </p>
      </div>
    </div>
  );
}
