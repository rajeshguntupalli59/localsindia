'use client';

import { useState } from 'react';
import { Send } from 'lucide-react';
import { toast } from 'sonner';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000';

export default function AdminAnnouncementsPage() {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const [confirming, setConfirming] = useState(false);

  const send = async () => {
    const token = localStorage.getItem('access_token');
    if (!token) return;
    setSending(true);
    try {
      const res = await fetch(`${API_BASE}/api/v1/admin/broadcast`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, body }),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      toast.success(`Sent to ${data.devices_pushed} device${data.devices_pushed === 1 ? '' : 's'} (${data.users_notified} user${data.users_notified === 1 ? '' : 's'})`);
      setTitle('');
      setBody('');
    } catch {
      toast.error('Failed to send announcement');
    } finally {
      setSending(false);
      setConfirming(false);
    }
  };

  const canSend = title.trim().length > 0 && body.trim().length > 0;

  return (
    <div className="p-6 max-w-lg">
      <h1 className="text-xl font-bold">Send Announcement</h1>
      <p className="text-sm text-muted-foreground mt-1">
        Sends a push notification (and an in-app alert) to every device that has LocalsIndia installed. Use this for real updates — new features, downtime notices, important changes.
      </p>

      <div className="mt-6 space-y-4">
        <div>
          <label className="text-sm font-semibold block mb-1.5">Title</label>
          <input
            type="text"
            value={title}
            onChange={e => setTitle(e.target.value)}
            maxLength={60}
            placeholder="e.g. New: PG search filters"
            className="w-full border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
          />
          <p className="text-xs text-muted-foreground mt-1">{title.length}/60</p>
        </div>
        <div>
          <label className="text-sm font-semibold block mb-1.5">Message</label>
          <textarea
            value={body}
            onChange={e => setBody(e.target.value)}
            rows={4}
            maxLength={200}
            placeholder="What do you want to tell everyone?"
            className="w-full border rounded-xl px-3 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-200"
          />
          <p className="text-xs text-muted-foreground mt-1">{body.length}/200</p>
        </div>

        <button
          onClick={() => setConfirming(true)}
          disabled={!canSend || sending}
          className="flex items-center justify-center gap-2 w-full py-3 rounded-xl text-white text-sm font-semibold disabled:opacity-40 transition-opacity"
          style={{ background: 'var(--li-primary)' }}
        >
          <Send className="w-4 h-4" /> Send to everyone
        </button>
      </div>

      {confirming && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => !sending && setConfirming(false)} />
          <div className="relative bg-white rounded-2xl p-5 w-full max-w-sm space-y-4">
            <h2 className="font-semibold">Send to every device?</h2>
            <div className="text-sm bg-slate-50 rounded-xl p-3 space-y-1">
              <p className="font-semibold">{title}</p>
              <p className="text-muted-foreground">{body}</p>
            </div>
            <p className="text-sm text-muted-foreground">This goes out immediately to everyone with the app installed. This can&apos;t be recalled once sent.</p>
            <div className="flex gap-3">
              <button onClick={() => setConfirming(false)} disabled={sending} className="flex-1 py-2.5 rounded-xl border text-sm font-semibold disabled:opacity-50">
                Cancel
              </button>
              <button onClick={send} disabled={sending} className="flex-1 py-2.5 rounded-xl bg-red-600 text-white text-sm font-semibold disabled:opacity-50">
                {sending ? 'Sending...' : 'Yes, send it'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
