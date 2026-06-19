'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import Image from 'next/image';
import Link from 'next/link';
import { MapPin, Clock, Heart, Eye } from 'lucide-react';
import { formatPrice, timeAgo } from '@/lib/utils';
import { api } from '@/lib/api';
import type { Listing } from '@/lib/types';
import { usePrefs } from '@/context/PrefsContext';
import { useSaved } from '@/hooks/useSaved';

const CATEGORY_EMOJI: Record<string, string> = {
  'tiffin': '🍱',
  'pg-roommate': '🏠',
  'jobs': '💼',
  'vehicles': '🚗',
  'electronics': '📱',
  'events': '🎉',
  'businesses': '🏪',
  'education': '📚',
};

interface Props {
  listing: Listing;
  citySlug?: string;
}

export default function ListingCard({ listing }: Props) {
  const { t } = usePrefs();
  const { toggle, isSaved } = useSaved();
  const [heartBounce, setHeartBounce] = useState(false);

  const image = listing.images?.[0];
  const waUrl =
    listing.whatsapp_url ??
    `https://wa.me/${listing.contact_phone.replace('+', '')}`;
  const href = `/listing/${listing.id}`;
  const saved = isSaved(listing.id);

  const handleHeartClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setHeartBounce(true);
    toggle(listing);
  };

  return (
    <motion.div
      className="bg-white rounded-2xl overflow-hidden border card-hover"
      style={{ borderColor: 'var(--li-border)' }}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
    >
      <Link href={href} className="block">
        {/* Image */}
        <div className="relative h-44 bg-gray-100 overflow-hidden">
          {image ? (
            <Image
              src={image.url}
              alt={listing.title}
              fill
              className="object-cover transition-transform duration-300 group-hover:scale-105"
              sizes="(max-width: 768px) 50vw, 25vw"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-5xl opacity-20">
              {CATEGORY_EMOJI[listing.category_slug ?? ''] ?? '🏷️'}
            </div>
          )}

          {/* Price badge */}
          {listing.price !== null && (
            <span
              className="absolute bottom-2 left-2 text-white text-xs font-bold px-2.5 py-1.5 rounded-lg"
              style={{ background: 'rgba(15,15,26,0.72)', backdropFilter: 'blur(6px)' }}
            >
              {formatPrice(listing.price)}
            </span>
          )}

          {/* Bookmark heart — scale bounce on toggle */}
          <motion.button
            type="button"
            onClick={handleHeartClick}
            aria-label={saved ? 'Remove bookmark' : 'Save listing'}
            animate={heartBounce ? { scale: [1, 1.35, 1] } : { scale: 1 }}
            transition={{ duration: 0.2 }}
            onAnimationComplete={() => setHeartBounce(false)}
            className="absolute top-2 right-2 z-10 w-7 h-7 rounded-full bg-white/90 flex items-center justify-center shadow-sm hover:bg-white"
          >
            <Heart
              className={`w-3.5 h-3.5 transition-colors duration-150 ${saved ? 'fill-red-500 text-red-500' : 'text-slate-400'}`}
              strokeWidth={2}
            />
          </motion.button>

          {/* Featured badge */}
          {listing.is_featured && (
            <span className="badge-featured absolute top-2 left-2">
              ⭐ {t('listing.featured')}
            </span>
          )}

          {/* Sold overlay */}
          {listing.status === 'fulfilled' && (
            <div className="absolute inset-0 bg-black/55 flex items-center justify-center">
              <span className="text-white font-bold text-sm bg-black/60 px-4 py-1.5 rounded-full">
                {t('listing.sold')}
              </span>
            </div>
          )}
        </div>
      </Link>

      {/* Body */}
      <div className="p-3">
        <Link href={href}>
          <p
            className="font-700 text-sm leading-snug line-clamp-2 mb-1.5"
            style={{ color: 'var(--li-text)', fontWeight: 700 }}
          >
            {listing.title}
          </p>

          {/* Social proof line: Posted X ago + view count */}
          <div className="flex items-center gap-3 text-xs mb-2" style={{ color: 'var(--li-muted)' }}>
            {listing.area && (
              <span className="flex items-center gap-1 truncate">
                <MapPin className="w-3 h-3 shrink-0" />
                {listing.area}
              </span>
            )}
            <span className="flex items-center gap-1 ml-auto shrink-0">
              <Clock className="w-3 h-3" />
              Posted {timeAgo(listing.created_at)}
            </span>
            {(listing.view_count ?? 0) > 0 && (
              <span className="flex items-center gap-1 shrink-0">
                <Eye className="w-3 h-3" />
                {listing.view_count}
              </span>
            )}
          </div>
        </Link>

        {/* WA Verified badge */}
        {listing.wa_verified && (
          <div className="flex items-center gap-1 mb-2">
            <span
              className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full"
              style={{ background: '#dcfce7', color: '#16a34a' }}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-[#25D366] inline-block" />
              {t('listing.activeOnWA')}
            </span>
          </div>
        )}

        {/* WhatsApp CTA */}
        <a
          href={waUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="wa-btn mt-1 w-full py-2.5 text-sm"
          onClick={e => { e.stopPropagation(); api.listings.waClick(listing.id); }}
        >
          💬 {t('listing.chatOnWA')}
        </a>
      </div>
    </motion.div>
  );
}
