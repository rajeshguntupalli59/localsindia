import { useState, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, FlatList, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { businessesApi } from '../lib/api';

export default function BusinessesScreen({ route, navigation }: any) {
  const { citySlug, cityName } = route.params ?? {};
  const [businesses, setBusinesses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(useCallback(() => {
    let active = true;
    setLoading(true);
    businessesApi.list(citySlug)
      .then((data: any[]) => { if (active) setBusinesses(data); })
      .catch(() => { if (active) setBusinesses([]); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [citySlug]));

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Ionicons name="arrow-back" size={24} color="#1f2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>Businesses in {cityName}</Text>
        <View style={{ width: 24 }} />
      </View>

      <TouchableOpacity
        style={styles.addButton}
        onPress={() => navigation.navigate('PostBusiness', { citySlug, cityName })}
        activeOpacity={0.85}
      >
        <Ionicons name="add-circle-outline" size={18} color="white" />
        <Text style={styles.addButtonText}>Add Your Business</Text>
      </TouchableOpacity>

      {loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color="#f97316" />
      ) : (
        <FlatList
          data={businesses}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="storefront-outline" size={40} color="#d1d5db" />
              <Text style={styles.emptyTitle}>No businesses listed yet</Text>
              <Text style={styles.emptyDesc}>Be the first to add your business in {cityName}!</Text>
            </View>
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.card}
              onPress={() => navigation.navigate('BusinessDetail', { businessId: item.id })}
              activeOpacity={0.85}
            >
              <View style={styles.nameRow}>
                <Text style={styles.name} numberOfLines={1}>{item.name}</Text>
                {item.verified && (
                  <Ionicons name="checkmark-circle" size={16} color="#2563eb" />
                )}
              </View>
              {item.avg_rating != null && (
                <View style={styles.ratingRow}>
                  <Ionicons name="star" size={13} color="#f59e0b" />
                  <Text style={styles.ratingText}>
                    {Number(item.avg_rating).toFixed(1)} · {item.review_count} reviews
                  </Text>
                </View>
              )}
              {item.address && (
                <Text style={styles.address} numberOfLines={1}>{item.address}</Text>
              )}
            </TouchableOpacity>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 14, backgroundColor: 'white',
    borderBottomWidth: 1, borderBottomColor: '#f1f5f9',
  },
  headerTitle: { fontSize: 17, fontWeight: '700', color: '#1f2937', flex: 1, textAlign: 'center' },
  addButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    backgroundColor: '#2563eb', marginHorizontal: 16, marginTop: 14,
    paddingVertical: 12, borderRadius: 12,
  },
  addButtonText: { color: 'white', fontWeight: '700', fontSize: 14 },
  list: { padding: 16, paddingTop: 14, gap: 10 },
  card: {
    backgroundColor: 'white', borderRadius: 14, padding: 14,
    borderWidth: 1, borderColor: '#f1f5f9', gap: 4,
  },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  name: { fontSize: 15, fontWeight: '700', color: '#1f2937', flexShrink: 1 },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  ratingText: { fontSize: 12, color: '#6b7280' },
  address: { fontSize: 12, color: '#9ca3af' },
  empty: { alignItems: 'center', paddingTop: 60, gap: 8 },
  emptyTitle: { fontSize: 15, fontWeight: '700', color: '#374151' },
  emptyDesc: { fontSize: 13, color: '#9ca3af', textAlign: 'center', paddingHorizontal: 32 },
});
