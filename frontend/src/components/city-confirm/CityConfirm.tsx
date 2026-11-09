'use client';

import type { City } from '@/lib/types';

type Props = {
  cities: Pick<City, 'slug' | 'name'>[];
  value: string;
  confirmed: boolean;
  onChange: (slug: string) => void;
  onConfirmedChange: (confirmed: boolean) => void;
};

/** The city a post goes live in. Starts on the city being browsed, so the poster must actively agree to it. */
export default function CityConfirm({ cities, value, confirmed, onChange, onConfirmedChange }: Props) {
  const sorted = [...cities].sort((a, b) => a.name.localeCompare(b.name));
  const name = cities.find(c => c.slug === value)?.name ?? 'this city';
  return (
    <div className="rounded-2xl border p-4 space-y-3" style={{ borderColor: 'var(--li-border)' }}>
      <div>
        <label htmlFor="post-city" className="text-sm font-bold mb-2 block" style={{ color: 'var(--li-text)' }}>
          Which city is this in? <span style={{ color: '#EF4444' }}>*</span>
        </label>
        <select
          id="post-city"
          value={value}
          onChange={e => { onChange(e.target.value); onConfirmedChange(true); }}
          className="w-full h-11 rounded-xl border-2 bg-white px-3 text-sm outline-none"
          style={{ borderColor: 'var(--li-border)', color: 'var(--li-text)' }}
        >
          {sorted.map(c => <option key={c.slug} value={c.slug}>{c.name}</option>)}
        </select>
        <p className="text-xs mt-1.5" style={{ color: 'var(--li-muted)' }}>
          Only people in this city will see it. Village or town not listed? Pick the nearest city.
        </p>
      </div>
      <label className="flex items-center gap-2.5 text-sm font-semibold cursor-pointer" style={{ color: 'var(--li-text)' }}>
        <input
          type="checkbox"
          checked={confirmed}
          onChange={e => onConfirmedChange(e.target.checked)}
          className="w-4 h-4 shrink-0"
        />
        Yes, this is in {name}
      </label>
    </div>
  );
}
