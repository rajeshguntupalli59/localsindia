import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, Image } from 'react-native';
import { useState, useEffect } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { usersApi } from '../lib/api';
import ListingCard from '../components/ListingCard';

export default function SellerProfileScreen({ navigation, route }: any) {
  const insets = useSafeAreaInsets();
  const { userId } = route.params;
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    usersApi.publicProfile(userId)
      .then(data => { setProfile(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, [userId]);

  const memberSince = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color="#f97316" size="large" />
      </View>
    );
  }

  if (!profile) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>Seller not found</Text>
        <TouchableOpacity onPress={() => navigation.goBack()} accessibilityRole="button" accessibilityLabel="Go back">
          <Text style={styles.backLink}>← Go back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const initial = profile.name?.[0]?.toUpperCase() ?? '?';

  return (
    <ScrollView style={styles.container}>
      <TouchableOpacity
        onPress={() => navigation.goBack()}
        style={[styles.backBtn, { paddingTop: Math.max(insets.top, 12) + 16 }]}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        accessibilityRole="button"
        accessibilityLabel="Go back"
      >
        <Ionicons name="arrow-back" size={20} color="#374151" />
      </TouchableOpacity>

      {/* Avatar + info */}
      <View style={styles.profileCard}>
        {profile.avatar_url ? (
          <Image source={{ uri: profile.avatar_url }} style={styles.avatar} />
        ) : (
          <View style={styles.avatarPlaceholder}>
            <Text style={styles.avatarInitial}>{initial}</Text>
          </View>
        )}
        <Text style={styles.name}>{profile.name ?? 'Seller'}</Text>
        <Text style={styles.since}>Member since {memberSince(profile.member_since)}</Text>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{profile.active_listings_count} active listing{profile.active_listings_count !== 1 ? 's' : ''}</Text>
        </View>
      </View>

      {/* Listings */}
      <Text style={styles.sectionTitle}>Active Listings</Text>
      <View style={styles.listingsContainer}>
        {profile.listings.length === 0 ? (
          <Text style={styles.emptyText}>No active listings</Text>
        ) : (
          profile.listings.map((l: any) => (
            <ListingCard
              key={l.id}
              listing={l}
              onPress={() => navigation.navigate('ListingDetail', { id: l.id })}
            />
          ))
        )}
      </View>

      <View style={{ height: 32 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  errorText: { color: '#9ca3af', marginBottom: 12 },
  backLink: { color: '#f97316', fontWeight: '600' },
  backBtn: { padding: 16 },
  profileCard: { alignItems: 'center', backgroundColor: 'white', padding: 24, marginBottom: 8 },
  avatar: { width: 80, height: 80, borderRadius: 40, marginBottom: 12 },
  avatarPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#f97316',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  avatarInitial: { color: 'white', fontSize: 32, fontWeight: 'bold' },
  name: { fontSize: 22, fontWeight: 'bold', color: '#111827', marginBottom: 4 },
  since: { fontSize: 13, color: '#9ca3af', marginBottom: 12 },
  badge: { backgroundColor: '#fff7ed', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 6 },
  badgeText: { color: '#f97316', fontWeight: '700', fontSize: 13 },
  sectionTitle: { fontSize: 17, fontWeight: 'bold', color: '#111827', padding: 16, paddingBottom: 8 },
  listingsContainer: { paddingHorizontal: 16 },
  emptyText: { color: '#9ca3af', textAlign: 'center', paddingVertical: 40 },
});
