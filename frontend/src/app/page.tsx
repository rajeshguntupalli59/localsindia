'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, Search, Clock } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Input } from '@/components/ui/input';
import { api } from '@/lib/api';
import type { City } from '@/lib/types';

const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.04 } },
};
const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
};

const STATE_ORDER = [
  'Telangana', 'Andhra Pradesh', 'Karnataka', 'Tamil Nadu',
  'Kerala', 'Goa', 'Puducherry', 'Metro',
];

export default function CitySelectorPage() {
  const router = useRouter();
  const [cities, setCities] = useState<City[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [recentSlugs, setRecentSlugs] = useState<string[]>([]);

  useEffect(() => {
    api.cities.list().then(setCities).catch(console.error).finally(() => setLoading(false));
    try {
      setRecentSlugs(JSON.parse(localStorage.getItem('recentCities') ?? '[]'));
    } catch {
      setRecentSlugs([]);
    }
  }, []);

  const handleSelect = (city: City) => {
    const recent = [city.slug, ...recentSlugs.filter(s => s !== city.slug)].slice(0, 3);
    localStorage.setItem('recentCities', JSON.stringify(recent));
    router.push(`/${city.slug}`);
  };

  const filtered = search
    ? cities.filter(
        c =>
          c.name.toLowerCase().includes(search.toLowerCase()) ||
          c.state.toLowerCase().includes(search.toLowerCase()),
      )
    : cities;

  const recentCities = cities.filter(c => recentSlugs.includes(c.slug));

  const grouped: Record<string, City[]> = {};
  for (const state of STATE_ORDER) {
    const sc = filtered.filter(c => c.state === state);
    if (sc.length) grouped[state] = sc;
  }
  for (const c of filtered) {
    if (!STATE_ORDER.includes(c.state)) {
      grouped[c.state] = [...(grouped[c.state] ?? []), c];
    }
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--li-page-bg)' }}>
      <div className="px-4 pt-12 pb-8" style={{ background: 'var(--li-nav-bg)' }}>
        <h1 className="text-3xl font-bold text-white mb-1">
          <span style={{ color: 'var(--li-primary)' }}>Local</span>India
        </h1>
        <p className="text-white/70 text-sm mb-6">Discover your city&apos;s marketplace</p>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white/50 w-4 h-4" />
          <Input
            className="pl-10 bg-white/10 border-white/20 text-white placeholder:text-white/50 focus-visible:ring-white/30"
            placeholder="Search city..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-6">
        {!search && recentCities.length > 0 && (
          <section>
            <div className="flex items-center gap-2 mb-3">
              <Clock className="w-4 h-4 text-muted-foreground" />
              <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Recent</h2>
            </div>
            <div className="flex gap-2 flex-wrap">
              {recentCities.map(c => (
                <button
                  key={c.slug}
                  onClick={() => handleSelect(c)}
                  className="px-4 py-2 bg-white rounded-full border text-sm font-medium hover:border-[var(--li-primary)] hover:text-[var(--li-primary)] transition-colors"
                >
                  {c.name}
                </button>
              ))}
            </div>
          </section>
        )}

        {loading ? (
          <div className="space-y-6">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="space-y-2">
                <div className="h-3 w-20 bg-muted rounded animate-pulse" />
                <div className="grid grid-cols-3 gap-2">
                  {[...Array(6)].map((_, j) => (
                    <div key={j} className="h-10 bg-muted rounded-xl animate-pulse" />
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <AnimatePresence mode="wait">
            <motion.div key={search} variants={containerVariants} initial="hidden" animate="show" className="space-y-6">
              {Object.entries(grouped).map(([state, stateCities]) => (
                <section key={state}>
                  <div className="flex items-center gap-2 mb-3">
                    <MapPin className="w-4 h-4" style={{ color: 'var(--li-primary)' }} />
                    <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{state}</h2>
                  </div>
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                    {stateCities.map(c => (
                      <motion.button
                        key={c.slug}
                        variants={cardVariants}
                        onClick={() => handleSelect(c)}
                        className="px-3 py-2.5 bg-white rounded-xl border text-sm font-medium text-left hover:border-[var(--li-primary)] hover:text-[var(--li-primary)] transition-all active:scale-95"
                      >
                        {c.name}
                      </motion.button>
                    ))}
                  </div>
                </section>
              ))}
              {Object.keys(grouped).length === 0 && (
                <div className="text-center py-12 text-muted-foreground">
                  <MapPin className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  <p>No cities found for &ldquo;{search}&rdquo;</p>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}
