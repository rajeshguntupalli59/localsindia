'use client';

import { useCallback, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { MessageCircleQuestion, Search, X, MapPin } from 'lucide-react';
import { timeAgo } from '@/lib/utils';
import EmptyState from '@/components/empty-state/EmptyState';
import { toast } from 'sonner';

interface ChatbotQuestion {
  id: string;
  question: string;
  city_slug: string | null;
  search_query: string | null;
  results_count: number | null;
  created_at: string;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000';

export default function AdminChatbotPage() {
  const [questions, setQuestions] = useState<ChatbotQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const fetchQuestions = useCallback(async (q: string) => {
    setLoading(true);
    try {
      const res = await fetch(
        `${API_BASE}/api/v1/admin/chatbot-questions?page_size=200${q ? `&q=${encodeURIComponent(q)}` : ''}`,
        { headers: { Authorization: `Bearer ${localStorage.getItem('access_token') ?? ''}` } },
      );
      if (!res.ok) throw new Error();
      setQuestions(await res.json());
    } catch {
      toast.error('Failed to load chatbot questions');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => fetchQuestions(search), search ? 300 : 0);
    return () => clearTimeout(timer);
  }, [search, fetchQuestions]);

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold">Chatbot Questions</h1>
          <p className="text-sm text-muted-foreground">What people ask the LocalsIndia assistant, newest first</p>
        </div>
        <button onClick={() => fetchQuestions(search)} className="text-sm px-4 py-2 rounded-lg border hover:bg-muted transition-colors">
          Refresh
        </button>
      </div>

      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search questions..."
          className="w-full pl-9 pr-9 py-2.5 rounded-xl border bg-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-200"
        />
        {search && (
          <button onClick={() => setSearch('')} aria-label="Clear search" className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-20 bg-white rounded-xl animate-pulse" />)}
        </div>
      ) : questions.length === 0 ? (
        <EmptyState
          icon={MessageCircleQuestion}
          title={search ? 'No matching questions' : 'No questions yet'}
          description={search ? 'Try a different search' : 'Questions people ask the chatbot will show up here'}
        />
      ) : (
        <div className="space-y-3">
          {questions.map((q, i) => (
            <motion.div
              key={q.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(i, 20) * 0.02 }}
              className="bg-white rounded-xl shadow-sm p-4"
            >
              <p className="text-sm whitespace-pre-wrap break-words">{q.question}</p>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-xs text-muted-foreground">
                {q.city_slug && (
                  <span className="flex items-center gap-1 capitalize"><MapPin className="w-3 h-3" /> {q.city_slug.replace(/-/g, ' ')}</span>
                )}
                {q.search_query != null && (
                  <span className={q.results_count === 0 ? 'text-red-600 font-medium' : ''}>
                    Searched &ldquo;{q.search_query}&rdquo; · {q.results_count ?? 0} results
                  </span>
                )}
                <span>{timeAgo(q.created_at)}</span>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
