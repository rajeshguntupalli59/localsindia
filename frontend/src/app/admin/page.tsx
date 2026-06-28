'use client';

import { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  Users, ClipboardList, Star, MapPin, Eye, MessageCircle,
  Heart, FileText, Phone, AlertCircle,
  CheckCircle, RefreshCw, TrendingUp, Flag, CalendarDays,
} from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000';

interface PlatformStats {
  users: { total: number; new_today: number; new_7d: number; new_by_day: { date: string; count: number }[] };
  listings: {
    total: number; pending: number; active: number; flagged: number;
    rejected: number; expired: number; fulfilled: number; featured: number;
    total_views: number; total_contacts: number;
  };
  events: { pending: number; active: number };
  cities: { total: number; with_listings: number; top: { name: string; state: string; count: number }[] };
  otp: { today_total: number; today_verified: number };
  content: { reports: number; saves: number; reviews: number };
  system: { chatbot_key_set: boolean; razorpay_configured: boolean; sendgrid_configured: boolean };
}

function fmt(n: number) {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(n);
}

function KpiCard({ label, value, sub, icon: Icon, color }: {
  label: string; value: string | number; sub?: string;
  icon: React.ElementType; color: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-xl shadow-sm p-5 flex items-start gap-4"
    >
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${color}`}>
        <Icon className="w-5 h-5 text-white" />
      </div>
      <div>
        <p className="text-2xl font-bold">{value}</p>
        <p className="text-xs text-muted-foreground font-medium">{label}</p>
        {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
      </div>
    </motion.div>
  );
}

function ActionItem({ label, count, href, urgent }: { label: string; count: number; href: string; urgent: boolean }) {
  if (count === 0) return null;
  return (
    <Link href={href} className="flex items-center justify-between px-4 py-3 hover:bg-muted/50 rounded-lg transition-colors group">
      <div className="flex items-center gap-2.5">
        <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${urgent ? 'bg-red-500' : 'bg-amber-400'}`} />
        <span className="text-sm font-medium">{label}</span>
      </div>
      <div className="flex items-center gap-2">
        <span className={`text-sm font-bold ${urgent ? 'text-red-600' : 'text-amber-600'}`}>{count}</span>
        <span className="text-muted-foreground text-xs opacity-0 group-hover:opacity-100 transition-opacity">→</span>
      </div>
    </Link>
  );
}

function HealthItem({ label, ok, note }: { label: string; ok: boolean; note?: string }) {
  return (
    <div className="flex items-center gap-2.5 py-2">
      {ok
        ? <CheckCircle className="w-4 h-4 text-green-500 shrink-0" />
        : <AlertCircle className="w-4 h-4 text-amber-500 shrink-0" />}
      <div>
        <span className="text-sm font-medium">{label}</span>
        {note && <p className="text-xs text-muted-foreground">{note}</p>}
      </div>
    </div>
  );
}

