import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Image, Alert } from 'react-native';
import { useState, useEffect, useCallback } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { listingsApi } from '../lib/api';
import { storage } from '../lib/storage';

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  active:    { bg: '#dcfce7', text: '#16a34a' },
  pending:   { bg: '#fef9c3', text: '#a16207' },
  flagged:   { bg: '#fee2e2', text: '#dc2626' },
  fulfilled: { bg: '#f3f4f6', text: '#6b7280' },
  expired:   { bg: '#f3f4f6', text: '#6b7280' },
};

const STATUS_LABELS: Record<string, string> = {
  active: 'Active', pending: 'Under Review', flagged: 'Flagged', expired: 'Expired',
};

// "Sold" doesn't fit every category (a roommate isn't "sold") — use a word that matches.
const FULFILLED_LABELS: Record<string, string> = {
  'pg-roommate': 'Filled',
  jobs: 'Filled',
  services: 'Closed',
  tiffin: 'Closed',
  businesses: 'Closed',
  events: 'Closed',
};

const fulfilledLabel = (categorySlug?: string) => FULFILLED_LABELS[categorySlug ?? ''] ?? 'Sold';

export default function MyListingsScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const [listings, setListings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);

  useFocusEffect(
    useCallback(() => {
      storage.getUser().then(u => setUser(u));
      fetchListings();
    }, [])
  );

  const fetchListings = async () => {
    setLoading(true);
    try {
      const data = await listingsApi.mine();
      setListings(data);
    } catch {
      setListings([]);
    } finally {
      setLoading(false);
    }
  };

  const handleRenew = async (id: string, listing: any) => {
    const renewedAt = listing.last_renewed_at ? new Date(listing.last_renewed_at) : null;
    if (renewedAt && listing.status === 'active') {
      const hoursLeft = 24 - (Date.now() - renewedAt.getTime()) / 3600000;
      if (hoursLeft > 0.1) {
        Alert.alert('Renew cooldown', `Renew available in ${Math.ceil(hoursLeft)}h`);
        return;
      }
    }
    setActionId(id);
    try {
      await listingsApi.renew(id);
      Alert.alert('Renewed!', 'Listing bumped to top of search results.');
      fetchListings();
    } catch (e: any) {
      Alert.alert('Error', e?.response?.data?.detail ?? 'Failed to renew');
    } finally {
      setActionId(null);
    }
  };

  const handleFulfill = async (id: string, label: string) => {
    Alert.alert(`Mark as ${label}?`, 'This will hide the listing from search.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: `Mark ${label}`, style: 'destructive',
        onPress: async () => {
          setActionId(id);
          try {
            await listingsApi.fulfill(id);
            fetchListings();
          } finally {
            setActionId(null);
          }
        },
      },
    ]);
  };

  const handleDelete = async (id: string) => {
    Alert.alert('Delete listing?', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          setActionId(id);
          try {
            await listingsApi.delete(id);
            setListings(ls => ls.filter(l => l.id !== id));
          } finally {
            setActionId(null);
          }
        },
      },
    ]);
  };

  if (!user) {
    return (
      <View style={styles.container}>
        <View style={[styles.header, { paddingTop: Math.max(insets.top, 12) + 8 }]}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <Ionicons name="arrow-back" size={24} color="#1f2937" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>My Listings</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.emptyCenter}>
          <Ionicons name="person-circle-outline" size={64} color="#e5e7eb" />
          <Text style={styles.emptyTitle}>Not signed in</Text>
          <TouchableOpacity style={styles.loginBtn} onPress={() => navigation.navigate('Login')}>
            <Text style={styles.loginBtnText}>Sign In</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 12) + 8 }]}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Ionicons name="arrow-back" size={24} color="#1f2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Listings</Text>
        <TouchableOpacity
          onPress={() => navigation.navigate('Post')}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityRole="button"
          accessibilityLabel="Post a new listing"
        >
          <Ionicons name="add-circle" size={28} color="#f97316" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        {loading ? (
          [1, 2, 3].map(i => (
            <View key={i} style={[styles.card, { height: 100, backgroundColor: '#f3f4f6' }]} />
          ))
        ) : listings.length === 0 ? (
          <View style={styles.emptyCenter}>
            <Ionicons name="list-outline" size={56} color="#e5e7eb" />
            <Text style={styles.emptyTitle}>No listings yet</Text>
            <Text style={styles.emptyText}>Post your first listing — it's free!</Text>
            <TouchableOpacity style={styles.postBtn} onPress={() => navigation.navigate('Post')}>
              <Text style={styles.postBtnText}>Post Listing</Text>
            </TouchableOpacity>
          </View>
        ) : (
          listings.map(listing => {
            const sc = STATUS_COLORS[listing.status] ?? STATUS_COLORS.expired;
            const renewedAt = listing.last_renewed_at ? new Date(listing.last_renewed_at) : null;
            const hoursLeft = renewedAt && listing.status === 'active'
              ? Math.max(0, 24 - (Date.now() - renewedAt.getTime()) / 3600000)
              : 0;
            const onCooldown = hoursLeft > 0.1;

            return (
              <View key={listing.id} style={styles.card}>
                <View style={styles.cardBody}>
                  <View style={styles.thumb}>
                    {listing.images?.[0]?.url ? (
                      <Image source={{ uri: listing.images[0].url }} style={styles.thumbImg} />
                    ) : (
                      <Ionicons name="pricetag-outline" size={28} color="#9ca3af" />
                    )}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.title} numberOfLines={2}>{listing.title}</Text>
                    <Text style={styles.price}>
                      {listing.price != null ? `₹${listing.price.toLocaleString('en-IN')}` : 'Price on request'}
                    </Text>
                    <View style={styles.metaRow}>
                      <View style={[styles.badge, { backgroundColor: sc.bg }]}>
                        <Text style={[styles.badgeText, { color: sc.text }]}>
                          {listing.status === 'fulfilled'
                            ? fulfilledLabel(listing.category_slug)
                            : STATUS_LABELS[listing.status] ?? listing.status}
                        </Text>
                      </View>
                      {listing.status === 'active' && (
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                            <Ionicons name="eye-outline" size={12} color="#6b7280" />
                            <Text style={styles.counters}>{listing.view_count ?? 0}</Text>
                          </View>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                            <Ionicons name="chatbubble-outline" size={12} color="#6b7280" />
                            <Text style={styles.counters}>{listing.contact_click_count ?? 0}</Text>
                          </View>
                        </View>
                      )}
                    </View>
                  </View>
                </View>

                {/* Actions */}
                <View style={styles.actions}>
                  {listing.status === 'active' && (
                    <TouchableOpacity
                      style={styles.actionBtn}
                      disabled={actionId === listing.id}
                      onPress={() => handleFulfill(listing.id, fulfilledLabel(listing.category_slug))}
                    >
                      <Ionicons name="checkmark-circle-outline" size={16} color="#16a34a" />
                      <Text style={[styles.actionText, { color: '#16a34a' }]}>
                        {fulfilledLabel(listing.category_slug)}
                      </Text>
                    </TouchableOpacity>
                  )}
                  {(listing.status === 'active' || listing.status === 'expired') && (
                    <TouchableOpacity
                      style={styles.actionBtn}
                      disabled={actionId === listing.id || onCooldown}
                      onPress={() => handleRenew(listing.id, listing)}
                    >
                      <Ionicons name="refresh-outline" size={16} color={onCooldown ? '#9ca3af' : '#6366f1'} />
                      <Text style={[styles.actionText, { color: onCooldown ? '#9ca3af' : '#6366f1' }]}>
                        {onCooldown ? `${Math.ceil(hoursLeft)}h` : 'Renew'}
                      </Text>
                    </TouchableOpacity>
                  )}
                  {listing.status === 'active' && !listing.is_featured && (
                    <TouchableOpacity
                      style={styles.actionBtn}
                      disabled={actionId === listing.id}
                      onPress={() => navigation.navigate('Promote', { listingId: listing.id, listingTitle: listing.title })}
                    >
                      <Ionicons name="star-outline" size={16} color="#f59e0b" />
                      <Text style={[styles.actionText, { color: '#f59e0b' }]}>Promote</Text>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity
                    style={styles.actionBtn}
                    disabled={actionId === listing.id}
                    onPress={() => navigation.navigate('EditListing', { listingId: listing.id })}
                  >
                    <Ionicons name="create-outline" size={16} color="#6b7280" />
                    <Text style={[styles.actionText, { color: '#6b7280' }]}>Edit</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.actionBtn}
                    disabled={actionId === listing.id}
                    onPress={() => handleDelete(listing.id)}
                  >
                    <Ionicons name="trash-outline" size={16} color="#ef4444" />
                    <Text style={[styles.actionText, { color: '#ef4444' }]}>Delete</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingBottom: 12, backgroundColor: '#fff',
    borderBottomWidth: 1, borderBottomColor: '#f3f4f6',
  },
  headerTitle: { fontSize: 17, fontWeight: '700', color: '#1f2937' },
  card: { backgroundColor: '#fff', borderRadius: 12, marginBottom: 12, overflow: 'hidden' },
  cardBody: { flexDirection: 'row', gap: 12, padding: 12 },
  thumb: {
    width: 76, height: 76, borderRadius: 8, backgroundColor: '#f3f4f6',
    alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
  },
  thumbImg: { width: '100%', height: '100%' },
  title: { fontSize: 13, fontWeight: '600', color: '#1f2937', lineHeight: 18 },
  price: { fontSize: 13, fontWeight: '700', color: '#f97316', marginTop: 2 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6, flexWrap: 'wrap' },
  badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999 },
  badgeText: { fontSize: 11, fontWeight: '700' },
  counters: { fontSize: 11, color: '#6b7280' },
  actions: { flexDirection: 'row', flexWrap: 'wrap', borderTopWidth: 1, borderTopColor: '#f3f4f6' },
  actionBtn: {
    flexBasis: '33%', flexGrow: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 4, paddingVertical: 10,
  },
  actionText: { fontSize: 12, fontWeight: '600' },
  emptyCenter: { alignItems: 'center', paddingTop: 60, gap: 12 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: '#374151' },
  emptyText: { fontSize: 13, color: '#9ca3af', textAlign: 'center' },
  postBtn: {
    marginTop: 8, backgroundColor: '#f97316', paddingHorizontal: 24, paddingVertical: 12,
    borderRadius: 10,
  },
  postBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  loginBtn: {
    marginTop: 8, backgroundColor: '#25d366', paddingHorizontal: 24, paddingVertical: 12,
    borderRadius: 10,
  },
  loginBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
});
