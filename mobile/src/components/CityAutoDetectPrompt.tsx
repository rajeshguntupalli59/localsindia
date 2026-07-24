import { useState, useEffect, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Modal, Pressable,
  Animated, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { citiesApi } from '../lib/api';
import { storage } from '../lib/storage';
import { getApproxLocationWithArea, matchCityByName } from '../lib/location';

const AUTODETECT_KEY = 'li_city_autodetect_done';

interface City { slug: string; name: string }

interface Props {
  navigation: any;
  onCitySelected: (city: City) => void;
}

/**
 * One-time "let us find your city?" prompt shown on first app open — replaces
 * silently defaulting to Hyderabad. Mirrors AlertOnboardingSheet's bottom-sheet
 * shape, but checked regardless of login state (city applies to guests too).
 */
export default function CityAutoDetectPrompt({ navigation, onCitySelected }: Props) {
  const insets = useSafeAreaInsets();
  const [visible, setVisible] = useState(false);
  const [locating, setLocating] = useState(false);
  const slideAnim = useRef(new Animated.Value(400)).current;

  useEffect(() => {
    checkAutoDetect();
  }, []);

  const checkAutoDetect = async () => {
    const done = await AsyncStorage.getItem(AUTODETECT_KEY);
    if (done) return;

    const saved = await storage.getCity();
    if (saved) {
      // Already has a city from some other path — never show, mark done.
      await AsyncStorage.setItem(AUTODETECT_KEY, '1');
      return;
    }

    setTimeout(() => {
      setVisible(true);
      Animated.spring(slideAnim, {
        toValue: 0, useNativeDriver: true, bounciness: 4, speed: 14,
      }).start();
    }, 1200);
  };

  // Always set the flag, on every dismissal path — tap-outside included —
  // so this genuinely never re-prompts once resolved one way or another.
  const dismiss = (after?: () => void) => {
    AsyncStorage.setItem(AUTODETECT_KEY, '1');
    Animated.timing(slideAnim, {
      toValue: 600, duration: 260, useNativeDriver: true,
    }).start(() => {
      setVisible(false);
      after?.();
    });
  };

  const handleAllow = async () => {
    setLocating(true);
    const loc = await getApproxLocationWithArea();
    setLocating(false);

    const openPicker = () => navigation.navigate('CityPicker', { onSelect: onCitySelected });

    if (!loc?.cityGuess) {
      dismiss(openPicker);
      return;
    }
    const cities: City[] = await citiesApi.list().catch(() => []);
    const match = matchCityByName(cities, loc.cityGuess);
    if (match) {
      onCitySelected(match);
      dismiss();
    } else {
      dismiss(openPicker);
    }
  };

  if (!visible) return null;

  return (
    <Modal visible transparent animationType="none" onRequestClose={() => dismiss()}>
      <Pressable style={styles.overlay} onPress={() => dismiss()}>
        <Animated.View style={[styles.sheet, { transform: [{ translateY: slideAnim }] }]}>
          <Pressable onPress={e => e.stopPropagation()}>
            <View style={styles.handle} />

            <View style={styles.sheetHeader}>
              <Ionicons name="navigate" size={22} color="#F7921E" />
              <Text style={styles.title}>Let LocalsIndia find your city?</Text>
              <Text style={styles.subtitle}>We'll use your location just once to set your city.</Text>
            </View>

            <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 20) }]}>
              <TouchableOpacity
                style={[styles.allowBtn, locating && { opacity: 0.7 }]}
                onPress={handleAllow}
                disabled={locating}
                activeOpacity={0.85}
                accessibilityRole="button"
                accessibilityLabel="Allow location access"
              >
                {locating
                  ? <ActivityIndicator color="white" />
                  : <Text style={styles.allowBtnText}>Allow</Text>}
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => dismiss()}
                disabled={locating}
                style={styles.notNowBtn}
                accessibilityRole="button"
                accessibilityLabel="Not now"
              >
                <Text style={styles.notNowText}>Not now</Text>
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
    backgroundColor: '#0D0F1C', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 20, paddingTop: 16, gap: 6,
  },
  title: { fontSize: 18, fontWeight: '800', color: 'white', lineHeight: 24, marginTop: 4 },
  subtitle: { fontSize: 13, color: 'rgba(255,255,255,0.5)' },

  footer: { padding: 20, paddingBottom: 36, gap: 10 },
  allowBtn: {
    backgroundColor: '#f97316', borderRadius: 14,
    paddingVertical: 15, alignItems: 'center',
    shadowColor: '#f97316', shadowOpacity: 0.4, shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 }, elevation: 6,
  },
  allowBtnText: { color: 'white', fontWeight: '800', fontSize: 15 },
  notNowBtn: { paddingVertical: 10, alignItems: 'center' },
  notNowText: { color: '#9ca3af', fontWeight: '600', fontSize: 13 },
});
