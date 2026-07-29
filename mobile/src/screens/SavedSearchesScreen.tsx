import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { useState, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { savedSearchesApi } from '../lib/api';
import { timeAgo } from '../lib/format';
import { C, RADIUS, SHADOW } from '../lib/theme';

type SavedSearch = {
  id: string;
  city_slug: string;
  query_text: string | null;
  category_slug: string | null;
  created_at: string;
};

const cityLabel = (slug: string) => slug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

export default function SavedSearchesScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const [searches, setSearches] = useState<SavedSearch[]>([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(useCallback(() => {
    let active = true;
    setLoading(true);
    savedSearchesApi.list()
      .then((data: SavedSearch[]) => { if (active) setSearches(data); })
      .catch(() => { if (active) setSearches([]); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []));

  const handleDelete = async (id: string) => {
    setSearches(prev => prev.filter(s => s.id !== id));
    try {
      await savedSearchesApi.delete(id);
    } catch {
      // best-effort — a stale row reappearing on next focus is an acceptable failure mode here
    }
  };

  const runSearch = (s: SavedSearch) => {
    navigation.navigate('Search', {
      citySlug: s.city_slug,
      cityName: cityLabel(s.city_slug),
      q: s.query_text ?? '',
      categorySlug: s.category_slug ?? '',
    });
  };

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 12) + 8 }]}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Ionicons name="arrow-back" size={22} color={C.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Saved Searches</Text>
        <View style={{ width: 22 }} />
      </View>

      {loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color={C.orange} />
      ) : (
        <FlatList
          data={searches}
          keyExtractor={s => s.id}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="search-outline" size={48} color={C.textMuted} style={{ marginBottom: 12 }} />
              <Text style={styles.emptyTitle}>No saved searches</Text>
              <Text style={styles.emptyText}>Save a search from any search results page to get alerts.</Text>
            </View>
          }
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.iconWrap}>
                <Ionicons name="search" size={16} color={C.orange} />
              </View>
              <TouchableOpacity
                style={{ flex: 1 }}
                onPress={() => runSearch(item)}
                accessibilityRole="button"
                accessibilityLabel={`Run search: ${item.query_text || item.category_slug || 'All listings'} in ${cityLabel(item.city_slug)}`}
              >
                <Text style={styles.cardTitle} numberOfLines={1}>
                  {item.query_text || item.category_slug || 'All listings'}
                  {item.city_slug && <Text style={styles.cardCity}> in {cityLabel(item.city_slug)}</Text>}
                </Text>
                <Text style={styles.cardMeta}>Saved {timeAgo(item.created_at)}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => handleDelete(item.id)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                accessibilityRole="button"
                accessibilityLabel="Remove saved search"
              >
                <Ionicons name="trash-outline" size={17} color={C.textMuted} />
              </TouchableOpacity>
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.pageBg },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingBottom: 14, backgroundColor: C.surface,
    borderBottomWidth: 1, borderBottomColor: C.divider,
  },
  headerTitle: { fontSize: 15, fontWeight: '700', color: C.text },
  list: { padding: 16, gap: 10 },
  card: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: C.surface, borderRadius: RADIUS.md, padding: 14,
    ...SHADOW.card,
  },
  iconWrap: {
    width: 36, height: 36, borderRadius: RADIUS.sm,
    backgroundColor: C.orangeLight, alignItems: 'center', justifyContent: 'center',
  },
  cardTitle: { fontSize: 14, fontWeight: '700', color: C.text },
  cardCity: { fontWeight: '400', color: C.textMuted },
  cardMeta: { fontSize: 12, color: C.textMuted, marginTop: 2 },
  empty: { alignItems: 'center', paddingTop: 60, paddingHorizontal: 32 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: C.textSub, marginBottom: 4 },
  emptyText: { fontSize: 13, color: C.textMuted, textAlign: 'center', lineHeight: 19 },
});
