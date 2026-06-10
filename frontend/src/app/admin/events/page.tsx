'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle, XCircle, Clock, CalendarDays, MapPin, Ticket } from 'lucide-react';
import { timeAgo } from '@/lib/utils';
import EmptyState from '@/components/empty-state/EmptyState';
import { toast } from 'sonner';

interface EventItem {
  id: string;
  title: string;
  description: string;
  venue: string;
  event_date: string;
  is_free: boolean;
  ticket_url: string | null;
  status: string;
  city_id: string;
  user_id: string;
  created_at: string;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000';

const STATUS_TABS = [
  { key: 'pending',   label: 'Pending' },
  { key: 'active',    label: 'Active' },
  { key: 'cancelled', label: 'Cancelled' },
  { key: 'completed', label: 'Completed' },
];

function formatEventDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

export default function AdminEventsPage() {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('pending');
  const [actionId, setActionId] = useState<string | null>(null);
  const [rejectModal, setRejectModal] = useState<string | null>(null);

  const token = () => localStorage.getItem('access_token') ?? '';

  const fetchEvents = async (status: string) => {
    setLoading(true);
    try {
      const endpoint = status === 'pending'
        ? `${API_BASE}/api/v1/admin/events/pending`
        : `${API_BASE}/api/v1/admin/events?status=${status}`;
      const res = await fetch(endpoint, {
        headers: { Authorization: `Bearer ${token()}` },
      });
      if (!res.ok) throw new Error();
      setEvents(await res.json());
    } catch {
      toast.error('Failed to load events');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchEvents(tab); }, [tab]);

  const approve = async (id: string) => {
    setActionId(id);
    try {
      const res = await fetch(`${API_BASE}/api/v1/admin/events/${id}/approve`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token()}` },
      });
      if (!res.ok) throw new Error();
      toast.success('Event approved');
      setEvents(ev => ev.filter(e => e.id !== id));
    } catch {
      toast.error('Failed to approve');
    } finally {
      setActionId(null);
    }
  };

  const reject = async (id: string) => {
    setActionId(id);
    try {
      const res = await fetch(`${API_BASE}/api/v1/admin/events/${id}/reject`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token()}` },
      });
      if (!res.ok) throw new Error();
      toast.success('Event rejected');
      setEvents(ev => ev.filter(e => e.id !== id));
      setRejectModal(null);
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
          <h1 className="text-xl font-bold">Events</h1>
          <p className="text-sm text-muted-foreground">{events.length} {tab} events</p>
        </div>
        <button
          onClick={() => fetchEvents(tab)}
          className="text-sm px-4 py-2 rounded-lg border hover:bg-muted transition-colors"
        >
          Refresh
        </button>
      </div>

      {/* Status tabs */}
      <div className="flex gap-1 mb-5 bg-muted p-1 rounded-xl w-fit">
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

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-28 bg-white rounded-xl animate-pulse" />
          ))}
        </div>
      ) : events.length === 0 ? (
        <EmptyState icon={Clock} title="No events" description={`No ${tab} events found`} />
      ) : (
        <div className="space-y-3">
          {events.map((event, i) => (
            <motion.div
              key={event.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
              className="bg-white rounded-xl shadow-sm overflow-hidden"
            >
              <div className="flex gap-4 p-4">
                {/* Date block */}
                <div
                  className="w-16 shrink-0 rounded-xl flex flex-col items-center justify-center py-3 text-white"
                  style={{ background: 'var(--li-primary)' }}
                >
                  <CalendarDays className="w-5 h-5 mb-1 opacity-80" />
                  <span className="text-xs font-bold leading-none">
                    {new Date(event.event_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                  </span>
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-start gap-2 flex-wrap">
                    <p className="font-semibold truncate">{event.title}</p>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${
                      event.is_free
                        ? 'bg-green-100 text-green-700'
                        : 'bg-amber-100 text-amber-700'
                    }`}>
                      {event.is_free ? 'Free' : 'Paid'}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground line-clamp-1 mt-0.5">{event.description}</p>
                  <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground flex-wrap">
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3 h-3" /> {event.venue}
                    </span>
                    <span>{formatEventDate(event.event_date)}</span>
                    {event.ticket_url && (
                      <span className="flex items-center gap-1 text-blue-600">
                        <Ticket className="w-3 h-3" />
                        <a href={event.ticket_url} target="_blank" rel="noreferrer" className="underline">
                          Tickets
                        </a>
                      </span>
                    )}
                    <span className="text-muted-foreground/60">Posted {timeAgo(event.created_at)}</span>
                  </div>
                </div>

                {/* Actions */}
                {tab === 'pending' && (
                  <div className="flex gap-2 shrink-0 items-start">
                    <button
                      onClick={() => approve(event.id)}
                      disabled={actionId === event.id}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-green-50 text-green-700 text-xs font-semibold hover:bg-green-100 transition-colors disabled:opacity-50"
                    >
                      <CheckCircle className="w-3.5 h-3.5" /> Approve
                    </button>
                    <button
                      onClick={() => setRejectModal(event.id)}
                      disabled={actionId === event.id}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-red-50 text-red-700 text-xs font-semibold hover:bg-red-100 transition-colors disabled:opacity-50"
                    >
                      <XCircle className="w-3.5 h-3.5" /> Reject
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Reject confirm modal */}
      {rejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setRejectModal(null)} />
          <div className="relative bg-white rounded-2xl p-5 w-full max-w-sm space-y-4">
            <h2 className="font-semibold">Reject Event</h2>
            <p className="text-sm text-muted-foreground">
              This event will be marked as cancelled and hidden from public listings.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setRejectModal(null)}
                className="flex-1 py-2.5 rounded-xl border text-sm font-semibold"
              >
                Cancel
              </button>
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
