import Link from 'next/link';
import { Shield } from 'lucide-react';
import { safetyTips } from '@/lib/safety';

export default function SafetyTips({ categorySlug }: { categorySlug?: string | null }) {
  return (
    <div className="rounded-3xl p-5 border" style={{ background: '#FFFBEB', borderColor: '#FDE68A' }}>
      <div className="flex items-center gap-2 mb-3">
        <Shield className="w-4 h-4" style={{ color: '#D97706' }} />
        <p className="text-sm font-bold" style={{ color: '#92400E' }}>Stay Safe</p>
      </div>
      <ul className="space-y-2">
        {safetyTips(categorySlug).map(tip => (
          <li key={tip} className="flex items-start gap-2 text-xs leading-relaxed" style={{ color: '#78350F' }}>
            <span className="mt-0.5 shrink-0">•</span>
            {tip}
          </li>
        ))}
      </ul>
      <Link href="/trust" className="inline-block mt-3 text-xs font-semibold underline" style={{ color: '#92400E' }}>
        What our badges mean
      </Link>
    </div>
  );
}
