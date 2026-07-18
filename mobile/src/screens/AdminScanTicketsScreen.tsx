import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { adminApi } from '../lib/api';

type ScanResult =
  | { kind: 'valid'; eventTitle: string; attendeeName: string | null }
  | { kind: 'error'; message: string };

export default function AdminScanTicketsScreen({ navigation }: any) {
  const [token, setToken] = useState('');
  const [checking, setChecking] = useState(false);
  const [result, setResult] = useState<ScanResult | null>(null);

  const checkIn = async () => {
    const trimmed = token.trim();
    if (!trimmed) return;
    setChecking(true);
    setResult(null);
    try {
      const data = await adminApi.scanTicket(trimmed);
      setResult({ kind: 'valid', eventTitle: data.event_title, attendeeName: data.attendee_name });
      setToken('');
    } catch (err: any) {
      setResult({ kind: 'error', message: err?.response?.data?.detail ?? 'Scan failed' });
    } finally {
      setChecking(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Ionicons name="arrow-back" size={24} color="#1f2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Scan Tickets</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.body}>
        <Text style={styles.hint}>
          Ask the attendee to show their ticket QR code, then type or paste the code below to check them in.
        </Text>

        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            value={token}
            onChangeText={setToken}
            placeholder="Ticket code"
            autoCapitalize="none"
            autoCorrect={false}
          />
          <TouchableOpacity
            style={[styles.checkInBtn, checking && { opacity: 0.6 }]}
            onPress={checkIn}
            disabled={checking}
          >
            {checking ? <ActivityIndicator color="white" size="small" /> : (
              <Text style={styles.checkInBtnText}>Check In</Text>
            )}
          </TouchableOpacity>
        </View>

        {result && (
          <View style={[styles.resultCard, result.kind === 'valid' ? styles.resultValid : styles.resultError]}>
            <Ionicons
              name={result.kind === 'valid' ? 'checkmark-circle' : 'close-circle'}
              size={20}
              color={result.kind === 'valid' ? '#16a34a' : '#dc2626'}
            />
            <View style={{ flex: 1 }}>
              {result.kind === 'valid' ? (
                <>
                  <Text style={styles.resultTitle}>Checked in</Text>
                  <Text style={styles.resultDesc}>{result.attendeeName ?? 'Attendee'} — {result.eventTitle}</Text>
                </>
              ) : (
                <>
                  <Text style={[styles.resultTitle, { color: '#991b1b' }]}>Not valid</Text>
                  <Text style={[styles.resultDesc, { color: '#b91c1c' }]}>{result.message}</Text>
                </>
              )}
            </View>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 14, backgroundColor: 'white',
    borderBottomWidth: 1, borderBottomColor: '#f1f5f9',
  },
  headerTitle: { fontSize: 17, fontWeight: '700', color: '#1f2937' },
  body: { padding: 20 },
  hint: { fontSize: 13, color: '#6b7280', marginBottom: 16, lineHeight: 19 },
  inputRow: { flexDirection: 'row', gap: 8 },
  input: {
    flex: 1, backgroundColor: 'white', borderRadius: 12, borderWidth: 1, borderColor: '#e5e7eb',
    paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, color: '#1f2937',
  },
  checkInBtn: {
    backgroundColor: '#111827', borderRadius: 12, paddingHorizontal: 18,
    alignItems: 'center', justifyContent: 'center',
  },
  checkInBtnText: { color: 'white', fontWeight: '700', fontSize: 14 },
  resultCard: {
    flexDirection: 'row', gap: 10, alignItems: 'flex-start',
    borderRadius: 14, padding: 14, marginTop: 20, borderWidth: 1,
  },
  resultValid: { backgroundColor: '#f0fdf4', borderColor: '#bbf7d0' },
  resultError: { backgroundColor: '#fef2f2', borderColor: '#fecaca' },
  resultTitle: { fontSize: 14, fontWeight: '700', color: '#15803d' },
  resultDesc: { fontSize: 12, color: '#15803d', marginTop: 2 },
});
