import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Pricing — LocalsIndia',
  description: 'Post free classifieds in your city. Featured listing boosts available.',
};

const FEATURES = [
  'Post unlimited classifieds',
  'Photos up to 5 per listing',
  'WhatsApp contact button',
  'Active for 30 days',
  'Visible across 64+ cities',
];

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-[#FAFAFA]">
      <div className="max-w-3xl mx-auto px-4 py-16">

        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-black text-slate-900 mb-3">Simple, honest pricing</h1>
          <p className="text-slate-500 text-lg">Posting is always free. Pay only if you want extra visibility.</p>
        </div>

        {/* Cards */}
        <div className="grid md:grid-cols-2 gap-6 mb-12">

          {/* Free */}
          <div className="bg-white rounded-3xl border-2 border-slate-200 p-8">
            <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">Standard</p>
            <div className="flex items-end gap-1 mb-1">
              <span className="text-5xl font-black text-slate-900">₹0</span>
              <span className="text-slate-400 mb-2">/ listing</span>
            </div>
            <p className="text-slate-500 text-sm mb-6">Forever free — no credit card needed.</p>
            <ul className="space-y-3 mb-8">
              {FEATURES.map(f => (
                <li key={f} className="flex items-center gap-3 text-sm text-slate-700">
                  <span className="w-5 h-5 rounded-full bg-emerald-50 flex items-center justify-center shrink-0 text-emerald-600 text-xs">✓</span>
                  {f}
                </li>
              ))}
            </ul>
            <Link
              href="/"
              className="block text-center w-full py-3 rounded-2xl border-2 border-slate-200 font-semibold text-sm text-slate-700 hover:border-[#F7921E] hover:text-[#F7921E] transition-colors"
            >
              Post Free Listing
            </Link>
          </div>

          {/* Featured */}
          <div className="bg-white rounded-3xl border-2 border-[#F7921E] p-8 relative overflow-hidden">
            <span className="absolute top-4 right-4 text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-[#F7921E] text-white">
              Most Popular
            </span>
            <p className="text-xs font-bold uppercase tracking-widest text-[#F7921E] mb-2">Featured</p>
            <div className="flex items-end gap-1 mb-1">
              <span className="text-5xl font-black text-slate-900">₹99</span>
              <span className="text-slate-400 mb-2">/ week</span>
            </div>
            <p className="text-slate-500 text-sm mb-6">Or ₹199/month — appear at the top of city listings.</p>
            <ul className="space-y-3 mb-8">
              {[...FEATURES, 'Featured badge on your listing', 'Top position in city & search results', '5× more views on average'].map(f => (
                <li key={f} className="flex items-center gap-3 text-sm text-slate-700">
                  <span className="w-5 h-5 rounded-full bg-orange-50 flex items-center justify-center shrink-0 text-[#F7921E] text-xs">⭐</span>
                  {f}
                </li>
              ))}
            </ul>
            <Link
              href="/"
              className="block text-center w-full py-3 rounded-2xl bg-[#F7921E] font-semibold text-sm text-white hover:bg-[#E07B0A] transition-colors"
            >
              Post & Promote
            </Link>
          </div>
        </div>

        {/* FAQ */}
        <div className="bg-white rounded-3xl border border-slate-200 p-8">
          <h2 className="text-lg font-bold text-slate-900 mb-6">Frequently asked</h2>
          <div className="space-y-5">
            {[
              ['How do I promote an existing listing?', 'Open your listing, then tap "Promote this listing" in the seller panel. You\'ll see the Featured plan options with Razorpay checkout.'],
              ['When does a featured listing expire?', 'Weekly plans run for 7 days from activation; monthly plans for 30 days. Your listing stays live after — it just moves to a standard position.'],
              ['What payment methods are accepted?', 'UPI, all major debit/credit cards, and net banking via Razorpay. Payments are secured and encrypted.'],
              ['Can I get a refund?', 'Featured slots are digital goods — refunds are not available once a listing appears at the top. Contact us at queryoptimizer78@gmail.com for concerns.'],
            ].map(([q, a]) => (
              <div key={q} className="border-b border-slate-100 pb-5 last:border-0 last:pb-0">
                <p className="font-semibold text-slate-800 mb-1.5">{q}</p>
                <p className="text-sm text-slate-500 leading-relaxed">{a}</p>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
