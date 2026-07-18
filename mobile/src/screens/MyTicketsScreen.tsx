import { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, FlatList, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { ticketsApi } from '../lib/api';

export default function MyTicketsScreen({ navigation }: any) {
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(useCallback(() => {
    let active = true;
    setLoading(true);
    ticketsApi.my()
      .then((data: any[]) => { if (active) setTickets(data); })
      .catch(() => { if (active) setTickets([]); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []));

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Ionicons name="arrow-back" size={24} color="#1f2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Tickets</Text>
        <View style={{ width: 24 }} />
      </View>

      {loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color="#ec4899" />
      ) : (
        <FlatList
          data={tickets}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="ticket-outline" size={40} color="#d1d5db" />
              <Text style={styles.emptyTitle}>No tickets yet</Text>
            </View>
          }
          renderItem={({ item }) => {
            const date = new Date(item.event_date);
            return (
              <TouchableOpacity
                style={styles.card}
                onPress={() => navigation.navigate('Ticket', { ticketId: item.id })}
                activeOpacity={0.85}
              >
                <View style={styles.row}>
                  <Text style={styles.name} numberOfLines={1}>{item.event_title}</Text>
                  {item.used_at && <Text style={styles.usedBadge}>Used</Text>}
                </View>
                <Text style={styles.meta}>
                  {date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })} · {item.event_venue}
                </Text>
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
  headerTitle: { fontSize: 17, fontWeight: '700', color: '#1f2937' },
  list: { padding: 16, gap: 10 },
  card: { backgroundColor: 'white', borderRadius: 14, padding: 14, borderWidth: 1, borderColor: '#f1f5f9' },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  name: { fontSize: 15, fontWeight: '700', color: '#1f2937', flexShrink: 1 },
  usedBadge: {
    fontSize: 10, fontWeight: '700', textTransform: 'uppercase', color: '#6b7280',
    backgroundColor: '#f1f5f9', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8,
  },
  meta: { fontSize: 12, color: '#9ca3af', marginTop: 4 },
  empty: { alignItems: 'center', paddingTop: 60, gap: 8 },
  emptyTitle: { fontSize: 15, fontWeight: '700', color: '#374151' },
});
