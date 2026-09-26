import { View, Text, TouchableOpacity, StyleSheet, FlatList, Image } from 'react-native';
import { assignCovers } from '../lib/categoryCover';
import { siteImage } from '../lib/features';
import { businessCategoryLabel } from '../lib/businessCategories';

/** Horizontal row of real local businesses (OpenStreetMap-imported or owner-added). */
export default function BusinessRow({ title, data, navigation, citySlug, cityName, categorySlug }: {
  title: string; data: any[]; navigation: any; citySlug: string; cityName: string; categorySlug?: string;
}) {
  if (data.length === 0) return null;
  const covers = assignCovers(data.map(b => ({ id: b.id, category_slug: b.category_slug, name: b.name })));
  return (
    <View style={{ marginBottom: 8 }}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle} numberOfLines={1}>{title}</Text>
        <TouchableOpacity onPress={() => navigation.navigate('Businesses', { citySlug, cityName, categorySlug })}>
          <Text style={styles.viewAll}>View all →</Text>
        </TouchableOpacity>
      </View>
      <FlatList
        horizontal
        showsHorizontalScrollIndicator={false}
        data={data}
        keyExtractor={item => item.id}
        contentContainerStyle={{ paddingHorizontal: 16 }}
        renderItem={({ item }) => {
          const own = item.images?.[0]?.url;
          const photo = own ?? covers.get(item.id);
          return (
            <TouchableOpacity
              style={styles.bizCard}
              onPress={() => navigation.navigate('BusinessDetail', { businessId: item.id, citySlug })}
              activeOpacity={0.85}
            >
              <View>
                {photo ? <Image source={{ uri: siteImage(photo) }} style={styles.bizPhoto} /> : <View style={styles.bizPhoto} />}
                {!own && photo && <Text style={styles.bizRep}>Representative image</Text>}
              </View>
              <View style={{ padding: 10, gap: 2 }}>
                <Text style={styles.bizName} numberOfLines={1}>{item.name}</Text>
                <Text style={styles.bizMeta} numberOfLines={1}>{businessCategoryLabel(item.category_slug)}</Text>
              </View>
            </TouchableOpacity>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  sectionTitle: { flexShrink: 1, fontSize: 17, fontWeight: '800', color: '#111827', letterSpacing: -0.3 },
  sectionHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12,
    paddingHorizontal: 16, paddingTop: 20, paddingBottom: 10,
  },
  viewAll: { color: '#f97316', fontWeight: '600', fontSize: 13 },
  bizCard: {
    width: 170, marginRight: 12, backgroundColor: 'white', borderRadius: 14, overflow: 'hidden',
    borderWidth: 1, borderColor: '#f1f5f9',
  },
  bizPhoto: { width: '100%', height: 100, backgroundColor: '#f1f5f9' },
  bizName: { fontSize: 13, fontWeight: '700', color: '#1f2937' },
  bizRep: {
    position: 'absolute', left: 6, bottom: 6, backgroundColor: 'rgba(0,0,0,0.55)', color: 'white',
    fontSize: 9, fontWeight: '600', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 999, overflow: 'hidden',
  },
  bizMeta: { fontSize: 11, color: '#6b7280' },
});
