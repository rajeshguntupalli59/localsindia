'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Eye, MessageCircle, Star, MessagesSquare } from 'lucide-react';
import Link from 'next/link';
import { api, ApiError } from '@/lib/api';
import type { BusinessAnalytics } from '@/lib/types';

export default function BusinessDashboardClient() {
  const params = useParams();
  const router = useRouter();
  const citySlug = params.city as string;
  const businessId = params.id as string;

  const [data, setData] = useState<BusinessAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (!token) {
      router.push('/auth/login');
      return;
    }
    api.businesses
      .analytics(businessId, token)
      .then(setData)
      .catch(err => {
        setError(err instanceof ApiError ? err.message : 'Failed to load analytics');
      })
      .finally(() => setLoading(false));
  }, [businessId, router]);

  const maxDailyViews = data ? Math.max(1, ...data.daily_trend.map(d => d.views)) : 1;

  return (
    <div className="min-h-screen bg-[#FAFAFA]">
      <div className="max-w-lg mx-auto px-4 py-10">
        <Link
          href={`/${citySlug}/businesses/${businessId}`}
          className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-800 mb-8"
        >
          <ArrowLeft className="w-4 h-4" /> Back to business
        </Link>

        <div className="mb-8">
          <div className="flex items-center gap-2 mb-2">
            <MessagesSquare className="w-5 h-5 text-[#F7921E]" />
            <span className="text-xs font-bold uppercase tracking-widest text-[#F7921E]">Business Analytics</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Last 30 days</h1>
        </div>

        {loading && (
          <div className="space-y-3">
            {[0, 1, 2].map(i => (
              <div key={i} className="h-20 rounded-2xl bg-slate-100 animate-pulse" />
            ))}
          </div>
        )}

        {!loading && error && (
          <div className="rounded-2xl border border-red-100 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        {!loading && data && (
          <>
            <div className="grid grid-cols-2 gap-3 mb-6">
              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <div className="flex items-center gap-1.5 text-slate-400 mb-1">
                  <Eye className="w-4 h-4" />
                  <span className="text-xs font-medium">Views</span>
                </div>
                <p className="text-2xl font-bold text-slate-900">{data.views_30d}</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <div className="flex items-center gap-1.5 text-slate-400 mb-1">
                  <MessageCircle className="w-4 h-4" />
                  <span className="text-xs font-medium">WhatsApp Taps</span>
                </div>
                <p className="text-2xl font-bold text-slate-900">{data.whatsapp_clicks_30d}</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <div className="flex items-center gap-1.5 text-slate-400 mb-1">
                  <MessagesSquare className="w-4 h-4" />
                  <span className="text-xs font-medium">Reviews</span>
                </div>
                <p className="text-2xl font-bold text-slate-900">{data.review_count}</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <div className="flex items-center gap-1.5 text-slate-400 mb-1">
                  <Star className="w-4 h-4" />
                  <span className="text-xs font-medium">Avg Rating</span>
                </div>
                <p className="text-2xl font-bold text-slate-900">
                  {data.avg_rating > 0 ? data.avg_rating.toFixed(1) : '—'}
                </p>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <p className="text-xs font-semibold text-slate-500 mb-3">Views per day</p>
              {data.daily_trend.length === 0 ? (
                <p className="text-sm text-slate-400 py-6 text-center">No views yet in the last 30 days.</p>
              ) : (
                <div className="flex items-end gap-1 h-24">
                  {data.daily_trend.map(point => (
                    <div
                      key={point.date}
                      className="flex-1 rounded-t bg-[#F7921E]/80 min-w-[2px]"
                      style={{ height: `${Math.max(4, (point.views / maxDailyViews) * 100)}%` }}
                      title={`${point.date}: ${point.views} views, ${point.whatsapp_clicks} WhatsApp taps`}
                    />
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
