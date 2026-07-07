import { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { preferencesApi } from '../lib/api';

const INTERESTS: { id: string; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { id: 'jobs', label: 'Jobs', icon: 'briefcase-outline' },
  { id: 'pg', label: 'PG / Room', icon: 'home-outline' },
  { id: 'vehicles', label: 'Vehicles', icon: 'car-outline' },
  { id: 'electronics', label: 'Electronics', icon: 'phone-portrait-outline' },
  { id: 'services', label: 'Services', icon: 'build-outline' },
  { id: 'other', label: 'Other', icon: 'ellipsis-horizontal-outline' },
];

const ALERT_FREQ = [
  { id: 'daily', label: 'Daily digest', desc: 'Get a summary every morning' },
  { id: 'weekly', label: 'Weekly digest', desc: 'One email per week' },
  { id: 'never', label: 'No emails', desc: 'In-app notifications only' },
];

export default function AlertsPrefsScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const [interests, setInterests] = useState<string[]>([]);
  const [alertFreq, setAlertFreq] = useState('weekly');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    preferencesApi.get()
      .then(prefs => {
        if (prefs) {
          setInterests(prefs.interests ?? []);
          setAlertFreq(prefs.alert_frequency ?? 'weekly');
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const toggleInterest = (id: string) => {
    setInterests(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await preferencesApi.upsert({ interests, alert_frequency: alertFreq, onboarding_done: true });
      Alert.alert('Saved!', 'Your preferences have been updated.');
      navigation.goBack();
    } catch {
      Alert.alert('Error', 'Could not save preferences. Try again.');
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
        <Text style={styles.headerTitle}>Alerts & Preferences</Text>
        <View style={{ width: 24 }} />
      </View>

      {loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color="#f97316" size="large" />
      ) : (
        <ScrollView contentContainerStyle={styles.body}>
          {/* Interests */}
          <Text style={styles.sectionTitle}>I'm looking for</Text>
          <Text style={styles.sectionSub}>We'll show relevant listings first</Text>
          <View style={styles.grid}>
            {INTERESTS.map(item => {
              const active = interests.includes(item.id);
              return (
                <TouchableOpacity
                  key={item.id}
                  style={[styles.chip, active && styles.chipActive]}
                  onPress={() => toggleInterest(item.id)}
                  activeOpacity={0.75}
                  accessibilityRole="button"
                  accessibilityLabel={item.label}
                  accessibilityState={{ selected: active }}
                >
                  <Ionicons name={item.icon} size={16} color={active ? '#ea580c' : '#6b7280'} />
                  <Text style={[styles.chipLabel, active && styles.chipLabelActive]}>
                    {item.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Email frequency */}
          <Text style={[styles.sectionTitle, { marginTop: 28 }]}>Email alerts</Text>
          <Text style={styles.sectionSub}>How often should we send you listing updates?</Text>
          {ALERT_FREQ.map(f => (
            <TouchableOpacity
              key={f.id}
              style={[styles.freqCard, alertFreq === f.id && styles.freqCardActive]}
              onPress={() => setAlertFreq(f.id)}
              activeOpacity={0.8}
              accessibilityRole="radio"
              accessibilityLabel={`${f.label}, ${f.desc}`}
              accessibilityState={{ checked: alertFreq === f.id }}
            >
              <View style={[styles.radio, alertFreq === f.id && styles.radioActive]}>
                {alertFreq === f.id && <View style={styles.radioDot} />}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.freqLabel, alertFreq === f.id && { color: '#ea580c', fontWeight: '700' }]}>
                  {f.label}
                </Text>
                <Text style={styles.freqDesc}>{f.desc}</Text>
              </View>
            </TouchableOpacity>
          ))}

          <View style={{ height: 100 }} />
        </ScrollView>
      )}

      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 20) }]}>
        <TouchableOpacity
          style={[styles.saveBtn, saving && { opacity: 0.6 }]}
          onPress={handleSave}
          disabled={saving}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel="Save preferences"
          accessibilityState={{ disabled: saving }}
        >
          {saving ? <ActivityIndicator color="white" /> : <Text style={styles.saveBtnText}>Save preferences</Text>}
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
  sectionTitle: { fontSize: 16, fontWeight: '800', color: '#1f2937', marginBottom: 4 },
  sectionSub: { fontSize: 13, color: '#9ca3af', marginBottom: 16 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    borderWidth: 2, borderColor: '#e5e7eb', borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 10,
  },
  chipActive: { borderColor: '#f97316', backgroundColor: '#fff7ed' },
  chipEmoji: { fontSize: 18 },
  chipLabel: { fontSize: 14, fontWeight: '600', color: '#6b7280' },
  chipLabelActive: { color: '#ea580c' },
  freqCard: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: 'white', borderRadius: 14, padding: 16, marginBottom: 10,
    borderWidth: 2, borderColor: '#e5e7eb',
  },
  freqCardActive: { borderColor: '#f97316', backgroundColor: '#fff7ed' },
  radio: {
    width: 22, height: 22, borderRadius: 11, borderWidth: 2,
    borderColor: '#d1d5db', alignItems: 'center', justifyContent: 'center',
  },
  radioActive: { borderColor: '#f97316' },
  radioDot: { width: 11, height: 11, borderRadius: 6, backgroundColor: '#f97316' },
  freqLabel: { fontSize: 15, fontWeight: '600', color: '#374151' },
  freqDesc: { fontSize: 12, color: '#9ca3af', marginTop: 2 },
  footer: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: 'white', padding: 20, paddingBottom: 36,
    borderTopWidth: 1, borderTopColor: '#f3f4f6',
  },
  saveBtn: {
    backgroundColor: '#f97316', borderRadius: 14, paddingVertical: 15,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#f97316', shadowOpacity: 0.4, shadowRadius: 10, elevation: 5,
  },
  saveBtnText: { color: 'white', fontWeight: '800', fontSize: 15 },
});
