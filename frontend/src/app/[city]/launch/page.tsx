'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { MapPin, Users, ArrowRight, MessageCircle, Shield, Zap, IndianRupee, Lock, Globe, type LucideIcon } from 'lucide-react';
import { api } from '@/lib/api';
import type { City } from '@/lib/types';
import SiteHeader from '@/components/site-header/SiteHeader';
import SiteFooter from '@/components/site-footer/SiteFooter';

const PERKS: { icon: LucideIcon; title: string; desc: string }[] = [
  { icon: IndianRupee, title: 'Completely Free', desc: 'No listing fees ever. No subscription. Post as many listings as you want.' },
  { icon: Lock, title: 'No Spam Calls', desc: 'Your number stays private. Buyers contact you on WhatsApp only — no cold calls.' },
  { icon: MessageCircle, title: 'WhatsApp-First', desc: '90% of Indians use WhatsApp. Every listing has a chat button — deals happen faster.' },
  { icon: Globe, title: 'Your Language', desc: 'Browse in Telugu, Hindi, Tamil, Kannada, and 7 more Indian languages.' },
];

export default function CityLaunchPage() {
  const { city: citySlug } = useParams<{ city: string }>();
  const [city, setCity] = useState<City | null>(null);
  const [listingCount, setListingCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [cityData, listings] = await Promise.all([
          api.cities.get(citySlug),
          api.cities.listings(citySlug, { status: 'active' }),
        ]);
        setCity(cityData);
        setListingCount(listings.length);
      } catch { /* ignore */ }
      finally { setLoading(false); }
    }
    load();
  }, [citySlug]);

  const cityName = loading ? citySlug.replace(/-/g, ' ') : (city?.name ?? citySlug);

  const shareOnWhatsApp = () => {
    const msg = `LocalsIndia is now live in ${cityName}! 🎉\n\nFree classifieds — no spam calls, no fees, WhatsApp-first.\nPost your listing free 👇\nhttps://www.localsindia.com/${citySlug}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
  };

  return (
    <div style={{ background: 'var(--li-page-bg)', minHeight: '100vh' }}>
      <SiteHeader citySlug={citySlug} cityName={city?.name} />

      {/* Hero */}
      <div style={{ background: 'linear-gradient(135deg, #1A1A2E 0%, #16213E 100%)' }} className="py-16 md:py-24">
        <div className="page-wrap text-center">
          <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>

            <div
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-6 text-sm font-bold"
              style={{ background: 'rgba(255,107,53,0.15)', color: 'var(--li-primary)', border: '1px solid rgba(255,107,53,0.3)' }}
            >
              <MapPin className="w-4 h-4" /> Just Launched
            </div>

            <h1 className="text-4xl md:text-5xl font-black text-white mb-3 leading-tight">
              LocalsIndia is live in<br />
              <span style={{ color: 'var(--li-primary)' }} className="capitalize">{cityName}</span>
            </h1>

            <p className="text-base md:text-lg mb-8 max-w-md mx-auto" style={{ color: 'rgba(255,255,255,0.55)' }}>
              Free classifieds · No spam calls · WhatsApp-first · 8 Indian languages
            </p>

            {/* Live listing counter */}
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.25, type: 'spring', stiffness: 200 }}
              className="inline-flex items-center gap-3 px-6 py-3 rounded-2xl mb-8"
              style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)' }}
            >
              <Users className="w-5 h-5 text-white" />
              <span className="text-white font-bold text-lg">
                {loading ? '...' : listingCount} listing{listingCount !== 1 ? 's' : ''} posted
              </span>
            </motion.div>

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link
                href={`/${citySlug}/classifieds/post`}
                className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-2xl font-bold text-white text-base shadow-lg transition-transform hover:scale-[1.02]"
                style={{ background: 'var(--li-primary)', boxShadow: '0 8px 24px -6px rgba(255,107,53,0.5)' }}
              >
                Post Listing <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                href={`/${citySlug}`}
                className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-2xl font-bold text-base transition-colors hover:bg-white/20"
                style={{ background: 'rgba(255,255,255,0.1)', color: 'white', border: '1px solid rgba(255,255,255,0.2)' }}
              >
                Browse Listings
              </Link>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Why us */}
      <div className="page-wrap py-14">
        <h2 className="text-2xl font-black text-center mb-3" style={{ color: 'var(--li-text)' }}>
          Why LocalsIndia beats JustDial & OLX
        </h2>
        <p className="text-center text-sm mb-10" style={{ color: 'var(--li-muted)' }}>
          JustDial charges ₹5,000–50,000/year and sells your number. We are free. Forever.
        </p>

        <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-4">
          {PERKS.map((p, i) => (
            <motion.div
              key={p.title}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08 }}
              className="bg-white rounded-3xl p-6 border"
              style={{ borderColor: 'var(--li-border)' }}
            >
              <div className="mb-3" style={{ color: 'var(--li-primary)' }}><p.icon size={28} strokeWidth={1.75} /></div>
              <h3 className="font-bold text-sm mb-1.5" style={{ color: 'var(--li-text)' }}>{p.title}</h3>
              <p className="text-xs leading-relaxed" style={{ color: 'var(--li-muted)' }}>{p.desc}</p>
            </motion.div>
          ))}
        </div>

        {/* Trust signals */}
        <div className="grid md:grid-cols-2 gap-5 mt-8">
          <div className="bg-white rounded-3xl p-6 border flex items-start gap-4" style={{ borderColor: 'var(--li-border)' }}>
            <Shield className="w-8 h-8 shrink-0 mt-0.5" style={{ color: 'var(--li-primary)' }} strokeWidth={1.5} />
            <div>
              <h3 className="font-bold text-sm mb-1" style={{ color: 'var(--li-text)' }}>Your privacy is protected</h3>
              <p className="text-xs leading-relaxed" style={{ color: 'var(--li-muted)' }}>
                We never sell your phone number. JustDial&apos;s entire business model is selling user data — that&apos;s why everyone gets spam calls after listing there.
              </p>
            </div>
          </div>
          <div className="bg-white rounded-3xl p-6 border flex items-start gap-4" style={{ borderColor: 'var(--li-border)' }}>
            <Zap className="w-8 h-8 shrink-0 mt-0.5" style={{ color: '#F7B731' }} strokeWidth={1.5} />
            <div>
              <h3 className="font-bold text-sm mb-1" style={{ color: 'var(--li-text)' }}>Deals happen on WhatsApp</h3>
              <p className="text-xs leading-relaxed" style={{ color: 'var(--li-muted)' }}>
                Every listing has a WhatsApp button. No forms, no registration for buyers. One tap and they&apos;re talking to you directly. That&apos;s how local commerce works.
              </p>
            </div>
          </div>
        </div>

        {/* Founding Member share card */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mt-10 rounded-3xl p-8 text-center"
          style={{ background: 'linear-gradient(135deg, #1A1A2E 0%, #16213E 100%)' }}
        >
          <div
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full mb-4 text-xs font-bold"
            style={{ background: 'rgba(247,183,49,0.15)', color: '#F7B731', border: '1px solid rgba(247,183,49,0.3)' }}
          >
            ⭐ Founding Member
          </div>
          <h3 className="text-xl font-black text-white mb-2">
            Help build {cityName}&apos;s community
          </h3>
          <p className="text-sm mb-6 max-w-sm mx-auto" style={{ color: 'rgba(255,255,255,0.55)' }}>
            You&apos;re among the first users here. Share LocalsIndia with local businesses — every listing makes the platform more useful for everyone.
          </p>
          <button
            onClick={shareOnWhatsApp}
            className="inline-flex items-center justify-center gap-3 px-8 py-4 rounded-2xl font-bold text-white text-sm transition-transform hover:scale-[1.02]"
            style={{ background: '#25D366', boxShadow: '0 8px 20px -6px rgba(37,211,102,0.5)' }}
          >
            <MessageCircle className="w-5 h-5" />
            Share on WhatsApp
          </button>
        </motion.div>
      </div>

      <SiteFooter />
    </div>
  );
}
