import { useState, useRef, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import MapView, { Marker, type Region } from 'react-native-maps';
import * as Location from 'expo-location';
import { getApproxLocation } from '../lib/location';

const DEFAULT_REGION: Region = {
  // India-wide fallback, low zoom — only used until GPS resolves (or if
  // permission is denied), so this screen never needs a caller to have
  // already fetched a location before opening it.
  latitude: 20.5,
  longitude: 78.9,
  latitudeDelta: 12,
  longitudeDelta: 12,
};

const ZOOMED_DELTA = { latitudeDelta: 0.02, longitudeDelta: 0.02 };

interface ConfirmResult {
  latitude: number;
  longitude: number;
  areaGuess: string | null;
  cityGuess: string | null;
}

export default function MapPinPickerScreen({ navigation, route }: any) {
  const insets = useSafeAreaInsets();
  const onConfirm: (result: ConfirmResult) => void = route.params?.onConfirm;
  const initialRegion: Region | undefined = route.params?.initialRegion;

  const mapRef = useRef<MapView>(null);
  const areaEditedRef = useRef(false);
  const cityGuessRef = useRef<string | null>(null);
  const [coords, setCoords] = useState({
    latitude: (initialRegion ?? DEFAULT_REGION).latitude,
    longitude: (initialRegion ?? DEFAULT_REGION).longitude,
  });
  const [areaText, setAreaText] = useState('');
  const [geocoding, setGeocoding] = useState(false);
  const [locatingGps, setLocatingGps] = useState(!initialRegion);

  const refreshAreaGuess = async (point: { latitude: number; longitude: number }) => {
    if (areaEditedRef.current) return;
    setGeocoding(true);
    try {
      const results = await Location.reverseGeocodeAsync(point);
      const place = results[0];
      const guess = place?.district || place?.subregion || place?.name || null;
      cityGuessRef.current = place?.city || place?.subregion || null;
      if (guess && !areaEditedRef.current) setAreaText(guess);
    } catch {
      // Nice-to-have suggestion only — the pin itself is already precise.
    } finally {
      setGeocoding(false);
    }
  };

  // No location known yet (e.g. this is the very first thing the user taps,
  // before any GPS fix exists) — try GPS ourselves instead of leaving the
  // user stuck on an India-wide default view.
  useEffect(() => {
    if (initialRegion) {
      refreshAreaGuess(coords);
      return;
    }
    (async () => {
      const gps = await getApproxLocation();
      setLocatingGps(false);
      if (!gps) return;
      setCoords(gps);
      mapRef.current?.animateToRegion({ ...gps, ...ZOOMED_DELTA }, 400);
      refreshAreaGuess(gps);
    })();
  }, []);

  const handlePinMoved = (point: { latitude: number; longitude: number }) => {
    setCoords(point);
    refreshAreaGuess(point);
  };

  const handleConfirm = () => {
    onConfirm({ ...coords, areaGuess: areaText.trim() || null, cityGuess: cityGuessRef.current });
    navigation.goBack();
  };

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityRole="button"
          accessibilityLabel="Cancel"
        >
          <Ionicons name="close" size={24} color="#1f2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Confirm your location</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.mapWrap}>
        <MapView
          ref={mapRef}
          style={styles.map}
          initialRegion={initialRegion ?? DEFAULT_REGION}
          onPress={e => handlePinMoved(e.nativeEvent.coordinate)}
        >
          <Marker
            coordinate={coords}
            draggable
            onDragEnd={e => handlePinMoved(e.nativeEvent.coordinate)}
          />
        </MapView>
        {locatingGps && (
          <View style={styles.locatingOverlay} pointerEvents="none">
            <ActivityIndicator color="#f97316" />
            <Text style={styles.locatingText}>Finding your location…</Text>
          </View>
        )}
      </View>

      <Text style={styles.hint}>Drag the pin or tap the map to set your exact spot.</Text>

      <View style={styles.areaRow}>
        <Ionicons name="location-outline" size={16} color="#6b7280" />
        <TextInput
          style={styles.areaInput}
          value={areaText}
          onChangeText={t => { areaEditedRef.current = true; setAreaText(t); }}
          placeholder="Village, town, or area name"
          placeholderTextColor="#9ca3af"
        />
        {geocoding && <ActivityIndicator size="small" color="#9ca3af" />}
      </View>

      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 20) }]}>
        <TouchableOpacity
          style={styles.confirmBtn}
          onPress={handleConfirm}
          activeOpacity={0.85}
        >
          <Text style={styles.confirmBtnText}>Confirm location</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'white' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingBottom: 12,
    borderBottomWidth: 1, borderBottomColor: '#f3f4f6',
  },
  headerTitle: { fontSize: 15, fontWeight: '700', color: '#1f2937', flex: 1, textAlign: 'center' },
  mapWrap: { flex: 1 },
  map: { flex: 1 },
  locatingOverlay: {
    position: 'absolute', top: 16, alignSelf: 'center',
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: 'white', paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: 20, shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 }, elevation: 4,
  },
  locatingText: { fontSize: 12.5, color: '#374151', fontWeight: '600' },
  hint: { textAlign: 'center', color: '#9ca3af', fontSize: 12, paddingTop: 10 },
  areaRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 16, paddingVertical: 10,
  },
  areaInput: { flex: 1, fontSize: 14, color: '#1f2937', paddingVertical: 4 },
  footer: {
    paddingHorizontal: 20, paddingTop: 4,
    borderTopWidth: 1, borderTopColor: '#f3f4f6',
  },
  confirmBtn: {
    backgroundColor: '#f97316', borderRadius: 14, paddingVertical: 15, alignItems: 'center',
    shadowColor: '#f97316', shadowOpacity: 0.4, shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 }, elevation: 6,
  },
  confirmBtnText: { color: 'white', fontWeight: '800', fontSize: 15 },
});
