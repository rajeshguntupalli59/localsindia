import { View, Text, TextInput, TouchableOpacity, Switch, StyleSheet } from 'react-native';

// The category-specific part of the post / edit screens: pick the
// subcategory ("Type"), then answer that subcategory's own questions.
// Questions come from GET /categories/catalog
// (backend/app/core/category_catalog.py) — same list as the website.

export type Question = {
  key: string; label: string; type: 'text' | 'number' | 'select' | 'multiselect' | 'switch';
  options?: string[]; placeholder?: string; unit?: string; min?: number; max?: number; required?: boolean; filter?: boolean;
};
export type Subcategory = {
  slug: string; name: string; questions: Question[];
  price_label?: string; show_price?: boolean; title_placeholder?: string;
};
export type CatalogEntry = { slug: string; name: string; questions: Question[]; subcategories: Subcategory[] };
export type Answers = Record<string, any>;

const isEmpty = (v: any) => v === undefined || v === null || v === '' || (Array.isArray(v) && v.length === 0);

/** Same rules as the backend's validate_answers; returns {key: message}. */
export function checkAnswers(sub: Subcategory | null, answers: Answers, subRequired = true): Record<string, string> {
  if (!sub) return subRequired ? { _sub: 'Pick what kind of listing this is' } : {};
  const e: Record<string, string> = {};
  for (const f of sub.questions) {
    const v = answers[f.key];
    if (isEmpty(v)) {
      if (f.required && f.type !== 'switch') e[f.key] = 'Required';
      continue;
    }
    if (f.type === 'number') {
      const n = Number(v);
      if (Number.isNaN(n)) e[f.key] = 'Enter a number';
      else if ((f.min != null && n < f.min) || (f.max != null && n > f.max)) e[f.key] = `Must be between ${f.min} and ${f.max}`;
    }
  }
  if (!isEmpty(answers.salary_min) && !isEmpty(answers.salary_max) && Number(answers.salary_min) > Number(answers.salary_max)) {
    e.salary_max = 'Max salary must be more than min salary';
  }
  return e;
}

/** Only the answered questions, numbers as numbers — `category_details`. */
export function answersPayload(questions: Question[] | null | undefined, answers: Answers): Answers | null {
  if (!questions) return null;
  const out: Answers = {};
  for (const f of questions) {
    const v = answers[f.key];
    if (isEmpty(v)) continue;
    out[f.key] = f.type === 'number' ? Number(v) : typeof v === 'string' ? v.trim() : v;
  }
  return Object.keys(out).length > 0 ? out : null;
}

function Label({ field }: { field: Question }) {
  return (
    <>
      {field.label}
      {field.unit ? <Text style={styles.unit}> ({field.unit})</Text> : null}
      {field.required ? <Text style={styles.required}> *</Text> : null}
    </>
  );
}

function QuestionInput({ field, value, onAnswer }: { field: Question; value: any; onAnswer: (key: string, v: any) => void }) {
  if (field.type === 'select' || field.type === 'multiselect') {
    const selected: string[] = field.type === 'multiselect' ? (Array.isArray(value) ? value : []) : (value ? [value] : []);
    return (
      <>
        <Text style={styles.label}><Label field={field} /></Text>
        <View style={styles.chipRow}>
          {(field.options ?? []).map(opt => {
            const active = selected.includes(opt);
            return (
              <TouchableOpacity
                key={opt}
                style={[styles.chip, active && styles.chipActive]}
                onPress={() => field.type === 'multiselect'
                  ? onAnswer(field.key, active ? selected.filter(o => o !== opt) : [...selected, opt])
                  // Tapping the chosen option again clears it
                  : onAnswer(field.key, active ? '' : opt)}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
              >
                <Text style={[styles.chipText, active && styles.chipTextActive]}>{opt}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </>
    );
  }

  if (field.type === 'switch') {
    return (
      <View style={styles.switchRow}>
        <Text style={[styles.label, { marginBottom: 0, flex: 1 }]}><Label field={field} /></Text>
        <Switch
          value={!!value}
          onValueChange={v => onAnswer(field.key, v)}
          trackColor={{ false: '#d1d5db', true: '#25D366' }}
          thumbColor="white"
          accessibilityLabel={field.label}
        />
      </View>
    );
  }

  return (
    <>
      <Text style={styles.label}><Label field={field} /></Text>
      <TextInput
        style={styles.input}
        value={value != null ? String(value) : ''}
        onChangeText={t => onAnswer(field.key, field.type === 'number' ? t.replace(/[^0-9.]/g, '') : t)}
        placeholder={field.placeholder}
        placeholderTextColor="#9ca3af"
        maxLength={field.type === 'text' ? 150 : undefined}
        keyboardType={field.type === 'number' ? 'numeric' : 'default'}
        accessibilityLabel={field.label}
      />
    </>
  );
}

export default function DetailQuestions({
  subcategories, subSlug, answers, errors, onSubChange, onAnswer, subRequired = true,
}: {
  subcategories: Subcategory[];
  subSlug: string;
  answers: Answers;
  errors: Record<string, string>;
  /** New subcategory + the answers worth keeping (questions it also asks). */
  onSubChange: (slug: string, kept: Answers) => void;
  onAnswer: (key: string, value: any) => void;
  subRequired?: boolean;
}) {
  const sub = subcategories.find(sc => sc.slug === subSlug) ?? null;
  return (
    <>
      <Text style={[styles.label, { marginTop: 14 }]}>
        Type {subRequired ? <Text style={styles.required}>*</Text> : null}
      </Text>
      <View style={styles.chipRow}>
        {subcategories.map(sc => {
          const active = sc.slug === subSlug;
          return (
            <TouchableOpacity
              key={sc.slug}
              style={[styles.chip, active && styles.chipActive]}
              onPress={() => {
                if (active) return;
                const keep = new Set(sc.questions.map(qq => qq.key));
                onSubChange(sc.slug, Object.fromEntries(Object.entries(answers).filter(([k]) => keep.has(k))));
              }}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
            >
              <Text style={[styles.chipText, active && styles.chipTextActive]}>{sc.name}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
      {errors._sub ? <Text style={styles.errorText}>{errors._sub}</Text> : null}
      {sub?.questions.map(field => (
        <View key={field.key} style={{ marginTop: 14 }}>
          <QuestionInput field={field} value={answers[field.key]} onAnswer={onAnswer} />
          {errors[field.key] ? <Text style={styles.errorText}>{errors[field.key]}</Text> : null}
        </View>
      ))}
    </>
  );
}

// Matches PostScreen's form styles
const styles = StyleSheet.create({
  label: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 8 },
  unit: { fontWeight: '400', color: '#6b7280' },
  required: { color: '#ef4444' },
  input: {
    borderWidth: 1.5, borderColor: '#e5e7eb', borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 12, fontSize: 15,
    backgroundColor: '#fafafa', color: '#111827',
  },
  errorText: { fontSize: 12, color: '#ef4444', marginTop: 4 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingHorizontal: 14, paddingVertical: 9, borderRadius: 20,
    borderWidth: 1.5, borderColor: '#e5e7eb', backgroundColor: '#fafafa',
  },
  chipActive: { borderColor: '#f97316', backgroundColor: '#fff7ed' },
  chipText: { fontSize: 13, fontWeight: '600', color: '#6b7280' },
  chipTextActive: { color: '#f97316' },
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
});
