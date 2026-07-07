import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSavedContext } from '../context/SavedContext';
import ListingCard from '../components/ListingCard';

export default function SavedScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const { savedListings, savedCount } = useSavedContext();

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 12) + 8 }]}>
        <Text style={styles.headerTitle}>Saved</Text>
        {savedCount > 0 && (
          <View style={styles.countBadge}>
            <Text style={styles.countBadgeText}>{savedCount}</Text>
          </View>
        )}
      </View>

      {savedCount === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="heart-outline" size={64} color="#e5e7eb" />
          <Text style={styles.emptyTitle}>No saved listings yet</Text>
          <Text style={styles.emptyText}>
            Tap the heart icon on any listing to save it here. Compare your favourites all in one place.
          </Text>
          <TouchableOpacity
            style={styles.browseBtn}
            onPress={() => navigation.navigate('Home')}
            accessibilityRole="button"
            accessibilityLabel="Browse listings"
          >
            <Text style={styles.browseBtnText}>Browse Listings</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
          <Text style={styles.hint}>♥ {savedCount} saved — tap to view, heart again to remove</Text>
          {savedListings.map(listing => (
            <ListingCard
              key={listing.id}
              listing={listing}
              onPress={() => navigation.navigate('ListingDetail', { id: listing.id })}
            />
          ))}
          <View style={{ height: 24 }} />
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'white',
    paddingHorizontal: 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  headerTitle: { fontSize: 20, fontWeight: '800', color: '#111827', flex: 1 },
  countBadge: {
    backgroundColor: '#f97316', borderRadius: 12,
    minWidth: 24, height: 24, paddingHorizontal: 7,
    alignItems: 'center', justifyContent: 'center',
  },
  countBadgeText: { color: 'white', fontSize: 12, fontWeight: '800' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 36, gap: 12 },
  emptyTitle: { fontSize: 18, fontWeight: '800', color: '#374151', textAlign: 'center' },
  emptyText: { fontSize: 14, color: '#9ca3af', textAlign: 'center', lineHeight: 22 },
  browseBtn: { marginTop: 8, backgroundColor: '#f97316', borderRadius: 14, paddingHorizontal: 28, paddingVertical: 13 },
  browseBtnText: { color: 'white', fontWeight: '700', fontSize: 15 },
  list: { padding: 16 },
  hint: { fontSize: 12, color: '#9ca3af', marginBottom: 14, textAlign: 'center' },
});
