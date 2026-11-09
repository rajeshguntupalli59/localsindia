import type { Business } from '@/lib/types';

type TitleFields = Pick<Business, 'name' | 'address' | 'phone' | 'opening_hours' | 'locality'>;

/** Search title that names only the details this page really has ("contact number" searches are our main traffic). */
export function businessTitle(b: TitleFields, city: string, kind: string): string {
  const details = [b.address && 'Address', b.phone && 'Phone Number', b.opening_hours && 'Timings'].filter(Boolean) as string[];
  if (details.length === 0) return `${b.name} — ${kind} in ${city} | LocalsIndia`;
  const place = b.locality || city;
  const name = b.name.toLowerCase().includes(place.toLowerCase()) ? b.name : `${b.name}, ${place}`;
  const last = details.pop();
  return `${name} — ${details.length ? `${details.join(', ')} & ` : ''}${last} | LocalsIndia`;
}
