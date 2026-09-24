'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { MapPin, Phone, Store, ArrowRight } from 'lucide-react';
import { api } from '@/lib/api';
import type { Business } from '@/lib/types';
import OsmAttribution from '@/components/osm-attribution/OsmAttribution';

/**
 * "Local businesses" strip for a category page — the directory businesses
 * (many imported from OpenStreetMap) filed under the same category as the
 * listings being browsed. Renders nothing when the category has none.
 */
export default function CategoryBusinesses({
  citySlug,
  categorySlug,
  categoryName,
}: {
  citySlug: string;
  categorySlug: string;
  categoryName?: string;
}) {
  const [items, setItems] = useState<Business[]>([]);

  useEffect(() => {
    if (!citySlug || !categorySlug) { setItems([]); return; }
    api.businesses.list(citySlug, { category_slug: categorySlug, page_size: '6' })
      .then(setItems)
      .catch(() => setItems([]));
  }, [citySlug, categorySlug]);

  if (items.length === 0) return null;

  return (
    <section className="mt-10">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-extrabold" style={{ color: 'var(--li-text)' }}>
          Local {categoryName ? categoryName.toLowerCase() : 'businesses'} nearby
        </h2>
        <Link
          href={`/${citySlug}/businesses?category=${categorySlug}`}
          className="flex items-center gap-1 text-sm font-semibold hover:underline"
          style={{ color: 'var(--li-primary)' }}
        >
          View all <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {items.map(b => (
          <Link
            key={b.id}
            href={`/${citySlug}/businesses/${b.id}`}
            className="bg-white rounded-2xl border p-4 hover:shadow-md transition-shadow"
            style={{ borderColor: 'var(--li-border)' }}
          >
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'var(--li-primary-light)' }}>
                <Store className="w-4 h-4" style={{ color: 'var(--li-primary)' }} />
              </div>
              <div className="min-w-0">
                <p className="font-bold text-sm line-clamp-1" style={{ color: 'var(--li-text)' }}>{b.name}</p>
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
            </div>
          </Link>
        ))}
      </div>
      {items.some(b => b.source === 'osm') && <OsmAttribution className="mt-2" />}
    </section>
  );
}
