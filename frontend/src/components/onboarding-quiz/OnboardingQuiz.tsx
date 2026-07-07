'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Briefcase, Home, Car, Smartphone, Wrench, Package, Flame, CalendarDays, Eye, type LucideIcon } from 'lucide-react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'https://localsindia-backend.azurewebsites.net';

const INTERESTS: { id: string; label: string; icon: LucideIcon }[] = [
  { id: 'jobs', label: 'Jobs', icon: Briefcase },
  { id: 'pg', label: 'PG / Room', icon: Home },
  { id: 'vehicles', label: 'Vehicles', icon: Car },
  { id: 'electronics', label: 'Electronics', icon: Smartphone },
  { id: 'services', label: 'Services', icon: Wrench },
  { id: 'other', label: 'Other', icon: Package },
];

const BUDGETS = [
  { id: '5000-8000', label: '₹5K–8K', min: 5000, max: 8000 },
  { id: '8000-12000', label: '₹8K–12K', min: 8000, max: 12000 },
  { id: '12000-20000', label: '₹12K–20K', min: 12000, max: 20000 },
  { id: '20000+', label: '₹20K+', min: 20000, max: null },
];

const TIMELINES: { id: string; label: string; icon: LucideIcon }[] = [
  { id: 'asap', label: 'ASAP', icon: Flame },
  { id: 'this_month', label: 'This month', icon: CalendarDays },
  { id: 'browsing', label: 'Just browsing', icon: Eye },
];

const ALERT_FREQ = [
  { id: 'daily', label: 'Daily digest' },
  { id: 'weekly', label: 'Weekly digest' },
  { id: 'never', label: 'No emails' },
];

interface Props {
  onClose: () => void;
}

export default function OnboardingQuiz({ onClose }: Props) {
  const [interests, setInterests] = useState<string[]>([]);
  const [budget, setBudget] = useState<string>('');
  const [timeline, setTimeline] = useState<string>('');
  const [alertFreq, setAlertFreq] = useState<string>('weekly');
  const [saving, setSaving] = useState(false);

  const toggleInterest = (id: string) => {
    setInterests(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const selectedBudget = BUDGETS.find(b => b.id === budget);

  const handleSave = async () => {
    setSaving(true);
    const token = localStorage.getItem('access_token');
    try {
      await fetch(`${API_BASE}/api/v1/preferences`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          interests,
          budget_min: selectedBudget?.min ?? null,
          budget_max: selectedBudget?.max ?? null,
          timeline: timeline || null,
          alert_frequency: alertFreq,
          onboarding_done: true,
        }),
      });
    } catch { /* non-blocking */ }
    setSaving(false);
    onClose();
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
        style={{ background: 'rgba(0,0,0,0.45)' }}
        onClick={e => { if (e.target === e.currentTarget) onClose(); }}
      >
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
          className="w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-3xl overflow-hidden
            shadow-[0_20px_60px_rgba(0,0,0,0.18)]"
        >
          {/* Header */}
          <div className="px-6 pt-6 pb-4 flex items-start justify-between"
            style={{ background: 'var(--li-nav-bg)' }}>
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-white/50 mb-1">Quick setup</p>
              <h2 className="text-xl font-bold text-white">What are you looking for?</h2>
              <p className="text-sm text-white/60 mt-1">Personalise your feed in 30 seconds</p>
            </div>
            <button type="button" onClick={onClose} aria-label="Close"
              className="text-white/50 hover:text-white transition-colors mt-1">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="px-6 py-5 space-y-6 max-h-[70vh] overflow-y-auto">

            {/* Interests */}
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">I&apos;m looking for</p>
              <div className="grid grid-cols-3 gap-2">
                {INTERESTS.map(i => {
                  const active = interests.includes(i.id);
                  return (
                    <button
                      key={i.id}
                      type="button"
                      onClick={() => toggleInterest(i.id)}
                      aria-pressed={active}
                      className={`flex flex-col items-center gap-1 py-3 px-2 rounded-xl border-2 text-xs font-semibold transition-all
                        ${active
                          ? 'border-[#F7921E] bg-[#FEF3E2] text-[#E07B0A]'
                          : 'border-slate-200 text-slate-600 hover:border-slate-300'}`}
                    >
                      <i.icon size={20} />
                      {i.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Budget (show if PG selected) */}
            {interests.includes('pg') && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">Monthly budget</p>
                <div className="grid grid-cols-2 gap-2">
                  {BUDGETS.map(b => (
                    <button
                      key={b.id}
                      type="button"
                      onClick={() => setBudget(b.id === budget ? '' : b.id)}
                      className={`py-2.5 rounded-xl border-2 text-sm font-semibold transition-all
                        ${budget === b.id
                          ? 'border-[#F7921E] bg-[#FEF3E2] text-[#E07B0A]'
                          : 'border-slate-200 text-slate-600 hover:border-slate-300'}`}
                    >
                      {b.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Timeline */}
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">How soon?</p>
              <div className="flex gap-2 flex-wrap">
                {TIMELINES.map(t => {
                  const active = timeline === t.id;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setTimeline(t.id === timeline ? '' : t.id)}
                      aria-pressed={active}
                      className={`flex items-center gap-1.5 px-4 py-2 rounded-full border-2 text-sm font-medium transition-all
                        ${active
                          ? 'border-[#F7921E] bg-[#FEF3E2] text-[#E07B0A]'
                          : 'border-slate-200 text-slate-600 hover:border-slate-300'}`}
                    >
                      <t.icon size={14} />
                      {t.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Email alerts */}
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">Email alerts</p>
              <div className="flex gap-2 flex-wrap">
                {ALERT_FREQ.map(f => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setAlertFreq(f.id)}
                    className={`px-4 py-2 rounded-full border-2 text-sm font-medium transition-all
                      ${alertFreq === f.id
                        ? 'border-[#F7921E] bg-[#FEF3E2] text-[#E07B0A]'
                        : 'border-slate-200 text-slate-600 hover:border-slate-300'}`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="px-6 pb-8 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="w-full h-12 rounded-2xl text-white font-bold text-sm transition-colors
                disabled:opacity-60"
              style={{ background: 'var(--li-primary)' }}
            >
              {saving ? 'Saving...' : interests.length > 0 ? 'Save preferences →' : 'Skip for now'}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
