'use client';

import { MessageCircle, Copy, Star } from 'lucide-react';
import { toast } from 'sonner';

export function reviewInviteText(businessName: string, url: string): string {
  return `Hi! ${businessName} is now on LocalsIndia. If you've been to us, we'd be grateful for a quick review — it helps other people nearby find us:\n${url}`;
}

// Owner-only: the owner sends their own page to regular customers (their own
// WhatsApp, one chat at a time) and asks for a review. Real reviews are what
// get star ratings shown in Google results.
export default function ReviewInvite({ businessName, url }: { businessName: string; url: string }) {
  const text = reviewInviteText(businessName, url);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success('Message copied — paste it to your customers');
    } catch {
      toast.error('Could not copy');
    }
  };
  return (
    <div className="p-4 rounded-xl border-2 border-amber-100 bg-amber-50 text-left">
      <p className="flex items-center gap-1.5 text-sm font-semibold text-amber-900">
        <Star className="w-4 h-4 fill-amber-400 text-amber-400" /> Get reviews from your customers
      </p>
      <p className="text-xs text-amber-800 mt-1">
        Send your page to regular customers and ask for a quick review. Ratings help you show up first — on
        LocalsIndia and in Google.
      </p>
      <div className="flex gap-2 mt-3">
        <a
          href={`https://wa.me/?text=${encodeURIComponent(text)}`}
          target="_blank" rel="noopener noreferrer"
          className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-white text-sm font-semibold"
          style={{ background: '#25D366' }}
        >
          <MessageCircle className="w-4 h-4" /> Share on WhatsApp
        </a>
        <button type="button" onClick={copy}
          className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border border-amber-200 bg-white text-sm font-semibold text-amber-900">
          <Copy className="w-4 h-4" /> Copy
        </button>
      </div>
    </div>
  );
}
