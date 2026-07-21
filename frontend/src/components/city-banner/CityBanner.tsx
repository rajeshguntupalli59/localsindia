'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import type { CityBanner as CityBannerData } from '@/lib/types';

export default function CityBanner({ citySlug }: { citySlug: string }) {
  const [banner, setBanner] = useState<CityBannerData | null>(null);

  useEffect(() => {
    let cancelled = false;
    api.cities.banner(citySlug)
      .then(data => { if (!cancelled) setBanner(data); })
      .catch(() => { if (!cancelled) setBanner(null); });
    return () => { cancelled = true; };
  }, [citySlug]);

  if (!banner) return null;

  return (
    <a
      href={banner.link_url}
      target="_blank"
      rel="noopener noreferrer sponsored"
      className="block rounded-2xl overflow-hidden border"
      style={{ borderColor: 'var(--li-border, #E5E7EB)' }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- external advertiser-supplied URLs, not a Cloudinary asset next/image can optimise */}
      <img
        src={banner.image_url}
        alt={banner.advertiser_name}
        className="w-full h-auto object-cover"
        loading="lazy"
      />
    </a>
  );
}
