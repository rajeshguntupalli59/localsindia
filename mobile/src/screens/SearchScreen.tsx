import {
  View, Text, FlatList, TextInput, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert,
} from 'react-native';
import { useState, useEffect, useRef } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { listingsApi, categoriesApi, savedSearchesApi, businessesApi } from '../lib/api';
import { getApproxLocation } from '../lib/location';
import { storage } from '../lib/storage';
import ListingCard from '../components/ListingCard';
import BusinessRow from '../components/BusinessRow';
import AnswerFiltersSheet, { type AnswerFilterValues } from '../components/AnswerFiltersSheet';
import type { CatalogEntry } from '../components/DetailQuestions';
import { BUSINESS_CATEGORY_LABEL, businessCategoryLabel } from '../lib/businessCategories';
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
  // Subcategory + answer filters for the active category (catalog-driven)
  const [catalog, setCatalog] = useState<CatalogEntry[]>([]);
  const [activeSub, setActiveSub] = useState('');
  const [answerFilters, setAnswerFilters] = useState<AnswerFilterValues>({});
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [listings, setListings] = useState<any[]>([]);
  // Real directory businesses matching the search — classifieds alone are sparse.
  const [businesses, setBusinesses] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [nearMe, setNearMe] = useState(false);
  const [nearMeLoading, setNearMeLoading] = useState(false);
  const [savingSearch, setSavingSearch] = useState(false);
  const inputRef = useRef<TextInput>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchId = useRef(0);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    categoriesApi.list().then(setCategories).catch(() => {
      Alert.alert('Could not load categories', 'Check your internet connection and try again.');
    });
    categoriesApi.catalog().then(setCatalog).catch(() => {});
  }, []);

  const subcategories = catalog.find(c => c.slug === activeCat)?.subcategories ?? [];
  const selectedSubcat = subcategories.find(sc => sc.slug === activeSub);
  const filterQuestions = (selectedSubcat?.questions
    ?? catalog.find(c => c.slug === activeCat)?.questions ?? []).filter(q => q.filter);
  const activeFilterCount = Object.keys(answerFilters).length;

  const pickCategory = (slug: string) => {
    setActiveCat(slug);
    setActiveSub('');
    setAnswerFilters({});   // filters belong to the old category's questions
  };
  const pickSub = (slug: string) => {
    setActiveSub(slug === activeSub ? '' : slug);
    setAnswerFilters({});
  };

  const doSearch = (q: string, cat: string, city: string, useNearMe: boolean, sub: string, answers: AnswerFilterValues) => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      const id = ++searchId.current;
      setLoading(true);
      try {
        const params: Record<string, string> = { page_size: '20' };
        if (q) params.q = q;
        if (cat) params.category_slug = cat;
        if (cat && sub) params.subcategory_slug = sub;
        if (cat) Object.assign(params, answers);
        if (useNearMe) {
          const location = await getApproxLocation();
          if (location) {
            params.lat = String(location.latitude);
            params.lng = String(location.longitude);
          }
        }
        // Only business categories have directory entries; skip the rest.
        const bizCat = cat && BUSINESS_CATEGORY_LABEL[cat] ? cat : '';
        const [ls, bs] = await Promise.allSettled([
          listingsApi.byCitySlug(city, params),
          cat && !bizCat
            ? Promise.resolve([])
            : businessesApi.list(city, {
                page_size: 10, ...(bizCat ? { category_slug: bizCat } : {}),
                ...(bizCat && sub ? { subcategory_slug: sub } : {}), ...(q ? { q } : {}),
              }),
        ]);
        if (id !== searchId.current) return; // a newer search has started
        setListings(ls.status === 'fulfilled' ? ls.value : []);
        setBusinesses(bs.status === 'fulfilled' ? bs.value : []);
      } finally {
        if (id === searchId.current) setLoading(false);
      }
    }, 350);
  };

  useEffect(() => {
    doSearch(query, activeCat, activeCity, nearMe, activeSub, answerFilters);
  }, [query, activeCat, activeCity, nearMe, activeSub, answerFilters]);

  const toggleNearMe = async () => {
    if (nearMe) { setNearMe(false); return; }
    setNearMeLoading(true);
    const location = await getApproxLocation();
    setNearMeLoading(false);
    if (!location) {
      Alert.alert(
        'Location unavailable',
        'Turn on location permission for LocalsIndia in your phone settings to sort listings by distance.',
      );
      return;
    }
    setNearMe(true);
  };

  const handleSaveSearch = async () => {
    const token = await storage.getAccessToken();
    if (!token) { navigation.navigate('Login'); return; }
    setSavingSearch(true);
    try {
      await savedSearchesApi.create({
        city_slug: activeCity,
        query_text: query.trim() || undefined,
        category_slug: activeCat || undefined,
      });
      Alert.alert('Search saved', "You'll find it under Profile → Saved Searches.");
    } catch (e: any) {
      if (e?.response?.status === 409) Alert.alert('Already saved', 'This search is already in your saved list.');
      else Alert.alert('Error', 'Could not save this search. Please try again.');
    } finally {
      setSavingSearch(false);
    }
  };

  const allCats: Category[] = [{ id: '', name: 'All', slug: '', icon: '' }, ...categories];
  const canSaveSearch = !!query.trim() || !!activeCat;

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

      {/* ── Near Me toggle ── */}
      <View style={styles.nearMeRow}>
        <TouchableOpacity
          style={[styles.nearMeChip, nearMe && styles.nearMeChipActive]}
          onPress={toggleNearMe}
          disabled={nearMeLoading}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel={nearMe ? 'Near Me is on — showing closest listings first' : 'Sort listings by distance from you'}
          accessibilityState={{ selected: nearMe }}
        >
          {nearMeLoading ? (
            <ActivityIndicator size="small" color={nearMe ? 'white' : C.orange} />
          ) : (
            <Ionicons name="navigate" size={14} color={nearMe ? 'white' : C.orange} />
          )}
          <Text style={[styles.nearMeText, nearMe && styles.nearMeTextActive]}>Near Me</Text>
        </TouchableOpacity>

        {canSaveSearch && (
          <TouchableOpacity
            style={styles.saveSearchChip}
            onPress={handleSaveSearch}
            disabled={savingSearch}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel="Save this search to get alerts"
          >
            {savingSearch ? (
              <ActivityIndicator size="small" color={C.orange} />
            ) : (
              <Ionicons name="bookmark-outline" size={14} color={C.orange} />
            )}
            <Text style={styles.saveSearchText}>Save search</Text>
          </TouchableOpacity>
        )}
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
                onPress={() => pickCategory(item.slug)}
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

      {/* ── Subcategory chips + Filters for the active category ── */}
      {activeCat && (subcategories.length > 0 || filterQuestions.length > 0) ? (
        <View style={styles.subsContainer}>
          <FlatList
            horizontal
            showsHorizontalScrollIndicator={false}
            data={subcategories}
            keyExtractor={sc => sc.slug}
            contentContainerStyle={styles.catsContent}
            ListHeaderComponent={filterQuestions.length > 0 ? (
              <TouchableOpacity
                style={[styles.subChip, activeFilterCount > 0 && styles.subChipActive, { marginRight: 8 }]}
                onPress={() => setFiltersOpen(true)}
                accessibilityRole="button"
                accessibilityLabel={`Filters${activeFilterCount ? `, ${activeFilterCount} active` : ''}`}
              >
                <Ionicons name="options-outline" size={14} color={activeFilterCount > 0 ? C.orange : C.textMuted} />
                <Text style={[styles.subText, activeFilterCount > 0 && styles.subTextActive]}>
                  Filters{activeFilterCount ? ` (${activeFilterCount})` : ''}
                </Text>
              </TouchableOpacity>
            ) : null}
            renderItem={({ item }) => {
              const active = item.slug === activeSub;
              return (
                <TouchableOpacity
                  style={[styles.subChip, active && styles.subChipActive]}
                  onPress={() => pickSub(item.slug)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                >
                  <Text style={[styles.subText, active && styles.subTextActive]}>{item.name}</Text>
                </TouchableOpacity>
              );
            }}
          />
        </View>
      ) : null}

      <AnswerFiltersSheet
        visible={filtersOpen}
        questions={filterQuestions}
        values={answerFilters}
        onClose={() => setFiltersOpen(false)}
        onApply={next => { setAnswerFilters(next); setFiltersOpen(false); }}
      />

      {/* ── Results ── */}
      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator color={C.orange} size="large" />
          <Text style={styles.loadingText}>Searching...</Text>
        </View>
      ) : (
        <FlatList
          data={listings}
          keyExtractor={l => l.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            <>
            <View style={{ marginHorizontal: -16, marginTop: -20 }}>
              <BusinessRow
                title={query.trim()
                  ? `Businesses matching "${query.trim()}"`
                  : activeCat ? businessCategoryLabel(activeCat) : `Popular in ${activeCityName}`}
                data={businesses}
                navigation={navigation}
                citySlug={activeCity}
                cityName={activeCityName}
                categorySlug={activeCat && BUSINESS_CATEGORY_LABEL[activeCat] ? activeCat : undefined}
              />
            </View>
            {listings.length > 0 ? (
              <Text style={styles.countText}>
                {listings.length} listing{listings.length !== 1 ? 's' : ''} in{' '}
                <Text style={{ color: C.orange, fontWeight: '700' }}>{activeCityName}</Text>
                {activeCat ? ` · ${allCats.find(c => c.slug === activeCat)?.name ?? ''}` : ''}
              </Text>
            ) : null}
            </>
          }
          ListEmptyComponent={
            <View style={[styles.emptyWrap, businesses.length > 0 && { paddingTop: 24 }]}>
              {businesses.length === 0 && <Ionicons name="search-outline" size={48} color={C.textMuted} style={{ marginBottom: 16 }} />}
              <Text style={styles.emptyTitle}>{businesses.length > 0 ? 'No classified ads yet' : 'No listings found'}</Text>
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

  // Near Me toggle
  nearMeRow: {
    backgroundColor: C.navBg,
    flexDirection: 'row', gap: 8,
    paddingHorizontal: 14, paddingBottom: 12,
  },
  nearMeChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(247,146,30,0.12)',
    borderRadius: RADIUS.pill,
    paddingHorizontal: 13, paddingVertical: 8,
    borderWidth: 1, borderColor: 'rgba(247,146,30,0.3)',
  },
  nearMeChipActive: {
    backgroundColor: C.orange, borderColor: C.orange,
  },
  nearMeText: { fontSize: 13, color: C.orange, fontWeight: '700' },
  nearMeTextActive: { color: 'white' },
  saveSearchChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(247,146,30,0.12)',
    borderRadius: RADIUS.pill,
    paddingHorizontal: 13, paddingVertical: 8,
    borderWidth: 1, borderColor: 'rgba(247,146,30,0.3)',
  },
  saveSearchText: { fontSize: 13, color: C.orange, fontWeight: '700' },

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
  subsContainer: { backgroundColor: C.navBg, paddingBottom: 12 },
  subChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    borderRadius: RADIUS.pill, paddingHorizontal: 12, paddingVertical: 6,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)',
  },
  subChipActive: { backgroundColor: 'white', borderColor: 'white' },
  subText: { fontSize: 12, color: 'rgba(255,255,255,0.75)', fontWeight: '600' },
  subTextActive: { color: C.orange, fontWeight: '700' },

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
