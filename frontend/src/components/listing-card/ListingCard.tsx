'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import Image from 'next/image';
import Link from 'next/link';
import { MapPin, Clock, Heart, Eye } from 'lucide-react';
import { formatPrice, timeAgo, fulfillLabel } from '@/lib/utils';
import { api } from '@/lib/api';
import type { Listing } from '@/lib/types';
import { usePrefs } from '@/context/PrefsContext';
import { useSaved } from '@/hooks/useSaved';

const CATEGORY_EMOJI: Record<string, string> = {
  'tiffin':       '🍱',
  'pg-roommate':  '🏠',
  'jobs':         '💼',
  'vehicles':     '🚗',
  'electronics':  '📱',
  'events':       '🎉',
  'businesses':   '🏪',
  'education':    '📚',
};

const CATEGORY_COLOR: Record<string, string> = {
  'tiffin':       '#f97316',
  'pg-roommate':  '#3b82f6',
  'jobs':         '#10b981',
  'vehicles':     '#ef4444',
  'electronics':  '#8b5cf6',
  'education':    '#f59e0b',
  'events':       '#ec4899',
  'businesses':   '#06b6d4',
};

interface Props {
  listing: Listing;
  citySlug?: string;
}

export default function ListingCard({ listing }: Props) {
  const { t } = usePrefs();
  const { toggle, isSaved } = useSaved();
  const [heartBounce, setHeartBounce] = useState(false);

  const image      = listing.images?.[0];
  const waUrl      = listing.whatsapp_url ?? `https://wa.me/${listing.contact_phone.replace('+', '')}`;
  const href       = `/listing/${listing.id}`;
  const saved      = isSaved(listing.id);
  const catColor   = CATEGORY_COLOR[listing.category_slug ?? ''] ?? '#94a3b8';
  const isFeatured = listing.is_featured;

  const handleHeartClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setHeartBounce(true);
    toggle(listing);
  };

  return (
    <motion.div
      className="group relative bg-white rounded-[20px] overflow-hidden"
      style={{
        boxShadow: isFeatured
          ? '0 2px 16px rgba(247,183,49,0.18), 0 1px 4px rgba(0,0,0,0.06), inset 0 0 0 1.5px rgba(247,183,49,0.38)'
          : '0 2px 10px rgba(0,0,0,0.07), 0 1px 3px rgba(0,0,0,0.04), inset 0 0 0 1px rgba(0,0,0,0.06)',
      }}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22 }}
      whileHover={{
        y: -5,
        boxShadow: isFeatured
          ? '0 20px 48px rgba(247,183,49,0.22), 0 6px 14px rgba(0,0,0,0.08)'
          : '0 20px 48px rgba(0,0,0,0.13), 0 6px 12px rgba(0,0,0,0.06)',
        transition: { duration: 0.22, ease: [0.22, 1, 0.36, 1] },
      }}
    >
      {/* Category color accent strip */}
      <div
        className="absolute inset-x-0 top-0 h-[3px] z-20"
        style={{ background: catColor }}
        aria-hidden
      />

      <Link href={href} className="block">
        {/* ── Image area ───────────────────────────────── */}
        <div className="relative h-48 bg-slate-50 overflow-hidden">

          {image ? (
            <>
              <Image
                src={image.url}
                alt={listing.title}
                fill
                className="object-cover transition-transform duration-500 group-hover:scale-[1.05]"
                sizes="(max-width: 768px) 50vw, 25vw"
              />
              {/* Bottom gradient overlay */}
              <div
                className="absolute inset-x-0 bottom-0 h-[76px] pointer-events-none z-[1]"
                style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.72) 0%, rgba(0,0,0,0.3) 55%, transparent 100%)' }}
                aria-hidden
              />
            </>
          ) : (
            <div
              className="absolute inset-0 flex items-center justify-center"
              style={{ background: `linear-gradient(135deg, ${catColor}1A 0%, ${catColor}08 100%)` }}
            >
              <span className="text-[52px]" style={{ opacity: 0.25 }}>
                {CATEGORY_EMOJI[listing.category_slug ?? ''] ?? '🏷️'}
              </span>
            </div>
          )}

          {/* Price badge — ON the image (bottom-left over gradient) */}
          {image && (
            <div className="absolute bottom-2.5 left-2.5 z-10">
              {listing.price !== null ? (
                <span
                  className="text-white text-[13px] font-black px-2.5 py-[5px] rounded-[9px] leading-none block"
                  style={{
                    background: 'rgba(247,146,30,0.95)',
                    backdropFilter: 'blur(4px)',
                    boxShadow: '0 2px 10px rgba(247,146,30,0.45)',
                  }}
                >
                  {formatPrice(listing.price)}
                </span>
              ) : (
                <span
                  className="text-white/75 text-[11px] font-semibold px-2 py-1 rounded-lg leading-none block"
                  style={{ background: 'rgba(0,0,0,0.36)', backdropFilter: 'blur(4px)' }}
                >
                  Price on request
                </span>
              )}
            </div>
          )}

          {/* Bookmark heart */}
          <motion.button
            type="button"
            onClick={handleHeartClick}
            aria-label={saved ? 'Remove bookmark' : 'Save listing'}
            animate={heartBounce ? { scale: [1, 1.45, 1] } : { scale: 1 }}
            transition={{ duration: 0.24, ease: 'backOut' }}
            onAnimationComplete={() => setHeartBounce(false)}
            className="absolute top-2.5 right-2.5 z-20 w-8 h-8 rounded-full flex items-center justify-center"
            style={{
              background: 'rgba(255,255,255,0.92)',
              backdropFilter: 'blur(10px)',
              boxShadow: '0 2px 8px rgba(0,0,0,0.14)',
            }}
          >
            <Heart
              className={`w-3.5 h-3.5 transition-colors duration-150 ${saved ? 'fill-red-500 text-red-500' : 'text-slate-400'}`}
              strokeWidth={2}
            />
          </motion.button>

          {/* Featured badge */}
          {isFeatured && (
            <span
              className="absolute top-2.5 left-2.5 z-20 text-[10px] font-black px-2.5 py-1 rounded-[8px] leading-none uppercase tracking-wide"
              style={{
                background: 'linear-gradient(135deg, #F7B731 0%, #F7921E 100%)',
                color: '#1A1A2E',
                boxShadow: '0 2px 10px rgba(247,183,49,0.55)',
              }}
            >
              ⭐ Featured
            </span>
          )}

          {/* Fulfilled overlay */}
          {listing.status === 'fulfilled' && (
            <div className="absolute inset-0 bg-black/58 flex items-center justify-center z-10">
              <span className="text-white font-bold text-sm bg-black/60 px-4 py-1.5 rounded-full">
                {fulfillLabel(listing.category_slug)}
              </span>
            </div>
          )}
        </div>
      </Link>

      {/* ── Body ─────────────────────────────────────── */}
      <div className="px-3 pt-2.5 pb-3">
        <Link href={href}>
          {/* Price in body — only when NO image */}
          {!image && (
            listing.price !== null ? (
              <p className="text-[17px] font-black mb-1 leading-none" style={{ color: 'var(--li-primary)' }}>
                {formatPrice(listing.price)}
              </p>
            ) : (
              <p className="text-[11px] text-slate-400 mb-1">Price on request</p>
            )
          )}

          {/* Title */}
          <p
            className="text-[13.5px] leading-snug line-clamp-2 mb-2"
            style={{ color: 'var(--li-text)', fontWeight: 700 }}
          >
            {listing.title}
          </p>

          {/* Meta row */}
          <div className="flex items-center gap-2 text-[11px] mb-2.5" style={{ color: 'var(--li-muted)' }}>
            {listing.area && (
              <span className="flex items-center gap-1 min-w-0 truncate">
                <MapPin className="w-3 h-3 shrink-0" strokeWidth={2} />
                <span className="truncate">{listing.area}</span>
              </span>
            )}
            <span className="flex items-center gap-1 ml-auto shrink-0">
              <Clock className="w-3 h-3" strokeWidth={2} />
              {timeAgo(listing.created_at)}
            </span>
            {(listing.view_count ?? 0) > 0 && (
              <span className="flex items-center gap-1 shrink-0">
                <Eye className="w-3 h-3" strokeWidth={2} />
                {listing.view_count}
              </span>
            )}
          </div>
        </Link>

        {/* Attribute chips */}
        {listing.attributes && Object.keys(listing.attributes).length > 0 && (
          <div className="flex flex-wrap gap-1 mb-2">
            {Object.values(listing.attributes).map((val, i) => (
              <span
                key={i}
                className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-orange-50 text-orange-600 border border-orange-100"
              >
                {val}
              </span>
            ))}
          </div>
        )}

        {/* WA Verified */}
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
          className="wa-btn w-full py-2.5 text-[13px]"
          onClick={e => { e.stopPropagation(); api.listings.waClick(listing.id); }}
        >
          💬 {t('listing.chatOnWA')}
        </a>
      </div>
    </motion.div>
  );
}
