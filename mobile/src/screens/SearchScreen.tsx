import { View, Text, FlatList, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { useState, useEffect, useRef } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { listingsApi } from '../lib/api';
import ListingCard from '../components/ListingCard';

const CATS = [
  { label: 'All', emoji: '🔍', slug: '' },
  { label: 'Tiffin', emoji: '🍱', slug: 'tiffin' },
  { label: 'PG / Rooms', emoji: '🏠', slug: 'pg-roommate' },
  { label: 'Jobs', emoji: '💼', slug: 'jobs' },
  { label: 'Vehicles', emoji: '🚗', slug: 'vehicles' },
  { label: 'Electronics', emoji: '📱', slug: 'electronics' },
  { label: 'Education', emoji: '📚', slug: 'education' },
  { label: 'Events', emoji: '🎉', slug: 'events' },
  { label: 'Businesses', emoji: '🏪', slug: 'businesses' },
];

export default function SearchScreen({ navigation, route }: any) {
  const { citySlug = 'hyderabad', cityName = 'Hyderabad', q: initQ = '', categorySlug: initCat = '' } = route.params ?? {};
  const [query, setQuery] = useState(initQ);
  const [activeCity, setActiveCity] = useState(citySlug);
  const [activeCityName, setActiveCityName] = useState(cityName);
  const [catLabel, setCatLabel] = useState(
    CATS.find(c => c.slug === initCat)?.label ?? 'All'
  );
  const [listings, setListings] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const doSearch = (q: string, cat: string, city: string) => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      setLoading(true);
      try {
        const params: Record<string, string> = { page_size: '20' };
        if (q) params.q = q;
        const catSlug = CATS.find(c => c.label === cat)?.slug;
        if (catSlug) params.category_slug = catSlug;
        const data = await listingsApi.byCitySlug(city, params);
        setListings(data);
      } catch {
        setListings([]);
      } finally {
        setLoading(false);
      }
    }, 350);
  };

  useEffect(() => {
    doSearch(query, catLabel, activeCity);
  }, [query, catLabel, activeCity]);

  return (
    <View style={styles.container}>

      {/* Search bar */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={20} color="#374151" />
        </TouchableOpacity>
        <TextInput
          style={styles.input}
          placeholder="Search listings..."
          value={query}
          onChangeText={setQuery}
          autoFocus={!!initQ}
          returnKeyType="search"
        />
        <TouchableOpacity
          style={styles.cityChip}
          onPress={() => navigation.navigate('CityPicker', {
            onSelect: (c: any) => { setActiveCity(c.slug); setActiveCityName(c.name); }
          })}
        >
          <Ionicons name="location-outline" size={12} color="#f97316" />
          <Text style={styles.cityChipText}>{activeCityName}</Text>
        </TouchableOpacity>
      </View>

      {/* Category tabs */}
      <FlatList
        horizontal
        showsHorizontalScrollIndicator={false}
        data={CATS}
        keyExtractor={c => c.label}
        style={styles.tabs}
        contentContainerStyle={styles.tabsContent}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[styles.tab, item.label === catLabel && styles.activeTab]}
            onPress={() => setCatLabel(item.label)}
          >
            <Text style={styles.tabEmoji}>{item.emoji}</Text>
            <Text style={[styles.tabText, item.label === catLabel && styles.activeTabText]}>{item.label}</Text>
          </TouchableOpacity>
        )}
      />

      {loading ? (
        <ActivityIndicator color="#f97316" style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={listings}
          keyExtractor={l => l.id}
          contentContainerStyle={{ padding: 16 }}
          renderItem={({ item }) => (
            <ListingCard listing={item} onPress={() => navigation.navigate('ListingDetail', { id: item.id })} />
          )}
          ListHeaderComponent={
            <Text style={styles.count}>{listings.length} listing{listings.length !== 1 ? 's' : ''} · {activeCityName}</Text>
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyText}>No listings found</Text>
              <TouchableOpacity style={styles.postBtn} onPress={() => navigation.navigate('Post')}>
                <Text style={styles.postBtnText}>+ Post the first listing</Text>
              </TouchableOpacity>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb', paddingTop: 48 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, gap: 8, marginBottom: 8 },
  backBtn: { padding: 4 },
  input: {
    flex: 1,
    backgroundColor: 'white',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 15,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  cityChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#fff7ed',
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  cityChipText: { color: '#f97316', fontWeight: '600', fontSize: 12 },
  tabs: { flexGrow: 0, flexShrink: 0, height: 44, marginBottom: 4 },
  tabsContent: { alignItems: 'center', paddingLeft: 12 },
  tab: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, marginRight: 6, backgroundColor: '#f3f4f6' },
  activeTab: { backgroundColor: '#f97316' },
  tabEmoji: { fontSize: 13, marginRight: 4 },
  tabText: { fontSize: 13, color: '#374151' },
  activeTabText: { color: 'white', fontWeight: '600' },
  count: { paddingBottom: 8, fontSize: 12, color: '#9ca3af' },
  empty: { alignItems: 'center', paddingTop: 60 },
  emptyText: { color: '#9ca3af', marginBottom: 16 },
  postBtn: { backgroundColor: '#f97316', borderRadius: 10, paddingHorizontal: 20, paddingVertical: 12 },
  postBtnText: { color: 'white', fontWeight: '700' },
});
