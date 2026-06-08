'use client';

import { motion } from 'framer-motion';
import Image from 'next/image';
import Link from 'next/link';
import { formatPrice, timeAgo } from '@/lib/utils';
import type { Listing } from '@/lib/types';
import WhatsAppButton from '@/components/whatsapp-button/WhatsAppButton';
import { Badge } from '@/components/ui/badge';

interface Props {
  listing: Listing;
  citySlug?: string;
}

export default function ListingCard({ listing, citySlug = '' }: Props) {
  const image = listing.images?.[0];
  const waUrl =
    listing.whatsapp_url ??
    `https://wa.me/${listing.contact_phone.replace('+', '')}`;
  const href = citySlug
    ? `/${citySlug}/classifieds/${listing.id}`
    : `/classifieds/${listing.id}`;

  return (
    <motion.div
      className="bg-white rounded-xl overflow-hidden border shadow-sm"
      whileHover={{ scale: 1.02, boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}
      transition={{ duration: 0.15 }}
    >
      <Link href={href}>
        <div className="relative aspect-[4/3] bg-muted overflow-hidden">
          {image ? (
            <Image
              src={image.url}
              alt={listing.title}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 50vw, 33vw"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-4xl opacity-20">
              🏷️
            </div>
          )}
          {listing.price !== null && (
            <span
              className="absolute top-2 right-2 text-white text-xs font-bold px-2 py-1 rounded-lg"
              style={{ background: 'var(--li-primary)' }}
            >
              {formatPrice(listing.price)}
            </span>
          )}
          {listing.is_featured && (
            <Badge
              className="absolute bottom-2 left-2 border-0 text-xs text-white"
              style={{ background: 'var(--li-featured)' }}
            >
              ★ Featured
            </Badge>
          )}
          {listing.status === 'fulfilled' && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
              <span className="text-white font-bold text-sm bg-black/60 px-3 py-1 rounded-full">
                Sold
              </span>
            </div>
          )}
        </div>

        <div className="p-2.5">
          <p className="font-semibold text-sm line-clamp-2 mb-0.5">{listing.title}</p>
          {listing.price === null && (
            <p className="text-xs font-medium mb-0.5" style={{ color: 'var(--li-primary)' }}>
              Price on request
            </p>
          )}
          <p className="text-xs text-muted-foreground">{timeAgo(listing.created_at)}</p>
        </div>
      </Link>

      <div className="px-2.5 pb-2.5">
        <WhatsAppButton url={waUrl} variant="compact" />
      </div>
    </motion.div>
  );
}
