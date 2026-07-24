import { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import MapView, { Marker, type Region } from 'react-native-maps';
import * as Location from 'expo-location';

const DEFAULT_REGION: Region = {
  // India-wide fallback, low zoom
  latitude: 20.5,
  longitude: 78.9,
  latitudeDelta: 12,
  longitudeDelta: 12,
};

interface ConfirmResult {
  latitude: number;
  longitude: number;
  areaGuess: string | null;
}

export default function MapPinPickerScreen({ navigation, route }: any) {
  const insets = useSafeAreaInsets();
  const onConfirm: (result: ConfirmResult) => void = route.params?.onConfirm;
  const initialRegion: Region | undefined = route.params?.initialRegion;

  const [region] = useState<Region>(initialRegion ?? DEFAULT_REGION);
  const [coords, setCoords] = useState({
    latitude: (initialRegion ?? DEFAULT_REGION).latitude,
    longitude: (initialRegion ?? DEFAULT_REGION).longitude,
  });
  const [confirming, setConfirming] = useState(false);

  const handleConfirm = async () => {
    setConfirming(true);
    let areaGuess: string | null = null;
    try {
      const results = await Location.reverseGeocodeAsync(coords);
      const place = results[0];
      areaGuess = place?.district || place?.subregion || place?.name || null;
    } catch {
      // Reverse geocoding is a nice-to-have — the pin itself is already precise.
    }
    setConfirming(false);
    onConfirm({ ...coords, areaGuess });
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
        <Text style={styles.headerTitle}>Drop a pin at your exact location</Text>
        <View style={{ width: 24 }} />
      </View>

      <MapView
        style={styles.map}
        initialRegion={region}
        onPress={e => setCoords(e.nativeEvent.coordinate)}
      >
        <Marker
          coordinate={coords}
          draggable
          onDragEnd={e => setCoords(e.nativeEvent.coordinate)}
        />
      </MapView>

      <Text style={styles.hint}>Drag the pin or tap the map to set your exact spot.</Text>

      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 20) }]}>
        <TouchableOpacity
          style={[styles.confirmBtn, confirming && { opacity: 0.7 }]}
          onPress={handleConfirm}
          disabled={confirming}
          activeOpacity={0.85}
        >
          <Text style={styles.confirmBtnText}>{confirming ? 'Saving…' : 'Use this location'}</Text>
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
  map: { flex: 1 },
  hint: { textAlign: 'center', color: '#9ca3af', fontSize: 12, paddingVertical: 10 },
  footer: {
    paddingHorizontal: 20, paddingTop: 12,
    borderTopWidth: 1, borderTopColor: '#f3f4f6',
  },
  confirmBtn: {
    backgroundColor: '#f97316', borderRadius: 14, paddingVertical: 15, alignItems: 'center',
    shadowColor: '#f97316', shadowOpacity: 0.4, shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 }, elevation: 6,
  },
  confirmBtnText: { color: 'white', fontWeight: '800', fontSize: 15 },
});
