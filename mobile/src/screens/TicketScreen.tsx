import { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { ticketsApi } from '../lib/api';

export default function TicketScreen({ route, navigation }: any) {
  const { ticketId } = route.params ?? {};
  const [ticket, setTicket] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    ticketsApi.getById(ticketId)
      .then(setTicket)
      .catch(() => setTicket(null))
      .finally(() => setLoading(false));
  }, [ticketId]);

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator style={{ marginTop: 60 }} color="#ec4899" />
      </SafeAreaView>
    );
  }

  if (!ticket) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={{ textAlign: 'center', marginTop: 40, color: '#9ca3af' }}>Ticket not found</Text>
      </SafeAreaView>
    );
  }

  const date = new Date(ticket.event_date);
  const dateLabel = date.toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' });
  const timeLabel = date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.popToTop()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Ionicons name="close" size={24} color="#1f2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Your Ticket</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.body}>
        <View style={styles.card}>
          <View style={[styles.statusPill, ticket.used_at ? styles.statusUsed : styles.statusValid]}>
            <Ionicons
              name={ticket.used_at ? 'time-outline' : 'checkmark-circle'}
              size={13}
              color={ticket.used_at ? '#6b7280' : '#15803d'}
            />
            <Text style={[styles.statusText, ticket.used_at ? { color: '#6b7280' } : { color: '#15803d' }]}>
              {ticket.used_at ? 'Used' : 'Valid'}
            </Text>
          </View>

          <Text style={styles.eventTitle}>{ticket.event_title}</Text>
          <Text style={styles.eventMeta}>{dateLabel} · {timeLabel}</Text>
          <Text style={styles.eventMeta}>{ticket.event_venue}</Text>

          <Image
            source={{ uri: ticket.qr_image }}
            style={[styles.qr, ticket.used_at && { opacity: 0.4 }]}
            resizeMode="contain"
          />
          <Text style={styles.hint}>Show this QR code at the entrance</Text>
        </View>
      </View>
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
  body: { flex: 1, padding: 20, justifyContent: 'center' },
  card: {
    backgroundColor: 'white', borderRadius: 20, padding: 24, alignItems: 'center',
    shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 12, elevation: 3,
  },
  statusPill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, marginBottom: 14,
  },
  statusValid: { backgroundColor: '#dcfce7' },
  statusUsed: { backgroundColor: '#f1f5f9' },
  statusText: { fontSize: 11, fontWeight: '800', textTransform: 'uppercase' },
  eventTitle: { fontSize: 17, fontWeight: '800', color: '#111827', textAlign: 'center' },
  eventMeta: { fontSize: 13, color: '#6b7280', marginTop: 4, textAlign: 'center' },
  qr: { width: 220, height: 220, marginTop: 24 },
  hint: { fontSize: 12, color: '#9ca3af', marginTop: 14 },
});
