import { useState, useEffect, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Modal, Pressable,
  ScrollView, Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { preferencesApi } from '../lib/api';
import { storage } from '../lib/storage';

const ONBOARDING_KEY = 'li_onboarding_done';

const INTERESTS: { id: string; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { id: 'jobs', label: 'Jobs', icon: 'briefcase-outline' },
  { id: 'pg', label: 'PG / Room', icon: 'home-outline' },
  { id: 'vehicles', label: 'Vehicles', icon: 'car-outline' },
  { id: 'electronics', label: 'Electronics', icon: 'phone-portrait-outline' },
  { id: 'services', label: 'Services', icon: 'build-outline' },
  { id: 'other', label: 'Other', icon: 'ellipsis-horizontal-outline' },
];

export default function AlertOnboardingSheet() {
  const insets = useSafeAreaInsets();
  const [visible, setVisible] = useState(false);
  const [interests, setInterests] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const slideAnim = useRef(new Animated.Value(400)).current;

  useEffect(() => {
    checkOnboarding();
  }, []);

  const checkOnboarding = async () => {
    const token = await storage.getAccessToken();
    if (!token) return;
    const done = await AsyncStorage.getItem(ONBOARDING_KEY);
    if (done) return;
    // Delay 1.5s after app load before showing
    setTimeout(() => {
      setVisible(true);
      Animated.spring(slideAnim, {
        toValue: 0, useNativeDriver: true, bounciness: 4, speed: 14,
      }).start();
    }, 1500);
  };

  const toggleInterest = (id: string) => {
    setInterests(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await preferencesApi.upsert({
        interests,
        onboarding_done: true,
      });
    } catch {}
    await AsyncStorage.setItem(ONBOARDING_KEY, '1');
    dismiss();
  };

  const dismiss = () => {
    Animated.timing(slideAnim, {
      toValue: 600, duration: 260, useNativeDriver: true,
    }).start(() => setVisible(false));
  };

  if (!visible) return null;

  return (
    <Modal visible transparent animationType="none" onRequestClose={dismiss}>
      <Pressable style={styles.overlay} onPress={dismiss}>
        <Animated.View style={[styles.sheet, { transform: [{ translateY: slideAnim }] }]}>
          <Pressable onPress={e => e.stopPropagation()}>
            {/* Handle */}
            <View style={styles.handle} />

            {/* Header */}
            <View style={styles.sheetHeader}>
              <View>
                <Text style={styles.eyebrow}>Quick setup</Text>
                <Text style={styles.title}>What are you looking for?</Text>
                <Text style={styles.subtitle}>Personalise your feed in 30 seconds</Text>
              </View>
              <TouchableOpacity
                onPress={dismiss}
                style={styles.closeBtn}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                accessibilityRole="button"
                accessibilityLabel="Dismiss"
              >
                <Ionicons name="close" size={20} color="rgba(255,255,255,0.6)" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
              {/* Interests */}
              <Text style={styles.sectionLabel}>I'm looking for</Text>
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
                      <Ionicons name={item.icon} size={15} color={active ? '#ea580c' : '#6b7280'} />
                      <Text style={[styles.chipLabel, active && styles.chipLabelActive]}>
                        {item.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <View style={{ height: 16 }} />
            </ScrollView>

            {/* CTA */}
            <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 20) }]}>
              <TouchableOpacity
                style={[styles.saveBtn, saving && { opacity: 0.6 }]}
                onPress={handleSave}
                disabled={saving}
                activeOpacity={0.85}
                accessibilityRole="button"
                accessibilityLabel={interests.length > 0 ? 'Save preferences' : 'Skip for now'}
                accessibilityState={{ disabled: saving }}
              >
                <Text style={styles.saveBtnText}>
                  {saving ? 'Saving...' : interests.length > 0 ? 'Save preferences' : 'Skip for now'}
                </Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Animated.View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: 'white', borderTopLeftRadius: 28, borderTopRightRadius: 28,
    shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 24,
    shadowOffset: { width: 0, height: -8 }, elevation: 24,
  },
  handle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: '#e5e7eb', alignSelf: 'center', marginTop: 10,
  },
  sheetHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start',
    backgroundColor: '#0D0F1C', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 20, paddingTop: 16,
  },
  eyebrow: { fontSize: 10, fontWeight: '800', color: 'rgba(255,255,255,0.4)', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 4 },
  title: { fontSize: 20, fontWeight: '800', color: 'white', lineHeight: 26 },
  subtitle: { fontSize: 13, color: 'rgba(255,255,255,0.5)', marginTop: 4 },
  closeBtn: { padding: 4 },
  closeX: { color: 'rgba(255,255,255,0.4)', fontSize: 18, fontWeight: '300' },

  body: { paddingHorizontal: 20, paddingTop: 20, maxHeight: 320 },
  sectionLabel: { fontSize: 11, fontWeight: '700', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 },

  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    borderWidth: 2, borderColor: '#e5e7eb', borderRadius: 12,
    paddingHorizontal: 12, paddingVertical: 10, backgroundColor: 'white',
  },
  chipActive: { borderColor: '#f97316', backgroundColor: '#fff7ed' },
  chipEmoji: { fontSize: 16 },
  chipLabel: { fontSize: 13, fontWeight: '600', color: '#6b7280' },
  chipLabelActive: { color: '#ea580c' },

  footer: { padding: 20, paddingBottom: 36 },
  saveBtn: {
    backgroundColor: '#f97316', borderRadius: 14,
    paddingVertical: 15, alignItems: 'center',
    shadowColor: '#f97316', shadowOpacity: 0.4, shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 }, elevation: 6,
  },
  saveBtnText: { color: 'white', fontWeight: '800', fontSize: 15 },
});
