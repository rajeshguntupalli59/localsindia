import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { authApi } from '../lib/api';
import { storage } from '../lib/storage';

export default function EditProfileScreen({ navigation, route }: any) {
  const insets = useSafeAreaInsets();
  const { user } = route.params ?? {};
  const [name, setName] = useState(user?.name ?? '');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (name.trim().length < 2) { Alert.alert('Name required', 'Enter at least 2 characters.'); return; }
    setSaving(true);
    try {
      const updated = await authApi.updateName(name.trim());
      await storage.setUser(updated);
      navigation.goBack();
    } catch {
      Alert.alert('Error', 'Could not save your name. Please try again.');
    } finally {
      setSaving(false);
    }
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
          <Ionicons name="arrow-back" size={24} color="#1f2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Edit Profile</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.body}>
        <Text style={styles.label}>Name</Text>
        <View style={styles.inputRow}>
          <Ionicons name="person-outline" size={18} color="#9ca3af" style={{ marginRight: 10 }} />
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="e.g. Rajesh Kumar"
            placeholderTextColor="#9ca3af"
            autoFocus
            maxLength={60}
          />
        </View>
        <Text style={styles.hint}>Shown to buyers on your listings</Text>

        {user?.phone && (
          <>
            <Text style={[styles.label, { marginTop: 20 }]}>Phone</Text>
            <View style={[styles.inputRow, styles.inputRowDisabled]}>
              <Ionicons name="call-outline" size={18} color="#9ca3af" style={{ marginRight: 10 }} />
              <Text style={styles.disabledText}>{user.phone}</Text>
            </View>
            <Text style={styles.hint}>Phone number can&apos;t be changed here</Text>
          </>
        )}

        <TouchableOpacity
          style={[styles.saveBtn, (saving || name.trim().length < 2) && styles.saveBtnDisabled]}
          onPress={handleSave}
          disabled={saving || name.trim().length < 2}
        >
          {saving ? <ActivityIndicator color="white" /> : <Text style={styles.saveBtnText}>Save changes</Text>}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingBottom: 12,
    backgroundColor: 'white', borderBottomWidth: 1, borderBottomColor: '#f3f4f6',
  },
  headerTitle: { fontSize: 17, fontWeight: '700', color: '#1f2937' },
  body: { padding: 20 },
  label: { fontSize: 13, fontWeight: '700', color: '#6b7280', marginBottom: 8 },
  inputRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'white', borderRadius: 12, borderWidth: 1, borderColor: '#e5e7eb',
    paddingHorizontal: 14,
  },
  inputRowDisabled: { backgroundColor: '#f3f4f6' },
  input: { flex: 1, fontSize: 16, paddingVertical: 14, color: '#1f2937' },
  disabledText: { flex: 1, fontSize: 16, paddingVertical: 14, color: '#9ca3af' },
  hint: { fontSize: 12, color: '#9ca3af', marginTop: 6 },
  saveBtn: {
    marginTop: 28, backgroundColor: '#f97316', borderRadius: 12,
    paddingVertical: 16, alignItems: 'center',
  },
  saveBtnDisabled: { opacity: 0.5 },
  saveBtnText: { color: 'white', fontSize: 16, fontWeight: '800' },
});
