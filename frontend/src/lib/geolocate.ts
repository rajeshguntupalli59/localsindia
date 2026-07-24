import type { City } from '@/lib/types';

export type GeoResult =
  | { status: 'located'; match: City }
  | { status: 'no-match'; raw: string }
  | { status: 'denied' }
  | { status: 'failed'; message: string }
  | { status: 'unsupported' };

/** Reverse-geocodes the browser's current position via OSM Nominatim (free,
 * no API key) and fuzzy-matches the resulting place name against `cities`. */
export function geolocateAndMatch(cities: City[]): Promise<GeoResult> {
  return new Promise(resolve => {
    if (!('geolocation' in navigator)) {
      resolve({ status: 'unsupported' });
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async ({ coords: { latitude, longitude } }) => {
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`,
            { headers: { 'Accept-Language': 'en-IN,en' } }
          );
          const data = await res.json();
          const raw: string = (
            data.address?.city || data.address?.town || data.address?.county || ''
          ).trim();
          const lc = raw.toLowerCase();

          // fuzzy match against our city list
          const match = cities.find(c => {
            const cn = c.name.toLowerCase();
            return (
              cn === lc ||
              lc.startsWith(cn) ||
              cn.startsWith(lc.split(' ')[0])
            );
          });

          if (match) {
            resolve({ status: 'located', match });
          } else {
            resolve({ status: 'no-match', raw });
          }
        } catch {
          resolve({ status: 'failed', message: 'Location lookup failed — check your connection' });
        }
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          resolve({ status: 'denied' });
        } else {
          resolve({ status: 'failed', message: "Couldn't get your location, please try again" });
        }
      },
      { timeout: 10_000, maximumAge: 60_000 }
    );
  });
}

/** Reverse-geocodes a specific lat/lng via OSM Nominatim — used to suggest an
 * area name for a manually-dropped map pin. Returns null on any failure;
 * purely a suggestion, never blocks the caller. */
export async function reverseGeocode(lat: number, lng: number): Promise<string | null> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`,
      { headers: { 'Accept-Language': 'en-IN,en' } }
    );
    const data = await res.json();
    const raw: string = (
      data.address?.suburb || data.address?.village || data.address?.town ||
      data.address?.city || data.address?.county || ''
    ).trim();
    return raw || null;
  } catch {
    return null;
  }
}
