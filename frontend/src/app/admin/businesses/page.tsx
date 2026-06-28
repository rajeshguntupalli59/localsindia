'use client';

import { useEffect, useState, useCallback } from 'react';
import { ShieldCheck, ShieldOff, Building2 } from 'lucide-react';
import { toast } from 'sonner';
import EmptyState from '@/components/empty-state/EmptyState';

interface BusinessRow {
  id: string;
  name: string;
  verified: boolean;
  badge_plan: string | null;
  badge_expires_at: string | null;
  owner_id: string | null;
  city_id: string;
  created_at: string;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000';

export default function AdminBusinessesPage() {
  const [businesses, setBusinesses] = useState<BusinessRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState<string | null>(null);

  const fetchBusinesses = useCallback(async () => {
    const token = localStorage.getItem('access_token');
    if (!token) return;
    try {
      const res = await fetch(`${API_BASE}/api/v1/admin/businesses`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error();
      setBusinesses(await res.json());
    } catch {
      toast.error('Failed to load businesses');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchBusinesses(); }, [fetchBusinesses]);

  const grantBadge = async (b: BusinessRow) => {
    setActionId(b.id);
    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch(`${API_BASE}/api/v1/admin/businesses/${b.id}/verify`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error();
      const updated = await res.json();
      setBusinesses(bs => bs.map(x => x.id === b.id ? { ...x, verified: true, badge_plan: updated.badge_plan, badge_expires_at: updated.badge_expires_at } : x));
      toast.success(`${b.name} is now verified (30 days)`);
    } catch {
      toast.error('Failed to grant badge');
    } finally {
      setActionId(null);
    }
  };

  const revokeBadge = async (b: BusinessRow) => {
    const confirmed = window.confirm(`Revoke verified badge from ${b.name}?`);
    if (!confirmed) return;
    setActionId(b.id);
    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch(`${API_BASE}/api/v1/admin/businesses/${b.id}/verify`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error();
      setBusinesses(bs => bs.map(x => x.id === b.id ? { ...x, verified: false, badge_plan: null, badge_expires_at: null } : x));
      toast.success(`Badge revoked from ${b.name}`);
    } catch {
      toast.error('Failed to revoke badge');
    } finally {
      setActionId(null);
    }
  };

  const verifiedCount = businesses.filter(b => b.verified).length;

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold">Businesses</h1>
          <p className="text-sm text-muted-foreground">
            {businesses.length} total · {verifiedCount} verified
          </p>
        </div>
      </div>

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-14 bg-white rounded-xl animate-pulse" />
          ))}
        </div>
      ) : businesses.length === 0 ? (
        <EmptyState icon={Building2} title="No businesses yet" description="Businesses will appear here once they are created" />
      ) : (
        <div className="bg-white rounded-xl border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-slate-50">
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Business</th>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Status</th>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Plan</th>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Expires</th>
                <th className="text-right px-4 py-3 font-semibold text-muted-foreground">Action</th>
              </tr>
            </thead>
            <tbody>
              {businesses.map(b => {
                const busy = actionId === b.id;
                const expiresAt = b.badge_expires_at
                  ? new Date(b.badge_expires_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
                  : '—';
                const isExpired = b.badge_expires_at ? new Date(b.badge_expires_at) < new Date() : false;
                return (
                  <tr key={b.id} className="border-b last:border-0 hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{b.name}</span>
                        {b.verified && <ShieldCheck className="w-3.5 h-3.5 text-blue-500" />}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {b.owner_id ? 'Claimed' : 'Unclaimed'}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      {b.verified ? (
                        <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${isExpired ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>
                          <ShieldCheck className="w-3 h-3" />
                          {isExpired ? 'Expired' : 'Verified'}
                        </span>
                      ) : (
                        <span className="inline-flex items-center text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">
                          Unverified
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground capitalize">
                      {b.badge_plan?.replace('_', ' ') ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {expiresAt}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {b.verified ? (
                        <button
                          onClick={() => revokeBadge(b)}
                          disabled={busy}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-red-50 text-red-700 hover:bg-red-100 transition-colors disabled:opacity-50"
                        >
                          <ShieldOff className="w-3.5 h-3.5" /> Revoke
                        </button>
                      ) : (
                        <button
                          onClick={() => grantBadge(b)}
                          disabled={busy}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors disabled:opacity-50"
                        >
                          <ShieldCheck className="w-3.5 h-3.5" /> Grant Badge
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
