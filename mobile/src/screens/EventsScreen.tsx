import { useState, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, FlatList, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { eventsApi } from '../lib/api';

export default function EventsScreen({ route, navigation }: any) {
  const { citySlug, cityName } = route.params ?? {};
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(useCallback(() => {
    let active = true;
    setLoading(true);
    eventsApi.list(citySlug)
      .then((data: any[]) => { if (active) setEvents(data); })
      .catch(() => { if (active) setEvents([]); })
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
        <Text style={styles.headerTitle} numberOfLines={1}>Events in {cityName}</Text>
        <View style={{ width: 24 }} />
      </View>

      {loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color="#f97316" />
      ) : (
        <FlatList
          data={events}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="calendar-outline" size={40} color="#d1d5db" />
              <Text style={styles.emptyTitle}>No events yet</Text>
              <Text style={styles.emptyDesc}>Be the first to post an event in {cityName}!</Text>
            </View>
          }
          renderItem={({ item }) => {
            const date = new Date(item.event_date);
            const day = date.toLocaleDateString('en-IN', { day: '2-digit' });
            const month = date.toLocaleDateString('en-IN', { month: 'short' });
            return (
              <TouchableOpacity
                style={styles.card}
                onPress={() => navigation.navigate('EventDetail', { eventId: item.id })}
                activeOpacity={0.85}
              >
                <View style={styles.dateBadge}>
                  <Text style={styles.dateDay}>{day}</Text>
                  <Text style={styles.dateMonth}>{month}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <View style={styles.badgeRow}>
                    <Text style={[styles.badge, item.is_free ? styles.badgeFree : styles.badgePaid]}>
                      {item.is_free ? 'Free' : 'Paid'}
                    </Text>
                  </View>
                  <Text style={styles.name} numberOfLines={1}>{item.title}</Text>
                  <Text style={styles.venue} numberOfLines={1}>{item.venue}</Text>
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
  list: { padding: 16, paddingTop: 14, gap: 10 },
  card: {
    flexDirection: 'row', gap: 12,
    backgroundColor: 'white', borderRadius: 14, padding: 14,
    borderWidth: 1, borderColor: '#f1f5f9',
  },
  dateBadge: {
    width: 48, height: 48, borderRadius: 12, backgroundColor: '#f97316',
    alignItems: 'center', justifyContent: 'center',
  },
  dateDay: { color: 'white', fontSize: 16, fontWeight: '800', lineHeight: 18 },
  dateMonth: { color: 'rgba(255,255,255,0.9)', fontSize: 10, fontWeight: '700', textTransform: 'uppercase' },
  badgeRow: { flexDirection: 'row', marginBottom: 3 },
  badge: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase', paddingHorizontal: 7, paddingVertical: 2, borderRadius: 8, overflow: 'hidden' },
  badgeFree: { color: '#15803d', backgroundColor: '#dcfce7' },
  badgePaid: { color: '#b45309', backgroundColor: '#fef3c7' },
  name: { fontSize: 15, fontWeight: '700', color: '#1f2937' },
  venue: { fontSize: 12, color: '#9ca3af', marginTop: 2 },
  empty: { alignItems: 'center', paddingTop: 60, gap: 8 },
  emptyTitle: { fontSize: 15, fontWeight: '700', color: '#374151' },
  emptyDesc: { fontSize: 13, color: '#9ca3af', textAlign: 'center', paddingHorizontal: 32 },
});
