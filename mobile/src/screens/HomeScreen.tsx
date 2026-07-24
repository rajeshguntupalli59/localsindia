import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  FlatList, Image, RefreshControl, Alert,
} from 'react-native';
import { useState, useEffect, useCallback, useRef } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { listingsApi, citiesApi, categoriesApi } from '../lib/api';
import { storage } from '../lib/storage';
import ListingCard from '../components/ListingCard';
import NotificationBell from '../components/NotificationBell';
import AlertOnboardingSheet from '../components/AlertOnboardingSheet';
import CityAutoDetectPrompt from '../components/CityAutoDetectPrompt';

const LOGO = require('../../assets/logo-mark-transparent.png');

const CAT_COLORS: Record<string, string> = {
  tiffin:        '#f97316',
  'pg-roommate': '#3b82f6',
  jobs:          '#10b981',
  vehicles:      '#ef4444',
  electronics:   '#8b5cf6',
  education:     '#f59e0b',
  events:        '#ec4899',
  businesses:    '#06b6d4',
};

const CAT_VISUAL: Record<string, { icon: string; bg: string }> = {
  tiffin:        { icon: 'fast-food-outline',     bg: '#f97316' },
  'pg-roommate': { icon: 'home-outline',           bg: '#3b82f6' },
  jobs:          { icon: 'briefcase-outline',      bg: '#10b981' },
  vehicles:      { icon: 'car-outline',            bg: '#ef4444' },
  electronics:   { icon: 'phone-portrait-outline', bg: '#8b5cf6' },
  education:     { icon: 'school-outline',         bg: '#f59e0b' },
  events:        { icon: 'calendar-outline',       bg: '#ec4899' },
  businesses:    { icon: 'storefront-outline',     bg: '#06b6d4' },
  classifieds:   { icon: 'pricetags-outline',      bg: '#64748b' },
  services:      { icon: 'construct-outline',      bg: '#0d9488' },
  'real-estate': { icon: 'business-outline',       bg: '#a21caf' },
  furniture:     { icon: 'cube-outline',           bg: '#92400e' },
  fashion:       { icon: 'shirt-outline',          bg: '#db2777' },
  doctors:       { icon: 'medical-outline',        bg: '#0284c7' },
};

type Listing = any;

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'morning';
  if (h < 17) return 'afternoon';
  return 'evening';
}

function HRow({
  title,
  data,
  onPress,
  navigation,
  citySlug,
  cityName,
}: {
  title: string;
  data: Listing[];
  onPress: (item: Listing) => void;
  navigation: any;
  citySlug: string;
  cityName: string;
}) {
  if (data.length < 3) return null;
  return (
    <View style={{ marginBottom: 8 }}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{title}</Text>
        <TouchableOpacity onPress={() => navigation.navigate('Search', { citySlug, cityName })}>
          <Text style={styles.viewAll}>View all →</Text>
        </TouchableOpacity>
      </View>
      <FlatList
        horizontal
        showsHorizontalScrollIndicator={false}
        data={data}
        keyExtractor={item => item.id}
        contentContainerStyle={{ paddingHorizontal: 16 }}
        renderItem={({ item }) => (
          <View style={{ width: 240, marginRight: 12 }}>
            <ListingCard
              listing={item}
              onPress={() => onPress(item)}
            />
          </View>
        )}
      />
    </View>
  );
}

