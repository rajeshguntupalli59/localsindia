import { useRef } from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet, Linking, Animated, Share } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { listingsApi } from '../lib/api';
import { useSavedContext } from '../context/SavedContext';

const CATEGORY_COLORS: Record<string, string> = {
  tiffin:        '#f97316',
  'pg-roommate': '#3b82f6',
  jobs:          '#10b981',
  vehicles:      '#ef4444',
  electronics:   '#8b5cf6',
  education:     '#f59e0b',
  events:        '#ec4899',
  businesses:    '#06b6d4',
};

const CATEGORY_EMOJI: Record<string, string> = {
  tiffin:        '🍱',
  'pg-roommate': '🏠',
  jobs:          '💼',
  vehicles:      '🚗',
  electronics:   '📱',
  education:     '📚',
  events:        '🎉',
  businesses:    '🏪',
};

function timeAgo(dateStr: string): string {
  const d = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(d / 60000);
  const h = Math.floor(d / 3600000);
  const day = Math.floor(d / 86400000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  if (h < 24) return `${h}h ago`;
  return `${day}d ago`;
}

interface Listing {
  id: string;
  title: string;
  description: string;
  price: number | null;
  contact_phone: string;
  whatsapp_url: string | null;
  area: string | null;
  wa_verified: boolean;
  is_featured: boolean;
  category_slug?: string | null;
  category_name?: string | null;
  seller_name?: string | null;
  created_at?: string;
  view_count?: number;
  images?: { id: string; url: string; display_order: number }[];
}

interface Props {
  listing: Listing;
  onPress?: () => void;
}

function formatPrice(p: number): string {
  if (p >= 100000) return `₹${(p / 100000).toFixed(1)}L`;
  if (p >= 1000) return `₹${(p / 1000).toFixed(0)}k`;
  return `₹${p}`;
}

export default function ListingCard({ listing, onPress }: Props) {
  const image     = listing.images?.[0];
  const catColor  = CATEGORY_COLORS[listing.category_slug ?? ''] ?? '#94a3b8';
  const catEmoji  = CATEGORY_EMOJI[listing.category_slug ?? ''] ?? '🏷️';
  const heartScale = useRef(new Animated.Value(1)).current;
  const { isSaved, toggle } = useSavedContext();
  const saved = isSaved(listing.id);

  const handleSave = () => {
    Animated.sequence([
      Animated.timing(heartScale, { toValue: 1.45, duration: 100, useNativeDriver: true }),
      Animated.spring(heartScale, { toValue: 1, useNativeDriver: true, bounciness: 12 }),
    ]).start();
    toggle(listing);
  };

  const handleShare = () => {
    const url = `https://localsindia.com/listing/${listing.id}`;
    const price = listing.price != null ? ` — ${formatPrice(listing.price)}` : '';
    Share.share({
      message: `Check out: ${listing.title}${price}\n${url}`,
      title: listing.title,
    }).catch(() => {});
  };

  const handleWhatsApp = () => {
    listingsApi.waClick(listing.id);
    const phone = listing.whatsapp_url
      ? listing.whatsapp_url.replace('https://wa.me/', '')
      : listing.contact_phone.replace('+', '');
    const msg = encodeURIComponent(`Hi, I saw your listing "${listing.title}" on LocalsIndia. Is it still available?`);
    Linking.openURL(`https://wa.me/${phone}?text=${msg}`);
  };

  return (
    <View style={[styles.card, { shadowColor: catColor }]}>
      {/* Brand accent strip at top */}
      <View style={[styles.catStrip, { backgroundColor: '#F7921E' }]} />

      <TouchableOpacity onPress={onPress} activeOpacity={0.92}>
        {/* ── Image area ── */}
        <View style={styles.imageContainer}>
          {image ? (
            <View style={styles.imageWrapper}>
              <Image source={{ uri: image.url }} style={styles.image} resizeMode="cover" />

              {/* Gradient overlay — 5-layer approximation */}
              <View style={styles.gradientOverlay} pointerEvents="none">
                {[0, 0.06, 0.16, 0.32, 0.52].map((opacity, i) => (
                  <View key={i} style={{ flex: 1, backgroundColor: `rgba(0,0,0,${opacity})` }} />
                ))}
              </View>

              {/* Price badge on image */}
              <View style={styles.priceBadgeRow}>
                {listing.price !== null ? (
                  <View style={styles.priceTag}>
                    <Text style={styles.priceTagText}>{formatPrice(listing.price)}</Text>
                  </View>
                ) : (
                  <View style={styles.priceTagDim}>
                    <Text style={styles.priceTagDimText}>Price on request</Text>
                  </View>
                )}
              </View>
            </View>
          ) : (
            /* No image — brand placeholder */
            <View style={[styles.imagePlaceholder, { backgroundColor: 'rgba(247,146,30,0.07)' }]}>
              <Text style={styles.emoji}>{catEmoji}</Text>
            </View>
          )}
        </View>

        {/* ── Body ── */}
        <View style={styles.body}>
          {/* Badges */}
          <View style={styles.badgeRow}>
            {listing.is_featured && (
              <View style={styles.featuredBadge}>
                <Text style={styles.featuredText}>⭐ Featured</Text>
              </View>
            )}
            {listing.wa_verified && (
              <View style={styles.verifiedBadge}>
                <View style={styles.verifiedDot} />
                <Text style={styles.verifiedText}>Active on WA</Text>
              </View>
            )}
          </View>

          {/* Price in body — only when no image */}
          {!image && (
            listing.price !== null ? (
              <Text style={styles.price}>{formatPrice(listing.price)}</Text>
            ) : (
              <Text style={styles.priceOnRequest}>Price on request</Text>
            )
          )}

          {/* Title */}
          <Text style={styles.title} numberOfLines={2}>{listing.title}</Text>

          {/* Meta row */}
          <View style={styles.metaRow}>
            {listing.area ? (
              <View style={styles.metaItem}>
                <Ionicons name="location-outline" size={11} color="#9ca3af" />
                <Text style={styles.metaText} numberOfLines={1}>{listing.area}</Text>
              </View>
            ) : null}
            {listing.created_at ? (
              <Text style={[styles.metaText, { marginLeft: 'auto' }]}>
                {timeAgo(listing.created_at)}
              </Text>
            ) : null}
            {(listing.view_count ?? 0) > 0 ? (
              <View style={styles.metaItem}>
                <Ionicons name="eye-outline" size={11} color="#9ca3af" />
                <Text style={styles.metaText}>{listing.view_count}</Text>
              </View>
            ) : null}
          </View>

          {/* Action row: WhatsApp + Share */}
          <View style={styles.actionRow}>
            <TouchableOpacity style={styles.waBtn} onPress={handleWhatsApp} activeOpacity={0.85}>
              <Text style={styles.waBtnText}>💬 Chat on WhatsApp</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.shareBtn} onPress={handleShare} activeOpacity={0.85}>
              <Ionicons name="share-social-outline" size={18} color="#6b7280" />
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>

      {/* Heart save — outside main touchable */}
      <TouchableOpacity
        style={styles.heartBtn}
        onPress={handleSave}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Animated.View style={{ transform: [{ scale: heartScale }] }}>
          <Ionicons
            name={saved ? 'heart' : 'heart-outline'}
            size={18}
            color={saved ? '#ef4444' : '#9ca3af'}
          />
        </Animated.View>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: 'white',
    borderRadius: 18,
    marginBottom: 12,
    overflow: 'hidden',
    shadowOpacity: 0.18,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 5 },
    elevation: 4,
  },
  catStrip: {
    height: 3,
  },
  imageContainer: {
    width: '100%',
  },
  imageWrapper: {
    position: 'relative',
  },
  image: {
    width: '100%',
    height: 166,
  },
  gradientOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 72,
    flexDirection: 'column',
  },
  priceBadgeRow: {
    position: 'absolute',
    bottom: 10,
    left: 10,
    flexDirection: 'row',
  },
  priceTag: {
    backgroundColor: 'rgba(247,146,30,0.95)',
    borderRadius: 9,
    paddingHorizontal: 10,
    paddingVertical: 5,
    shadowColor: '#f97316',
    shadowOpacity: 0.45,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  priceTagText: {
    color: 'white',
    fontWeight: '900',
    fontSize: 13,
    letterSpacing: -0.3,
  },
  priceTagDim: {
    backgroundColor: 'rgba(0,0,0,0.36)',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  priceTagDimText: {
    color: 'rgba(255,255,255,0.75)',
    fontWeight: '600',
    fontSize: 11,
  },
  imagePlaceholder: {
    width: '100%',
    height: 128,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emoji: {
    fontSize: 44,
    opacity: 0.55,
  },
  body: {
    padding: 12,
  },
  badgeRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 6,
    flexWrap: 'wrap',
  },
  featuredBadge: {
    backgroundColor: '#fef3c7',
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  featuredText: {
    color: '#92400e',
    fontSize: 10,
    fontWeight: '700',
  },
  verifiedBadge: {
    backgroundColor: '#dcfce7',
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 3,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  verifiedDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#25d366',
  },
  verifiedText: {
    color: '#16a34a',
    fontSize: 10,
    fontWeight: '700',
  },
  price: {
    fontSize: 20,
    fontWeight: '900',
    color: '#f97316',
    marginBottom: 4,
    letterSpacing: -0.5,
  },
  priceOnRequest: {
    fontSize: 11,
    color: '#9ca3af',
    marginBottom: 4,
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
    lineHeight: 20,
    marginBottom: 6,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
    flexWrap: 'wrap',
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  metaText: {
    fontSize: 11,
    color: '#9ca3af',
  },
  actionRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  waBtn: {
    flex: 1,
    backgroundColor: '#25d366',
    borderRadius: 11,
    paddingVertical: 12,
    alignItems: 'center',
    shadowColor: '#25d366',
    shadowOpacity: 0.35,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
  waBtnText: {
    color: 'white',
    fontWeight: '700',
    fontSize: 13,
    letterSpacing: 0.1,
  },
  shareBtn: {
    width: 44, height: 44, borderRadius: 11,
    backgroundColor: '#f3f4f6',
    alignItems: 'center', justifyContent: 'center',
  },
  heartBtn: {
    position: 'absolute',
    top: 12,
    right: 10,
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(255,255,255,0.93)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.14,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
});
