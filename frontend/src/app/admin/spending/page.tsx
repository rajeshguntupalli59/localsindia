'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { DollarSign, Sparkles, Cloud } from 'lucide-react';
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

interface AzureCostData {
  configured: boolean;
  reason?: string;
  month_to_date_cost_usd?: number;
  currency?: string;
  breakdown?: { resource_group: string; cost_usd: number }[];
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000';

function formatUsd(n: number, decimals = 4) {
  return `$${n.toFixed(decimals)}`;
}

export default function AdminSpendingPage() {
  const [llmData, setLlmData] = useState<LlmUsageData | null>(null);
  const [azureData, setAzureData] = useState<AzureCostData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('access_token');
      const headers = { Authorization: `Bearer ${token}` };
      const [llmRes, azureRes] = await Promise.all([
        fetch(`${API_BASE}/api/v1/admin/llm-usage`, { headers }),
        fetch(`${API_BASE}/api/v1/admin/azure-cost`, { headers }),
      ]);
      if (!llmRes.ok || !azureRes.ok) throw new Error();
      setLlmData(await llmRes.json());
      setAzureData(await azureRes.json());
    } catch {
      toast.error('Failed to load spending data');
    } finally {
      setLoading(false);
    }
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { fetchAll(); }, []);

  const azureCost = azureData?.configured ? azureData.month_to_date_cost_usd ?? 0 : 0;
  const grandTotal = (llmData?.totals.combined_cost_usd ?? 0) + azureCost;

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold">Spending</h1>
          <p className="text-sm text-muted-foreground">
            Everything that costs money to run LocalsIndia, in one place — Azure hosting, Gemini (chatbot), and Claude (marketing agents). Estimates based on published pricing, not a live invoice.
          </p>
        </div>
        <button onClick={fetchAll} className="text-sm px-4 py-2 rounded-lg border hover:bg-muted transition-colors">
          Refresh
        </button>
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-24 bg-white rounded-xl animate-pulse" />)}
        </div>
      ) : !llmData ? (
        <EmptyState icon={DollarSign} title="No spending data" description="Couldn't load spending data — try refreshing." />
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-xl shadow-sm p-4">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Total (month to date)</p>
              <p className="text-2xl font-black" style={{ color: 'var(--li-primary)' }}>{formatUsd(grandTotal, 2)}</p>
            </div>
            <div className="bg-white rounded-xl shadow-sm p-4">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Azure Hosting</p>
              {azureData?.configured ? (
                <>
                  <p className="text-lg font-bold">{formatUsd(azureData.month_to_date_cost_usd ?? 0, 2)}</p>
                  <p className="text-xs text-muted-foreground">App Service + Postgres + bandwidth</p>
                </>
              ) : (
                <p className="text-xs text-muted-foreground">Not set up yet — needs a managed identity with Cost Management Reader access</p>
              )}
            </div>
            <div className="bg-white rounded-xl shadow-sm p-4">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Gemini (chatbot)</p>
              <p className="text-lg font-bold">{formatUsd(llmData.totals.gemini.cost_usd)}</p>
              <p className="text-xs text-muted-foreground">{llmData.totals.gemini.calls} calls · {(llmData.totals.gemini.input_tokens + llmData.totals.gemini.output_tokens).toLocaleString()} tokens</p>
            </div>
            <div className="bg-white rounded-xl shadow-sm p-4">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Claude (marketing agents)</p>
              <p className="text-lg font-bold">{formatUsd(llmData.totals.claude.cost_usd)}</p>
              <p className="text-xs text-muted-foreground">{llmData.totals.claude.calls} calls · {(llmData.totals.claude.input_tokens + llmData.totals.claude.output_tokens).toLocaleString()} tokens</p>
            </div>
          </div>

          {azureData?.configured && azureData.breakdown && azureData.breakdown.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm p-4 mb-6">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3 flex items-center gap-1.5">
                <Cloud size={14} /> Azure cost by resource group
              </p>
              <div className="space-y-1.5">
                {azureData.breakdown.map((b, i) => (
                  <div key={i} className="flex items-center justify-between text-sm">
                    <span>{b.resource_group}</span>
                    <span className="font-semibold">{formatUsd(b.cost_usd, 2)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <h2 className="text-sm font-bold mb-3">Recent LLM calls</h2>
          {llmData.recent.length === 0 ? (
            <EmptyState icon={Sparkles} title="No usage logged yet" description="Usage will appear here as the chatbot and marketing agents run." />
          ) : (
            <div className="space-y-2">
              {llmData.recent.map((entry, i) => (
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
