'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, CalendarDays, MapPin, Ticket as TicketIcon, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import { api, ApiError } from '@/lib/api';
import type { Event } from '@/lib/types';
import { loadRazorpay, openRazorpay } from '@/lib/razorpay';

function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse bg-slate-100 rounded-lg ${className ?? ''}`} />;
}

export default function EventDetailClient({ id, initialEvent = null }: { id: string; initialEvent?: Event | null }) {
  const router = useRouter();
  const [event, setEvent] = useState<Event | null>(initialEvent);
  const [loading, setLoading] = useState(!initialEvent);
  const [buying, setBuying] = useState(false);

  useEffect(() => {
    if (initialEvent) return;
    api.events.get(id).then(setEvent).catch(() => {}).finally(() => setLoading(false));
  }, [id, initialEvent]);

  useEffect(() => {
    loadRazorpay();
  }, []);

  const handleBuyTicket = async () => {
    const token = localStorage.getItem('access_token');
    if (!token) {
      toast.error('Please sign in to buy a ticket.');
      router.push('/auth/login');
      return;
    }
    if (!event) return;

    setBuying(true);
    try {
      const order = await api.tickets.createOrder(event.id, token);
      openRazorpay({
        key: order.key_id,
        amount: order.amount,
        currency: order.currency,
        order_id: order.order_id,
        name: 'LocalsIndia',
        description: event.title,
        handler: async (response: {
          razorpay_payment_id: string;
          razorpay_order_id: string;
          razorpay_signature: string;
        }) => {
          try {
            const ticket = await api.tickets.verify(
              {
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                event_id: event.id,
              },
              token,
            );
            toast.success('Ticket purchased!');
            router.push(`/tickets/${ticket.id}`);
          } catch (err) {
            toast.error(err instanceof ApiError ? err.message : 'Payment verification failed');
          } finally {
            setBuying(false);
          }
        },
        modal: { ondismiss: () => setBuying(false) },
      });
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Could not start payment');
      setBuying(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FAFAFA]">
        <div className="max-w-lg mx-auto px-4 py-10 space-y-4">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-8 w-3/4" />
          <Skeleton className="h-40 w-full" />
        </div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-screen bg-[#FAFAFA] flex flex-col items-center justify-center px-4 text-center">
        <h1 className="text-xl font-bold text-slate-900 mb-2">Event not found</h1>
        <Link href="/" className="text-sm font-semibold text-[#F7921E]">Back to LocalsIndia</Link>
      </div>
    );
  }

  const date = new Date(event.event_date);
  const dateLabel = date.toLocaleDateString('en-IN', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });
  const timeLabel = date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });

  return (
    <div className="min-h-screen bg-[#FAFAFA]">
      <div className="max-w-lg mx-auto px-4 py-10">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-800 mb-6"
        >
          <ArrowLeft className="w-4 h-4" /> Back
        </Link>

        <div className="bg-white rounded-2xl border border-slate-100 p-6">
          <span
            className={`text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full ${
              event.is_free ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
            }`}
          >
            {event.is_free ? 'Free' : 'Paid'}
          </span>
          <h1 className="text-2xl font-bold text-slate-900 mt-2">{event.title}</h1>

          <div className="flex items-center gap-2 text-sm text-slate-500 mt-3">
            <CalendarDays className="w-4 h-4 shrink-0" />
            <span>{dateLabel} · {timeLabel}</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-slate-500 mt-1.5">
            <MapPin className="w-4 h-4 shrink-0" />
            <span>{event.venue}</span>
          </div>

          <p className="text-sm text-slate-700 mt-5 whitespace-pre-wrap">{event.description}</p>

          <div className="mt-6">
            {event.is_free ? (
              <div className="rounded-xl bg-green-50 border border-green-100 p-4 text-sm text-green-700 font-medium">
                This is a free event — just show up at the venue.
              </div>
            ) : event.ticket_price ? (
              <button
                onClick={handleBuyTicket}
                disabled={buying}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-white font-semibold text-sm disabled:opacity-60"
                style={{ background: '#F7921E' }}
              >
                <TicketIcon className="w-4 h-4" />
                {buying ? 'Processing...' : `Buy Ticket — ₹${event.ticket_price}`}
              </button>
            ) : event.ticket_url ? (
              <a
                href={event.ticket_url}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-white font-semibold text-sm"
                style={{ background: '#F7921E' }}
              >
                <ExternalLink className="w-4 h-4" />
                Get Tickets
              </a>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
