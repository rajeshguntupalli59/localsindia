import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, FlatList, ActivityIndicator, Image, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { businessesApi } from '../lib/api';
import { assignCovers } from '../lib/categoryCover';
import { openStatus, parseOpeningHours } from '../lib/openingHours';
import { siteImage } from '../lib/features';
import { BUSINESS_CATEGORY_LABEL, businessCategoryLabel } from '../lib/businessCategories';

const PAGE_SIZE = 20;

// City business directory: category chips with live counts, paged list,
// a photo (own, or a labelled category cover) and "Open now" where known.
export default function BusinessesScreen({ route, navigation }: any) {
  const { citySlug, cityName, categorySlug: initialCategory = '' } = route.params ?? {};
  const [category, setCategory] = useState<string>(initialCategory);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [businesses, setBusinesses] = useState<any[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const requestId = useRef(0);

  useEffect(() => {
    businessesApi.counts(citySlug).then(setCounts).catch(() => setCounts({}));
  }, [citySlug]);

  const load = useCallback(async (p: number) => {
    const id = ++requestId.current;
    p === 1 ? setLoading(true) : setLoadingMore(true);
    try {
      const data: any[] = await businessesApi.list(citySlug, {
        category_slug: category || undefined, page: p, page_size: PAGE_SIZE,
      });
      if (id !== requestId.current) return;   // a newer filter was chosen meanwhile
      setBusinesses(prev => (p === 1 ? data : [...prev, ...data]));
      setHasMore(data.length === PAGE_SIZE);
      setPage(p);
    } catch {
      if (id === requestId.current && p === 1) setBusinesses([]);
    } finally {
      if (id === requestId.current) { setLoading(false); setLoadingMore(false); }
    }
  }, [citySlug, category]);

  useEffect(() => { load(1); }, [load]);

  // Distinct cover photos for neighbouring cards without their own photo
  const covers = useMemo(
    () => assignCovers(businesses.map(b => ({ id: b.id, category_slug: b.category_slug, name: b.name }))),
    [businesses],
  );
  const chips = Object.entries(counts)
    .filter(([slug, n]) => n > 0 && BUSINESS_CATEGORY_LABEL[slug])
    // the chosen category first so it's visible, then by size
    .sort((a, b) => (b[0] === category ? 1 : 0) - (a[0] === category ? 1 : 0) || b[1] - a[1]);
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  const title = category ? `${businessCategoryLabel(category)} in ${cityName}` : `Businesses in ${cityName}`;

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
        <Text style={styles.headerTitle} numberOfLines={1}>{title}</Text>
        <View style={{ width: 24 }} />
      </View>

      <View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
          <TouchableOpacity style={[styles.chip, !category && styles.chipActive]} onPress={() => setCategory('')}>
            <Text style={[styles.chipText, !category && styles.chipTextActive]}>
              All{total ? ` (${total.toLocaleString('en-IN')})` : ''}
            </Text>
          </TouchableOpacity>
          {chips.map(([slug, n]) => (
            <TouchableOpacity key={slug} style={[styles.chip, category === slug && styles.chipActive]} onPress={() => setCategory(slug)}>
              <Text style={[styles.chipText, category === slug && styles.chipTextActive]}>
                {BUSINESS_CATEGORY_LABEL[slug]} ({n.toLocaleString('en-IN')})
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color="#f97316" />
      ) : (
        <FlatList
          data={businesses}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.list}
          onEndReachedThreshold={0.4}
          onEndReached={() => { if (hasMore && !loadingMore) load(page + 1); }}
          ListHeaderComponent={
            <View style={{ gap: 8 }}>
              <TouchableOpacity
                style={styles.addButton}
                onPress={() => navigation.navigate('Main', { screen: 'Post', params: { presetCategory: 'businesses' } })}
                activeOpacity={0.85}
              >
                <Ionicons name="add-circle-outline" size={16} color="#2563eb" />
                <Text style={styles.addButtonText}>Add your business — it's free</Text>
              </TouchableOpacity>
              {!!category && category !== 'businesses' && (
                <TouchableOpacity onPress={() => navigation.navigate('Search', { citySlug, cityName, categorySlug: category })}>
                  <Text style={styles.adsLink}>Classified ads for {businessCategoryLabel(category)} →</Text>
                </TouchableOpacity>
              )}
            </View>
          }
          ListFooterComponent={loadingMore ? <ActivityIndicator style={{ marginVertical: 16 }} color="#f97316" /> : null}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="storefront-outline" size={40} color="#d1d5db" />
              <Text style={styles.emptyTitle}>No businesses here yet</Text>
              <Text style={styles.emptyDesc}>Be the first to add your business in {cityName}!</Text>
            </View>
          }
          renderItem={({ item }) => {
            const photo = item.images?.[0]?.url ?? covers.get(item.id);
            const hours = parseOpeningHours(item.opening_hours);
            const status = hours ? openStatus(hours) : null;
            return (
              <TouchableOpacity
                style={styles.card}
                onPress={() => navigation.navigate('BusinessDetail', { businessId: item.id, citySlug })}
                activeOpacity={0.85}
              >
                {photo ? <Image source={{ uri: siteImage(photo) }} style={styles.thumb} /> : <View style={styles.thumb} />}
                <View style={styles.cardBody}>
                  <View style={styles.nameRow}>
                    <Text style={styles.name} numberOfLines={1}>{item.name}</Text>
                    {item.verified && <Ionicons name="checkmark-circle" size={15} color="#2563eb" />}
                  </View>
                  <Text style={styles.category} numberOfLines={1}>
                    {businessCategoryLabel(item.category_slug)}
                    {status ? <Text style={{ color: status.open ? '#059669' : '#dc2626' }}>  ·  {status.open ? 'Open now' : 'Closed'}</Text> : null}
                  </Text>
                  {item.review_count > 0 && !!item.avg_rating && (
                    <View style={styles.ratingRow}>
                      <Ionicons name="star" size={12} color="#f59e0b" />
                      <Text style={styles.ratingText}>{Number(item.avg_rating).toFixed(1)} · {item.review_count} reviews</Text>
                    </View>
                  )}
                  {item.address && <Text style={styles.address} numberOfLines={1}>{item.address}</Text>}
                </View>
              </TouchableOpacity>
            );
          }}
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
  chips: { paddingHorizontal: 16, paddingVertical: 10, gap: 8 },
  chip: { borderWidth: 1, borderColor: '#e5e7eb', backgroundColor: 'white', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 7 },
  chipActive: { borderColor: '#f97316', backgroundColor: '#fff7ed' },
  chipText: { fontSize: 13, color: '#4b5563', fontWeight: '600' },
  chipTextActive: { color: '#c2410c' },
  addButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    borderWidth: 1, borderColor: '#bfdbfe', backgroundColor: '#eff6ff', paddingVertical: 10, borderRadius: 12, marginBottom: 2,
  },
  addButtonText: { color: '#2563eb', fontWeight: '700', fontSize: 13 },
  adsLink: { color: '#f97316', fontWeight: '700', fontSize: 13, textAlign: 'center', marginBottom: 2 },
  list: { padding: 16, paddingTop: 4, gap: 10 },
  card: {
    flexDirection: 'row', gap: 12, backgroundColor: 'white', borderRadius: 14, padding: 10,
    borderWidth: 1, borderColor: '#f1f5f9',
  },
  thumb: { width: 72, height: 72, borderRadius: 10, backgroundColor: '#f1f5f9' },
  cardBody: { flex: 1, gap: 3, justifyContent: 'center' },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  name: { fontSize: 15, fontWeight: '700', color: '#1f2937', flexShrink: 1 },
  category: { fontSize: 12, color: '#6b7280', fontWeight: '600' },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  ratingText: { fontSize: 12, color: '#6b7280' },
  address: { fontSize: 12, color: '#9ca3af' },
  empty: { alignItems: 'center', paddingTop: 60, gap: 8 },
  emptyTitle: { fontSize: 15, fontWeight: '700', color: '#374151' },
  emptyDesc: { fontSize: 13, color: '#9ca3af', textAlign: 'center', paddingHorizontal: 32 },
});