function FunnelBar({ label, count, total, color }: { label: string; count: number; total: number; color: string }) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-semibold">{fmt(count)} <span className="text-muted-foreground font-normal">({pct}%)</span></span>
      </div>
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function SparkBar({ date, count, max }: { date: string; count: number; max: number }) {
  const pct = max > 0 ? Math.max(4, Math.round((count / max) * 100)) : 4;
  const day = new Date(date).toLocaleDateString('en', { weekday: 'short' });
  return (
    <div className="flex flex-col items-center gap-1 flex-1">
      <span className="text-xs font-semibold text-slate-700">{count}</span>
      <div className="w-full flex items-end justify-center" style={{ height: 48 }}>
        <div
          className="w-full max-w-[28px] rounded-t-md bg-blue-400"
          style={{ height: `${pct}%` }}
        />
      </div>
      <span className="text-xs text-muted-foreground">{day}</span>
    </div>
  );
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const token = () => localStorage.getItem('access_token') ?? '';

  const fetchStats = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/v1/admin/stats`, {
        headers: { Authorization: `Bearer ${token()}` },
      });
      if (!res.ok) throw new Error();
      setStats(await res.json());
    } catch {
      toast.error('Failed to load stats');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchStats(); }, [fetchStats]);

  if (loading) {
    return (
      <div className="p-6 space-y-4">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-24 bg-white rounded-xl animate-pulse" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-40 bg-white rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (!stats) return null;

  const otpRate = stats.otp.today_total > 0
    ? Math.round((stats.otp.today_verified / stats.otp.today_total) * 100)
    : null;

  const anyActionNeeded = stats.listings.pending > 0 || stats.events.pending > 0 || stats.listings.flagged > 0 || stats.content.reports > 0;
  const maxDayUsers = Math.max(...(stats.users.new_by_day.map(d => d.count)), 1);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Dashboard</h1>
          <p className="text-sm text-muted-foreground">localsindia.com platform overview</p>
        </div>
        <button
          onClick={() => fetchStats(true)}
          disabled={refreshing}
          className="flex items-center gap-2 px-3 py-2 rounded-lg border text-sm hover:bg-muted transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label="Total Users"
          value={fmt(stats.users.total)}
          sub={`+${stats.users.new_today} today · +${stats.users.new_7d} this week`}
          icon={Users}
          color="bg-blue-500"
        />
        <KpiCard
          label="Active Listings"
          value={fmt(stats.listings.active)}
          sub={`${stats.listings.pending} pending review`}
          icon={ClipboardList}
          color="bg-orange-500"
        />
        <KpiCard
          label="Featured Listings"
          value={stats.listings.featured}
          sub="paid promotions live"
          icon={Star}
          color="bg-amber-500"
        />
        <KpiCard
          label="Cities Seeded"
          value={`${stats.cities.with_listings}/${stats.cities.total}`}
          sub="cities with active listings"
          icon={MapPin}
          color="bg-green-500"
        />
      </div>

      {/* Action Required + System Health */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Action Required */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-xl shadow-sm p-5"
        >
          <h2 className="text-sm font-bold mb-3 flex items-center gap-2">
            <Flag className="w-4 h-4 text-red-500" /> Action Required
          </h2>
          {anyActionNeeded ? (
            <div className="divide-y">
              <ActionItem label="Listings pending approval" count={stats.listings.pending} href="/admin/listings" urgent={stats.listings.pending > 5} />
              <ActionItem label="Events pending approval" count={stats.events.pending} href="/admin/events" urgent={false} />
              <ActionItem label="Flagged listings" count={stats.listings.flagged} href="/admin/listings" urgent={true} />
              <ActionItem label="Open content reports" count={stats.content.reports} href="/admin/reports" urgent={stats.content.reports > 3} />
            </div>
          ) : (
            <div className="flex items-center gap-2 text-green-600 py-2">
              <CheckCircle className="w-4 h-4" />
              <span className="text-sm font-medium">All clear — nothing needs attention</span>
            </div>
          )}
        </motion.div>

        {/* System Health */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="bg-white rounded-xl shadow-sm p-5"
        >
          <h2 className="text-sm font-bold mb-3">System Health</h2>
          <div className="divide-y">
            <HealthItem
              label="Backend API"
              ok={true}
              note="Stats loaded successfully"
            />
            <HealthItem
              label="OTP Service (MSG91)"
              ok={otpRate === null || otpRate >= 70}
              note={otpRate !== null ? `${otpRate}% success rate today (${stats.otp.today_verified}/${stats.otp.today_total})` : 'No OTP requests today'}
            />
            <HealthItem
              label="AI Chatbot (Gemini)"
              ok={stats.system.chatbot_key_set}
              note={stats.system.chatbot_key_set ? 'GOOGLE_AI_KEY configured' : 'API key not set — chatbot offline'}
            />
            <HealthItem
              label="Razorpay Payments"
              ok={stats.system.razorpay_configured}
              note={stats.system.razorpay_configured ? 'Test keys configured' : 'Not configured'}
            />
            <HealthItem
              label="Email (SendGrid)"
              ok={stats.system.sendgrid_configured}
              note={stats.system.sendgrid_configured ? 'Configured' : 'Not set — emails skipped silently'}
            />
          </div>
        </motion.div>
      </div>

      {/* Content Funnel + Engagement */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Listing Funnel */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-xl shadow-sm p-5 space-y-4"
        >
          <h2 className="text-sm font-bold flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-blue-500" />
            Listing Funnel ({fmt(stats.listings.total)} total)
          </h2>
          <div className="space-y-3">
            <FunnelBar label="Active" count={stats.listings.active} total={stats.listings.total} color="bg-green-400" />
            <FunnelBar label="Featured (paid)" count={stats.listings.featured} total={stats.listings.total} color="bg-amber-400" />
            <FunnelBar label="Pending review" count={stats.listings.pending} total={stats.listings.total} color="bg-blue-400" />
            <FunnelBar label="Expired" count={stats.listings.expired} total={stats.listings.total} color="bg-slate-300" />
            <FunnelBar label="Rejected" count={stats.listings.rejected} total={stats.listings.total} color="bg-red-300" />
            <FunnelBar label="Fulfilled / Sold" count={stats.listings.fulfilled} total={stats.listings.total} color="bg-purple-300" />
          </div>
        </motion.div>

        {/* Engagement */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="bg-white rounded-xl shadow-sm p-5"
        >
          <h2 className="text-sm font-bold mb-4">Engagement</h2>
          <div className="grid grid-cols-2 gap-4">
            {[
              { icon: Eye, label: 'Total Views', value: fmt(stats.listings.total_views), color: 'text-blue-500' },
              { icon: MessageCircle, label: 'WA Contact Taps', value: fmt(stats.listings.total_contacts), color: 'text-green-500' },
              { icon: Heart, label: 'Saved Listings', value: fmt(stats.content.saves), color: 'text-red-500' },
              { icon: FileText, label: 'Listing Reviews', value: fmt(stats.content.reviews), color: 'text-purple-500' },
              { icon: Phone, label: 'OTP Verifications', value: fmt(stats.otp.today_verified), color: 'text-amber-500' },
              { icon: CalendarDays, label: 'Active Events', value: fmt(stats.events.active), color: 'text-teal-500' },
            ].map(({ icon: Icon, label, value, color }) => (
              <div key={label} className="flex items-center gap-3">
                <Icon className={`w-4 h-4 shrink-0 ${color}`} />
                <div>
                  <p className="text-lg font-bold leading-none">{value}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-5 pt-4 border-t">
            <p className="text-xs text-muted-foreground mb-1">Listing approval rate</p>
            <div className="flex items-center gap-2">
              <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-green-400 rounded-full"
                  style={{
                    width: `${stats.listings.total > 0
                      ? Math.round((stats.listings.active / (stats.listings.total - stats.listings.pending)) * 100)
                      : 0}%`
                  }}
                />
              </div>
              <span className="text-xs font-semibold">
                {stats.listings.total - stats.listings.pending > 0
                  ? `${Math.round((stats.listings.active / (stats.listings.total - stats.listings.pending)) * 100)}%`
                  : '—'}
              </span>
            </div>
          </div>
        </motion.div>
      </div>

      {/* New Users chart */}
      {stats.users.new_by_day.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white rounded-xl shadow-sm p-5"
        >
          <h2 className="text-sm font-bold mb-4">New Users — Last 7 Days</h2>
          <div className="flex gap-2 items-end">
            {stats.users.new_by_day.map(d => (
              <SparkBar key={d.date} date={d.date} count={d.count} max={maxDayUsers} />
            ))}
          </div>
        </motion.div>
      )}

      {/* Quick links */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35 }}
        className="flex gap-3 flex-wrap"
      >
        <Link href="/admin/monitoring" className="text-sm px-4 py-2 rounded-lg border hover:bg-muted transition-colors flex items-center gap-2">
          <MapPin className="w-3.5 h-3.5" /> City breakdown →
        </Link>
        <Link href="/admin/listings?status=pending" className="text-sm px-4 py-2 rounded-lg border hover:bg-muted transition-colors flex items-center gap-2">
          <ClipboardList className="w-3.5 h-3.5" /> Review pending listings →
        </Link>
        <Link href="/admin/users" className="text-sm px-4 py-2 rounded-lg border hover:bg-muted transition-colors flex items-center gap-2">
          <Users className="w-3.5 h-3.5" /> Manage users →
        </Link>
      </motion.div>
    </div>
  );
}
