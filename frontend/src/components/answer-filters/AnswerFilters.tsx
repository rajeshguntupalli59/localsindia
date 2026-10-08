'use client';
import { useEffect, useState } from 'react';
import type { CatalogCategory, CatalogQuestion } from '@/lib/types';

// Subcategory chips + filters built from the category's posting questions
// (backend/app/core/category_catalog.py). State lives in the URL:
// `sub=<slug>` and `f_<key>=value` / `f_<key>_min` / `f_<key>_max`, which the
// listings endpoint reads directly.

export const ANSWER_PARAM_PREFIX = 'f_';

/** The subcategories that take listings (Events/Businesses have none). */
export function listingSubcategories(category?: CatalogCategory | null) {
  return (category?.subcategories ?? []).filter(s => s.questions.length > 0);
}

/** True when the URL has a subcategory or any answer filter. */
export function hasAnswerFilters(params: URLSearchParams) {
  return !!params.get('sub') || Array.from(params.keys()).some(k => k.startsWith(ANSWER_PARAM_PREFIX));
}

/** `sub` → subcategory_slug and every f_* param, ready for the listings API. */
export function answerApiParams(params: URLSearchParams): Record<string, string> {
  const out: Record<string, string> = {};
  const sub = params.get('sub');
  if (sub) out.subcategory_slug = sub;
  params.forEach((v, k) => { if (k.startsWith(ANSWER_PARAM_PREFIX) && v) out[k] = v; });
  return out;
}

/** A copy of `params` without the subcategory and answer filters. */
export function withoutAnswerFilters(params: URLSearchParams) {
  const next = new URLSearchParams(params.toString());
  next.delete('sub');
  Array.from(next.keys()).filter(k => k.startsWith(ANSWER_PARAM_PREFIX)).forEach(k => next.delete(k));
  return next;
}

function filterQuestions(category: CatalogCategory, subSlug: string | null): CatalogQuestion[] {
  const sub = category.subcategories.find(s => s.slug === subSlug);
  return (sub ? sub.questions : category.questions).filter(q => q.filter);
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className="shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors"
      style={active
        ? { background: 'var(--li-primary)', color: 'white', borderColor: 'var(--li-primary)' }
        : { borderColor: 'var(--li-border)', color: 'var(--li-text)', background: 'white' }}
    >
      {children}
    </button>
  );
}

function RangeInputs({ q, params, onChange }: { q: CatalogQuestion; params: URLSearchParams; onChange: (p: URLSearchParams) => void }) {
  const minKey = `${ANSWER_PARAM_PREFIX}${q.key}_min`;
  const maxKey = `${ANSWER_PARAM_PREFIX}${q.key}_max`;
  const [lo, setLo] = useState(params.get(minKey) ?? '');
  const [hi, setHi] = useState(params.get(maxKey) ?? '');
  useEffect(() => { setLo(params.get(minKey) ?? ''); setHi(params.get(maxKey) ?? ''); }, [params, minKey, maxKey]);

  const commit = () => {
    const next = new URLSearchParams(params.toString());
    if (lo) next.set(minKey, lo); else next.delete(minKey);
    if (hi) next.set(maxKey, hi); else next.delete(maxKey);
    if (next.toString() !== params.toString()) onChange(next);
  };
  const input = (value: string, set: (v: string) => void, placeholder: string) => (
    <input
      type="number"
      inputMode="numeric"
      value={value}
      min={q.min}
      max={q.max}
      placeholder={placeholder}
      onChange={e => set(e.target.value)}
      onBlur={commit}
      onKeyDown={e => { if (e.key === 'Enter') commit(); }}
      className="w-full min-w-0 border rounded-xl px-3 py-2 text-sm outline-none focus:border-orange-400 bg-white"
      style={{ borderColor: 'var(--li-border)', color: 'var(--li-text)' }}
    />
  );
  return (
    <div className="flex gap-2">
      {input(lo, setLo, 'Min')}
      {input(hi, setHi, 'Max')}
    </div>
  );
}

export default function AnswerFilters({
  category, params, onChange,
}: {
  category?: CatalogCategory | null;
  params: URLSearchParams;
  onChange: (next: URLSearchParams) => void;
}) {
  const subs = listingSubcategories(category);
  if (!category || (subs.length === 0 && category.questions.every(q => !q.filter))) return null;
  const subSlug = params.get('sub');
  const questions = filterQuestions(category, subSlug);

  const setSub = (slug: string | null) => {
    // Filters belong to one subcategory's questions — start fresh on switch
    const next = withoutAnswerFilters(params);
    if (slug) next.set('sub', slug);
    onChange(next);
  };
  const setValue = (key: string, value: string | null) => {
    const next = new URLSearchParams(params.toString());
    if (value) next.set(`${ANSWER_PARAM_PREFIX}${key}`, value); else next.delete(`${ANSWER_PARAM_PREFIX}${key}`);
    onChange(next);
  };

  return (
    <div className="space-y-4">
      {subs.length > 0 && (
        <div>
          <p className="text-xs font-bold mb-2" style={{ color: 'var(--li-text)' }}>Type</p>
          <div className="flex flex-wrap gap-2">
            <Chip active={!subSlug} onClick={() => setSub(null)}>All</Chip>
            {subs.map(s => (
              <Chip key={s.slug} active={subSlug === s.slug} onClick={() => setSub(subSlug === s.slug ? null : s.slug)}>
                {s.name}
              </Chip>
            ))}
          </div>
        </div>
      )}

      {questions.map(q => {
        const current = params.get(`${ANSWER_PARAM_PREFIX}${q.key}`);
        return (
          <div key={q.key}>
            <p className="text-xs font-bold mb-2" style={{ color: 'var(--li-text)' }}>
              {q.label}{q.unit ? <span className="font-normal" style={{ color: 'var(--li-muted)' }}> ({q.unit})</span> : null}
            </p>
            {q.type === 'number' && <RangeInputs q={q} params={params} onChange={onChange} />}
            {q.type === 'switch' && (
              <label className="flex items-center gap-2 text-sm cursor-pointer" style={{ color: 'var(--li-text)' }}>
                <input
                  type="checkbox"
                  checked={current === 'true'}
                  onChange={e => setValue(q.key, e.target.checked ? 'true' : null)}
                  className="w-4 h-4 accent-orange-500"
                />
                Only show &ldquo;yes&rdquo;
              </label>
            )}
            {(q.type === 'select' || q.type === 'multiselect') && (
              <div className="flex flex-wrap gap-2">
                {(q.options ?? []).map(opt => (
                  <Chip key={opt} active={current === opt} onClick={() => setValue(q.key, current === opt ? null : opt)}>
                    {opt}
                  </Chip>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
