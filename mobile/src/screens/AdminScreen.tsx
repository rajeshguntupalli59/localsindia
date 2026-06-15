import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  Alert, RefreshControl, ActivityIndicator,
} from 'react-native';
import { useState, useEffect, useCallback } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { adminApi } from '../lib/api';

const TABS = [
  { key: 'pending', label: 'Pending' },
  { key: 'flagged', label: 'Flagged' },
  { key: 'active',  label: 'Active'  },
  { key: 'rejected', label: 'Rejected' },
];

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export default function AdminScreen({ navigation }: any) {
  const [tab, setTab] = useState('pending');
  const [listings, setListings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionId, setActionId] = useState<string | null>(null);

  const load = useCallback(async (status: string, silent = false) => {
    if (!silent) setLoading(true);
    try {
      const data = status === 'pending'
        ? await adminApi.pendingListings()
        : await adminApi.listingsByStatus(status);
      setListings(data);
    } catch {
      Alert.alert('Error', 'Failed to load listings.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(tab); }, [tab, load]);

  const onRefresh = () => { setRefreshing(true); load(tab, true); };

  const approve = (id: string, title: string) => {
    Alert.alert('Approve listing?', `"${title}"`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Approve',
        style: 'default',
        onPress: async () => {
          setActionId(id);
          try {
            await adminApi.approveListing(id);
            setListings(ls => ls.filter(l => l.id !== id));
          } catch {
            Alert.alert('Error', 'Failed to approve.');
          } finally {
            setActionId(null);
          }
        },
      },
    ]);
  };

  const reject = (id: string, title: string) => {
    Alert.alert('Reject listing?', `"${title}" will be hidden from the app.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Reject',
        style: 'destructive',
        onPress: async () => {
          setActionId(id);
          try {
            await adminApi.rejectListing(id);
            setListings(ls => ls.filter(l => l.id !== id));
          } catch {
            Alert.alert('Error', 'Failed to reject.');
          } finally {
            setActionId(null);
          }
        },
      },
    ]);
  };

  const renderItem = ({ item }: { item: any }) => {
    const busy = actionId === item.id;
    return (
      <View style={styles.card}>
        <View style={styles.cardBody}>
          <Text style={styles.cardTitle} numberOfLines={2}>{item.title}</Text>
          <Text style={styles.cardDesc} numberOfLines={2}>{item.description}</Text>
          <View style={styles.cardMeta}>
            {item.price != null && (
              <Text style={styles.price}>₹{Number(item.price).toLocaleString('en-IN')}</Text>
            )}
            <Text style={styles.metaText}>{item.created_at ? timeAgo(item.created_at) : ''}</Text>
            {item.contact_phone && (
              <Text style={styles.metaText}>{item.contact_phone}</Text>
            )}
          </View>
        </View>

        {tab === 'pending' && (
          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.approveBtn, busy && styles.btnDisabled]}
              onPress={() => approve(item.id, item.title)}
              disabled={busy}
            >
              {busy ? (
                <ActivityIndicator size="small" color="#16a34a" />
              ) : (
                <>
                  <Ionicons name="checkmark-circle" size={15} color="#16a34a" />
                  <Text style={styles.approveTxt}>Approve</Text>
                </>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.rejectBtn, busy && styles.btnDisabled]}
              onPress={() => reject(item.id, item.title)}
              disabled={busy}
            >
              <Ionicons name="close-circle" size={15} color="#dc2626" />
              <Text style={styles.rejectTxt}>Reject</Text>
            </TouchableOpacity>
          </View>
        )}

        {tab === 'flagged' && (
          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.approveBtn, busy && styles.btnDisabled]}
              onPress={() => approve(item.id, item.title)}
              disabled={busy}
            >
              <Ionicons name="checkmark-circle" size={15} color="#16a34a" />
              <Text style={styles.approveTxt}>Restore</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.rejectBtn, busy && styles.btnDisabled]}
              onPress={() => reject(item.id, item.title)}
              disabled={busy}
            >
              <Ionicons name="close-circle" size={15} color="#dc2626" />
              <Text style={styles.rejectTxt}>Remove</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Admin Panel</Text>
        <TouchableOpacity onPress={onRefresh} style={styles.refreshBtn}>
          <Ionicons name="refresh" size={20} color="#6b7280" />
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View style={styles.tabRow}>
        {TABS.map(t => (
          <TouchableOpacity
            key={t.key}
            style={[styles.tab, tab === t.key && styles.tabActive]}
            onPress={() => setTab(t.key)}
          >
            <Text style={[styles.tabText, tab === t.key && styles.tabTextActive]}>
              {t.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Count */}
      <Text style={styles.countText}>{listings.length} {tab} listing{listings.length !== 1 ? 's' : ''}</Text>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#f97316" />
        </View>
      ) : listings.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="checkmark-done-circle-outline" size={56} color="#d1d5db" />
          <Text style={styles.emptyTitle}>All clear</Text>
          <Text style={styles.emptyText}>No {tab} listings right now.</Text>
        </View>
      ) : (
        <FlatList
          data={listings}
          keyExtractor={item => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#f97316" />
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    paddingTop: 52,
    paddingBottom: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  backBtn: { padding: 4, marginRight: 8 },
  refreshBtn: { padding: 4, marginLeft: 'auto' },
  headerTitle: { flex: 1, fontSize: 18, fontWeight: 'bold', color: '#111827' },
  tabRow: {
    flexDirection: 'row',
    backgroundColor: 'white',
    paddingHorizontal: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
    gap: 4,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 7,
    borderRadius: 8,
  },
  tabActive: { backgroundColor: '#fff7ed' },
  tabText: { fontSize: 12, fontWeight: '600', color: '#9ca3af' },
  tabTextActive: { color: '#f97316' },
  countText: { fontSize: 12, color: '#9ca3af', paddingHorizontal: 16, paddingVertical: 8 },
  list: { padding: 12, gap: 10 },
  card: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 14,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  cardBody: { marginBottom: 10 },
  cardTitle: { fontSize: 15, fontWeight: '700', color: '#111827', marginBottom: 3 },
  cardDesc: { fontSize: 13, color: '#6b7280', lineHeight: 18 },
  cardMeta: { flexDirection: 'row', gap: 10, marginTop: 6, flexWrap: 'wrap' },
  price: { fontSize: 13, fontWeight: '700', color: '#f97316' },
  metaText: { fontSize: 12, color: '#9ca3af' },
  actions: { flexDirection: 'row', gap: 8 },
  approveBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 4, backgroundColor: '#f0fdf4', borderRadius: 8, paddingVertical: 8,
    borderWidth: 1, borderColor: '#bbf7d0',
  },
  approveTxt: { fontSize: 13, fontWeight: '700', color: '#16a34a' },
  rejectBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 4, backgroundColor: '#fef2f2', borderRadius: 8, paddingVertical: 8,
    borderWidth: 1, borderColor: '#fecaca',
  },
  rejectTxt: { fontSize: 13, fontWeight: '700', color: '#dc2626' },
  btnDisabled: { opacity: 0.5 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#374151' },
  emptyText: { fontSize: 14, color: '#9ca3af' },
});
