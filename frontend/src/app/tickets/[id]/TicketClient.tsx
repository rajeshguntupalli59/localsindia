'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowLeft, CalendarDays, MapPin, CheckCircle2 } from 'lucide-react';
import { api, ApiError } from '@/lib/api';
import type { Ticket } from '@/lib/types';

export default function TicketClient({ id }: { id: string }) {
  const router = useRouter();
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (!token) {
      router.push('/auth/login');
      return;
    }
    api.tickets
      .get(id, token)
      .then(setTicket)
      .catch(err => setError(err instanceof ApiError ? err.message : 'Failed to load ticket'))
      .finally(() => setLoading(false));
  }, [id, router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FAFAFA]">
        <div className="max-w-sm mx-auto px-4 py-10">
          <div className="h-72 rounded-2xl bg-slate-100 animate-pulse" />
        </div>
      </div>
    );
  }

  if (error || !ticket) {
    return (
      <div className="min-h-screen bg-[#FAFAFA] flex flex-col items-center justify-center px-4 text-center">
        <h1 className="text-xl font-bold text-slate-900 mb-2">{error ?? 'Ticket not found'}</h1>
        <Link href="/" className="text-sm font-semibold text-[#F7921E]">Back to LocalsIndia</Link>
      </div>
    );
  }

  const date = new Date(ticket.event_date);
  const dateLabel = date.toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' });
  const timeLabel = date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });

  return (
    <div className="min-h-screen bg-[#FAFAFA]">
      <div className="max-w-sm mx-auto px-4 py-10">
        <Link
          href={`/events/${ticket.event_id}`}
          className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-800 mb-6"
        >
          <ArrowLeft className="w-4 h-4" /> Back to event
        </Link>

        <div className="bg-white rounded-2xl border border-slate-100 p-6 text-center">
          {ticket.used_at ? (
            <div className="mb-4 inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full">
              Used
            </div>
          ) : (
            <div className="mb-4 inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-green-700 bg-green-50 px-2.5 py-1 rounded-full">
              <CheckCircle2 className="w-3.5 h-3.5" /> Valid
            </div>
          )}

          <h1 className="text-lg font-bold text-slate-900">{ticket.event_title}</h1>
          <div className="flex items-center justify-center gap-1.5 text-sm text-slate-500 mt-2">
            <CalendarDays className="w-4 h-4" />
            <span>{dateLabel} · {timeLabel}</span>
          </div>
          <div className="flex items-center justify-center gap-1.5 text-sm text-slate-500 mt-1">
            <MapPin className="w-4 h-4" />
            <span>{ticket.event_venue}</span>
          </div>

          <Image
            src={ticket.qr_image}
            alt="Ticket QR code"
            unoptimized
            className={`mx-auto mt-6 rounded-xl ${ticket.used_at ? 'opacity-40' : ''}`}
            width={220}
            height={220}
          />
          <p className="text-xs text-slate-400 mt-4">Show this QR code at the entrance</p>
        </div>
      </div>
    </div>
  );
}
