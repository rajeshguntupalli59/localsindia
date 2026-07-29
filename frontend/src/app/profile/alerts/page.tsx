'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft, Tag, Building2, Briefcase, Car, Smartphone, Wrench, CalendarDays, Store,
  UtensilsCrossed, Home, Package, ShoppingBag, GraduationCap, Stethoscope, type LucideIcon,
} from 'lucide-react';
import { toast } from 'sonner';
import { api, ApiError } from '@/lib/api';

// Same slugs + icons as the post-listing category picker and the onboarding
// quiz, so alert choices map directly onto real categories/listings.
const INTERESTS: { id: string; label: string; icon: LucideIcon }[] = [
  { id: 'classifieds', label: 'Classifieds', icon: Tag },
  { id: 'pg-roommate', label: 'PG / Roommate', icon: Building2 },
  { id: 'jobs', label: 'Jobs', icon: Briefcase },
  { id: 'vehicles', label: 'Vehicles', icon: Car },
  { id: 'electronics', label: 'Electronics', icon: Smartphone },
  { id: 'services', label: 'Services', icon: Wrench },
  { id: 'events', label: 'Events', icon: CalendarDays },
  { id: 'businesses', label: 'Businesses', icon: Store },
  { id: 'tiffin', label: 'Tiffin / Food', icon: UtensilsCrossed },
  { id: 'real-estate', label: 'Real Estate', icon: Home },
  { id: 'furniture', label: 'Furniture', icon: Package },
  { id: 'fashion', label: 'Fashion', icon: ShoppingBag },
  { id: 'education', label: 'Education', icon: GraduationCap },
  { id: 'doctors', label: 'Doctors', icon: Stethoscope },
];

const ALERT_FREQ = [
  { id: 'daily', label: 'Daily alerts', desc: 'Get a push notification every morning' },
  { id: 'weekly', label: 'Weekly alerts', desc: 'One push notification per week' },
  { id: 'never', label: 'No alerts', desc: 'In-app notifications only' },
];

export default function AlertsPreferencesPage() {
  const router = useRouter();
  const [interests, setInterests] = useState<string[]>([]);
  const [alertFreq, setAlertFreq] = useState('weekly');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (!token) { router.replace('/auth/login'); return; }
    api.preferences.get(token)
      .then(prefs => {
        setInterests(prefs.interests ?? []);
        setAlertFreq(prefs.alert_frequency ?? 'weekly');
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [router]);

  const toggleInterest = (id: string) => {
    setInterests(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const handleSave = async () => {
    const token = localStorage.getItem('access_token');
    if (!token) { router.replace('/auth/login'); return; }
    setSaving(true);
    try {
      await api.preferences.upsert({ interests, alert_frequency: alertFreq, onboarding_done: true }, token);
      toast.success('Preferences saved');
      router.back();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Could not save preferences');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen pb-28" style={{ background: 'var(--li-page-bg)' }}>
      <div className="sticky top-0 z-30 bg-white border-b px-4 py-3 flex items-center gap-3">
        <button onClick={() => router.back()} className="text-muted-foreground">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="font-semibold text-sm">Alerts &amp; Preferences</h1>
      </div>

      {loading ? (
        <div className="p-4 space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-16 bg-white rounded-xl animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="p-4 max-w-lg mx-auto">
          <p className="text-sm font-bold text-slate-800 mb-1">I&apos;m looking for</p>
          <p className="text-xs text-slate-400 mb-4">We&apos;ll show relevant listings first</p>
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 mb-8">
            {INTERESTS.map(i => {
              const active = interests.includes(i.id);
              return (
                <button
                  key={i.id}
                  type="button"
                  onClick={() => toggleInterest(i.id)}
                  aria-pressed={active}
                  className={`flex flex-col items-center gap-1 py-3 px-2 rounded-xl border-2 text-xs font-semibold transition-all
                    ${active ? 'border-[#F7921E] bg-[#FEF3E2] text-[#E07B0A]' : 'border-slate-200 text-slate-600 hover:border-slate-300'}`}
                >
                  <i.icon size={20} />
                  {i.label}
                </button>
              );
            })}
          </div>

          <p className="text-sm font-bold text-slate-800 mb-1">Listing alerts</p>
          <p className="text-xs text-slate-400 mb-4">How often should we notify you about new listings?</p>
          <div className="space-y-2">
            {ALERT_FREQ.map(f => {
              const active = alertFreq === f.id;
              return (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setAlertFreq(f.id)}
                  role="radio"
                  aria-checked={active}
                  className={`w-full flex items-center gap-3.5 bg-white rounded-2xl p-4 border-2 text-left transition-all
                    ${active ? 'border-[#F7921E] bg-[#FEF3E2]' : 'border-slate-200'}`}
                >
                  <span className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0
                    ${active ? 'border-[#F7921E]' : 'border-slate-300'}`}>
                    {active && <span className="w-2.5 h-2.5 rounded-full bg-[#F7921E]" />}
                  </span>
                  <span className="flex-1">
                    <span className={`block text-sm font-semibold ${active ? 'text-[#E07B0A]' : 'text-slate-700'}`}>{f.label}</span>
                    <span className="block text-xs text-slate-400 mt-0.5">{f.desc}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {!loading && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t px-4 py-4 z-30">
          <div className="max-w-lg mx-auto">
            <button
              onClick={handleSave}
              disabled={saving}
              className="cta-btn w-full h-12 rounded-2xl font-bold text-sm disabled:opacity-60"
            >
              {saving ? 'Saving...' : 'Save preferences'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