export default function HomeScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const [citySlug, setCitySlug] = useState('hyderabad');
  const [cityName, setCityName] = useState('Hyderabad');
  const [userName, setUserName] = useState<string | null>(null);
  const [todayCount, setTodayCount] = useState<number | null>(null);
  const [trendingListings, setTrendingListings] = useState<Listing[]>([]);
  const [freshListings, setFreshListings] = useState<Listing[]>([]);
  const [recentlyViewed, setRecentlyViewed] = useState<Listing[]>([]);
  const [categories, setCategories] = useState<{ id: string; name: string; slug: string; icon: string }[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  // Guards against alerting twice when the categories call and the
  // count/trending/fresh calls fail at the same time (e.g. no network) —
  // reset on each explicit pull-to-refresh so a retry can alert again.
  const errorShownRef = useRef(false);
  const reportLoadFailure = useCallback(() => {
    if (errorShownRef.current) return;
    errorShownRef.current = true;
    Alert.alert('Could not load listings', 'Check your internet connection and try again.');
  }, []);

  const loadAll = useCallback(async (slug: string, name: string) => {
    try {
      const [countData, trending, fresh] = await Promise.all([
        citiesApi.todayCount(slug),
        citiesApi.trending(slug),
        listingsApi.byCitySlug(slug, { page_size: '20', sort: 'newest' }),
      ]);
      setTodayCount(countData.count ?? 0);
      setTrendingListings(trending ?? []);
      setFreshListings(Array.isArray(fresh) ? fresh : (fresh?.items ?? []));
    } catch {
      reportLoadFailure();
    }
  }, [reportLoadFailure]);

  useEffect(() => {
    // Load saved city, user, categories
    storage.getCity().then(saved => {
      if (saved) { setCitySlug(saved.slug); setCityName(saved.name); }
    });
    storage.getUser().then((u: any) => {
      if (u?.name) setUserName(u.name.split(' ')[0]);
    });
    categoriesApi.list().then(setCategories).catch(reportLoadFailure);
  }, [reportLoadFailure]);

  useEffect(() => {
    loadAll(citySlug, cityName);
    // Load recently viewed for this city
    storage.recentlyViewed.get(citySlug).then(rv => setRecentlyViewed(rv));
  }, [citySlug, loadAll]);

  const handleRefresh = async () => {
    setRefreshing(true);
    errorShownRef.current = false;
    await loadAll(citySlug, cityName);
    // Refresh recently viewed too
    const rv = await storage.recentlyViewed.get(citySlug);
    setRecentlyViewed(rv);
    setRefreshing(false);
  };

  const handleCitySelect = (c: any) => {
    setCitySlug(c.slug);
    setCityName(c.name);
    storage.setCity(c.slug, c.name);
  };

  const handleListingPress = async (listing: Listing) => {
    // Guard against a tap landing during pull-to-refresh, when all three
    // horizontal lists are being replaced at once and a recycled card could
    // hand the touch to a listing that's no longer the one the user saw.
    if (refreshing) return;
    await storage.recentlyViewed.add(listing, citySlug);
    navigation.navigate('ListingDetail', { id: listing.id });
  };

  const greetingLine = `Good ${getGreeting()}${userName ? `, ${userName}` : ''} 👋`;
  const countLine = todayCount !== null && todayCount > 0
    ? `${todayCount} new listing${todayCount > 1 ? 's' : ''} in ${cityName} today`
    : `explore what's happening in ${cityName}`;

  return (
    <View style={{ flex: 1 }}>
      <ScrollView
        style={styles.container}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor="#f97316"
            colors={['#f97316']}
          />
        }
      >
        {/* ── HERO ── */}
        <View style={[styles.hero, { paddingTop: Math.max(insets.top, 20) + 40 }]}>
          {/* Atmospheric glow blobs */}
          <View style={styles.glowTopRight} pointerEvents="none" />
          <View style={styles.glowBottomLeft} pointerEvents="none" />

          <View style={styles.heroHeader}>
            <View style={styles.brandRow}>
              <Image source={LOGO} style={styles.logo} resizeMode="contain" />
              <View style={{ flex: 1 }}>
                <Text style={styles.greetingText}>{greetingLine}</Text>
                <Text style={styles.countText}>{countLine}</Text>
              </View>
            </View>
            <View style={styles.headerActions}>
              <NotificationBell />
              <TouchableOpacity
                style={styles.cityBtn}
                onPress={() => navigation.navigate('CityPicker', { onSelect: handleCitySelect })}
                accessibilityRole="button"
                accessibilityLabel={`Change city, currently ${cityName}`}
              >
                <Ionicons name="location-outline" size={13} color="#f97316" />
                <Text style={styles.cityBtnText}>{cityName}</Text>
                <Ionicons name="chevron-down" size={11} color="rgba(255,255,255,0.5)" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Premium search bar */}
          <TouchableOpacity
            style={styles.searchBar}
            onPress={() => navigation.navigate('Search', { citySlug, cityName })}
            activeOpacity={0.9}
            accessibilityRole="search"
            accessibilityLabel="Search tiffin, PG, tutor and more"
          >
            <Ionicons name="search-outline" size={18} color="#f97316" />
            <Text style={styles.searchPlaceholder}>Search tiffin, PG, tutor...</Text>
            <View style={styles.searchPill}>
              <Text style={styles.searchPillText}>Go</Text>
            </View>
          </TouchableOpacity>

          {/* Post Free CTA */}
          <TouchableOpacity
            style={styles.postFreeBtn}
            onPress={() => navigation.navigate('Post', { citySlug, cityName })}
            activeOpacity={0.85}
          >
            <Ionicons name="add-circle-outline" size={15} color="#F7921E" />
            <Text style={styles.postFreeBtnText}>Post a Free Ad — takes 60 seconds</Text>
          </TouchableOpacity>
        </View>

        {/* ── ROW 1: Recently viewed (conditional — hide if < 3) ── */}
        {recentlyViewed.length >= 3 && (
          <HRow
            title="Picked up where you left off"
            data={recentlyViewed}
            onPress={handleListingPress}
            navigation={navigation}
            citySlug={citySlug}
            cityName={cityName}
          />
        )}

        {/* ── ROW 2: Trending near you ── */}
        <HRow
          title="Trending near you 🔥"
          data={trendingListings}
          onPress={handleListingPress}
          navigation={navigation}
          citySlug={citySlug}
          cityName={cityName}
        />

        {/* ── ROW 3: Fresh listings ── */}
        {freshListings.length >= 3 && (
          <View style={{ marginBottom: 8 }}>
            <View style={styles.sectionHeader}>
              <View>
                <Text style={styles.sectionTitle}>
                  {(() => {
                    const h = new Date().getHours();
                    return h < 12 ? 'New this morning ☀️' : h < 17 ? 'Posted today' : 'Fresh tonight 🌙';
                  })()}
                </Text>
                {todayCount !== null && todayCount > 0 && (
                  <Text style={{ fontSize: 11, color: '#f97316', fontWeight: '600', marginTop: 1 }}>
                    {todayCount} new today in {cityName}
                  </Text>
                )}
              </View>
              <TouchableOpacity onPress={() => navigation.navigate('Search', { citySlug, cityName })}>
                <Text style={styles.viewAll}>View all →</Text>
              </TouchableOpacity>
            </View>
            <FlatList
              horizontal
              showsHorizontalScrollIndicator={false}
              data={freshListings.slice(0, 12)}
              keyExtractor={item => item.id}
              contentContainerStyle={{ paddingHorizontal: 16 }}
              renderItem={({ item }) => (
                <View style={{ width: 240, marginRight: 12 }}>
                  <ListingCard listing={item} onPress={() => handleListingPress(item)} />
                </View>
              )}
            />
          </View>
        )}

        {/* ── ROW 4: Browse by category — bold 4-column grid ── */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Browse by Category</Text>
        </View>
        <View style={styles.catGrid}>
          {categories.map(cat => {
            const vis = CAT_VISUAL[cat.slug] ?? { icon: 'grid-outline', bg: '#94a3b8' };
            // Businesses and Events are real category rows, but they're backed
            // by their own dedicated screens (Business Directory, Events
            // Calendar), not classifieds search results — route them there
            // instead of Search, same tile, same grid, no separate banner.
            const dest =
              cat.slug === 'businesses' ? 'Businesses' :
              cat.slug === 'events' ? 'Events' :
              null;
            return (
              <TouchableOpacity
                key={cat.slug}
                style={[styles.catBlock, { backgroundColor: vis.bg }]}
                onPress={() => dest
                  ? navigation.navigate(dest, { citySlug, cityName })
                  : navigation.navigate('Search', { citySlug, cityName, categorySlug: cat.slug })}
                activeOpacity={0.82}
              >
                <Ionicons name={vis.icon as any} size={26} color="rgba(255,255,255,0.95)" />
                <Text style={styles.catBlockLabel} numberOfLines={2}>{cat.name}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={{ height: 32 }} />
      </ScrollView>

      {/* Floating chat button */}
      <TouchableOpacity
        style={styles.chatFab}
        onPress={() => navigation.navigate('Chat')}
        activeOpacity={0.85}
        accessibilityRole="button"
        accessibilityLabel="Open AI chat assistant"
      >
        <Ionicons name="chatbubble-ellipses" size={22} color="white" />
      </TouchableOpacity>

      {/* Onboarding sheet — auto-shows once after first login */}
      <AlertOnboardingSheet />

      {/* City auto-detect — auto-shows once on first-ever launch, any auth state */}
      <CityAutoDetectPrompt navigation={navigation} onCitySelected={handleCitySelect} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f4f5f9' },

  /* ── Hero ── */
  hero: {
    backgroundColor: '#0D0F1C',
    padding: 20,
    paddingBottom: 24,
    overflow: 'hidden',
    position: 'relative',
  },
  glowTopRight: {
    position: 'absolute',
    top: -60,
    right: -50,
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: '#f97316',
    opacity: 0.08,
  },
  glowBottomLeft: {
    position: 'absolute',
    bottom: -40,
    left: -40,
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: '#6366f1',
    opacity: 0.07,
  },
  heroHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 18,
    gap: 8,
  },
  headerActions: {
    flexDirection: 'column',
    alignItems: 'flex-end',
    gap: 8,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    flex: 1,
    gap: 10,
  },
  logo: { width: 36, height: 36, marginTop: 2 },
  greetingText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '700',
    lineHeight: 22,
  },
  countText: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 12,
    marginTop: 2,
    lineHeight: 17,
  },
  cityBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.10)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    paddingHorizontal: 10,
    paddingVertical: 7,
    flexShrink: 0,
  },
  cityBtnText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
    maxWidth: 80,
  },

  /* ── Search bar ── */
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'white',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 13,
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  searchPlaceholder: {
    color: '#9ca3af',
    fontSize: 15,
    flex: 1,
  },
  searchPill: {
    backgroundColor: '#f97316',
    borderRadius: 9,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  searchPillText: {
    color: 'white',
    fontWeight: '700',
    fontSize: 12,
  },

  /* ── Section headers ── */
  sectionTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#111827',
    letterSpacing: -0.3,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 10,
  },
  viewAll: { color: '#f97316', fontWeight: '600', fontSize: 13 },

  /* ── Category chips ── */
  catChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'white',
    borderRadius: 24,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 9,
    marginRight: 8,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  catIconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  catEmoji: { fontSize: 15 },
  catLabel: { fontSize: 13, color: '#374151', fontWeight: '600' },

  catGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 12,
    gap: 10,
    marginBottom: 12,
  },
  catBlock: {
    width: '22%',
    flexGrow: 0,
    aspectRatio: 0.9,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 6,
    gap: 7,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 4,
  },
  catBlockLabel: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.95)',
    fontWeight: '700',
    textAlign: 'center',
    lineHeight: 14,
  },

  /* ── Post Free CTA ── */
  postFreeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    marginTop: 12,
    paddingVertical: 11,
    paddingHorizontal: 20,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: 'rgba(247,146,30,0.35)',
    backgroundColor: 'rgba(247,146,30,0.10)',
  },
  postFreeBtnText: {
    color: '#F7921E',
    fontWeight: '700',
    fontSize: 13,
    letterSpacing: -0.1,
  },
  /* ── Chat FAB ── */
  chatFab: {
    position: 'absolute',
    bottom: 16,
    right: 16,
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#f97316',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#f97316',
    shadowOpacity: 0.5,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 5 },
    elevation: 10,
  },
});
