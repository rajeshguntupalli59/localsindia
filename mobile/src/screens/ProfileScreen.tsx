import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert, Image } from 'react-native';
import { useState, useEffect } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { authApi } from '../lib/api';
import { storage } from '../lib/storage';

export default function ProfileScreen({ navigation }: any) {
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    storage.getUser().then(u => setUser(u));
  }, []);

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
          {/* Avatar */}
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
          </View>

          {/* Menu */}
          <View style={styles.menuSection}>
            <MenuItem
              icon="list-outline"
              label="My Listings"
              onPress={() => navigation.navigate('Search', { citySlug: 'hyderabad', cityName: 'Hyderabad' })}
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
              icon="location-outline"
              label="Change City"
              onPress={() => navigation.navigate('CityPicker', { onSelect: () => {} })}
            />
          </View>

          <View style={[styles.menuSection, { marginTop: 8 }]}>
            <MenuItem
              icon="log-out-outline"
              label="Log out"
              onPress={handleLogout}
              danger
            />
          </View>
        </>
      ) : (
        <View style={styles.loggedOut}>
          <Ionicons name="person-circle-outline" size={80} color="#e5e7eb" />
          <Text style={styles.loggedOutTitle}>You're not logged in</Text>
          <Text style={styles.loggedOutText}>Log in to post listings, save items, and more.</Text>
          <TouchableOpacity
            style={styles.loginBtn}
            onPress={() => navigation.navigate('Login')}
          >
            <Text style={styles.loginBtnText}>Sign in with Phone OTP</Text>
          </TouchableOpacity>
        </View>
      )}

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
  avatarSection: { alignItems: 'center', backgroundColor: 'white', paddingVertical: 24 },
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
  loggedOut: { alignItems: 'center', paddingTop: 80, paddingHorizontal: 32 },
  loggedOutTitle: { fontSize: 20, fontWeight: 'bold', color: '#374151', marginTop: 16, marginBottom: 8 },
  loggedOutText: { fontSize: 14, color: '#9ca3af', textAlign: 'center', lineHeight: 20, marginBottom: 28 },
  loginBtn: { backgroundColor: '#25d366', borderRadius: 12, paddingHorizontal: 28, paddingVertical: 14 },
  loginBtnText: { color: 'white', fontWeight: '700', fontSize: 16 },
});
