import Link from 'next/link';
import Image from 'next/image';
import { MapPin, Phone } from 'lucide-react';
import { businessCovers, coverFor } from '@/lib/categoryCover';
import OsmAttribution from '@/components/osm-attribution/OsmAttribution';
import type { Business } from '@/lib/types';

// Server-rendered grid of directory businesses (so search engines see them),
// each with its own photo or a distinct category cover.
export default function BusinessList({ businesses, citySlug, fallbackCategory }: {
  businesses: Business[];
  citySlug: string;
  fallbackCategory?: string;
}) {
  const covers = businessCovers(businesses.map(b => ({ ...b, category_slug: b.category_slug ?? fallbackCategory })));
  return (
    <>
      <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {businesses.map(b => (
          <li key={b.id}>
            <Link
              href={`/${citySlug}/businesses/${b.id}`}
              className="flex gap-3 bg-white rounded-2xl border p-3 hover:shadow-md transition-shadow h-full"
              style={{ borderColor: 'var(--li-border)' }}
            >
              <div className="relative w-16 h-16 rounded-xl overflow-hidden shrink-0 bg-slate-100">
                <Image
                  src={b.images?.[0]?.url ?? covers.get(b.id) ?? coverFor({ id: b.id, category_slug: fallbackCategory, name: b.name })}
                  alt="" fill className="object-cover" sizes="64px"
                />
              </div>
              <div className="min-w-0">
                <h3 className="font-bold text-sm line-clamp-1" style={{ color: 'var(--li-text)' }}>{b.name}</h3>
                {b.address && (
                  <p className="flex items-center gap-1 text-xs mt-0.5" style={{ color: 'var(--li-muted)' }}>
                    <MapPin className="w-3 h-3 shrink-0" /> <span className="truncate">{b.address}</span>
                  </p>
                )}
                {b.phone && (
                  <p className="flex items-center gap-1 text-xs mt-0.5" style={{ color: 'var(--li-muted)' }}>
                    <Phone className="w-3 h-3 shrink-0" /> {b.phone}
                  </p>
                )}
              </div>
            </Link>
          </li>
        ))}
      </ul>
      {businesses.some(b => b.source === 'osm') && <OsmAttribution className="mt-2" />}
    </>
  );
}

/** Row of pill links, e.g. other areas or categories. */
export function ChipLinks({ title, links }: { title: string; links: { href: string; label: string }[] }) {
  if (links.length === 0) return null;
  return (
    <div>
      <p className="text-sm font-semibold mb-3" style={{ color: 'var(--li-text)' }}>{title}</p>
      <div className="flex flex-wrap gap-2">
        {links.map(l => (
          <Link
            key={l.href}
            href={l.href}
            className="text-xs px-3 py-1.5 rounded-full border transition-colors hover:border-orange-400 hover:text-orange-500"
            style={{ borderColor: 'var(--li-border)', color: 'var(--li-muted)' }}
          >
            {l.label}
          </Link>
        ))}
      </div>
    </div>
  );
}
