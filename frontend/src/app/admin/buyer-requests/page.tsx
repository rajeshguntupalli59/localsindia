'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Flag, CheckCircle, Search } from 'lucide-react';
import { formatPrice, timeAgo } from '@/lib/utils';
import EmptyState from '@/components/empty-state/EmptyState';
import { toast } from 'sonner';

interface ReportDetail {
  id: string;
  reason: string;
  notes: string | null;
  created_at: string;
}

interface FlaggedBuyerRequest {
  id: string;
  description: string;
  budget: number | null;
  contact_phone: string;
  status: string;
  report_count: number;
  created_at: string;
  city_name: string | null;
  category_name: string | null;
  reports: ReportDetail[];
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000';

export default function AdminBuyerRequestsPage() {
  const [requests, setRequests] = useState<FlaggedBuyerRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState<string | null>(null);

  const token = () => localStorage.getItem('access_token') ?? '';

  const fetchFlagged = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/v1/admin/buyer-requests?status=flagged`, {
        headers: { Authorization: `Bearer ${token()}` },
      });
      if (!res.ok) throw new Error();
      setRequests(await res.json());
    } catch {
      toast.error('Failed to load flagged requests');
    } finally {
      setLoading(false);
    }
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { fetchFlagged(); }, []);

  const restore = async (id: string) => {
    setActionId(id);
    try {
      const res = await fetch(`${API_BASE}/api/v1/admin/buyer-requests/${id}/restore`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token()}` },
      });
      if (!res.ok) throw new Error();
      toast.success('Request restored to the public feed');
      setRequests(rs => rs.filter(r => r.id !== id));
    } catch {
      toast.error('Failed');
    } finally {
      setActionId(null);
    }
  };

  const remove = async (id: string) => {
    if (!confirm('Permanently remove this request?')) return;
    setActionId(id);
    try {
      const res = await fetch(`${API_BASE}/api/v1/buyer-requests/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token()}` },
      });
      if (!res.ok) throw new Error();
      toast.success('Request removed');
      setRequests(rs => rs.filter(r => r.id !== id));
    } catch {
      toast.error('Failed');
    } finally {
      setActionId(null);
    }
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold">Flagged Buyer Requests</h1>
          <p className="text-sm text-muted-foreground">{requests.length} requests with 3+ reports</p>
        </div>
        <button onClick={fetchFlagged} className="text-sm px-4 py-2 rounded-lg border hover:bg-muted transition-colors">
          Refresh
        </button>
      </div>

      {loading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-40 bg-white rounded-xl animate-pulse" />)}
        </div>
      ) : requests.length === 0 ? (
        <EmptyState icon={Flag} title="No flagged requests" description="All clear — no buyer requests have been flagged" />
      ) : (
        <div className="space-y-4">
          {requests.map((r, i) => (
            <motion.div
              key={r.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              className="bg-white rounded-xl shadow-sm overflow-hidden"
            >
              <div className="flex gap-4 p-4 border-b">
                <div className="w-16 h-16 rounded-lg bg-muted shrink-0 flex items-center justify-center text-slate-300">
                  <Search size={22} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold truncate">{r.description}</p>
                  <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                    {r.budget !== null && (
                      <span className="font-semibold" style={{ color: 'var(--li-primary)' }}>
                        Budget: {formatPrice(r.budget)}
                      </span>
                    )}
                    {r.category_name && <span>{r.category_name}</span>}
                    {r.city_name && <span>{r.city_name}</span>}
                    <span>{r.contact_phone}</span>
                    <span>{timeAgo(r.created_at)}</span>
                  </div>
                </div>
                <div className="flex flex-col gap-2 shrink-0">
                  <button
                    onClick={() => restore(r.id)}
                    disabled={actionId === r.id}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-green-50 text-green-700 text-xs font-semibold hover:bg-green-100 disabled:opacity-50"
                  >
                    <CheckCircle className="w-3.5 h-3.5" /> Restore
                  </button>
                  <button
                    onClick={() => remove(r.id)}
                    disabled={actionId === r.id}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-red-50 text-red-700 text-xs font-semibold hover:bg-red-100 disabled:opacity-50"
                  >
                    Remove
                  </button>
                </div>
              </div>

              <div className="p-4">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                  Reports ({r.reports.length})
                </p>
                <div className="space-y-2">
                  {r.reports.map(rep => (
                    <div key={rep.id} className="flex items-start gap-2 text-xs">
                      <Flag className="w-3.5 h-3.5 text-red-500 mt-0.5 shrink-0" />
                      <div>
                        <span className="font-medium">{rep.reason}</span>
                        <span className="text-muted-foreground ml-2">— {timeAgo(rep.created_at)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
