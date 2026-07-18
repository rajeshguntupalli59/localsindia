import type { Metadata } from 'next';
import type { Event } from '@/lib/types';
import EventDetailClient from './EventDetailClient';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'https://localsindia-backend.azurewebsites.net';

async function fetchEvent(id: string): Promise<Event | null> {
  try {
    const res = await fetch(`${API_BASE}/api/v1/events/${id}`, { next: { revalidate: 300 } });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export async function generateMetadata(
  { params }: { params: { id: string } }
): Promise<Metadata> {
  const event = await fetchEvent(params.id);
  if (!event) return { title: 'Event not found | LocalsIndia' };
  const title = `${event.title} | LocalsIndia`;
  return {
    title,
    description: event.description.slice(0, 155),
    alternates: { canonical: `https://www.localsindia.com/events/${event.id}` },
  };
}

export default async function EventPage({ params }: { params: { id: string } }) {
  const event = await fetchEvent(params.id);
  return <EventDetailClient id={params.id} initialEvent={event} />;
}
