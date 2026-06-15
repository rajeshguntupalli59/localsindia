import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSaved } from '../hooks/useSaved';
import ListingCard from '../components/ListingCard';

export default function SavedScreen({ navigation }: any) {
  const { saved } = useSaved();

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Saved</Text>
        <Text style={styles.headerCount}>{saved.length} item{saved.length !== 1 ? 's' : ''}</Text>
      </View>

      {saved.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="heart-outline" size={56} color="#e5e7eb" />
          <Text style={styles.emptyTitle}>No saved listings</Text>
          <Text style={styles.emptyText}>Tap the heart icon on any listing to save it here.</Text>
          <TouchableOpacity
            style={styles.browseBtn}
            onPress={() => navigation.navigate('Home')}
          >
            <Text style={styles.browseBtnText}>Browse Listings</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.list}>
          {saved.map(listing => (
            <ListingCard
              key={listing.id}
              listing={listing}
              onPress={() => navigation.navigate('ListingDetail', { id: listing.id })}
            />
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'white',
    paddingHorizontal: 16,
    paddingTop: 52,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#111827' },
  headerCount: { fontSize: 13, color: '#9ca3af' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
  emptyTitle: { fontSize: 18, fontWeight: 'bold', color: '#374151', marginTop: 16, marginBottom: 6 },
  emptyText: { fontSize: 14, color: '#9ca3af', textAlign: 'center', lineHeight: 20, marginBottom: 24 },
  browseBtn: { backgroundColor: '#f97316', borderRadius: 12, paddingHorizontal: 24, paddingVertical: 12 },
  browseBtnText: { color: 'white', fontWeight: '700', fontSize: 15 },
  list: { padding: 16 },
});
