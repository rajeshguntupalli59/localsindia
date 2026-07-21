'use client';

import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const DISMISS_KEY = 'li_prompt_dismissed';

interface Prompt {
  id: string;
  message: string;
  cta: string;
  href: string;
}

function detectPrompt(): Prompt | null {
  try {
    const token = localStorage.getItem('access_token');
    const dismissed = JSON.parse(localStorage.getItem(DISMISS_KEY) ?? '[]') as string[];

    // Guest browsing for a while but hasn't posted
    if (!token) {
      const id = 'post_cta';
      if (!dismissed.includes(id)) {
        return { id, message: 'Ready to sell something? Post a free listing — takes 2 minutes.', cta: 'Post for Free', href: '/' };
      }
    }

    const user = JSON.parse(localStorage.getItem('user') ?? 'null');
    if (!user) return null;

    const saved: unknown[] = JSON.parse(localStorage.getItem('localsindia_saved') ?? '[]');

    // Has 5+ saved listings but hasn't messaged (use save count as proxy)
    if (saved.length >= 5) {
      const id = 'chat_cta';
      if (!dismissed.includes(id)) {
        return { id, message: `You've saved ${saved.length} listings — message sellers directly on WhatsApp!`, cta: 'View Saved', href: '/saved' };
      }
    }
  } catch { /* ignore */ }
  return null;
}

export default function ContextualPrompt() {
  const pathname = usePathname();
  const [prompt, setPrompt] = useState<Prompt | null>(null);

  useEffect(() => {
    // Delay to avoid jarring the initial render
    const t = setTimeout(() => setPrompt(detectPrompt()), 3000);
    return () => clearTimeout(t);
  }, []);

  if (!prompt || pathname?.startsWith('/auth')) return null;

  const dismiss = () => {
    try {
      const dismissed: string[] = JSON.parse(localStorage.getItem(DISMISS_KEY) ?? '[]');
      if (!dismissed.includes(prompt.id)) dismissed.push(prompt.id);
      localStorage.setItem(DISMISS_KEY, JSON.stringify(dismissed));
    } catch { /* ignore */ }
    setPrompt(null);
  };

  return (
    <div className="fixed bottom-20 left-4 right-4 sm:left-auto sm:right-6 sm:w-80 z-40
      bg-white rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.12),0_0_0_1px_rgba(0,0,0,0.04)]
      p-4 flex items-start gap-3 animate-in slide-in-from-bottom-4 duration-300">
      <div className="flex-1">
        <p className="text-sm text-slate-700 leading-snug">{prompt.message}</p>
        <Link
          href={prompt.href}
          onClick={dismiss}
          className="inline-block mt-2 text-xs font-bold px-3 py-1.5 rounded-lg text-white transition-opacity"
          style={{ background: 'var(--li-primary)' }}
        >
          {prompt.cta} →
        </Link>
      </div>
      <button type="button" onClick={dismiss} className="text-slate-300 hover:text-slate-500 transition-colors shrink-0">
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
