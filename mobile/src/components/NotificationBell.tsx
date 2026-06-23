import { useState, useEffect, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Modal, ScrollView,
  Pressable, Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { notificationsApi } from '../lib/api';
import { storage } from '../lib/storage';

const TYPE_ICON: Record<string, string> = {
  listing_approved: '✅',
  listing_expiring: '⏰',
  listing_featured: '⭐',
  new_listing_match: '🔔',
};

function timeAgo(dateStr: string): string {
  const d = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(d / 60000);
  const h = Math.floor(d / 3600000);
  const day = Math.floor(d / 86400000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  if (h < 24) return `${h}h ago`;
  return `${day}d ago`;
}

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [loggedIn, setLoggedIn] = useState(false);
  const pulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    storage.getAccessToken().then(token => {
      if (!token) return;
      setLoggedIn(true);
      fetchCount();
    });
  }, []);

  useEffect(() => {
    if (unread > 0) {
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.3, duration: 200, useNativeDriver: true }),
        Animated.spring(pulse, { toValue: 1, useNativeDriver: true, bounciness: 10 }),
      ]).start();
    }
  }, [unread, pulse]);

  const fetchCount = async () => {
    try {
      const d = await notificationsApi.unreadCount();
      setUnread(d.count);
    } catch {}
  };

  const fetchNotifications = async () => {
    try {
      const data = await notificationsApi.list(20);
      setNotifications(data);
      setLoaded(true);
    } catch {}
  };

  const handleOpen = () => {
    setOpen(true);
    if (!loaded) fetchNotifications();
  };

  const markRead = async (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
    setUnread(prev => Math.max(0, prev - 1));
    notificationsApi.markRead(id).catch(() => {});
  };

  const markAllRead = async () => {
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    setUnread(0);
    notificationsApi.markAllRead().catch(() => {});
  };

  if (!loggedIn) return null;

  return (
    <>
      <TouchableOpacity onPress={handleOpen} style={styles.bellBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
        <Animated.View style={{ transform: [{ scale: pulse }] }}>
          <Ionicons name="notifications-outline" size={22} color="rgba(255,255,255,0.85)" />
        </Animated.View>
        {unread > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{unread > 9 ? '9+' : unread}</Text>
          </View>
        )}
      </TouchableOpacity>

      <Modal visible={open} transparent animationType="none" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.overlay} onPress={() => setOpen(false)}>
          <Pressable style={styles.sheet} onPress={e => e.stopPropagation()}>
            {/* Handle */}
            <View style={styles.handle} />

            {/* Header */}
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Notifications</Text>
              {unread > 0 && (
                <TouchableOpacity onPress={markAllRead}>
                  <Text style={styles.markAll}>Mark all read</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* List */}
            <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
              {!loaded ? (
                <View style={styles.loadingCenter}>
                  <Ionicons name="notifications-outline" size={36} color="#e5e7eb" />
                  <Text style={styles.emptyText}>Loading...</Text>
                </View>
              ) : notifications.length === 0 ? (
                <View style={styles.loadingCenter}>
                  <Ionicons name="notifications-off-outline" size={48} color="#e5e7eb" />
                  <Text style={styles.emptyTitle}>No notifications yet</Text>
                  <Text style={styles.emptyText}>Activity on your listings will appear here.</Text>
                </View>
              ) : (
                notifications.map(n => (
                  <TouchableOpacity
                    key={n.id}
                    style={[styles.notifRow, !n.is_read && styles.notifUnread]}
                    onPress={() => markRead(n.id)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.notifIcon}>{TYPE_ICON[n.type] ?? '📣'}</Text>
                    <View style={styles.notifContent}>
                      <Text style={[styles.notifTitle, !n.is_read && { fontWeight: '700' }]} numberOfLines={2}>
                        {n.title}
                      </Text>
                      {n.body && <Text style={styles.notifBody} numberOfLines={1}>{n.body}</Text>}
                      <Text style={styles.notifTime}>{timeAgo(n.created_at)}</Text>
                    </View>
                    {!n.is_read && <View style={styles.unreadDot} />}
                  </TouchableOpacity>
                ))
              )}
              <View style={{ height: 32 }} />
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  bellBtn: { position: 'relative', padding: 4 },
  badge: {
    position: 'absolute', top: 0, right: 0,
    minWidth: 16, height: 16, borderRadius: 8,
    backgroundColor: '#ef4444',
    alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 3,
  },
  badgeText: { color: 'white', fontSize: 9, fontWeight: '800' },

  overlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: 'white', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    maxHeight: '75%', paddingBottom: 0,
    shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 20,
    shadowOffset: { width: 0, height: -6 }, elevation: 20,
  },
  handle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: '#e5e7eb', alignSelf: 'center', marginTop: 10, marginBottom: 4,
  },
  sheetHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: '#f3f4f6',
  },
  sheetTitle: { fontSize: 17, fontWeight: '800', color: '#111827' },
  markAll: { fontSize: 13, color: '#f97316', fontWeight: '600' },

  list: { paddingHorizontal: 0 },
  loadingCenter: { alignItems: 'center', paddingVertical: 48, gap: 10 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: '#374151' },
  emptyText: { fontSize: 13, color: '#9ca3af', textAlign: 'center' },

  notifRow: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 12,
    paddingHorizontal: 20, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: '#f9fafb',
  },
  notifUnread: { backgroundColor: '#fff7ed' },
  notifIcon: { fontSize: 22, marginTop: 2 },
  notifContent: { flex: 1 },
  notifTitle: { fontSize: 14, color: '#1f2937', lineHeight: 20 },
  notifBody: { fontSize: 12, color: '#6b7280', marginTop: 2, lineHeight: 16 },
  notifTime: { fontSize: 11, color: '#9ca3af', marginTop: 4 },
  unreadDot: {
    width: 8, height: 8, borderRadius: 4,
    backgroundColor: '#f97316', marginTop: 6,
  },
});
