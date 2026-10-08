import type { DetailRow } from '@/lib/types';

// The seller's answers to the category's posting questions (BHK, fuel type,
// salary…) with their question labels — labels and formatting come from the
// backend catalog (backend/app/core/category_catalog.py).
export default function ListingDetailRows({ rows }: { rows?: DetailRow[] | null }) {
  if (!rows || rows.length === 0) return null;
  return (
    <div>
      <h2 className="text-sm font-semibold text-slate-700 mb-2">Details</h2>
      <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 rounded-2xl border px-4 py-1" style={{ borderColor: 'var(--li-border)' }}>
        {rows.map(r => (
          <div key={r.key} className="flex items-start justify-between gap-3 py-2.5 border-b last:border-0 sm:[&:nth-last-child(2)]:border-0" style={{ borderColor: 'var(--li-border)' }}>
            <dt className="text-sm text-slate-500">{r.label}</dt>
            <dd className="text-sm font-semibold text-slate-800 text-right break-words">{r.value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

// Up to `max` short answers for a listing card ("Petrol", "45,000 km"…).
export function cardDetailChips(rows?: DetailRow[] | null, max = 3): string[] {
  return (rows ?? []).map(r => r.value).filter(v => v.length <= 20).slice(0, max);
}
