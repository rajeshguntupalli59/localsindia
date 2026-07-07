import {
  View, Text, ScrollView, TouchableOpacity, Image, StyleSheet,
  Linking, ActivityIndicator, Share, Dimensions, NativeScrollEvent, NativeSyntheticEvent,
} from 'react-native';
import { useState, useEffect } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { listingsApi } from '../lib/api';
import { useSavedContext } from '../context/SavedContext';
import { C, SHADOW, RADIUS } from '../lib/theme';

const { width: SW } = Dimensions.get('window');
const IMAGE_H = SW * 0.72;

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const d = Math.floor(diff / 86400000);
  const h = Math.floor(diff / 3600000);
  const m = Math.floor(diff / 60000);
  if (d > 0) return `${d}d ago`;
  if (h > 0) return `${h}h ago`;
  return `${m}m ago`;
}

function formatPrice(p: number) {
  if (p >= 100000) return `₹${(p / 100000).toFixed(1)}L`;
  if (p >= 1000) return `₹${(p / 1000).toFixed(0)}k`;
  return `₹${p}`;
}

export default function ListingDetailScreen({ navigation, route }: any) {
  const { id } = route.params;
  const insets = useSafeAreaInsets();
  const [listing, setListing] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activePhoto, setActivePhoto] = useState(0);
  const { isSaved, toggle } = useSavedContext();

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

  const handleShare = () => {
    if (!listing) return;
    Share.share({
      message: `Check out: ${listing.title}\nhttps://localsindia.com/listing/${listing.id}`,
      title: listing.title,
    }).catch(() => {});
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={C.orange} size="large" />
      </View>
    );
  }

  if (!listing) {
    return (
      <View style={styles.center}>
        <Ionicons name="search-outline" size={48} color={C.textMuted} style={{ marginBottom: 8 }} />
        <Text style={styles.notFoundTitle}>Listing not found</Text>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backLink}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Text style={styles.backLinkText}>← Go back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const saved = isSaved(listing.id);
  const photos = listing.images ?? [];

  return (
    <>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>

        {/* ── Photo carousel ── */}
        <View style={styles.photoArea}>
          {photos.length > 0 ? (
            <ScrollView
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              scrollEventThrottle={16}
              onScroll={(e: NativeSyntheticEvent<NativeScrollEvent>) => {
                const idx = Math.round(e.nativeEvent.contentOffset.x / SW);
                setActivePhoto(idx);
              }}
              style={{ width: SW, height: IMAGE_H }}
            >
              {photos.map((img: any, i: number) => (
                <Image
                  key={img.id ?? i}
                  source={{ uri: img.url }}
                  style={styles.mainImage}
                  resizeMode="cover"
                />
              ))}
            </ScrollView>
          ) : (
            <View style={styles.imagePlaceholder}>
              <Ionicons name="pricetag-outline" size={56} color={C.textMuted} style={{ opacity: 0.4 }} />
            </View>
          )}

          {/* Top gradient overlay for button readability */}
          <View style={styles.imageTopGrad} pointerEvents="none" />

          {/* Floating back button */}
          <TouchableOpacity
            style={[styles.floatBtn, { top: insets.top + 10 }]}
            onPress={() => navigation.goBack()}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <Ionicons name="arrow-back" size={20} color="white" />
          </TouchableOpacity>

          {/* Floating action buttons — top right */}
          <View style={[styles.floatRight, { top: insets.top + 10 }]}>
            <TouchableOpacity
              style={styles.floatBtn}
              onPress={handleShare}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              accessibilityRole="button"
              accessibilityLabel="Share listing"
            >
              <Ionicons name="share-social-outline" size={19} color="white" />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.floatBtn, saved && styles.floatBtnSaved]}
              onPress={() => toggle(listing)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              accessibilityRole="button"
              accessibilityLabel={saved ? 'Remove from saved listings' : 'Save listing'}
            >
              <Ionicons name={saved ? 'heart' : 'heart-outline'} size={19} color={saved ? C.danger : 'white'} />
            </TouchableOpacity>
          </View>

          {/* Dot indicators */}
          {photos.length > 1 && (
            <View style={styles.dots}>
              {photos.map((_: any, i: number) => (
                <View key={i} style={[styles.dot, i === activePhoto && styles.dotActive]} />
              ))}
            </View>
          )}
        </View>

        {/* ── Content ── */}
        <View style={styles.content}>

          {/* Category + time */}
          <View style={styles.metaTop}>
            {listing.category_name && (
              <View style={styles.catBadge}>
                <Text style={styles.catBadgeText}>{listing.category_name}</Text>
              </View>
            )}
            {listing.is_featured && (
              <View style={styles.featuredBadge}>
                <Ionicons name="star" size={10} color="#92400E" />
                <Text style={styles.featuredText}>Featured</Text>
              </View>
            )}
            <Text style={styles.timeAgo}>{timeAgo(listing.created_at)}</Text>
          </View>

          {/* Title */}
          <Text style={styles.title}>{listing.title}</Text>

          {/* Price */}
          {listing.price !== null ? (
            <Text style={styles.price}>{formatPrice(listing.price)}</Text>
          ) : (
            <Text style={styles.priceOnRequest}>Price on request</Text>
          )}

          {/* Location + views */}
          <View style={styles.metaRow}>
            {listing.area && (
              <View style={styles.metaItem}>
                <Ionicons name="location-sharp" size={13} color={C.orange} />
                <Text style={styles.metaText}>{listing.area}</Text>
              </View>
            )}
            {(listing.view_count ?? 0) > 0 && (
              <View style={styles.metaItem}>
                <Ionicons name="eye-outline" size={13} color={C.textMuted} />
                <Text style={styles.metaText}>{listing.view_count} views</Text>
              </View>
            )}
          </View>

          {/* WA verified badge */}
          {listing.wa_verified && (
            <View style={styles.waBadge}>
              <Ionicons name="checkmark-circle" size={14} color={C.waGreen} />
              <Text style={styles.waBadgeText}>Active on WhatsApp</Text>
            </View>
          )}

          {/* Divider */}
          <View style={styles.divider} />

          {/* Description */}
          <Text style={styles.sectionLabel}>Description</Text>
          <Text style={styles.description}>{listing.description}</Text>

          {/* Seller */}
          {listing.seller_name && (
            <>
              <View style={styles.divider} />
              <Text style={styles.sectionLabel}>Seller</Text>
              <TouchableOpacity
                style={styles.sellerCard}
                onPress={() => navigation.navigate('SellerProfile', { userId: listing.user_id })}
                activeOpacity={0.85}
              >
                <View style={styles.sellerAvatar}>
                  <Text style={styles.sellerInitial}>
                    {listing.seller_name[0]?.toUpperCase() ?? '?'}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.sellerName}>{listing.seller_name}</Text>
                  <Text style={styles.sellerSub}>View seller profile</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={C.textMuted} />
              </TouchableOpacity>
            </>
          )}
        </View>

        {/* Space for sticky bar */}
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* ── Sticky WhatsApp bar ── */}
      <View style={[styles.stickyBar, { paddingBottom: Math.max(insets.bottom, 12) }]}>
        <TouchableOpacity
          style={styles.waBtn}
          onPress={handleWhatsApp}
          activeOpacity={0.9}
          accessibilityRole="button"
          accessibilityLabel={`Chat on WhatsApp about ${listing.title}`}
        >
          <Ionicons name="logo-whatsapp" size={22} color="white" />
          <Text style={styles.waBtnText}>Chat on WhatsApp</Text>
        </TouchableOpacity>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.surface },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: C.surface, gap: 8 },
  notFoundEmoji: { fontSize: 48, marginBottom: 8 },
  notFoundTitle: { fontSize: 18, fontWeight: '700', color: C.text, marginBottom: 16 },
  backLink: {},
  backLinkText: { color: C.orange, fontWeight: '700', fontSize: 15 },

  // Photo
  photoArea: { position: 'relative' },
  mainImage: { width: SW, height: IMAGE_H },
  imagePlaceholder: { height: IMAGE_H * 0.7, backgroundColor: C.pageBg, alignItems: 'center', justifyContent: 'center' },
  imagePlaceholderEmoji: { fontSize: 56, opacity: 0.25 },

  imageTopGrad: {
    position: 'absolute', top: 0, left: 0, right: 0, height: 100,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },

  floatBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.42)',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)',
    position: 'absolute',
    top: 50, left: 16,
  },
  floatBtnSaved: { backgroundColor: 'rgba(255,59,48,0.15)' },
  floatRight: {
    position: 'absolute', top: 50, right: 16, gap: 8,
    flexDirection: 'row',
  },

  thumbRow: {
    position: 'absolute', bottom: 10, left: 0, right: 0,
  },
  thumbRowContent: { paddingHorizontal: 12, gap: 8 },
  thumb: {
    width: 60, height: 50, borderRadius: RADIUS.sm,
    borderWidth: 2, borderColor: 'transparent',
  },
  thumbActive: { borderColor: C.orange },

  dots: {
    position: 'absolute', bottom: 12, left: 0, right: 0,
    flexDirection: 'row', justifyContent: 'center', gap: 6,
  },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.4)' },
  dotActive: { backgroundColor: 'white', width: 16 },

  // Content
  content: { padding: 20 },

  metaTop: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10, flexWrap: 'wrap' },
  catBadge: {
    backgroundColor: C.orangeLight, borderRadius: RADIUS.pill,
    paddingHorizontal: 10, paddingVertical: 4,
  },
  catBadgeText: { color: C.orange, fontSize: 12, fontWeight: '700' },
  featuredBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#FEF3C7', borderRadius: RADIUS.pill,
    paddingHorizontal: 8, paddingVertical: 4,
  },
  featuredText: { color: '#92400E', fontSize: 11, fontWeight: '700' },
  timeAgo: { fontSize: 12, color: C.textMuted, marginLeft: 'auto' },

  title: {
    fontSize: 22, fontWeight: '800', color: C.text,
    letterSpacing: -0.3, lineHeight: 30, marginBottom: 8,
  },
  price: { fontSize: 28, fontWeight: '900', color: C.orange, letterSpacing: -0.5, marginBottom: 12 },
  priceOnRequest: { fontSize: 14, color: C.textMuted, marginBottom: 12, fontStyle: 'italic' },

  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10, flexWrap: 'wrap' },
  metaItem: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#f1f5f9', borderRadius: 20,
    paddingHorizontal: 10, paddingVertical: 5,
  },
  metaText: { fontSize: 12, color: '#6b7280', fontWeight: '500' },

  waBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    alignSelf: 'flex-start',
    backgroundColor: '#F0FFF4', borderRadius: RADIUS.pill,
    paddingHorizontal: 10, paddingVertical: 5, marginBottom: 4,
  },
  waBadgeText: { color: '#16A34A', fontSize: 12, fontWeight: '700' },

  divider: { height: 1, backgroundColor: C.divider, marginVertical: 18 },
  sectionLabel: {
    fontSize: 15, fontWeight: '800', color: C.text, marginBottom: 10,
  },
  description: { fontSize: 15, color: C.textSub, lineHeight: 24 },

  sellerCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: C.pageBg, borderRadius: RADIUS.md,
    padding: 14, borderWidth: 1, borderColor: C.border,
  },
  sellerAvatar: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: C.orange, alignItems: 'center', justifyContent: 'center',
    borderWidth: 2.5, borderColor: '#fbbf24',
  },
  sellerInitial: { color: 'white', fontSize: 18, fontWeight: '900' },
  sellerName: { fontSize: 15, fontWeight: '700', color: C.text, marginBottom: 2 },
  sellerSub: { fontSize: 12, color: C.textMuted },

  // Sticky bar
  stickyBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    padding: 16, paddingBottom: 28,
    backgroundColor: C.surface,
    borderTopWidth: 1, borderTopColor: C.border,
    ...SHADOW.elevated,
  },
  waBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 10, backgroundColor: C.waGreen,
    borderRadius: RADIUS.md, paddingVertical: 16,
    ...SHADOW.waGreen,
  },
  waBtnText: { color: 'white', fontSize: 17, fontWeight: '800', letterSpacing: 0.2 },
});
