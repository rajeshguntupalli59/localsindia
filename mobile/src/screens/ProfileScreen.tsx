import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Alert, Image, Switch,
} from 'react-native';
import { useState, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { authApi } from '../lib/api';
import { storage } from '../lib/storage';
import { unregisterCurrentDevicePushToken } from '../lib/pushNotifications';
import { useSavedContext } from '../context/SavedContext';
import { isBiometricAvailable } from '../hooks/useBiometric';
import { C, SHADOW, RADIUS } from '../lib/theme';

export default function ProfileScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const [user, setUser] = useState<any>(null);
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [listingCount, setListingCount] = useState(0);
  const { savedCount } = useSavedContext();

  useFocusEffect(useCallback(() => {
    storage.getUser().then(u => {
      if (!u) { navigation.replace('Login'); } else { setUser(u); }
    });
    storage.getBiometricEnabled().then(setBiometricEnabled);
    isBiometricAvailable().then(setBiometricAvailable);
    authApi.getMe().then(me => {
      if (me?.listing_count != null) setListingCount(me.listing_count);
    }).catch(() => {});
  }, [navigation]));

  const toggleBiometric = async (value: boolean) => {
    await storage.setBiometricEnabled(value);
    setBiometricEnabled(value);
  };

  const handleLogout = () => {
    Alert.alert('Log out', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Log out', style: 'destructive',
        onPress: async () => { await unregisterCurrentDevicePushToken(); await storage.clear(); navigation.replace('Login'); },
      },
    ]);
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete account',
      'This permanently deletes your account and hides all your listings. This cannot be undone. Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete', style: 'destructive',
          onPress: () => {
            Alert.alert(
              'Are you absolutely sure?',
              'Your name, phone number, and listings will be permanently removed.',
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Yes, delete my account', style: 'destructive',
                  onPress: async () => {
                    try {
                      await unregisterCurrentDevicePushToken();
                      await authApi.deleteAccount();
                    } catch {
                      Alert.alert('Error', 'Could not delete your account. Please try again.');
                      return;
                    }
                    await storage.clear();
                    navigation.replace('Login');
                  },
                },
              ],
            );
          },
        },
      ],
    );
  };

  const initial = user?.name?.[0]?.toUpperCase() ?? user?.phone?.[3] ?? '?';

  type MenuItemProps = {
    icon: string;
    label: string;
    onPress: () => void;
    danger?: boolean;
    badge?: number;
    right?: React.ReactNode;
  };

  const MenuItem = ({ icon, label, onPress, danger, badge, right }: MenuItemProps) => (
    <TouchableOpacity
      style={styles.menuItem}
      onPress={onPress}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={badge ? `${label}, ${badge}` : label}
    >
      <View style={[styles.menuIcon, danger && styles.menuIconDanger]}>
        <Ionicons name={icon as any} size={18} color={danger ? C.danger : C.text} />
      </View>
      <Text style={[styles.menuLabel, danger && styles.menuLabelDanger]}>{label}</Text>
      {badge != null && badge > 0 && (
        <View style={styles.menuBadge}>
          <Text style={styles.menuBadgeText}>{badge > 9 ? '9+' : badge}</Text>
        </View>
      )}
      {right ?? <Ionicons name="chevron-forward" size={16} color={C.textMuted} />}
    </TouchableOpacity>
  );

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>

      {/* ── Hero header ── */}
      <View style={[styles.heroHeader, { paddingTop: Math.max(insets.top, 16) + 40 }]}>
        {/* Glow blobs */}
        <View style={styles.glowTR} pointerEvents="none" />
        <View style={styles.glowBL} pointerEvents="none" />

        <Text style={styles.headerLabel}>My Profile</Text>

        {user && (
          <View style={styles.avatarBlock}>
            {user.avatar_url ? (
              <Image source={{ uri: user.avatar_url }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarInitial}>{initial}</Text>
              </View>
            )}
            {user?.role === 'admin' && (
              <View style={styles.adminBadge}>
                <Ionicons name="shield-checkmark" size={12} color="white" />
              </View>
            )}
            <Text style={styles.name}>{user.name ?? 'LocalsIndia User'}</Text>
            <Text style={styles.phone}>{user.phone}</Text>
          </View>
        )}
      </View>

      {/* ── Stats card ── */}
      {user && (
        <View style={styles.statsCard}>
          <TouchableOpacity
            style={styles.statItem}
            onPress={() => navigation.navigate('MyListings')}
            accessibilityRole="button"
            accessibilityLabel={`My Listings, ${listingCount}`}
          >
            <Text style={styles.statValue}>{listingCount}</Text>
            <Text style={styles.statLabel}>Listings</Text>
          </TouchableOpacity>
          <View style={styles.statDivider} />
          <TouchableOpacity
            style={styles.statItem}
            onPress={() => navigation.navigate('Saved')}
            accessibilityRole="button"
            accessibilityLabel={`Saved listings, ${savedCount}`}
          >
            <Text style={styles.statValue}>{savedCount}</Text>
            <Text style={styles.statLabel}>Saved</Text>
          </TouchableOpacity>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Ionicons name="star" size={20} color={C.orange} />
            <Text style={styles.statLabel}>
              {user.created_at
                ? `Since ${new Date(user.created_at).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}`
                : 'Member'}
            </Text>
          </View>
        </View>
      )}

      {/* ── Menu sections ── */}
      {user && (
        <>
          <View style={styles.menuSection}>
            <Text style={styles.sectionLabel}>LISTINGS</Text>
            <MenuItem icon="list-outline" label="My Listings" onPress={() => navigation.navigate('MyListings')} badge={listingCount} />
            <MenuItem icon="heart-outline" label="Saved Listings" onPress={() => navigation.navigate('Saved')} badge={savedCount} />
          </View>

          <View style={styles.menuSection}>
            <Text style={styles.sectionLabel}>ACCOUNT</Text>
            <MenuItem icon="person-outline" label="Edit Profile"
              onPress={() => navigation.navigate('EditProfile', { user })} />
            <MenuItem icon="notifications-outline" label="Alerts & Preferences"
              onPress={() => navigation.navigate('AlertsPrefs')} />
            <MenuItem icon="location-outline" label="Change City"
              onPress={() => navigation.navigate('CityPicker', { onSelect: () => {} })} />
          </View>

          {biometricAvailable && (
            <View style={styles.menuSection}>
              <Text style={styles.sectionLabel}>SECURITY</Text>
              <View style={styles.menuItem}>
                <View style={styles.menuIcon}>
                  <Ionicons name="finger-print-outline" size={18} color={C.text} />
                </View>
                <Text style={[styles.menuLabel, { flex: 1 }]}>Biometric Login</Text>
                <Switch
                  value={biometricEnabled}
                  onValueChange={toggleBiometric}
                  trackColor={{ false: C.border, true: C.orange }}
                  thumbColor="white"
                />
              </View>
            </View>
          )}

          {user?.role === 'admin' && (
            <View style={styles.menuSection}>
              <Text style={styles.sectionLabel}>ADMIN</Text>
              <MenuItem icon="shield-checkmark-outline" label="Admin Panel"
                onPress={() => navigation.navigate('Admin')} />
            </View>
          )}

          <View style={styles.menuSection}>
            <MenuItem icon="log-out-outline" label="Log out" onPress={handleLogout} danger />
          </View>

          <View style={[styles.menuSection, { marginBottom: 32 }]}>
            <MenuItem icon="trash-outline" label="Delete account" onPress={handleDeleteAccount} danger />
          </View>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.pageBg },

  // Hero
  heroHeader: {
    backgroundColor: C.navBg,
    paddingHorizontal: 20,
    paddingBottom: 56,
    overflow: 'hidden',
    position: 'relative',
  },
  glowTR: {
    position: 'absolute', top: -60, right: -60,
    width: 220, height: 220, borderRadius: 110,
    backgroundColor: C.orange, opacity: 0.10,
  },
  glowBL: {
    position: 'absolute', bottom: -40, left: -40,
    width: 160, height: 160, borderRadius: 80,
    backgroundColor: '#6366f1', opacity: 0.07,
  },
  headerLabel: {
    fontSize: 13, fontWeight: '700', color: 'rgba(255,255,255,0.4)',
    letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 20,
  },
  avatarBlock: { alignItems: 'center' },
  avatar: { width: 86, height: 86, borderRadius: 43, borderWidth: 3, borderColor: C.orange, marginBottom: 12 },
  avatarPlaceholder: {
    width: 86, height: 86, borderRadius: 43,
    backgroundColor: C.orange, alignItems: 'center', justifyContent: 'center',
    borderWidth: 3, borderColor: 'rgba(247,146,30,0.4)', marginBottom: 12,
    ...SHADOW.orange,
  },
  avatarInitial: { color: 'white', fontSize: 34, fontWeight: '900' },
  adminBadge: {
    position: 'absolute', top: 60, right: -4,
    width: 24, height: 24, borderRadius: 12,
    backgroundColor: C.orange, alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: C.navBg,
  },
  name: { fontSize: 20, fontWeight: '800', color: 'white', letterSpacing: -0.3, marginBottom: 4 },
  phone: { fontSize: 13, color: 'rgba(255,255,255,0.5)' },

  // Stats card — overlaps hero
  statsCard: {
    flexDirection: 'row',
    backgroundColor: C.surface,
    marginHorizontal: 20,
    marginTop: -24,
    borderRadius: RADIUS.lg,
    paddingVertical: 18,
    ...SHADOW.elevated,
    marginBottom: 20,
  },
  statItem: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: 22, fontWeight: '900', color: C.orange, marginBottom: 3 },
  statLabel: { fontSize: 11, color: C.textMuted, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  statDivider: { width: 1, backgroundColor: C.border, marginVertical: 6 },

  // Menu
  menuSection: {
    backgroundColor: C.surface,
    marginHorizontal: 20,
    borderRadius: RADIUS.lg,
    marginBottom: 12,
    overflow: 'hidden',
    ...SHADOW.card,
  },
  sectionLabel: {
    fontSize: 11, fontWeight: '700', color: C.textMuted, letterSpacing: 1.2,
    paddingHorizontal: 16, paddingTop: 14, paddingBottom: 4,
  },
  menuItem: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 14,
    borderTopWidth: 1, borderTopColor: C.divider,
    gap: 12,
  },
  menuIcon: {
    width: 34, height: 34, borderRadius: 10,
    backgroundColor: C.pageBg, alignItems: 'center', justifyContent: 'center',
  },
  menuIconDanger: { backgroundColor: '#FFF5F5' },
  menuLabel: { flex: 1, fontSize: 15, color: C.text, fontWeight: '500' },
  menuLabelDanger: { color: C.danger },
  menuBadge: {
    backgroundColor: C.orange, borderRadius: RADIUS.pill,
    minWidth: 20, height: 20, alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 5, marginRight: 4,
  },
  menuBadgeText: { color: 'white', fontSize: 10, fontWeight: '800' },
});
