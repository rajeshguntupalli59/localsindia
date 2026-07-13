import Link from 'next/link';
import { SearchX } from 'lucide-react';
import SiteHeader from '@/components/site-header/SiteHeader';
import SiteFooter from '@/components/site-footer/SiteFooter';

export default function NotFound() {
  return (
    <div style={{ background: 'var(--li-page-bg)', minHeight: '100vh' }}>
      <SiteHeader />

      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 px-4 text-center">
        <SearchX size={44} strokeWidth={1.5} style={{ color: 'var(--li-muted)' }} />
        <h1 className="text-2xl font-black" style={{ color: 'var(--li-text)' }}>
          Page not found
        </h1>
        <p className="text-sm max-w-sm" style={{ color: 'var(--li-muted)' }}>
          The page you&apos;re looking for doesn&apos;t exist or may have been moved.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3 mt-2">
          <Link
            href="/"
            className="px-6 py-2.5 rounded-xl font-semibold text-sm text-white transition-opacity hover:opacity-90"
            style={{ background: 'var(--li-primary)' }}
          >
            Back to Home
          </Link>
          <Link
            href="/search"
            className="px-6 py-2.5 rounded-xl font-semibold text-sm border transition-colors hover:border-orange-400 hover:text-orange-600"
            style={{ borderColor: 'var(--li-border)', color: 'var(--li-text)' }}
          >
            Browse listings
          </Link>
        </div>
      </div>

      <SiteFooter />
    </div>
  );
}
