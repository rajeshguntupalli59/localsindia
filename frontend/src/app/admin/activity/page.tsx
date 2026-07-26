'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Activity, Share2, BookOpen } from 'lucide-react';
import { timeAgo } from '@/lib/utils';
import EmptyState from '@/components/empty-state/EmptyState';
import { toast } from 'sonner';

interface ActivityItem {
  type: 'social_post' | 'ecosystem_post' | 'blog_article';
  timestamp: string | null;
  title: string;
  detail?: string | null;
  facebook_post_id?: string | null;
  instagram_feed_id?: string | null;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000';

const TYPE_LABEL: Record<ActivityItem['type'], string> = {
  social_post: 'Facebook / Instagram',
  ecosystem_post: 'Facebook / Instagram',
  blog_article: 'Blog article',
};

function TypeIcon({ type }: { type: ActivityItem['type'] }) {
  if (type === 'blog_article') return <BookOpen size={18} className="text-slate-500" />;
  return <Share2 size={18} className="text-blue-600" />;
}

export default function AdminActivityPage() {
  const [items, setItems] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchFeed = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch(`${API_BASE}/api/v1/admin/activity-feed`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error();
      setItems(await res.json());
    } catch {
      toast.error('Failed to load activity feed');
    } finally {
      setLoading(false);
    }
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { fetchFeed(); }, []);

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold">Marketing Activity</h1>
          <p className="text-sm text-muted-foreground">
            Facebook/Instagram posts and blog articles published by the automation agents — activity only, no cost data (this posting is free).
          </p>
        </div>
        <button onClick={fetchFeed} className="text-sm px-4 py-2 rounded-lg border hover:bg-muted transition-colors">
          Refresh
        </button>
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-16 bg-white rounded-xl animate-pulse" />)}
        </div>
      ) : items.length === 0 ? (
        <EmptyState icon={Activity} title="No activity yet" description="Nothing has been published by the marketing agents yet, or the log files haven't been committed." />
      ) : (
        <div className="space-y-2">
          {items.map((item, i) => (
            <motion.div
              key={`${item.type}-${item.timestamp}-${i}`}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.02 }}
              className="flex items-center gap-3 bg-white rounded-xl shadow-sm px-4 py-3"
            >
              <TypeIcon type={item.type} />
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm truncate">{item.title}</p>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>{TYPE_LABEL[item.type]}</span>
                  {item.detail && <span>· {item.detail}</span>}
                </div>
              </div>
              {item.timestamp && (
                <span className="text-xs text-muted-foreground shrink-0">{timeAgo(item.timestamp)}</span>
              )}
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
