import { useEffect, useState } from 'react';
import { Modal, View, Text, TextInput, TouchableOpacity, ScrollView, Switch, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { Question } from './DetailQuestions';

// Filters built from a category's filterable posting questions
// (backend/app/core/category_catalog.py, `filter: true`). Values use the
// listings API's own param names: f_<key>=value, f_<key>_min / f_<key>_max.
export type AnswerFilterValues = Record<string, string>;

export default function AnswerFiltersSheet({
  visible, questions, values, onApply, onClose,
}: {
  visible: boolean;
  questions: Question[];
  values: AnswerFilterValues;
  onApply: (next: AnswerFilterValues) => void;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState<AnswerFilterValues>(values);
  useEffect(() => { if (visible) setDraft(values); }, [visible, values]);

  const set = (k: string, v: string | null) =>
    setDraft(d => { const next = { ...d }; if (v) next[k] = v; else delete next[k]; return next; });

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <Text style={styles.title}>Filters</Text>
            <TouchableOpacity onPress={onClose} accessibilityRole="button" accessibilityLabel="Close filters" hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="close" size={24} color="#374151" />
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={{ paddingBottom: 16 }} keyboardShouldPersistTaps="handled">
            {questions.map(q => {
              const key = `f_${q.key}`;
              return (
                <View key={q.key} style={{ marginTop: 16 }}>
                  <Text style={styles.label}>
                    {q.label}{q.unit ? <Text style={styles.unit}> ({q.unit})</Text> : null}
                  </Text>
                  {q.type === 'number' && (
                    <View style={styles.rangeRow}>
                      {(['_min', '_max'] as const).map(sfx => (
                        <TextInput
                          key={sfx}
                          style={styles.input}
                          keyboardType="numeric"
                          placeholder={sfx === '_min' ? 'Min' : 'Max'}
                          placeholderTextColor="#9ca3af"
                          value={draft[`${key}${sfx}`] ?? ''}
                          onChangeText={t => set(`${key}${sfx}`, t.replace(/[^0-9.]/g, '') || null)}
                          accessibilityLabel={`${q.label} ${sfx === '_min' ? 'minimum' : 'maximum'}`}
                        />
                      ))}
                    </View>
                  )}
                  {q.type === 'switch' && (
                    <View style={styles.switchRow}>
                      <Text style={styles.switchText}>Only show &ldquo;yes&rdquo;</Text>
                      <Switch
                        value={draft[key] === 'true'}
                        onValueChange={v => set(key, v ? 'true' : null)}
                        trackColor={{ false: '#d1d5db', true: '#f97316' }}
                        thumbColor="white"
                      />
                    </View>
                  )}
                  {(q.type === 'select' || q.type === 'multiselect') && (
                    <View style={styles.chipRow}>
                      {(q.options ?? []).map(opt => {
                        const active = draft[key] === opt;
                        return (
                          <TouchableOpacity
                            key={opt}
                            style={[styles.chip, active && styles.chipActive]}
                            onPress={() => set(key, active ? null : opt)}
                            accessibilityRole="button"
                            accessibilityState={{ selected: active }}
                          >
                            <Text style={[styles.chipText, active && styles.chipTextActive]}>{opt}</Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  )}
                </View>
              );
            })}
          </ScrollView>
          <View style={styles.footer}>
            <TouchableOpacity style={styles.clearBtn} onPress={() => setDraft({})} accessibilityRole="button">
              <Text style={styles.clearText}>Clear all</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.applyBtn} onPress={() => onApply(draft)} accessibilityRole="button">
              <Text style={styles.applyText}>Show results</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: 'white', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 18, maxHeight: '85%' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: 18, fontWeight: '800', color: '#111827' },
  label: { fontSize: 13, fontWeight: '700', color: '#374151', marginBottom: 8 },
  unit: { fontWeight: '400', color: '#6b7280' },
  rangeRow: { flexDirection: 'row', gap: 10 },
  input: {
    flex: 1, borderWidth: 1.5, borderColor: '#e5e7eb', borderRadius: 12,
    paddingHorizontal: 12, paddingVertical: 10, fontSize: 15, color: '#111827', backgroundColor: '#fafafa',
  },
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  switchText: { fontSize: 14, color: '#374151' },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 18, borderWidth: 1.5, borderColor: '#e5e7eb', backgroundColor: '#fafafa' },
  chipActive: { borderColor: '#f97316', backgroundColor: '#fff7ed' },
  chipText: { fontSize: 13, fontWeight: '600', color: '#6b7280' },
  chipTextActive: { color: '#f97316' },
  footer: { flexDirection: 'row', gap: 10, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#f3f4f6' },
  clearBtn: { flex: 1, paddingVertical: 14, borderRadius: 12, borderWidth: 1.5, borderColor: '#e5e7eb', alignItems: 'center' },
  clearText: { fontSize: 15, fontWeight: '700', color: '#374151' },
  applyBtn: { flex: 2, paddingVertical: 14, borderRadius: 12, backgroundColor: '#f97316', alignItems: 'center' },
  applyText: { fontSize: 15, fontWeight: '800', color: 'white' },
});
