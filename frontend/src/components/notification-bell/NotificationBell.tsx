'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Bell, CheckCircle2, Clock, Star, BellRing, Megaphone, type LucideIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { timeAgo } from '@/lib/utils';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'https://localsindia-backend.azurewebsites.net';

interface Notification {
  id: string;
  type: string;
  title: string;
  body: string | null;
  action_url: string | null;
  is_read: boolean;
  created_at: string;
}

const TYPE_ICON: Record<string, LucideIcon> = {
  listing_approved: CheckCircle2,
  listing_expiring: Clock,
  listing_featured: Star,
  new_listing_match: BellRing,
  default: Megaphone,
};
const TYPE_ICON_COLOR: Record<string, string> = {
  listing_approved: '#16a34a',
  listing_expiring: '#f59e0b',
  listing_featured: '#F7921E',
  new_listing_match: '#6366f1',
  default: '#94a3b8',
};

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unread, setUnread] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;

  const fetchCount = useCallback(async () => {
    const t = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;
    if (!t) return;
    try {
      const r = await fetch(`${API_BASE}/api/v1/notifications/unread-count`, {
        headers: { Authorization: `Bearer ${t}` },
      });
      if (r.ok) { const d = await r.json(); setUnread(d.count); }
    } catch { /* offline */ }
  }, []);

  const fetchNotifications = useCallback(async () => {
    const t = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;
    if (!t) return;
    try {
      const r = await fetch(`${API_BASE}/api/v1/notifications?limit=20`, {
        headers: { Authorization: `Bearer ${t}` },
      });
      if (r.ok) { setNotifications(await r.json()); setLoaded(true); }
    } catch { /* offline */ }
  }, []);

  useEffect(() => { fetchCount(); }, [fetchCount]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const handleOpen = () => {
    setOpen(v => !v);
    if (!open && !loaded) fetchNotifications();
  };

  const markRead = async (id: string) => {
    const t = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;
    if (!t) return;
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
    setUnread(prev => Math.max(0, prev - 1));
    fetch(`${API_BASE}/api/v1/notifications/read/${id}`, {
      method: 'POST', headers: { Authorization: `Bearer ${t}` },
    }).catch(() => {});
  };

  const markAllRead = async () => {
    const t = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;
    if (!t) return;
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    setUnread(0);
    fetch(`${API_BASE}/api/v1/notifications/read-all`, {
      method: 'POST', headers: { Authorization: `Bearer ${t}` },
    }).catch(() => {});
  };

  if (!token) return null;

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={handleOpen}
        aria-label="Notifications"
        className="relative flex items-center justify-center w-8 h-8 rounded-xl
          text-slate-500 hover:bg-slate-50 hover:text-slate-800 transition-colors"
      >
        <Bell className="w-[17px] h-[17px]" strokeWidth={1.9} />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1
            rounded-full bg-red-500 text-white text-[9px] font-bold
            flex items-center justify-center leading-none">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: -6 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -4 }}
            transition={{ duration: 0.16, ease: [0.22, 1, 0.36, 1] }}
            style={{ transformOrigin: 'top right' }}
            className="absolute right-0 top-[calc(100%+8px)] w-80 z-50 bg-white rounded-2xl
              shadow-[0_8px_32px_rgba(0,0,0,0.12),0_0_0_1px_rgba(0,0,0,0.04)]"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
              <span className="text-sm font-semibold text-slate-800">Notifications</span>
              {unread > 0 && (
                <button
                  type="button"
                  onClick={markAllRead}
                  className="text-xs text-[#F7921E] font-medium hover:underline"
                >
                  Mark all read
                </button>
              )}
            </div>

            {/* List */}
            <div className="max-h-[360px] overflow-y-auto">
              {!loaded ? (
                <div className="flex justify-center py-8">
                  <div className="w-5 h-5 rounded-full border-2 border-[#F7921E]/30 border-t-[#F7921E] animate-spin" />
                </div>
              ) : notifications.length === 0 ? (
                <div className="text-center py-10">
                  <Bell className="w-8 h-8 mx-auto mb-2 text-slate-200" strokeWidth={1.5} />
                  <p className="text-sm text-slate-400">No notifications yet</p>
                </div>
              ) : (
                notifications.map(n => {
                  const Icon = TYPE_ICON[n.type] ?? TYPE_ICON.default;
                  return (
                  <button
                    key={n.id}
                    type="button"
                    onClick={() => { markRead(n.id); if (n.action_url) { window.location.href = n.action_url; setOpen(false); } }}
                    className={`w-full text-left flex gap-3 px-4 py-3 border-b border-slate-50 cursor-pointer transition-colors
                      ${n.is_read ? 'hover:bg-slate-50' : 'bg-orange-50/60 hover:bg-orange-50'}`}
                  >
                    <Icon size={18} className="shrink-0 mt-0.5" style={{ color: TYPE_ICON_COLOR[n.type] ?? TYPE_ICON_COLOR.default }} />
                    <div className="flex-1 min-w-0">
                      <p className={`text-xs leading-snug ${n.is_read ? 'text-slate-600' : 'text-slate-900 font-medium'}`}>
                        {n.title}
                      </p>
                      {n.body && <p className="text-[11px] text-slate-400 mt-0.5 line-clamp-1">{n.body}</p>}
                      <p className="text-[10px] text-slate-400 mt-1">{timeAgo(n.created_at)}</p>
                    </div>
                    {!n.is_read && (
                      <span className="w-2 h-2 rounded-full bg-[#F7921E] shrink-0 mt-1.5" />
                    )}
                  </button>
                  );
                })
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
