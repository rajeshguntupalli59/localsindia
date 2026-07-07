'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Flag, Eye, CheckCircle, Tag } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { formatPrice, timeAgo } from '@/lib/utils';
import type { Listing } from '@/lib/types';
import EmptyState from '@/components/empty-state/EmptyState';
import { toast } from 'sonner';

interface ReportDetail {
  id: string;
  reason: string;
  created_at: string;
  reporter_phone: string;
}

interface FlaggedListing extends Listing {
  reports: ReportDetail[];
  city_name?: string;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000';

export default function AdminReportsPage() {
  const [listings, setListings] = useState<FlaggedListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState<string | null>(null);

  const token = () => localStorage.getItem('access_token') ?? '';

  const fetchFlagged = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/v1/admin/listings/flagged`, {
        headers: { Authorization: `Bearer ${token()}` },
      });
      if (!res.ok) throw new Error();
      setListings(await res.json());
    } catch {
      toast.error('Failed to load flagged listings');
    } finally {
      setLoading(false);
    }
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { fetchFlagged(); }, []);

  const clearFlag = async (id: string) => {
    setActionId(id);
    try {
      const res = await fetch(`${API_BASE}/api/v1/admin/listings/${id}/approve`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token()}` },
      });
      if (!res.ok) throw new Error();
      toast.success('Listing restored to active');
      setListings(ls => ls.filter(l => l.id !== id));
    } catch {
      toast.error('Failed');
    } finally {
      setActionId(null);
    }
  };

  const removeListing = async (id: string) => {
    if (!confirm('Permanently remove this listing?')) return;
    setActionId(id);
    try {
      const res = await fetch(`${API_BASE}/api/v1/admin/listings/${id}/reject`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token()}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: 'Removed due to reports' }),
      });
      if (!res.ok) throw new Error();
      toast.success('Listing removed');
      setListings(ls => ls.filter(l => l.id !== id));
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
          <h1 className="text-xl font-bold">Flagged Listings</h1>
          <p className="text-sm text-muted-foreground">{listings.length} listings with 3+ reports</p>
        </div>
        <button onClick={fetchFlagged} className="text-sm px-4 py-2 rounded-lg border hover:bg-muted transition-colors">
          Refresh
        </button>
      </div>

      {loading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-40 bg-white rounded-xl animate-pulse" />)}
        </div>
      ) : listings.length === 0 ? (
        <EmptyState icon={Flag} title="No flagged listings" description="All clear — no listings have been flagged" />
      ) : (
        <div className="space-y-4">
          {listings.map((listing, i) => (
            <motion.div
              key={listing.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              className="bg-white rounded-xl shadow-sm overflow-hidden"
            >
              {/* Listing info */}
              <div className="flex gap-4 p-4 border-b">
                <div className="relative w-16 h-16 rounded-lg overflow-hidden bg-muted shrink-0">
                  {listing.images && listing.images[0] ? (
                    <Image src={listing.images[0].url} alt={listing.title} fill className="object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-300"><Tag size={22} /></div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold truncate">{listing.title}</p>
                  <p className="text-sm text-muted-foreground line-clamp-1 mt-0.5">{listing.description}</p>
                  <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                    {listing.price !== null && (
                      <span className="font-semibold" style={{ color: 'var(--li-primary)' }}>
                        {formatPrice(listing.price)}
                      </span>
                    )}
                    <span>{listing.contact_phone}</span>
                    <span>{timeAgo(listing.created_at)}</span>
                  </div>
                </div>
                <div className="flex flex-col gap-2 shrink-0">
                  <Link
                    href={`#`}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-muted text-xs font-semibold hover:bg-muted/80 transition-colors"
                  >
                    <Eye className="w-3.5 h-3.5" /> View
                  </Link>
                  <button
                    onClick={() => clearFlag(listing.id)}
                    disabled={actionId === listing.id}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-green-50 text-green-700 text-xs font-semibold hover:bg-green-100 disabled:opacity-50"
                  >
                    <CheckCircle className="w-3.5 h-3.5" /> Restore
                  </button>
                  <button
                    onClick={() => removeListing(listing.id)}
                    disabled={actionId === listing.id}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-red-50 text-red-700 text-xs font-semibold hover:bg-red-100 disabled:opacity-50"
                  >
                    Remove
                  </button>
                </div>
              </div>

              {/* Reports */}
              <div className="p-4">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                  Reports ({listing.reports?.length ?? 0})
                </p>
                <div className="space-y-2">
                  {(listing.reports ?? []).map(r => (
                    <div key={r.id} className="flex items-start gap-2 text-xs">
                      <Flag className="w-3.5 h-3.5 text-red-500 mt-0.5 shrink-0" />
                      <div>
                        <span className="font-medium">{r.reason}</span>
                        <span className="text-muted-foreground ml-2">— {timeAgo(r.created_at)}</span>
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
