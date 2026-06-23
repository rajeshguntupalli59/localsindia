import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert, Image, Switch } from 'react-native';
import { useState, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { authApi } from '../lib/api';
import { storage } from '../lib/storage';
import { useSavedContext } from '../context/SavedContext';
import { isBiometricAvailable } from '../hooks/useBiometric';

export default function ProfileScreen({ navigation }: any) {
  const [user, setUser] = useState<any>(null);
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [listingCount, setListingCount] = useState(0);
  const { savedCount } = useSavedContext();

  useFocusEffect(useCallback(() => {
    storage.getUser().then(u => {
      if (!u) {
        navigation.replace('Login');
      } else {
        setUser(u);
      }
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
        text: 'Log out',
        style: 'destructive',
        onPress: async () => {
          await storage.clear();
          navigation.replace('Login');
        },
      },
    ]);
  };

  const initial = user?.name?.[0]?.toUpperCase() ?? user?.phone?.[3] ?? '?';

  const MenuItem = ({ icon, label, onPress, danger }: { icon: string; label: string; onPress: () => void; danger?: boolean }) => (
    <TouchableOpacity style={styles.menuItem} onPress={onPress}>
      <Ionicons name={icon as any} size={20} color={danger ? '#ef4444' : '#374151'} />
      <Text style={[styles.menuLabel, danger && styles.menuLabelDanger]}>{label}</Text>
      <Ionicons name="chevron-forward" size={16} color="#d1d5db" />
    </TouchableOpacity>
  );

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Profile</Text>
      </View>

      {user ? (
        <>
          {/* Avatar + stats */}
          <View style={styles.avatarSection}>
            {user.avatar_url ? (
              <Image source={{ uri: user.avatar_url }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarInitial}>{initial}</Text>
              </View>
            )}
            <Text style={styles.name}>{user.name ?? 'LocalsIndia User'}</Text>
            <Text style={styles.phone}>{user.phone}</Text>

            {/* Stats row */}
            <View style={styles.statsRow}>
              <TouchableOpacity style={styles.stat} onPress={() => navigation.navigate('Saved')}>
                <Text style={styles.statValue}>{savedCount}</Text>
                <Text style={styles.statLabel}>Saved</Text>
              </TouchableOpacity>
              <View style={styles.statDivider} />
              <TouchableOpacity style={styles.stat} onPress={() => navigation.navigate('MyListings')}>
                <Text style={styles.statValue}>{listingCount}</Text>
                <Text style={styles.statLabel}>Listed</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Menu */}
          <View style={styles.menuSection}>
            <MenuItem
              icon="list-outline"
              label="My Listings"
              onPress={() => navigation.navigate('MyListings')}
            />
            <MenuItem
              icon="heart-outline"
              label="Saved Listings"
              onPress={() => navigation.navigate('Saved')}
            />
            <MenuItem
              icon="person-outline"
              label="Edit Profile"
              onPress={() => Alert.alert('Coming soon', 'Profile editing coming soon.')}
            />
            <MenuItem
              icon="notifications-outline"
              label="Alerts & Preferences"
              onPress={() => navigation.navigate('AlertsPrefs')}
            />
            <MenuItem
              icon="location-outline"
              label="Change City"
              onPress={() => navigation.navigate('CityPicker', { onSelect: () => {} })}
            />
          </View>

          {biometricAvailable && (
            <View style={[styles.menuSection, { marginTop: 8 }]}>
              <View style={styles.menuItem}>
                <Ionicons name="finger-print-outline" size={20} color="#374151" />
                <Text style={[styles.menuLabel, { flex: 1 }]}>Biometric Login</Text>
                <Switch
                  value={biometricEnabled}
                  onValueChange={toggleBiometric}
                  trackColor={{ false: '#d1d5db', true: '#f97316' }}
                  thumbColor="white"
                />
              </View>
            </View>
          )}

          {user?.role === 'admin' && (
            <View style={[styles.menuSection, { marginTop: 8 }]}>
              <MenuItem
                icon="shield-checkmark-outline"
                label="Admin Panel"
                onPress={() => navigation.navigate('Admin')}
              />
            </View>
          )}

          <View style={[styles.menuSection, { marginTop: 8 }]}>
            <MenuItem
              icon="log-out-outline"
              label="Log out"
              onPress={handleLogout}
              danger
            />
          </View>
        </>
      ) : null}

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  header: {
    backgroundColor: 'white',
    paddingHorizontal: 16,
    paddingTop: 52,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#111827' },
  avatarSection: { alignItems: 'center', backgroundColor: 'white', paddingVertical: 24, paddingHorizontal: 16 },
  statsRow: {
    flexDirection: 'row', marginTop: 16, paddingTop: 16,
    borderTopWidth: 1, borderTopColor: '#f3f4f6',
    width: '80%', justifyContent: 'center', alignItems: 'center',
  },
  stat: { flex: 1, alignItems: 'center', paddingVertical: 4 },
  statValue: { fontSize: 22, fontWeight: '800', color: '#f97316' },
  statLabel: { fontSize: 12, color: '#9ca3af', marginTop: 2, fontWeight: '600' },
  statDivider: { width: 1, height: 36, backgroundColor: '#e5e7eb' },
  avatar: { width: 72, height: 72, borderRadius: 36, marginBottom: 10 },
  avatarPlaceholder: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#f97316',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  avatarInitial: { color: 'white', fontSize: 28, fontWeight: 'bold' },
  name: { fontSize: 18, fontWeight: 'bold', color: '#111827', marginBottom: 2 },
  phone: { fontSize: 13, color: '#9ca3af' },
  menuSection: { backgroundColor: 'white', marginTop: 12 },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f9fafb',
    gap: 12,
  },
  menuLabel: { flex: 1, fontSize: 15, color: '#374151' },
  menuLabelDanger: { color: '#ef4444' },
});
