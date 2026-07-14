'use client';

import { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { RefreshCw, MapPin, Phone, TrendingUp, AlertCircle, CheckCircle, Bug } from 'lucide-react';
import { toast } from 'sonner';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000';

interface PlatformStats {
  users: { total: number; new_today: number; new_7d: number };
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

interface ErrorGroup {
  message: string;
  platform: string;
  context: string | null;
  count: number;
  last_seen: string;
}

function pct(n: number, total: number) {
  if (total === 0) return '0%';
  return `${Math.round((n / total) * 100)}%`;
}

function StatusRow({ label, count, total, color }: { label: string; count: number; total: number; color: string }) {
  const width = total > 0 ? Math.max(1, Math.round((count / total) * 100)) : 0;
  return (
    <tr className="border-b last:border-0">
      <td className="py-2.5 pr-4 text-sm font-medium w-32">{label}</td>
      <td className="py-2.5 pr-4">
        <div className="h-2 bg-muted rounded-full overflow-hidden w-full">
          <div className={`h-full rounded-full ${color}`} style={{ width: `${width}%` }} />
        </div>
      </td>
      <td className="py-2.5 text-right text-sm font-semibold w-16">{count.toLocaleString()}</td>
      <td className="py-2.5 text-right text-xs text-muted-foreground w-14">{pct(count, total)}</td>
    </tr>
  );
}

export default function AdminMonitoringPage() {
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [errorGroups, setErrorGroups] = useState<ErrorGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const token = () => localStorage.getItem('access_token') ?? '';

  const fetchStats = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    try {
      const [statsRes, errorsRes] = await Promise.all([
        fetch(`${API_BASE}/api/v1/admin/stats`, { headers: { Authorization: `Bearer ${token()}` } }),
        fetch(`${API_BASE}/api/v1/admin/errors`, { headers: { Authorization: `Bearer ${token()}` } }),
      ]);
      if (!statsRes.ok) throw new Error();
      setStats(await statsRes.json());
      setErrorGroups(errorsRes.ok ? await errorsRes.json() : []);
    } catch {
      toast.error('Failed to load monitoring data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchStats(); }, [fetchStats]);

  if (loading) {
    return (
      <div className="p-6 space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-48 bg-white rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  if (!stats) return null;

  const otpRate = stats.otp.today_total > 0
    ? Math.round((stats.otp.today_verified / stats.otp.today_total) * 100)
    : null;

  const maxCityCount = stats.cities.top[0]?.count ?? 1;

  const listingStatuses = [
    { label: 'Active', count: stats.listings.active, color: 'bg-green-400' },
    { label: 'Pending', count: stats.listings.pending, color: 'bg-blue-400' },
    { label: 'Expired', count: stats.listings.expired, color: 'bg-slate-300' },
    { label: 'Rejected', count: stats.listings.rejected, color: 'bg-red-400' },
    { label: 'Flagged', count: stats.listings.flagged, color: 'bg-orange-400' },
    { label: 'Fulfilled', count: stats.listings.fulfilled, color: 'bg-purple-400' },
  ];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Monitoring</h1>
          <p className="text-sm text-muted-foreground">Detailed platform metrics and city breakdown</p>
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

      {/* Listing Status Breakdown */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-xl shadow-sm p-5"
      >
        <h2 className="text-sm font-bold mb-4 flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-blue-500" />
          Listing Status Breakdown
          <span className="text-muted-foreground font-normal ml-1">— {stats.listings.total.toLocaleString()} total</span>
        </h2>
        <table className="w-full">
          <tbody>
            {listingStatuses.map(s => (
              <StatusRow key={s.label} label={s.label} count={s.count} total={stats.listings.total} color={s.color} />
            ))}
          </tbody>
        </table>
        <div className="mt-4 pt-4 border-t grid grid-cols-3 gap-4 text-center">
          <div>
            <p className="text-lg font-bold">{stats.listings.featured}</p>
            <p className="text-xs text-muted-foreground">Featured (paid)</p>
          </div>
          <div>
            <p className="text-lg font-bold">{stats.listings.total_views.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">Total views</p>
          </div>
          <div>
            <p className="text-lg font-bold">{stats.listings.total_contacts.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">WA contact taps</p>
          </div>
        </div>
      </motion.div>

      {/* OTP Monitoring */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-white rounded-xl shadow-sm p-5"
      >
        <h2 className="text-sm font-bold mb-4 flex items-center gap-2">
          <Phone className="w-4 h-4 text-amber-500" />
          OTP Authentication (Today)
        </h2>
        <div className="grid grid-cols-3 gap-6">
          <div className="text-center">
            <p className="text-3xl font-bold">{stats.otp.today_total}</p>
            <p className="text-xs text-muted-foreground mt-1">OTPs sent</p>
          </div>
          <div className="text-center">
            <p className="text-3xl font-bold text-green-600">{stats.otp.today_verified}</p>
            <p className="text-xs text-muted-foreground mt-1">Verified</p>
          </div>
          <div className="text-center">
            <p className={`text-3xl font-bold ${otpRate === null ? 'text-muted-foreground' : otpRate >= 70 ? 'text-green-600' : 'text-amber-600'}`}>
              {otpRate !== null ? `${otpRate}%` : '—'}
            </p>
            <p className="text-xs text-muted-foreground mt-1">Success rate</p>
          </div>
        </div>
        {stats.otp.today_total > 0 && (
          <div className="mt-4">
            <div className="h-3 bg-muted rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${otpRate !== null && otpRate >= 70 ? 'bg-green-400' : 'bg-amber-400'}`}
                style={{ width: `${otpRate ?? 0}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-muted-foreground mt-1">
              <span>0%</span>
              <span className={otpRate !== null && otpRate < 70 ? 'text-amber-600 font-medium' : ''}>
                {otpRate !== null && otpRate < 70 ? '⚠ Below 70% — check MSG91 template' : 'Good'}
              </span>
              <span>100%</span>
            </div>
          </div>
        )}
      </motion.div>

      {/* City Leaderboard */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-white rounded-xl shadow-sm p-5"
      >
        <h2 className="text-sm font-bold mb-1 flex items-center gap-2">
          <MapPin className="w-4 h-4 text-green-500" />
          City Leaderboard — Top {stats.cities.top.length} by Active Listings
        </h2>
        <p className="text-xs text-muted-foreground mb-4">
          {stats.cities.with_listings} of {stats.cities.total} cities have active listings
        </p>
        <div className="space-y-2.5">
          {stats.cities.top.map((city, i) => (
            <div key={city.name} className="flex items-center gap-3">
              <span className="text-xs text-muted-foreground w-5 text-right shrink-0">{i + 1}</span>
              <div className="w-24 shrink-0">
                <p className="text-sm font-semibold truncate">{city.name}</p>
                <p className="text-xs text-muted-foreground truncate">{city.state}</p>
              </div>
              <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full bg-green-400 transition-all"
                  style={{ width: `${Math.max(4, Math.round((city.count / maxCityCount) * 100))}%` }}
                />
              </div>
              <span className="text-sm font-bold w-10 text-right shrink-0">{city.count}</span>
            </div>
          ))}
        </div>
        {stats.cities.top.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-6">No cities with active listings yet</p>
        )}
      </motion.div>

      {/* Integration Status */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="bg-white rounded-xl shadow-sm p-5"
      >
        <h2 className="text-sm font-bold mb-3">Integration Status</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            {
              label: 'Gemini Chatbot',
              ok: stats.system.chatbot_key_set,
              note: stats.system.chatbot_key_set
                ? 'GOOGLE_AI_KEY set on Azure'
                : 'Not configured — chatbot offline. Get key at aistudio.google.com',
              fix: 'az webapp config appsettings set --name localsindia-backend --resource-group localsindia-rg --settings "GOOGLE_AI_KEY=<key>"',
            },
            {
              label: 'Razorpay',
              ok: stats.system.razorpay_configured,
              note: stats.system.razorpay_configured
                ? 'Key ID + Secret configured'
                : 'Payment keys not set',
              fix: null,
            },
            {
              label: 'SendGrid Email',
              ok: stats.system.sendgrid_configured,
              note: stats.system.sendgrid_configured
                ? 'SENDGRID_API_KEY set'
                : 'Not configured — approval/reject emails are skipped silently',
              fix: null,
            },
          ].map(({ label, ok, note, fix }) => (
            <div
              key={label}
              className={`p-4 rounded-xl border-2 ${ok ? 'border-green-100 bg-green-50' : 'border-amber-100 bg-amber-50'}`}
            >
              <div className="flex items-center gap-2 mb-1">
                {ok
                  ? <CheckCircle className="w-4 h-4 text-green-600" />
                  : <AlertCircle className="w-4 h-4 text-amber-600" />}
                <span className="text-sm font-semibold">{label}</span>
              </div>
              <p className="text-xs text-muted-foreground">{note}</p>
              {fix && !ok && (
                <code className="block mt-2 text-xs bg-white/60 rounded p-1.5 text-slate-700 break-all">{fix}</code>
              )}
            </div>
          ))}
        </div>
      </motion.div>

      {/* Recent App Errors */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="bg-white rounded-xl shadow-sm p-5"
      >
        <h2 className="text-sm font-bold mb-1 flex items-center gap-2">
          <Bug className="w-4 h-4 text-red-500" />
          Recent App Errors
        </h2>
        <p className="text-xs text-muted-foreground mb-4">
          Reported from mobile crashes and failed API calls, grouped by message
        </p>
        {errorGroups.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">No errors reported — looking good</p>
        ) : (
          <div className="space-y-2">
            {errorGroups.map((e, i) => (
              <div key={`${e.message}-${i}`} className="flex items-start gap-3 p-3 rounded-lg bg-red-50/60 border border-red-100">
                <span className="shrink-0 text-xs font-bold uppercase px-2 py-1 rounded-full bg-red-100 text-red-700">
                  {e.platform}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-800 break-words">{e.message}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {e.context ? `${e.context} · ` : ''}last seen {new Date(e.last_seen).toLocaleString()}
                  </p>
                </div>
                <span className="shrink-0 text-sm font-bold text-red-600">×{e.count}</span>
              </div>
            ))}
          </div>
        )}
      </motion.div>
    </div>
  );
}
