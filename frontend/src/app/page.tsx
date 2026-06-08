'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { Search, MapPin } from 'lucide-react';
import Link from 'next/link';
import { api } from '@/lib/api';
import type { City } from '@/lib/types';
import SiteFooter from '@/components/site-footer/SiteFooter';

const STATE_ORDER = [
  'Telangana', 'Andhra Pradesh', 'Karnataka', 'Tamil Nadu',
  'Kerala', 'Goa', 'Puducherry', 'Metro',
];

const CATEGORIES = [
  { icon: '🍱', name: 'Tiffin & Food',  bg: '#FFF3EC', count: '2,840' },
  { icon: '🏠', name: 'PG / Rooms',     bg: '#EFF6FF', count: '5,120' },
  { icon: '💼', name: 'Jobs',           bg: '#F0FDF4', count: '3,460' },
  { icon: '🚗', name: 'Vehicles',       bg: '#FDF4FF', count: '4,780' },
  { icon: '📱', name: 'Electronics',    bg: '#FFFBEB', count: '6,910' },
  { icon: '🎉', name: 'Events',         bg: '#FFF1F2', count: '890'   },
  { icon: '🏪', name: 'Businesses',     bg: '#F0FDFA', count: '1,230' },
  { icon: '📚', name: 'Education',      bg: '#F5F3FF', count: '2,100' },
];

const POPULAR_TAGS = ['Tiffin Service', 'PG for Boys', 'Used Laptop', 'Honda Activa', 'Home Tutor', '2BHK Flat'];

const TRUST = [
  { icon: '🆓', num: '100% Free',   label: 'Post unlimited listings' },
  { icon: '💬', num: 'WhatsApp',    label: 'Direct seller contact' },
  { icon: '🌐', num: '11 Languages', label: 'Your language, your way' },
  { icon: '📍', num: '140+ Cities', label: 'South India focused' },
];

