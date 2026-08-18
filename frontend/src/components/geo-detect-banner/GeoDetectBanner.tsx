'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { MapPin, X, Loader2 } from 'lucide-react';
import { usePrefs } from '@/context/PrefsContext';
import { geolocateAndMatch } from '@/lib/geolocate';

const ATTEMPTED_KEY = 'li_geo_attempted';

/**
 * One-time "let us find your city?" bar shown on first visit (no saved city
 * yet). Deliberately a click-through prompt, not a silent auto-fire —
 * browsers throttle/ignore geolocation requests not tied to a user gesture,
 * and an unprompted permission popup on page load feels intrusive.
 */
export default function GeoDetectBanner() {
  const pathname = usePathname();
  const isAdmin = pathname?.startsWith('/admin');
  const { citySlug, citiesLoading, cities, setCity } = usePrefs();
  const [visible, setVisible] = useState(false);
  const [locating, setLocating] = useState(false);

  useEffect(() => {
    if (isAdmin) return;
    if (citiesLoading || citySlug !== '') return;
    if (typeof window === 'undefined') return;
    if (localStorage.getItem(ATTEMPTED_KEY)) return;
    setVisible(true);
  }, [isAdmin, citiesLoading, citySlug]);

  const dismiss = () => {
    localStorage.setItem(ATTEMPTED_KEY, '1');
    setVisible(false);
  };

  const handleUseLocation = async () => {
    setLocating(true);
    const result = await geolocateAndMatch(cities);
    setLocating(false);
    localStorage.setItem(ATTEMPTED_KEY, '1');
    setVisible(false);
    if (result.status === 'located') setCity(result.match);
  };

  if (!visible) return null;

  return (
    <div className="w-full bg-[#0D0F1C] text-white">
      <div className="page-wrap flex items-center justify-between gap-3 py-2.5">
        <span className="flex items-center gap-2 text-[13px] text-slate-200">
          <MapPin className="w-4 h-4 text-[#F7921E] shrink-0" strokeWidth={2.3} />
          Let us find your city?
        </span>
        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={handleUseLocation}
            disabled={locating}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12.5px] font-semibold
              text-white bg-[#F7921E] hover:bg-[#E07B0A] transition-colors duration-150
              disabled:opacity-70"
          >
            {locating && <Loader2 className="w-3 h-3 animate-spin" strokeWidth={2.5} />}
            {locating ? 'Locating…' : 'Use my location'}
          </button>
          <button
            type="button"
            onClick={dismiss}
            aria-label="Dismiss"
            className="p-1.5 text-slate-400 hover:text-white transition-colors duration-150"
          >
            <X className="w-4 h-4" strokeWidth={2} />
          </button>
        </div>
      </div>
    </div>
  );
}
