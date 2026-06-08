'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle, XCircle, Clock } from 'lucide-react';
import Image from 'next/image';
import { formatPrice, timeAgo } from '@/lib/utils';
import type { Listing } from '@/lib/types';
import EmptyState from '@/components/empty-state/EmptyState';
import { toast } from 'sonner';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000';

export default function AdminListingsPage() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState<string | null>(null);
  const [rejectModal, setRejectModal] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const token = () => localStorage.getItem('access_token') ?? '';

  const fetchPending = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/v1/admin/listings/pending`, {
        headers: { Authorization: `Bearer ${token()}` },
      });
      if (!res.ok) throw new Error();
      setListings(await res.json());
    } catch {
      toast.error('Failed to load queue');
    } finally {
      setLoading(false);
    }
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { fetchPending(); }, []);

  const approve = async (id: string) => {
    setActionId(id);
    try {
      const res = await fetch(`${API_BASE}/api/v1/admin/listings/${id}/approve`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token()}` },
      });
      if (!res.ok) throw new Error();
      toast.success('Listing approved');
      setListings(ls => ls.filter(l => l.id !== id));
    } catch {
      toast.error('Failed to approve');
    } finally {
      setActionId(null);
    }
  };

  const reject = async (id: string) => {
    if (!rejectReason.trim()) { toast.error('Enter a rejection reason'); return; }
    setActionId(id);
    try {
      const res = await fetch(`${API_BASE}/api/v1/admin/listings/${id}/reject`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token()}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: rejectReason }),
      });
      if (!res.ok) throw new Error();
      toast.success('Listing rejected');
      setListings(ls => ls.filter(l => l.id !== id));
      setRejectModal(null);
      setRejectReason('');
    } catch {
      toast.error('Failed to reject');
    } finally {
      setActionId(null);
    }
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold">Pending Queue</h1>
          <p className="text-sm text-muted-foreground">{listings.length} listings awaiting review</p>
        </div>
        <button
          onClick={fetchPending}
          className="text-sm px-4 py-2 rounded-lg border hover:bg-muted transition-colors"
        >
          Refresh
        </button>
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-24 bg-white rounded-xl animate-pulse" />
          ))}
        </div>
      ) : listings.length === 0 ? (
        <EmptyState icon={Clock} title="Queue is empty" description="All listings have been reviewed" />
      ) : (
        <div className="space-y-3">
          {listings.map((listing, i) => (
            <motion.div
              key={listing.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
              className="bg-white rounded-xl shadow-sm overflow-hidden"
            >
              <div className="flex gap-4 p-4">
                <div className="relative w-20 h-20 rounded-lg overflow-hidden bg-muted shrink-0">
                  {listing.images && listing.images[0] ? (
                    <Image src={listing.images[0].url} alt={listing.title} fill className="object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-3xl">🏷️</div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold truncate">{listing.title}</p>
                  <p className="text-sm text-muted-foreground line-clamp-1 mt-0.5">{listing.description}</p>
                  <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground">
                    {listing.price !== null && (
                      <span className="font-semibold" style={{ color: 'var(--li-primary)' }}>
                        {formatPrice(listing.price)}
                      </span>
                    )}
                    <span>{timeAgo(listing.created_at)}</span>
                    <span className="truncate">{listing.contact_phone}</span>
                  </div>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button
                    onClick={() => approve(listing.id)}
                    disabled={actionId === listing.id}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-green-50 text-green-700 text-xs font-semibold hover:bg-green-100 transition-colors disabled:opacity-50"
                  >
                    <CheckCircle className="w-3.5 h-3.5" /> Approve
                  </button>
                  <button
                    onClick={() => { setRejectModal(listing.id); setRejectReason(''); }}
                    disabled={actionId === listing.id}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-red-50 text-red-700 text-xs font-semibold hover:bg-red-100 transition-colors disabled:opacity-50"
                  >
                    <XCircle className="w-3.5 h-3.5" /> Reject
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Reject modal */}
      {rejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setRejectModal(null)} />
          <div className="relative bg-white rounded-2xl p-5 w-full max-w-sm space-y-4">
            <h2 className="font-semibold">Reject Listing</h2>
            <textarea
              value={rejectReason}
              onChange={e => setRejectReason(e.target.value)}
              placeholder="Reason for rejection (shown to user)"
              rows={3}
              className="w-full border rounded-xl px-3 py-2 text-sm resize-none"
              autoFocus
            />
            <div className="flex gap-3">
              <button onClick={() => setRejectModal(null)} className="flex-1 py-2.5 rounded-xl border text-sm font-semibold">Cancel</button>
              <button
                onClick={() => reject(rejectModal)}
                disabled={!!actionId}
                className="flex-1 py-2.5 rounded-xl bg-red-600 text-white text-sm font-semibold disabled:opacity-50"
              >
                Reject
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
