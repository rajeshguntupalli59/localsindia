import {
  View, Text, FlatList, TextInput, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert,
} from 'react-native';
import { useState, useEffect, useRef } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { listingsApi, categoriesApi } from '../lib/api';
import ListingCard from '../components/ListingCard';
import { C, RADIUS, SHADOW } from '../lib/theme';

type Category = { id: string; name: string; slug: string; icon: string };

const CATEGORY_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  tiffin:        'restaurant-outline',
  'pg-roommate': 'home-outline',
  jobs:          'briefcase-outline',
  vehicles:      'car-outline',
  electronics:   'phone-portrait-outline',
  education:     'school-outline',
  events:        'calendar-outline',
  businesses:    'storefront-outline',
};

export default function SearchScreen({ navigation, route }: any) {
  const {
    citySlug = 'hyderabad', cityName = 'Hyderabad',
    q: initQ = '', categorySlug: initCat = '',
  } = route.params ?? {};

  const [query, setQuery] = useState(initQ);
  const [activeCity, setActiveCity] = useState(citySlug);
  const [activeCityName, setActiveCityName] = useState(cityName);
  const [activeCat, setActiveCat] = useState(initCat);
  const [categories, setCategories] = useState<Category[]>([]);
  const [listings, setListings] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<TextInput>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    categoriesApi.list().then(setCategories).catch(() => {
      Alert.alert('Could not load categories', 'Check your internet connection and try again.');
    });
  }, []);

  const doSearch = (q: string, cat: string, city: string) => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      setLoading(true);
      try {
        const params: Record<string, string> = { page_size: '20' };
        if (q) params.q = q;
        if (cat) params.category_slug = cat;
        const data = await listingsApi.byCitySlug(city, params);
        setListings(data);
      } catch { setListings([]); }
      finally { setLoading(false); }
    }, 350);
  };

  useEffect(() => {
    doSearch(query, activeCat, activeCity);
  }, [query, activeCat, activeCity]);

  const allCats: Category[] = [{ id: '', name: 'All', slug: '', icon: '' }, ...categories];

  return (
    <View style={styles.container}>

      {/* ── Header ── */}
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 12) + 8 }]}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backBtn}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Ionicons name="arrow-back" size={22} color={C.textOnDark} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.searchBox}
          onPress={() => inputRef.current?.focus()}
          activeOpacity={1}
        >
          <Ionicons name="search-outline" size={17} color={C.textOnDarkSub} />
          <TextInput
            ref={inputRef}
            style={styles.searchInput}
            placeholder="Search listings..."
            placeholderTextColor={C.textOnDarkSub}
            value={query}
            onChangeText={setQuery}
            autoFocus={!!initQ}
            returnKeyType="search"
            accessibilityLabel="Search listings"
          />
          {query.length > 0 && (
            <TouchableOpacity
              onPress={() => setQuery('')}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              accessibilityRole="button"
              accessibilityLabel="Clear search"
            >
              <Ionicons name="close-circle" size={18} color={C.textOnDarkSub} />
            </TouchableOpacity>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.cityChip}
          onPress={() => navigation.navigate('CityPicker', {
            onSelect: (c: any) => { setActiveCity(c.slug); setActiveCityName(c.name); }
          })}
          accessibilityRole="button"
          accessibilityLabel={`Change city, currently ${activeCityName}`}
        >
          <Ionicons name="location-sharp" size={12} color={C.orange} />
          <Text style={styles.cityChipText} numberOfLines={1}>{activeCityName}</Text>
        </TouchableOpacity>
      </View>

      {/* ── Category chips ── */}
      <View style={styles.catsContainer}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={allCats}
          keyExtractor={c => c.slug}
          contentContainerStyle={styles.catsContent}
          renderItem={({ item }) => {
            const active = item.slug === activeCat;
            return (
              <TouchableOpacity
                style={[styles.catChip, active && styles.catChipActive]}
                onPress={() => setActiveCat(item.slug)}
                activeOpacity={0.8}
                accessibilityRole="button"
                accessibilityLabel={`Filter by ${item.name}`}
                accessibilityState={{ selected: active }}
              >
                <Ionicons
                  name={CATEGORY_ICONS[item.slug] ?? 'apps-outline'}
                  size={15}
                  color={active ? C.orange : C.textMuted}
                />
                <Text style={[styles.catText, active && styles.catTextActive]}>
                  {item.name}
                </Text>
              </TouchableOpacity>
            );
          }}
        />
      </View>

      {/* ── Results ── */}
      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator color={C.orange} size="large" />
          <Text style={styles.loadingText}>Finding listings...</Text>
        </View>
      ) : (
        <FlatList
          data={listings}
          keyExtractor={l => l.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            listings.length > 0 ? (
              <Text style={styles.countText}>
                {listings.length} listing{listings.length !== 1 ? 's' : ''} in{' '}
                <Text style={{ color: C.orange, fontWeight: '700' }}>{activeCityName}</Text>
                {activeCat ? ` · ${allCats.find(c => c.slug === activeCat)?.name ?? ''}` : ''}
              </Text>
            ) : null
          }
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <Ionicons name="search-outline" size={48} color={C.textMuted} style={{ marginBottom: 16 }} />
              <Text style={styles.emptyTitle}>No listings found</Text>
              <Text style={styles.emptyText}>
                {query ? `Nothing for "${query}" in ${activeCityName}.` : `No listings in ${activeCityName} yet.`}
              </Text>
              <TouchableOpacity style={styles.postBtn} onPress={() => navigation.navigate('Post')}>
                <Ionicons name="add" size={18} color="white" />
                <Text style={styles.postBtnText}>Post the first listing</Text>
              </TouchableOpacity>
            </View>
          }
          renderItem={({ item }) => (
            <ListingCard
              listing={item}
              onPress={() => navigation.navigate('ListingDetail', { id: item.id })}
            />
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.pageBg },

  // Header
  header: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: C.navBg,
    paddingTop: 52, paddingBottom: 14,
    paddingHorizontal: 14, gap: 10,
  },
  backBtn: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  },
  searchBox: {
    flex: 1, flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: RADIUS.md, paddingHorizontal: 12,
    paddingVertical: 10, gap: 8,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.10)',
  },
  searchInput: {
    flex: 1, fontSize: 15, color: C.textOnDark, padding: 0,
  },
  cityChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: C.orangeGlow, borderRadius: RADIUS.pill,
    paddingHorizontal: 10, paddingVertical: 8,
    borderWidth: 1, borderColor: 'rgba(247,146,30,0.25)',
    maxWidth: 90, flexShrink: 0,
  },
  cityChipText: { color: C.orange, fontWeight: '700', fontSize: 11 },

  // Categories
  catsContainer: {
    backgroundColor: C.navBg,
    borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.06)',
    paddingBottom: 12,
  },
  catsContent: { paddingHorizontal: 14, gap: 8, flexDirection: 'row' },
  catChip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: RADIUS.pill, paddingHorizontal: 13, paddingVertical: 7,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
  },
  catChipActive: {
    backgroundColor: C.orange, borderColor: C.orange,
  },
  catEmoji: { fontSize: 13 },
  catText: { fontSize: 13, color: 'rgba(255,255,255,0.65)', fontWeight: '600' },
  catTextActive: { color: 'white', fontWeight: '700' },

  // Content
  listContent: { padding: 16, paddingBottom: 40 },
  countText: { fontSize: 12, color: C.textMuted, marginBottom: 12, fontWeight: '500' },

  // Loading
  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, paddingTop: 60 },
  loadingText: { fontSize: 14, color: C.textMuted, fontWeight: '500' },

  // Empty state
  emptyWrap: { alignItems: 'center', paddingTop: 60, paddingHorizontal: 24 },
  emptyEmoji: { fontSize: 48, marginBottom: 16 },
  emptyTitle: { fontSize: 18, fontWeight: '800', color: C.text, marginBottom: 8 },
  emptyText: { fontSize: 14, color: C.textMuted, textAlign: 'center', lineHeight: 20, marginBottom: 24 },
  postBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: C.orange, borderRadius: RADIUS.md,
    paddingHorizontal: 20, paddingVertical: 13,
    ...SHADOW.orange,
  },
  postBtnText: { color: 'white', fontWeight: '700', fontSize: 14 },
});
