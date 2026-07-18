'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { MessageCircle, Copy, Star, Users, ArrowRight, Check, LogIn } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import SiteHeader from '@/components/site-header/SiteHeader';
import SiteFooter from '@/components/site-footer/SiteFooter';

const CITIES = [
  { name: 'Hyderabad', slug: 'hyderabad' },
  { name: 'Visakhapatnam', slug: 'visakhapatnam' },
  { name: 'Vijayawada', slug: 'vijayawada' },
  { name: 'Guntur', slug: 'guntur' },
  { name: 'Tirupati', slug: 'tirupati' },
  { name: 'Warangal', slug: 'warangal' },
  { name: 'Nellore', slug: 'nellore' },
  { name: 'Kurnool', slug: 'kurnool' },
];

export default function InvitePage() {
  const [selectedCity, setSelectedCity] = useState('hyderabad');
  const [copied, setCopied] = useState(false);
  const [referralCode, setReferralCode] = useState<string | null>(null);
  const [loadingCode, setLoadingCode] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (!token) { setLoadingCode(false); return; }
    api.auth.getMe(token)
      .then(me => setReferralCode(me.referral_code ?? null))
      .catch(() => { /* not logged in / token expired — treated as guest below */ })
      .finally(() => setLoadingCode(false));
  }, []);

  const cityName = CITIES.find(c => c.slug === selectedCity)?.name ?? selectedCity;
  const cityUrl = referralCode
    ? `https://www.localsindia.com/${selectedCity}?ref=${referralCode}`
    : `https://www.localsindia.com/${selectedCity}`;

  const waMessage = `Hey! I found this amazing free platform for local listings in ${cityName} 👇\n\n📢 LocalsIndia — India's free classifieds, WhatsApp-first\n✅ Post listings for free\n✅ No spam calls (WhatsApp only)\n✅ Works in Telugu, Hindi & more\n\nCheck it out: ${cityUrl}\n\nYou can list your business, sell stuff, find PG rooms, post jobs — all free!`;

  const shareOnWhatsApp = () => {
    window.open(`https://wa.me/?text=${encodeURIComponent(waMessage)}`, '_blank');
  };

  const copyLink = () => {
    navigator.clipboard.writeText(cityUrl).then(() => {
      setCopied(true);
      toast.success('Link copied!');
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => toast.error('Could not copy'));
  };

  return (
    <div style={{ background: 'var(--li-page-bg)', minHeight: '100vh' }}>
      <SiteHeader />

      {/* Hero */}
      <div style={{ background: 'linear-gradient(135deg, #1A1A2E 0%, #16213E 100%)' }} className="py-14">
        <div className="page-wrap text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <div
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-5 text-sm font-bold"
              style={{ background: 'rgba(247,183,49,0.15)', color: '#F7B731', border: '1px solid rgba(247,183,49,0.3)' }}
            >
              <Star className="w-4 h-4" fill="currentColor" /> Founding Member Program
            </div>

            <h1 className="text-3xl md:text-4xl font-black text-white mb-3">
              Invite a Business.<br />Build Your City.
            </h1>
            <p className="text-base max-w-md mx-auto" style={{ color: 'rgba(255,255,255,0.55)' }}>
              Every business you invite makes LocalsIndia more useful for everyone in your city. Zero fees, no spam — just community.
            </p>
          </motion.div>
        </div>
      </div>

      <div className="page-wrap py-12 max-w-2xl mx-auto">

        {/* City picker */}
        <div className="bg-white rounded-3xl p-6 border mb-5" style={{ borderColor: 'var(--li-border)' }}>
          <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: 'var(--li-muted)' }}>Invite for city</p>
          <div className="flex flex-wrap gap-2">
            {CITIES.map(c => (
              <button
                key={c.slug}
                onClick={() => setSelectedCity(c.slug)}
                className="px-4 py-2 rounded-full text-sm font-semibold transition-all"
                style={
                  selectedCity === c.slug
                    ? { background: 'var(--li-primary)', color: 'white' }
                    : { background: 'var(--li-page-bg)', color: 'var(--li-text)', border: '1px solid var(--li-border)' }
                }
              >
                {c.name}
              </button>
            ))}
          </div>
        </div>

        {/* Message preview + share — gated on login, since the link needs the
            sharer's own referral code to attribute anything */}
        {loadingCode ? null : !referralCode ? (
          <div className="bg-white rounded-3xl p-8 border mb-8 text-center" style={{ borderColor: 'var(--li-border)' }}>
            <LogIn className="w-8 h-8 mx-auto mb-3" style={{ color: 'var(--li-primary)' }} />
            <p className="font-bold text-sm mb-1" style={{ color: 'var(--li-text)' }}>Sign in to get your personal invite link</p>
            <p className="text-xs mb-5" style={{ color: 'var(--li-muted)' }}>Your own link lets us give you credit when someone you invite joins.</p>
            <Link
              href="/auth/login"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl text-white font-bold text-sm"
              style={{ background: 'var(--li-primary)' }}
            >
              Sign In <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        ) : (
        <>
        <div className="bg-white rounded-3xl p-6 border mb-5" style={{ borderColor: 'var(--li-border)' }}>
          <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: 'var(--li-muted)' }}>Your invite message</p>
          <div
            className="rounded-2xl p-4 text-sm leading-relaxed whitespace-pre-line"
            style={{ background: '#dcfce7', color: '#14532d' }}
          >
            {waMessage}
          </div>
        </div>

        {/* Share buttons */}
        <div className="space-y-3 mb-8">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            onClick={shareOnWhatsApp}
            className="w-full flex items-center justify-center gap-3 py-4 rounded-2xl font-bold text-white text-base"
            style={{ background: '#25D366', boxShadow: '0 8px 20px -6px rgba(37,211,102,0.45)' }}
          >
            <MessageCircle className="w-5 h-5" />
            Send on WhatsApp
          </motion.button>

          <button
            onClick={copyLink}
            className="w-full flex items-center justify-center gap-3 py-4 rounded-2xl font-bold text-sm border-2 transition-colors hover:border-orange-400"
            style={{ borderColor: 'var(--li-border)', color: 'var(--li-text)', background: 'white' }}
          >
            {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" style={{ color: 'var(--li-primary)' }} />}
            {copied ? 'Copied!' : `Copy link — ${cityUrl}`}
          </button>
        </div>
        </>
        )}

        {/* Stats / social proof */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          {[
            { val: '100%', label: 'Free forever' },
            { val: '0', label: 'Spam calls' },
            { val: '8+', label: 'Indian languages' },
          ].map(s => (
            <div key={s.label} className="bg-white rounded-2xl p-4 border text-center" style={{ borderColor: 'var(--li-border)' }}>
              <p className="text-2xl font-black mb-0.5" style={{ color: 'var(--li-primary)' }}>{s.val}</p>
              <p className="text-xs" style={{ color: 'var(--li-muted)' }}>{s.label}</p>
            </div>
          ))}
        </div>

        {/* Who to invite suggestions */}
        <div className="bg-white rounded-3xl p-6 border mb-8" style={{ borderColor: 'var(--li-border)' }}>
          <div className="flex items-center gap-2 mb-4">
            <Users className="w-4 h-4" style={{ color: 'var(--li-primary)' }} />
            <p className="font-bold text-sm" style={{ color: 'var(--li-text)' }}>Who to invite</p>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {[
              'Tiffin services', 'PG room owners', 'Local tutors', 'Auto/cab drivers',
              'Small shops', 'Event planners', 'Freelancers', 'Job seekers',
            ].map(s => (
              <div key={s} className="flex items-center gap-2 text-sm" style={{ color: 'var(--li-text)' }}>
                <span style={{ color: 'var(--li-primary)' }}>•</span> {s}
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className="text-center">
          <Link
            href={`/${selectedCity}`}
            className="inline-flex items-center gap-2 text-sm font-semibold"
            style={{ color: 'var(--li-primary)' }}
          >
            Browse {cityName} listings <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>

      <SiteFooter />
    </div>
  );
}
