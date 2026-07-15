'use client';

import { useCallback, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle, XCircle, Clock, Trash2, Tag, Search, X } from 'lucide-react';
import Image from 'next/image';
import { formatPrice, timeAgo } from '@/lib/utils';
import type { Listing } from '@/lib/types';
import EmptyState from '@/components/empty-state/EmptyState';
import { toast } from 'sonner';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000';

const STATUS_TABS = [
  { key: 'pending', label: 'Pending' },
  { key: 'active', label: 'Active' },
  { key: 'flagged', label: 'Flagged' },
  { key: 'rejected', label: 'Rejected' },
];

export default function AdminListingsPage() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('pending');
  const [actionId, setActionId] = useState<string | null>(null);
  const [rejectModal, setRejectModal] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [deleteModal, setDeleteModal] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const token = () => localStorage.getItem('access_token') ?? '';

  const fetchListings = useCallback(async (status: string, q: string) => {
    setLoading(true);
    try {
      const endpoint = status === 'pending'
        ? `${API_BASE}/api/v1/admin/listings/pending`
        : `${API_BASE}/api/v1/admin/listings?status=${status}${q ? `&q=${encodeURIComponent(q)}` : ''}`;
      const res = await fetch(endpoint, {
        headers: { Authorization: `Bearer ${token()}` },
      });
      if (!res.ok) throw new Error();
      let data: Listing[] = await res.json();
      if (status === 'pending' && q) {
        data = data.filter(l => l.title?.toLowerCase().includes(q.toLowerCase()));
      }
      setListings(data);
    } catch {
      toast.error('Failed to load listings');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => fetchListings(tab, search), search ? 300 : 0);
    return () => clearTimeout(timer);
  }, [tab, search, fetchListings]);

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

  const deleteListing = async (id: string) => {
    setActionId(id);
    try {
      const res = await fetch(`${API_BASE}/api/v1/listings/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token()}` },
      });
      if (!res.ok) throw new Error();
      toast.success('Listing deleted');
      setListings(ls => ls.filter(l => l.id !== id));
      setDeleteModal(null);
    } catch {
      toast.error('Failed to delete');
    } finally {
      setActionId(null);
    }
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold">Listings</h1>
          <p className="text-sm text-muted-foreground">{listings.length} {tab} listings</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={async () => {
              if (!confirm('Add placeholder images to all listings with no photos?')) return;
              try {
                const res = await fetch(`${API_BASE}/api/v1/admin/seed-placeholder-images`, {
                  method: 'POST',
                  headers: { Authorization: `Bearer ${token()}` },
                });
                const data = await res.json();
                toast.success(data.message ?? 'Done');
              } catch { toast.error('Failed to seed images'); }
            }}
            className="text-sm px-4 py-2 rounded-lg border border-blue-200 text-blue-700 hover:bg-blue-50 transition-colors"
          >
            Seed Images
          </button>
          <button
            onClick={() => fetchListings(tab, search)}
            className="text-sm px-4 py-2 rounded-lg border hover:bg-muted transition-colors"
          >
            Refresh
          </button>
        </div>
      </div>

      {/* Status tabs */}
      <div className="flex gap-1 mb-4 bg-muted p-1 rounded-xl w-fit">
        {STATUS_TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              tab === t.key ? 'bg-white shadow-sm text-slate-900' : 'text-muted-foreground hover:text-slate-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Search box */}
      <div className="relative mb-5 max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by title..."
          className="w-full pl-9 pr-9 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
        />
        {search && (
          <button
            onClick={() => setSearch('')}
            aria-label="Clear search"
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-slate-700"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-24 bg-white rounded-xl animate-pulse" />
          ))}
        </div>
      ) : listings.length === 0 ? (
        <EmptyState icon={Clock} title="No listings" description={`No ${tab} listings found`} />
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
                  {listing.images?.[0]?.url ? (
                    <Image src={listing.images[0].url} alt={listing.title ?? ''} fill className="object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-300"><Tag size={28} /></div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold truncate">{listing.title}</p>
                  <p className="text-sm text-muted-foreground line-clamp-1 mt-0.5">{listing.description}</p>
                  <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground">
                    {listing.price != null && (
                      <span className="font-semibold" style={{ color: 'var(--li-primary)' }}>
                        {formatPrice(listing.price)}
                      </span>
                    )}
                    <span>{listing.created_at ? timeAgo(listing.created_at) : ''}</span>
                    <span className="truncate">{listing.contact_phone}</span>
                  </div>
                </div>

                {/* Action buttons */}
                <div className="flex flex-col gap-2 shrink-0">
                  {tab === 'pending' && (
                    <div className="flex gap-2">
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
                  )}
                  <button
                    onClick={() => setDeleteModal(listing.id)}
                    disabled={actionId === listing.id}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-red-50 text-red-700 text-xs font-semibold hover:bg-red-100 transition-colors disabled:opacity-50 self-end"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Delete
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

      {/* Delete confirm modal */}
      {deleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setDeleteModal(null)} />
          <div className="relative bg-white rounded-2xl p-5 w-full max-w-sm space-y-4">
            <h2 className="font-semibold text-red-600">Delete Listing</h2>
            <p className="text-sm text-muted-foreground">This listing will be permanently removed. This cannot be undone.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteModal(null)} className="flex-1 py-2.5 rounded-xl border text-sm font-semibold">Cancel</button>
              <button
                onClick={() => deleteListing(deleteModal)}
                disabled={!!actionId}
                className="flex-1 py-2.5 rounded-xl bg-red-600 text-white text-sm font-semibold disabled:opacity-50"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
