'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { DollarSign, Sparkles } from 'lucide-react';
import { timeAgo } from '@/lib/utils';
import EmptyState from '@/components/empty-state/EmptyState';
import { toast } from 'sonner';

interface ProviderTotals {
  calls: number;
  input_tokens: number;
  output_tokens: number;
  cost_usd: number;
}

interface UsageEntry {
  provider: 'gemini' | 'claude';
  context: string | null;
  model: string;
  input_tokens: number;
  output_tokens: number;
  estimated_cost_usd: number;
  timestamp: string | null;
}

interface LlmUsageData {
  totals: { gemini: ProviderTotals; claude: ProviderTotals; combined_cost_usd: number };
  recent: UsageEntry[];
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000';

function formatUsd(n: number) {
  return `$${n.toFixed(4)}`;
}

export default function AdminLlmUsagePage() {
  const [data, setData] = useState<LlmUsageData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchUsage = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch(`${API_BASE}/api/v1/admin/llm-usage`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error();
      setData(await res.json());
    } catch {
      toast.error('Failed to load LLM usage');
    } finally {
      setLoading(false);
    }
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { fetchUsage(); }, []);

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold">LLM Usage &amp; Cost</h1>
          <p className="text-sm text-muted-foreground">
            Estimated spend on Gemini (chatbot) and Claude (marketing agents) — estimates based on published per-token pricing, not a live invoice.
          </p>
        </div>
        <button onClick={fetchUsage} className="text-sm px-4 py-2 rounded-lg border hover:bg-muted transition-colors">
          Refresh
        </button>
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-24 bg-white rounded-xl animate-pulse" />)}
        </div>
      ) : !data ? (
        <EmptyState icon={DollarSign} title="No usage data" description="Couldn't load usage data — try refreshing." />
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            <div className="bg-white rounded-xl shadow-sm p-4">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Total Estimated Cost</p>
              <p className="text-2xl font-black" style={{ color: 'var(--li-primary)' }}>{formatUsd(data.totals.combined_cost_usd)}</p>
            </div>
            <div className="bg-white rounded-xl shadow-sm p-4">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Gemini (chatbot)</p>
              <p className="text-lg font-bold">{formatUsd(data.totals.gemini.cost_usd)}</p>
              <p className="text-xs text-muted-foreground">{data.totals.gemini.calls} calls · {(data.totals.gemini.input_tokens + data.totals.gemini.output_tokens).toLocaleString()} tokens</p>
            </div>
            <div className="bg-white rounded-xl shadow-sm p-4">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Claude (marketing agents)</p>
              <p className="text-lg font-bold">{formatUsd(data.totals.claude.cost_usd)}</p>
              <p className="text-xs text-muted-foreground">{data.totals.claude.calls} calls · {(data.totals.claude.input_tokens + data.totals.claude.output_tokens).toLocaleString()} tokens</p>
            </div>
          </div>

          {data.recent.length === 0 ? (
            <EmptyState icon={Sparkles} title="No usage logged yet" description="Usage will appear here as the chatbot and marketing agents run." />
          ) : (
            <div className="space-y-2">
              {data.recent.map((entry, i) => (
                <motion.div
                  key={`${entry.provider}-${entry.timestamp}-${i}`}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.02 }}
                  className="flex items-center gap-3 bg-white rounded-xl shadow-sm px-4 py-3"
                >
                  <span
                    className="text-xs font-bold px-2 py-1 rounded-full shrink-0"
                    style={{
                      background: entry.provider === 'gemini' ? '#EEF2FF' : '#FEF3C7',
                      color: entry.provider === 'gemini' ? '#4338CA' : '#92400E',
                    }}
                  >
                    {entry.provider === 'gemini' ? 'Gemini' : 'Claude'}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm truncate">{entry.context ?? entry.model}</p>
                    <p className="text-xs text-muted-foreground">
                      {entry.input_tokens.toLocaleString()} in / {entry.output_tokens.toLocaleString()} out · {formatUsd(entry.estimated_cost_usd)}
                    </p>
                  </div>
                  {entry.timestamp && (
                    <span className="text-xs text-muted-foreground shrink-0">{timeAgo(entry.timestamp)}</span>
                  )}
                </motion.div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
