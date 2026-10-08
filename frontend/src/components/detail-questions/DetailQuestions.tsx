'use client';
import type { CatalogQuestion, CatalogSubcategory } from '@/lib/types';

// The category-specific part of the post / edit forms: pick the subcategory
// ("Type"), then answer that subcategory's own questions. Questions come from
// GET /api/v1/categories/catalog (backend/app/core/category_catalog.py).

export type Answers = Record<string, unknown>;

const isEmpty = (v: unknown) =>
  v === undefined || v === null || v === '' || (Array.isArray(v) && v.length === 0);

/** Same rules as the backend's validate_answers; returns {key: message}. */
export function checkAnswers(sub: CatalogSubcategory | null, answers: Answers): Record<string, string> {
  const e: Record<string, string> = {};
  if (!sub) return { _sub: 'Pick what kind of listing this is' };
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
export function answersPayload(questions: CatalogQuestion[] | null | undefined, answers: Answers): Answers | null {
  if (!questions) return null;
  const out: Answers = {};
  for (const f of questions) {
    const v = answers[f.key];
    if (isEmpty(v)) continue;
    out[f.key] = f.type === 'number' ? Number(v) : typeof v === 'string' ? v.trim() : v;
  }
  return Object.keys(out).length > 0 ? out : null;
}

function Label({ field }: { field: CatalogQuestion }) {
  return (
    <>
      {field.label}
      {field.unit && <span className="font-normal" style={{ color: 'var(--li-muted)' }}> ({field.unit})</span>}
      {field.required && <span style={{ color: '#EF4444' }}> *</span>}
    </>
  );
}

function OptionChip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className="px-3 py-1.5 rounded-full text-sm font-semibold border-2 transition-all"
      style={active
        ? { borderColor: 'var(--li-primary)', background: 'var(--li-primary-light)', color: 'var(--li-primary)' }
        : { borderColor: 'var(--li-border)', color: 'var(--li-muted)' }}
    >
      {children}
    </button>
  );
}

function QuestionInput({ field, value, onAnswer }: { field: CatalogQuestion; value: unknown; onAnswer: (key: string, v: unknown) => void }) {
  if (field.type === 'select' || field.type === 'multiselect') {
    const selected: string[] = field.type === 'multiselect'
      ? (Array.isArray(value) ? value as string[] : [])
      : (typeof value === 'string' && value ? [value] : []);
    return (
      <div>
        <p className="text-sm font-bold mb-2" style={{ color: 'var(--li-text)' }}><Label field={field} /></p>
        <div className="flex flex-wrap gap-2">
          {(field.options ?? []).map(opt => {
            const active = selected.includes(opt);
            return (
              <OptionChip
                key={opt}
                active={active}
                onClick={() => field.type === 'multiselect'
                  ? onAnswer(field.key, active ? selected.filter(o => o !== opt) : [...selected, opt])
                  // Tapping the chosen option again clears it
                  : onAnswer(field.key, active ? '' : opt)}
              >
                {opt}
              </OptionChip>
            );
          })}
        </div>
      </div>
    );
  }

  if (field.type === 'switch') {
    return (
      <div className="flex items-center justify-between gap-4">
        <p className="text-sm font-bold" style={{ color: 'var(--li-text)' }}><Label field={field} /></p>
        <button
          type="button"
          role="switch"
          aria-checked={!!value}
          aria-label={field.label}
          onClick={() => onAnswer(field.key, !value)}
          className="relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors duration-200 focus:outline-none"
          style={{ background: value ? 'var(--li-wa-green)' : '#D1D5DB' }}
        >
          <span
            className="inline-block h-5 w-5 rounded-full bg-white shadow-md transition-transform duration-200"
            style={{ transform: value ? 'translateX(22px)' : 'translateX(2px)' }}
          />
        </button>
      </div>
    );
  }

  return (
    <div>
      <label htmlFor={`q-${field.key}`} className="text-sm font-bold mb-2 block" style={{ color: 'var(--li-text)' }}><Label field={field} /></label>
      <input
        id={`q-${field.key}`}
        type={field.type === 'number' ? 'number' : 'text'}
        inputMode={field.type === 'number' ? 'numeric' : undefined}
        min={field.min}
        max={field.max}
        maxLength={field.type === 'text' ? 150 : undefined}
        value={value != null ? String(value) : ''}
        onChange={e => onAnswer(field.key, e.target.value)}
        placeholder={field.placeholder}
        className="w-full rounded-xl px-4 py-3 text-sm outline-none focus:border-orange-400 transition-colors"
        style={{ border: '2px solid var(--li-border)', color: 'var(--li-text)' }}
      />
    </div>
  );
}

export default function DetailQuestions({
  subcategories, subSlug, answers, errors, onSubChange, onAnswer,
}: {
  subcategories: CatalogSubcategory[];
  subSlug: string;
  answers: Answers;
  errors: Record<string, string>;
  /** New subcategory + the answers worth keeping (questions it also asks). */
  onSubChange: (slug: string, kept: Answers) => void;
  onAnswer: (key: string, value: unknown) => void;
}) {
  const sub = subcategories.find(sc => sc.slug === subSlug) ?? null;
  return (
    <>
      <p className="text-sm font-bold mb-2" style={{ color: 'var(--li-text)' }}>
        Type <span style={{ color: '#EF4444' }}>*</span>
      </p>
      <div className="flex flex-wrap gap-2 mb-2">
        {subcategories.map(sc => {
          const active = sc.slug === subSlug;
          return (
            <button
              key={sc.slug}
              type="button"
              aria-pressed={active}
              onClick={() => {
                if (active) return;
                const keep = new Set(sc.questions.map(qq => qq.key));
                onSubChange(sc.slug, Object.fromEntries(Object.entries(answers).filter(([k]) => keep.has(k))));
              }}
              className="px-4 py-2 rounded-full text-sm font-semibold border-2 transition-all"
              style={active
                ? { borderColor: 'var(--li-primary)', background: 'var(--li-primary)', color: 'white' }
                : { borderColor: 'var(--li-border)', color: 'var(--li-text)' }}
            >
              {sc.name}
            </button>
          );
        })}
      </div>
      {errors._sub && <p className="text-xs mb-2" style={{ color: '#EF4444' }}>{errors._sub}</p>}
      {sub && (
        <div className="space-y-5 pt-5 mt-4 border-t" style={{ borderColor: 'var(--li-border)' }}>
          {sub.questions.map(field => (
            <div key={field.key}>
              <QuestionInput field={field} value={answers[field.key]} onAnswer={onAnswer} />
              {errors[field.key] && <p className="text-xs mt-1.5" style={{ color: '#EF4444' }}>{errors[field.key]}</p>}
            </div>
          ))}
        </div>
      )}
    </>
  );
}
