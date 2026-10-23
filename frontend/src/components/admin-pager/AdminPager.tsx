'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';

export const PER_PAGE_OPTIONS = [10, 25, 50, 100];

/** Admin list endpoints send the full row count in this header. */
export function readTotal(res: Response): number {
  return Number(res.headers.get('X-Total-Count') ?? 0);
}

interface Props {
  total: number;
  page: number;
  perPage: number;
  onPageChange: (page: number) => void;
  onPerPageChange: (perPage: number) => void;
}

export default function AdminPager({ total, page, perPage, onPageChange, onPerPageChange }: Props) {
  if (total === 0) return null;
  const totalPages = Math.max(1, Math.ceil(total / perPage));
  const start = (page - 1) * perPage;

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 mt-4 text-sm text-muted-foreground">
      <div className="flex items-center gap-3">
        <span>Showing {start + 1}–{Math.min(start + perPage, total)} of {total}</span>
        <label className="flex items-center gap-2">
          Show
          <select
            value={perPage}
            onChange={e => onPerPageChange(Number(e.target.value))}
            className="px-2 py-1.5 bg-white border rounded-lg text-sm text-foreground"
          >
            {PER_PAGE_OPTIONS.map(n => <option key={n} value={n}>{n}</option>)}
          </select>
          per page
        </label>
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border bg-white hover:bg-slate-50 disabled:opacity-40"
        >
          <ChevronLeft className="w-4 h-4" /> Prev
        </button>
        <span>Page {page} of {totalPages}</span>
        <button
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border bg-white hover:bg-slate-50 disabled:opacity-40"
        >
          Next <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
