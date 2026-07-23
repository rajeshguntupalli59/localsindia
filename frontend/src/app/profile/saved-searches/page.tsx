'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Search, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { timeAgo } from '@/lib/utils';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'https://localsindia-backend-in.azurewebsites.net';

interface SavedSearch {
  id: string;
  city_slug: string;
  query_text: string | null;
  category_slug: string | null;
  created_at: string;
}

export default function SavedSearchesPage() {
  const router = useRouter();
  const [searches, setSearches] = useState<SavedSearch[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (!token) { router.replace('/auth/login'); return; }
    fetch(`${API_BASE}/api/v1/saved-searches`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.ok ? r.json() : [])
      .then(setSearches)
      .catch(() => setSearches([]))
      .finally(() => setLoading(false));
  }, [router]);

  const handleDelete = async (id: string) => {
    const token = localStorage.getItem('access_token');
    if (!token) return;
    try {
      const r = await fetch(`${API_BASE}/api/v1/saved-searches/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (r.ok) {
        setSearches(prev => prev.filter(s => s.id !== id));
        toast.success('Search removed');
      }
    } catch { toast.error('Failed to delete'); }
  };

  const runSearch = (s: SavedSearch) => {
    const params = new URLSearchParams();
    if (s.query_text) params.set('q', s.query_text);
    if (s.category_slug) params.set('category', s.category_slug);
    router.push(`/${s.city_slug}/search?${params.toString()}`);
  };

  return (
    <div className="min-h-screen pb-20" style={{ background: 'var(--li-page-bg)' }}>
      <div className="sticky top-0 z-30 bg-white border-b px-4 py-3 flex items-center gap-3">
        <button onClick={() => router.back()} className="text-muted-foreground">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="font-semibold text-sm">Saved Searches</h1>
      </div>

      <div className="p-4 space-y-3">
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-16 bg-white rounded-xl animate-pulse" />
          ))
        ) : searches.length === 0 ? (
          <div className="text-center py-20">
            <Search className="w-12 h-12 mx-auto mb-3 text-slate-200" strokeWidth={1.5} />
            <p className="font-semibold text-slate-700 mb-1">No saved searches</p>
            <p className="text-sm text-slate-400">Save a search from any search results page to get alerts.</p>
          </div>
        ) : (
          searches.map(s => (
            <div key={s.id} className="bg-white rounded-xl shadow-sm flex items-center gap-3 p-4">
              <div className="w-9 h-9 rounded-xl bg-orange-50 flex items-center justify-center shrink-0">
                <Search className="w-4 h-4 text-[#F7921E]" strokeWidth={2} />
              </div>
              <button
                type="button"
                className="flex-1 text-left"
                onClick={() => runSearch(s)}
              >
                <p className="text-sm font-semibold text-slate-800">
                  {s.query_text || s.category_slug || 'All listings'}
                  {s.city_slug && <span className="text-slate-400 font-normal"> in {s.city_slug.replace(/-/g, ' ')}</span>}
                </p>
                <p className="text-xs text-slate-400 mt-0.5">Saved {timeAgo(s.created_at)}</p>
              </button>
              <button
                type="button"
                onClick={() => handleDelete(s.id)}
                className="text-slate-300 hover:text-red-400 transition-colors p-1"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
