'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Ticket as TicketIcon, CalendarDays } from 'lucide-react';
import { api } from '@/lib/api';
import type { Ticket } from '@/lib/types';

export default function MyTicketsPage() {
  const router = useRouter();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (!token) {
      router.push('/auth/login');
      return;
    }
    api.tickets.my(token).then(setTickets).catch(() => {}).finally(() => setLoading(false));
  }, [router]);

  return (
    <div className="min-h-screen bg-[#FAFAFA]">
      <div className="max-w-lg mx-auto px-4 py-10">
        <Link href="/profile" className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-800 mb-6">
          <ArrowLeft className="w-4 h-4" /> Back to profile
        </Link>

        <h1 className="text-2xl font-bold text-slate-900 mb-6">My Tickets</h1>

        {loading ? (
          <div className="space-y-3">
            {[0, 1].map(i => <div key={i} className="h-20 rounded-2xl bg-slate-100 animate-pulse" />)}
          </div>
        ) : tickets.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <TicketIcon className="w-10 h-10 text-slate-300 mb-3" />
            <p className="text-sm text-slate-500">No tickets yet.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {tickets.map(t => {
              const date = new Date(t.event_date);
              return (
                <Link
                  key={t.id}
                  href={`/tickets/${t.id}`}
                  className="block bg-white rounded-2xl border border-slate-100 p-4 hover:shadow-sm transition-shadow"
                >
                  <div className="flex items-center justify-between">
                    <p className="font-semibold text-slate-900">{t.event_title}</p>
                    {t.used_at && (
                      <span className="text-[10px] font-bold uppercase tracking-wide text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                        Used
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-1.5">
                    <CalendarDays className="w-3.5 h-3.5" />
                    {date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })} · {t.event_venue}
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
