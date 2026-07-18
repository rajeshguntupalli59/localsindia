'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { CalendarDays, MapPin, Ticket, Plus } from 'lucide-react';
import Link from 'next/link';
import { api } from '@/lib/api';
import type { Event } from '@/lib/types';
import SiteHeader from '@/components/site-header/SiteHeader';
import SiteFooter from '@/components/site-footer/SiteFooter';
import BottomNav from '@/components/bottom-nav/BottomNav';

function EventCardSkeleton() {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-5 animate-pulse">
      <div className="h-4 bg-slate-200 rounded w-1/3 mb-3" />
      <div className="h-5 bg-slate-200 rounded w-3/4 mb-2" />
      <div className="h-4 bg-slate-200 rounded w-1/2 mb-4" />
      <div className="h-8 bg-slate-200 rounded-xl w-28" />
    </div>
  );
}

function EventCard({ event }: { event: Event }) {
  const date = new Date(event.event_date);
  const day = date.toLocaleDateString('en-IN', { day: '2-digit' });
  const month = date.toLocaleDateString('en-IN', { month: 'short' });
  const time = date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });

  return (
    <motion.div
      whileHover={{ y: -2 }}
      className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm hover:shadow-md transition-shadow"
    >
      <div className="flex gap-4">
        {/* Date badge */}
        <div
          className="flex-shrink-0 w-14 h-14 rounded-xl flex flex-col items-center justify-center text-white"
          style={{ background: 'var(--li-primary)' }}
        >
          <span className="text-lg font-black leading-none">{day}</span>
          <span className="text-[10px] font-semibold uppercase">{month}</span>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span
              className={`text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full ${
                event.is_free
                  ? 'bg-green-100 text-green-700'
                  : 'bg-amber-100 text-amber-700'
              }`}
            >
              {event.is_free ? 'Free' : 'Paid'}
            </span>
          </div>
          <h3 className="font-bold text-slate-900 line-clamp-1">{event.title}</h3>
          <div className="flex items-center gap-1 text-xs text-slate-500 mt-1">
            <MapPin className="w-3 h-3 flex-shrink-0" />
            <span className="truncate">{event.venue}</span>
            <span className="mx-1">·</span>
            <span>{time}</span>
          </div>
        </div>
      </div>

      <p className="text-sm text-slate-600 mt-3 line-clamp-2">{event.description}</p>

      <div className="mt-4">
        {event.is_free || event.ticket_price ? (
          <Link
            href={`/events/${event.id}`}
            className="inline-flex items-center gap-1.5 text-sm font-semibold px-4 py-2 rounded-xl border-2 transition-colors"
            style={{ borderColor: 'var(--li-primary)', color: 'var(--li-primary)' }}
          >
            {event.is_free ? 'View Details' : (
              <>
                <Ticket className="w-3.5 h-3.5" /> Buy Ticket
              </>
            )}
          </Link>
        ) : (
          <a
            href={event.ticket_url ?? '#'}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-sm font-semibold px-4 py-2 rounded-xl text-white transition-opacity hover:opacity-90"
            style={{ background: 'var(--li-primary)' }}
          >
            <Ticket className="w-3.5 h-3.5" />
            Get Tickets
          </a>
        )}
      </div>
    </motion.div>
  );
}

export default function EventsPage() {
  const params = useParams();
  const citySlug = params.city as string;

  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [cityName, setCityName] = useState('');

  useEffect(() => {
    async function load() {
      try {
        const [eventsData, cityData] = await Promise.all([
          api.events.list(citySlug),
          api.cities.get(citySlug),
        ]);
        setEvents(eventsData);
        setCityName(cityData.name);
      } catch {
        // city may not exist
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [citySlug]);

  return (
    <div className="min-h-screen" style={{ background: 'var(--li-page-bg)' }}>
      <SiteHeader />

      <div className="page-wrap py-8 pb-24">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-black" style={{ color: 'var(--li-text)' }}>
              Events in {cityName || citySlug}
            </h1>
            <p className="text-sm text-slate-500 mt-0.5">Discover what&apos;s happening near you</p>
          </div>
          <Link
            href={`/${citySlug}/events/post`}
            className="flex items-center gap-1.5 text-sm font-semibold px-4 py-2 rounded-xl text-white"
            style={{ background: 'var(--li-primary)' }}
          >
            <Plus className="w-4 h-4" />
            Post Event
          </Link>
        </div>

        {/* Events grid */}
        {loading ? (
          <div className="grid gap-4 sm:grid-cols-2">
            {[...Array(4)].map((_, i) => <EventCardSkeleton key={i} />)}
          </div>
        ) : events.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <CalendarDays className="w-12 h-12 text-slate-300 mb-4" />
            <h3 className="text-lg font-bold text-slate-700">No events yet</h3>
            <p className="text-sm text-slate-500 mt-1 mb-6">Be the first to post an event in {cityName}!</p>
            <Link
              href={`/${citySlug}/events/post`}
              className="text-sm font-semibold px-5 py-2.5 rounded-xl text-white"
              style={{ background: 'var(--li-primary)' }}
            >
              Post an Event →
            </Link>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {events.map(event => (
              <EventCard key={event.id} event={event} />
            ))}
          </div>
        )}
      </div>

      <SiteFooter />
      <BottomNav citySlug={citySlug} />
    </div>
  );
}
