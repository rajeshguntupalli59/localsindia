import { useState, useRef } from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet, Linking, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { listingsApi } from '../lib/api';

const CATEGORY_COLORS: Record<string, string> = {
  tiffin: '#f97316',
  'pg-roommate': '#3b82f6',
  jobs: '#10b981',
  vehicles: '#ef4444',
  electronics: '#8b5cf6',
  education: '#f59e0b',
  events: '#ec4899',
  businesses: '#06b6d4',
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

export default function ListingCard({ listing, onPress }: Props) {
  const image = listing.images?.[0];
  const bgColor = CATEGORY_COLORS[listing.category_slug ?? ''] ?? '#6b7280';
  const [saved, setSaved] = useState(false);
  const heartScale = useRef(new Animated.Value(1)).current;

  const handleSave = () => {
    Animated.sequence([
      Animated.timing(heartScale, { toValue: 1.4, duration: 100, useNativeDriver: true }),
      Animated.spring(heartScale, { toValue: 1, useNativeDriver: true, bounciness: 10 }),
    ]).start();
    setSaved(s => !s);
  };

  const handleWhatsApp = () => {
    listingsApi.waClick(listing.id);
    const phone = listing.whatsapp_url
      ? listing.whatsapp_url.replace('https://wa.me/', '')
      : listing.contact_phone.replace('+', '');
    const msg = encodeURIComponent(`Hi, I saw your listing "${listing.title}" on LocalsIndia. Is it still available?`);
    Linking.openURL(`https://wa.me/${phone}?text=${msg}`);
  };

  const formatPrice = (p: number) => {
    if (p >= 100000) return `₹${(p / 100000).toFixed(1)}L`;
    if (p >= 1000) return `₹${(p / 1000).toFixed(0)}k`;
    return `₹${p}`;
  };

  return (
    <View style={styles.card}>
      <TouchableOpacity onPress={onPress} activeOpacity={0.9}>
        <View style={{ position: 'relative' }}>
          {image ? (
            <Image source={{ uri: image.url }} style={styles.image} resizeMode="cover" />
          ) : (
            <View style={[styles.imagePlaceholder, { backgroundColor: bgColor }]}>
              <Text style={styles.emoji}>
                {listing.category_slug === 'tiffin' ? '🍱'
                  : listing.category_slug === 'pg-roommate' ? '🏠'
                  : listing.category_slug === 'jobs' ? '💼'
                  : listing.category_slug === 'vehicles' ? '🚗'
                  : listing.category_slug === 'electronics' ? '📱'
                  : listing.category_slug === 'education' ? '📚'
                  : '🏷️'}
              </Text>
            </View>
          )}
        </View>

        <View style={styles.body}>
          {listing.is_featured && (
            <View style={styles.featuredBadge}>
              <Text style={styles.featuredText}>⭐ Featured</Text>
            </View>
          )}
          {listing.wa_verified && (
            <View style={styles.verifiedBadge}>
              <Text style={styles.verifiedText}>✓ Active on WhatsApp</Text>
            </View>
          )}

          {listing.price !== null ? (
            <Text style={styles.price}>{formatPrice(listing.price)}</Text>
          ) : (
            <Text style={styles.priceOnRequest}>Price on request</Text>
          )}

          <Text style={styles.title} numberOfLines={2}>{listing.title}</Text>

          {/* Social proof line */}
          <View style={styles.metaRow}>
            {listing.area ? (
              <View style={styles.metaItem}>
                <Ionicons name="location-outline" size={11} color="#9ca3af" />
                <Text style={styles.metaText} numberOfLines={1}>{listing.area}</Text>
              </View>
            ) : null}
            {listing.created_at ? (
              <Text style={[styles.metaText, { marginLeft: 'auto' }]}>
                Posted {timeAgo(listing.created_at)}
              </Text>
            ) : null}
            {(listing.view_count ?? 0) > 0 ? (
              <View style={styles.metaItem}>
                <Ionicons name="eye-outline" size={11} color="#9ca3af" />
                <Text style={styles.metaText}>{listing.view_count}</Text>
              </View>
            ) : null}
          </View>

          <TouchableOpacity style={styles.waBtn} onPress={handleWhatsApp}>
            <Text style={styles.waBtnText}>💬 Chat on WhatsApp</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>

      {/* Heart save button — positioned outside main touchable to avoid tap conflict */}
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
    borderRadius: 16,
    marginBottom: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  image: { width: '100%', height: 160 },
  imagePlaceholder: {
    width: '100%',
    height: 120,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emoji: { fontSize: 40, opacity: 0.4 },
  body: { padding: 12 },
  featuredBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#fef3c7',
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginBottom: 6,
  },
  featuredText: { color: '#92400e', fontSize: 11, fontWeight: '700' },
  verifiedBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#dcfce7',
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginBottom: 6,
  },
  verifiedText: { color: '#16a34a', fontSize: 11, fontWeight: '700' },
  price: { fontSize: 20, fontWeight: '800', color: '#f97316', marginBottom: 4 },
  priceOnRequest: { fontSize: 12, color: '#9ca3af', marginBottom: 4 },
  title: { fontSize: 14, fontWeight: '600', color: '#111827', lineHeight: 20, marginBottom: 6 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  metaText: { fontSize: 11, color: '#9ca3af' },
  waBtn: {
    backgroundColor: '#25d366',
    borderRadius: 10,
    padding: 11,
    alignItems: 'center',
  },
  waBtnText: { color: 'white', fontWeight: '700', fontSize: 14 },
  heartBtn: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.92)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 3,
  },
});
