import Link from 'next/link';
import { MapPin, MessageCircle, Globe, Users } from 'lucide-react';

export const metadata = { title: 'About — LocalsIndia' };

const PILLARS = [
  {
    Icon: MapPin,
    title: 'Hyperlocal First',
    body: 'Every listing, every service, every connection is tied to a real city. We believe local communities thrive when they can transact in their own neighbourhoods.',
  },
  {
    Icon: MessageCircle,
    title: 'WhatsApp Native',
    body: 'Buyers contact sellers directly on WhatsApp — no inbox to check, no commission to pay. Just a human conversation between two people in the same city.',
  },
  {
    Icon: Globe,
    title: '11 Languages',
    body: 'India speaks hundreds of languages. LocalsIndia currently supports 11 — Telugu, Tamil, Kannada, Hindi, Marathi, Bengali, Gujarati, Punjabi, Malayalam, Odia, and English — with more on the way.',
  },
  {
    Icon: Users,
    title: 'Community-Owned',
    body: 'LocalsIndia does not charge listing fees or commissions. Our model is built on premium visibility for businesses who want to stand out, not on taxing ordinary people who want to buy and sell.',
  },
];

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-slate-50">

      {/* Hero */}
      <div className="bg-[#0D0F1C] py-20">
        <div className="max-w-3xl mx-auto px-4">
          <Link href="/" className="text-sm font-semibold mb-10 inline-block text-[#F7921E]">
            ← Back to LocalsIndia
          </Link>
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full mb-6
            bg-orange-500/[0.12] border border-orange-500/[0.2] text-orange-300 text-xs font-medium tracking-wide">
            <Globe className="w-3.5 h-3.5 shrink-0" />
            India&apos;s Hyperlocal Community Platform
          </div>
          <h1 className="text-4xl font-extrabold text-white tracking-tight mb-4">
            About LocalsIndia
          </h1>
          <p className="text-slate-400 text-lg leading-relaxed max-w-xl">
            We&apos;re building the platform that every Indian city deserves — a free, fast, multilingual marketplace where real people connect without middlemen.
          </p>
        </div>
      </div>

      {/* Story */}
      <div className="max-w-3xl mx-auto px-4 py-14">

        <section className="mb-12">
          <h2 className="text-2xl font-bold text-slate-900 mb-4">Our Story</h2>
          <div className="space-y-4 text-slate-600 leading-relaxed">
            <p>
              LocalsIndia was started with a simple observation: existing classifieds sites in India are broken. They&apos;re filled with spam, charge sellers ₹5,000/year for basic visibility, have a 1.4/5 rating on Trustpilot, and never solved the real problem — making it easy to find a tiffin service in your colony or rent out a spare room to someone you can actually meet.
            </p>
            <p>
              We built LocalsIndia to fix that. Post a listing in under a minute. Contact sellers directly on WhatsApp. Browse in your own language. No account needed to look around. No commissions. No spam.
            </p>
            <p>
              We launched in Tamil Nadu and Karnataka and are expanding city by city across India. Our goal is to cover every city, town, and taluk where people need a trustworthy local marketplace.
            </p>
          </div>
        </section>

        {/* Pillars */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-slate-900 mb-6">What We Stand For</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {PILLARS.map(({ Icon, title, body }) => (
              <div key={title} className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm">
                <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center mb-4">
                  <Icon className="w-5 h-5 text-[#F7921E]" strokeWidth={1.8} />
                </div>
                <h3 className="font-semibold text-slate-900 mb-2">{title}</h3>
                <p className="text-sm text-slate-500 leading-relaxed">{body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Team */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-slate-900 mb-4">Who We Are</h2>
          <p className="text-slate-600 leading-relaxed">
            LocalsIndia is founded and operated by <strong>Venkata Rajesh Guntupalli</strong>, a database architect and entrepreneur based in India. We are a bootstrapped product with a focus on getting the fundamentals right before scaling: fast pages, real listings, and genuine community value.
          </p>
        </section>

        {/* Contact */}
        <section className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm">
          <h2 className="text-lg font-bold text-slate-900 mb-3">Get in Touch</h2>
          <p className="text-sm text-slate-600 mb-4">
            For partnerships, press, or feedback — we read every message.
          </p>
          <a
            href="mailto:support@localsindia.com"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-[#F7921E] hover:bg-[#E07B0A] transition-colors"
          >
            support@localsindia.com
          </a>
        </section>

      </div>
    </div>
  );
}