export default function HomePage() {
  const router = useRouter();
  const [q, setQ] = useState('');
  const [cities, setCities] = useState<City[]>([]);
  const [selectedCity, setSelectedCity] = useState('');
  const [citySearch, setCitySearch] = useState('');
  const [showCityPicker, setShowCityPicker] = useState(false);
  const [recentSlugs, setRecentSlugs] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.cities.list().then(c => { setCities(c); setLoading(false); }).catch(() => setLoading(false));
    try { setRecentSlugs(JSON.parse(localStorage.getItem('recentCities') ?? '[]')); } catch { /* */ }
  }, []);

  const handleCitySelect = (city: City) => {
    setSelectedCity(city.slug);
    const recent = [city.slug, ...recentSlugs.filter(s => s !== city.slug)].slice(0, 3);
    localStorage.setItem('recentCities', JSON.stringify(recent));
    setShowCityPicker(false);
    if (q.trim()) {
      router.push(`/${city.slug}/search?q=${encodeURIComponent(q.trim())}`);
    } else {
      router.push(`/${city.slug}`);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCity) { setShowCityPicker(true); return; }
    if (q.trim()) router.push(`/${selectedCity}/search?q=${encodeURIComponent(q.trim())}`);
    else router.push(`/${selectedCity}`);
  };

  const recentCities = cities.filter(c => recentSlugs.includes(c.slug));
  const grouped: Record<string, City[]> = {};
  for (const s of STATE_ORDER) {
    const sc = cities.filter(c => c.state === s && c.name.toLowerCase().includes(citySearch.toLowerCase()));
    if (sc.length) grouped[s] = sc;
  }

  const selectedCityName = cities.find(c => c.slug === selectedCity)?.name;

  return (
    <div style={{ background: 'var(--li-page-bg)' }}>
      {/* ── SITE HEADER (standalone on homepage) ── */}
      <header className="sticky top-0 z-50 bg-white border-b" style={{ borderColor: 'var(--li-border)' }}>
        <div className="page-wrap h-16 flex items-center gap-6">
          <Link href="/" className="shrink-0 flex flex-col leading-none">
            <span className="text-xl font-black tracking-tight" style={{ color: 'var(--li-text)' }}>
              Locals<span style={{ color: 'var(--li-primary)' }}>India</span>
            </span>
            <span className="text-[10px] font-semibold" style={{ color: 'var(--li-muted)' }}>localsindia.com</span>
          </Link>
          <div className="flex-1" />
          <nav className="flex items-center gap-1">
            <button className="px-3 py-2 rounded-lg text-sm font-medium hover:bg-gray-100 transition-colors" style={{ color: '#374151' }}
              onClick={() => setShowCityPicker(true)}>
              Browse Cities
            </button>
            <Link href="/auth/login" className="px-3 py-2 rounded-lg text-sm font-medium hover:bg-gray-100 transition-colors" style={{ color: '#374151' }}>
              Login
            </Link>
            <button className="cta-btn px-4 py-2 text-sm rounded-xl" onClick={() => setShowCityPicker(true)}>
              + Post Free Ad
            </button>
          </nav>
        </div>
      </header>

      {/* ── HERO ── */}
      <section
        className="relative overflow-hidden py-20"
        style={{ background: 'linear-gradient(135deg, #1A1A2E 0%, #16213E 55%, #0f3460 100%)' }}
      >
        {/* Radial glows */}
        <div className="absolute -top-32 right-0 w-[520px] h-[520px] rounded-full opacity-15"
          style={{ background: 'radial-gradient(circle, var(--li-primary), transparent 70%)' }} />
        <div className="absolute -bottom-24 -left-12 w-[380px] h-[380px] rounded-full opacity-8"
          style={{ background: 'radial-gradient(circle, var(--li-featured), transparent 70%)' }} />

        <div className="page-wrap relative z-10">
          <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <div
              className="inline-flex items-center gap-2 text-xs font-semibold px-4 py-2 rounded-full mb-6"
              style={{ background: 'rgba(255,107,53,0.15)', border: '1px solid rgba(255,107,53,0.3)', color: '#FDBA74' }}
            >
              🇮🇳 India&apos;s Hyperlocal Community Platform
            </div>

            <h1 className="text-5xl font-black text-white leading-[1.08] tracking-tight mb-4 max-w-xl"
              style={{ letterSpacing: '-2px' }}>
              Buy. Sell.<br />Connect. In Your{' '}
              <span style={{ color: 'var(--li-primary)' }}>City.</span>
            </h1>
            <p className="text-lg max-w-md mb-10" style={{ color: 'rgba(255,255,255,0.55)', lineHeight: 1.6 }}>
              Post free classifieds, find PGs, discover local services — in your language, in your neighbourhood.
            </p>

            {/* Search box */}
            <form onSubmit={handleSearch} className="flex max-w-2xl rounded-2xl overflow-hidden shadow-2xl bg-white">
              {/* City picker trigger */}
              <button
                type="button"
                onClick={() => setShowCityPicker(true)}
                className="flex items-center gap-2 px-5 border-r min-w-[160px] text-left transition-colors hover:bg-gray-50"
                style={{ borderColor: 'var(--li-border)' }}
              >
                <MapPin className="w-4 h-4 shrink-0" style={{ color: 'var(--li-primary)' }} />
                <div>
                  <div className="text-sm font-bold" style={{ color: 'var(--li-text)' }}>
                    {selectedCityName ?? 'Select city'}
                  </div>
                  <div className="text-xs" style={{ color: 'var(--li-muted)' }}>Click to change ▾</div>
                </div>
              </button>

              <input
                value={q}
                onChange={e => setQ(e.target.value)}
                placeholder="Search tiffin, PG, laptop, Honda Activa..."
                className="flex-1 px-5 py-5 text-base outline-none"
                style={{ color: 'var(--li-text)' }}
              />
              <button type="submit" className="px-8 text-base font-bold text-white flex items-center gap-2"
                style={{ background: 'var(--li-primary)' }}>
                <Search className="w-5 h-5" /> Search
              </button>
            </form>

            {/* Popular tags */}
            <div className="flex items-center gap-2 mt-4 flex-wrap">
              <span className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>Popular:</span>
              {POPULAR_TAGS.map(t => (
                <button
                  key={t}
                  onClick={() => setQ(t)}
                  className="text-xs px-3 py-1.5 rounded-full transition-colors hover:bg-white/20"
                  style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.65)' }}
                >
                  {t}
                </button>
              ))}
            </div>
          </motion.div>

          {/* Stats */}
          <motion.div
            className="flex gap-10 mt-12"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3, duration: 0.5 }}
          >
            {[['1.2L+', 'Active Listings'], ['140+', 'Cities'], ['3.8L+', 'Happy Users'], ['11', 'Languages']].map(([n, l]) => (
              <div key={n}>
                <div className="text-3xl font-black text-white">{n}</div>
                <div className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.45)' }}>{l}</div>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ── CATEGORIES ── */}
      <section className="bg-white border-b" style={{ borderColor: 'var(--li-border)' }}>
        <div className="page-wrap py-10">
          <div className="grid grid-cols-8 gap-2">
            {CATEGORIES.map(cat => (
              <motion.button
                key={cat.name}
                whileHover={{ y: -3 }}
                transition={{ duration: 0.15 }}
                onClick={() => setShowCityPicker(true)}
                className="flex flex-col items-center gap-2.5 p-4 rounded-2xl border-2 border-transparent transition-colors hover:border-amber-200 cursor-pointer"
                style={{ background: 'white' }}
                onMouseEnter={e => (e.currentTarget.style.background = cat.bg)}
                onMouseLeave={e => (e.currentTarget.style.background = 'white')}
              >
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl" style={{ background: cat.bg }}>
                  {cat.icon}
                </div>
                <div className="text-xs font-700 text-center leading-tight" style={{ color: 'var(--li-text)', fontWeight: 700 }}>{cat.name}</div>
                <div className="text-[10px]" style={{ color: 'var(--li-muted)' }}>{cat.count} ads</div>
              </motion.button>
            ))}
          </div>
        </div>
      </section>

      {/* ── CITY PICKER MODAL ── */}
      {showCityPicker && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="bg-white rounded-3xl w-full max-w-2xl max-h-[80vh] overflow-hidden shadow-2xl"
          >
            <div className="p-6 border-b" style={{ borderColor: 'var(--li-border)' }}>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold" style={{ color: 'var(--li-text)' }}>Select your city</h2>
                <button
                  onClick={() => setShowCityPicker(false)}
                  className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-gray-100 text-gray-500 font-bold"
                >✕</button>
              </div>
              <div className="flex items-center gap-3 rounded-xl px-4 py-3" style={{ background: '#F3F4F6' }}>
                <Search className="w-4 h-4" style={{ color: 'var(--li-muted)' }} />
                <input
                  autoFocus
                  value={citySearch}
                  onChange={e => setCitySearch(e.target.value)}
                  placeholder="Search city..."
                  className="flex-1 bg-transparent text-sm outline-none"
                  style={{ color: 'var(--li-text)' }}
                />
              </div>
            </div>

            <div className="overflow-y-auto max-h-[55vh] p-6">
              {recentCities.length > 0 && !citySearch && (
                <div className="mb-6">
                  <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: 'var(--li-muted)' }}>
                    📍 Recent
                  </p>
                  <div className="flex gap-2 flex-wrap">
                    {recentCities.map(c => (
                      <button
                        key={c.slug}
                        onClick={() => handleCitySelect(c)}
                        className="px-4 py-2 rounded-full text-sm font-semibold border-2 transition-colors hover:border-orange-400 hover:text-orange-600"
                        style={{ background: 'var(--li-primary-light)', borderColor: 'var(--li-primary)', color: 'var(--li-primary)' }}
                      >
                        {c.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {loading ? (
                <div className="grid grid-cols-3 gap-2">
                  {Array.from({ length: 12 }).map((_, i) => (
                    <div key={i} className="h-10 bg-gray-100 rounded-xl animate-pulse" />
                  ))}
                </div>
              ) : (
                Object.entries(grouped).map(([state, stateCities]) => (
                  <div key={state} className="mb-6">
                    <div className="flex items-center gap-2 mb-3">
                      <MapPin className="w-3.5 h-3.5" style={{ color: 'var(--li-primary)' }} />
                      <p className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--li-muted)' }}>{state}</p>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      {stateCities.map(c => (
                        <motion.button
                          key={c.slug}
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => handleCitySelect(c)}
                          className="px-3 py-2.5 rounded-xl border text-sm font-medium text-left transition-all hover:border-orange-400 hover:text-orange-600 hover:bg-orange-50"
                          style={{ borderColor: 'var(--li-border)', color: 'var(--li-text)' }}
                        >
                          {c.name}
                        </motion.button>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          </motion.div>
        </div>
      )}

      {/* ── TRUST BAR ── */}
      <section style={{ background: 'var(--li-nav-bg)' }}>
        <div className="page-wrap py-12">
          <div className="grid grid-cols-4 gap-px" style={{ background: 'rgba(255,255,255,0.07)' }}>
            {TRUST.map(t => (
              <div key={t.num} className="text-center py-8 px-6" style={{ background: 'var(--li-nav-bg)' }}>
                <div className="text-3xl mb-3">{t.icon}</div>
                <div className="text-xl font-black text-white mb-1">{t.num}</div>
                <div className="text-xs" style={{ color: 'rgba(255,255,255,0.45)' }}>{t.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
