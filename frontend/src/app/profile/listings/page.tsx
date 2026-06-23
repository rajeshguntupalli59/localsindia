'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { ArrowLeft, Plus, RefreshCw, CheckCircle, Trash2, Pencil, Eye, MessageCircle, Star } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { api, ApiError } from '@/lib/api';
import type { Listing } from '@/lib/types';
import { formatPrice, timeAgo, isSaleCategory } from '@/lib/utils';
import EmptyState from '@/components/empty-state/EmptyState';
import { toast } from 'sonner';

const STATUS_STYLES: Record<string, string> = {
  active: 'bg-green-100 text-green-700',
  pending: 'bg-yellow-100 text-yellow-700',
  flagged: 'bg-red-100 text-red-700',
  fulfilled: 'bg-gray-100 text-gray-500',
  expired: 'bg-gray-100 text-gray-500',
};

const STATUS_LABELS: Record<string, string> = {
  active: 'Active',
  pending: 'Under Review',
  flagged: 'Flagged',
  expired: 'Expired',
};

function fulfilledLabel(categorySlug?: string | null) {
  return isSaleCategory(categorySlug) ? 'Sold' : 'Closed';
}

export default function MyListingsPage() {
  const router = useRouter();
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState<string | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (!token) { router.replace('/auth/login'); return; }
    fetchMyListings(token);
  }, [router]);

  const fetchMyListings = async (token?: string) => {
    const t = token ?? localStorage.getItem('access_token');
    if (!t) return;
    setLoading(true);
    try {
      const data = await api.listings.mine(t);
      setListings(data);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Could not load listings');
    } finally {
      setLoading(false);
    }
  };

  const handleFulfill = async (id: string) => {
    const token = localStorage.getItem('access_token');
    if (!token) return;
    setActionId(id);
    try {
      const listing = listings.find(l => l.id === id);
      await api.listings.fulfill(id, token);
      toast.success(isSaleCategory(listing?.category_slug) ? 'Marked as sold!' : 'Listing closed');
      fetchMyListings();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Failed');
    } finally {
      setActionId(null);
    }
  };

  const handleRenew = async (id: string) => {
    const token = localStorage.getItem('access_token');
    if (!token) return;
    setActionId(id);
    try {
      await api.listings.renew(id, token);
      toast.success('Listing renewed for 30 days');
      fetchMyListings();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Failed');
    } finally {
      setActionId(null);
    }
  };

  const handleDelete = async (id: string) => {
    const token = localStorage.getItem('access_token');
    if (!token) return;
    if (!confirm('Delete this listing?')) return;
    setActionId(id);
    try {
      await api.listings.delete(id, token);
      toast.success('Listing deleted');
      setListings(ls => ls.filter(l => l.id !== id));
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Failed');
    } finally {
      setActionId(null);
    }
  };

  return (
    <div className="min-h-screen pb-20" style={{ background: 'var(--li-page-bg)' }}>
      <div className="sticky top-0 z-30 bg-white border-b px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} className="text-muted-foreground">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="font-semibold">My Listings</h1>
        </div>
        <Link
          href="/"
          className="flex items-center gap-1.5 text-sm font-semibold px-3 py-1.5 rounded-full text-white"
          style={{ background: 'var(--li-primary)' }}
        >
          <Plus className="w-4 h-4" /> Post
        </Link>
      </div>

      <div className="p-4 space-y-3">
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-28 bg-white rounded-xl animate-pulse" />
          ))
        ) : listings.length === 0 ? (
          <EmptyState
            icon={Plus}
            title="No listings yet"
            description="Post your first free listing and reach thousands of buyers in your city"
            action={{ label: 'Post Listing', href: '/' }}
          />
        ) : (
          listings.map((listing, i) => (
            <motion.div
              key={listing.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              className="bg-white rounded-xl shadow-sm overflow-hidden"
            >
              <div className="flex gap-3 p-3">
                <div className="relative w-20 h-20 rounded-lg overflow-hidden bg-muted shrink-0">
                  {listing.images && listing.images[0] ? (
                    <Image src={listing.images[0].url} alt={listing.title} fill className="object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-3xl">🏷️</div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm truncate">{listing.title}</p>
                  <p className="text-sm font-bold mt-0.5" style={{ color: 'var(--li-primary)' }}>
                    {listing.price !== null ? formatPrice(listing.price) : 'Price on request'}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">{timeAgo(listing.created_at)}</p>
                  <div className="flex items-center gap-3 mt-1 flex-wrap">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${STATUS_STYLES[listing.status] ?? ''}`}>
                      {listing.status === 'fulfilled' ? fulfilledLabel(listing.category_slug) : (STATUS_LABELS[listing.status] ?? listing.status)}
                    </span>
                    {listing.status === 'active' && (
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Eye className="w-3 h-3" /> {listing.view_count ?? 0}
                        <MessageCircle className="w-3 h-3 ml-1.5" /> {listing.contact_click_count ?? 0}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex border-t">
                <ActionBtn
                  icon={<Pencil className="w-4 h-4" />}
                  label="Edit"
                  disabled={actionId === listing.id}
                  onClick={() => router.push(`/profile/listings/${listing.id}/edit`)}
                  color="text-blue-600"
                />
                {listing.status === 'active' && (
                  <ActionBtn
                    icon={<CheckCircle className="w-4 h-4" />}
                    label={isSaleCategory(listing.category_slug) ? 'Mark Sold' : 'Close'}
                    disabled={actionId === listing.id}
                    onClick={() => handleFulfill(listing.id)}
                    color="text-green-600"
                  />
                )}
                {(listing.status === 'active' || listing.status === 'expired') && (() => {
                  const renewedAt = listing.last_renewed_at ? new Date(listing.last_renewed_at) : null;
                  const hoursLeft = renewedAt && listing.status === 'active'
                    ? Math.max(0, 24 - (Date.now() - renewedAt.getTime()) / 3600000)
                    : 0;
                  const onCooldown = hoursLeft > 0.1;
                  return (
                    <ActionBtn
                      icon={<RefreshCw className="w-4 h-4" />}
                      label={onCooldown ? `${Math.ceil(hoursLeft)}h` : 'Renew'}
                      disabled={actionId === listing.id || onCooldown}
                      onClick={() => handleRenew(listing.id)}
                      color={onCooldown ? 'text-muted-foreground' : 'text-slate-600'}
                    />
                  );
                })()}
                {listing.status === 'active' && !listing.is_featured && listing.city_slug && (
                  <ActionBtn
                    icon={<Star className="w-4 h-4" />}
                    label="Promote"
                    disabled={actionId === listing.id}
                    onClick={() => router.push(`/${listing.city_slug}/classifieds/${listing.id}/promote`)}
                    color="text-amber-500"
                  />
                )}
                <ActionBtn
                  icon={<Trash2 className="w-4 h-4" />}
                  label="Delete"
                  disabled={actionId === listing.id}
                  onClick={() => handleDelete(listing.id)}
                  color="text-destructive"
                />
              </div>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
}

function ActionBtn({ icon, label, disabled, onClick, color }: {
  icon: React.ReactNode;
  label: string;
  disabled: boolean;
  onClick: () => void;
  color: string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-semibold transition-colors disabled:opacity-40 hover:bg-muted ${color}`}
    >
      {icon} {label}
    </button>
  );
}
