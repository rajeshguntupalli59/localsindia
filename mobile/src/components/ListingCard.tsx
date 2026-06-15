import { View, Text, TouchableOpacity, Image, StyleSheet, Linking } from 'react-native';
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
  images?: { id: string; url: string; display_order: number }[];
}

interface Props {
  listing: Listing;
  onPress?: () => void;
}

export default function ListingCard({ listing, onPress }: Props) {
  const image = listing.images?.[0];
  const bgColor = CATEGORY_COLORS[listing.category_slug ?? ''] ?? '#6b7280';

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
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.9}>
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

        {listing.area && (
          <View style={styles.locationRow}>
            <Ionicons name="location-outline" size={11} color="#9ca3af" />
            <Text style={styles.location}>{listing.area}</Text>
          </View>
        )}

        <TouchableOpacity style={styles.waBtn} onPress={handleWhatsApp}>
          <Text style={styles.waBtnText}>💬 Chat on WhatsApp</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
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
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 3, marginBottom: 10 },
  location: { fontSize: 11, color: '#9ca3af' },
  waBtn: {
    backgroundColor: '#25d366',
    borderRadius: 10,
    padding: 11,
    alignItems: 'center',
  },
  waBtnText: { color: 'white', fontWeight: '700', fontSize: 14 },
});
