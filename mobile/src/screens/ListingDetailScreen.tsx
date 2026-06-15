import { View, Text, ScrollView, TouchableOpacity, Image, StyleSheet, Linking, ActivityIndicator } from 'react-native';
import { useState, useEffect } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { listingsApi } from '../lib/api';

export default function ListingDetailScreen({ navigation, route }: any) {
  const { id } = route.params;
  const [listing, setListing] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activePhoto, setActivePhoto] = useState(0);

  useEffect(() => {
    listingsApi.getById(id)
      .then(data => { setListing(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, [id]);

  const handleWhatsApp = () => {
    if (!listing) return;
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

  const timeAgo = (iso: string) => {
    const diff = Date.now() - new Date(iso).getTime();
    const d = Math.floor(diff / 86400000);
    const h = Math.floor(diff / 3600000);
    const m = Math.floor(diff / 60000);
    if (d > 0) return `${d}d ago`;
    if (h > 0) return `${h}h ago`;
    return `${m}m ago`;
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color="#f97316" size="large" />
      </View>
    );
  }

  if (!listing) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>Listing not found</Text>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backLink}>
          <Text style={styles.backLinkText}>← Go back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <>
      <ScrollView style={styles.container}>

        {/* Back */}
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={20} color="#f97316" />
        </TouchableOpacity>

        {/* Photos */}
        {listing.images?.length > 0 ? (
          <>
            <Image
              source={{ uri: listing.images[activePhoto]?.url }}
              style={styles.mainImage}
              resizeMode="cover"
            />
            {listing.images.length > 1 && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.thumbRow}>
                {listing.images.map((img: any, i: number) => (
                  <TouchableOpacity key={img.id} onPress={() => setActivePhoto(i)}>
                    <Image
                      source={{ uri: img.url }}
                      style={[styles.thumb, i === activePhoto && styles.thumbActive]}
                    />
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}
          </>
        ) : (
          <View style={styles.imagePlaceholder}>
            <Text style={styles.imagePlaceholderEmoji}>🏷️</Text>
          </View>
        )}

        <View style={styles.body}>
          {listing.category_name && (
            <View style={styles.categoryBadge}>
              <Text style={styles.categoryBadgeText}>{listing.category_name}</Text>
            </View>
          )}

          <Text style={styles.title}>{listing.title}</Text>

          {listing.price !== null ? (
            <Text style={styles.price}>{formatPrice(listing.price)}</Text>
          ) : (
            <Text style={styles.priceOnRequest}>Price on request</Text>
          )}

          {listing.area && (
            <View style={styles.metaRow}>
              <Ionicons name="location-outline" size={13} color="#9ca3af" />
              <Text style={styles.metaText}>{listing.area}</Text>
            </View>
          )}

          <View style={styles.metaRow}>
            <Ionicons name="time-outline" size={13} color="#9ca3af" />
            <Text style={styles.metaText}>Posted {timeAgo(listing.created_at)}</Text>
          </View>

          {listing.seller_name && (
            <TouchableOpacity
              style={styles.sellerRow}
              onPress={() => navigation.navigate('SellerProfile', { userId: listing.user_id })}
            >
              <View style={styles.sellerAvatar}>
                <Text style={styles.sellerInitial}>
                  {listing.seller_name[0]?.toUpperCase() ?? '?'}
                </Text>
              </View>
              <View>
                <Text style={styles.sellerLabel}>Listed by</Text>
                <Text style={styles.sellerName}>{listing.seller_name} →</Text>
              </View>
            </TouchableOpacity>
          )}

          {listing.wa_verified && (
            <View style={styles.waBadge}>
              <Text style={styles.waBadgeText}>✓ Active on WhatsApp</Text>
            </View>
          )}

          <Text style={styles.descLabel}>Description</Text>
          <Text style={styles.description}>{listing.description}</Text>
        </View>

        {/* Space for sticky bar */}
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Sticky WhatsApp button */}
      <View style={styles.stickyBar}>
        <TouchableOpacity style={styles.waBtn} onPress={handleWhatsApp}>
          <Text style={styles.waBtnText}>💬  Chat on WhatsApp</Text>
        </TouchableOpacity>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'white' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  errorText: { color: '#9ca3af', marginBottom: 12 },
  backBtn: { padding: 16, paddingTop: 52 },
  backLink: { marginTop: 8 },
  backLinkText: { color: '#f97316', fontWeight: '600' },
  mainImage: { width: '100%', height: 250 },
  imagePlaceholder: { height: 160, backgroundColor: '#f3f4f6', alignItems: 'center', justifyContent: 'center' },
  imagePlaceholderEmoji: { fontSize: 48, opacity: 0.3 },
  thumbRow: { paddingHorizontal: 12, paddingVertical: 8 },
  thumb: { width: 60, height: 50, borderRadius: 8, marginRight: 8, borderWidth: 2, borderColor: 'transparent' },
  thumbActive: { borderColor: '#f97316' },
  body: { padding: 16 },
  categoryBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#fff7ed',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginBottom: 10,
  },
  categoryBadgeText: { color: '#f97316', fontSize: 12, fontWeight: '600' },
  title: { fontSize: 20, fontWeight: 'bold', color: '#111827', marginBottom: 8, lineHeight: 28 },
  price: { fontSize: 24, fontWeight: '800', color: '#f97316', marginBottom: 10 },
  priceOnRequest: { fontSize: 13, color: '#9ca3af', marginBottom: 10 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 5 },
  metaText: { fontSize: 13, color: '#9ca3af' },
  sellerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    padding: 12,
    marginVertical: 10,
  },
  sellerAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f97316',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sellerInitial: { color: 'white', fontWeight: '800', fontSize: 16 },
  sellerLabel: { fontSize: 11, color: '#9ca3af' },
  sellerName: { fontSize: 14, fontWeight: '700', color: '#111827' },
  waBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#dcfce7',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginBottom: 14,
  },
  waBadgeText: { color: '#16a34a', fontSize: 11, fontWeight: '700' },
  descLabel: { fontSize: 14, fontWeight: '700', color: '#374151', marginBottom: 6, marginTop: 4 },
  description: { fontSize: 14, color: '#4b5563', lineHeight: 22 },
  stickyBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 4,
  },
  waBtn: { backgroundColor: '#25d366', borderRadius: 12, padding: 15, alignItems: 'center' },
  waBtnText: { color: 'white', fontSize: 16, fontWeight: '700' },
});
