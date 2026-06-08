'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Search } from 'lucide-react';
import { useState } from 'react';

interface Props {
  citySlug?: string;
  cityName?: string;
}

export default function SiteHeader({ citySlug, cityName }: Props) {
  const router = useRouter();
  const [q, setQ] = useState('');

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!q.trim()) return;
    const target = citySlug
      ? `/${citySlug}/search?q=${encodeURIComponent(q.trim())}`
      : '/';
    router.push(target);
  };

  return (
    <header
      className="sticky top-0 z-50 bg-white border-b"
      style={{ borderColor: 'var(--li-border)' }}
    >
      <div className="page-wrap h-16 flex items-center gap-6">
        {/* Logo */}
        <Link href="/" className="shrink-0 flex flex-col leading-none">
          <span
            className="text-xl font-black tracking-tight"
            style={{ color: 'var(--li-text)' }}
          >
            Locals<span style={{ color: 'var(--li-primary)' }}>India</span>
          </span>
          <span className="text-[10px] font-semibold" style={{ color: 'var(--li-muted)' }}>
            localsindia.com
          </span>
        </Link>

        {/* Search bar */}
        <form onSubmit={handleSearch} className="flex-1 max-w-xl">
          <div
            className="flex items-center gap-3 rounded-xl px-4 h-10 border transition-colors"
            style={{ background: '#F3F4F6', borderColor: 'transparent' }}
            onFocus={e => (e.currentTarget.style.borderColor = 'var(--li-primary)')}
            onBlur={e => (e.currentTarget.style.borderColor = 'transparent')}
          >
            <Search className="w-4 h-4 shrink-0" style={{ color: 'var(--li-muted)' }} />
            <input
              value={q}
              onChange={e => setQ(e.target.value)}
              placeholder={cityName ? `Search in ${cityName}...` : 'Search listings...'}
              className="flex-1 bg-transparent text-sm outline-none"
              style={{ color: 'var(--li-text)' }}
            />
          </div>
        </form>

        {/* Right nav */}
        <nav className="flex items-center gap-1 ml-auto">
          {citySlug && (
            <div
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold cursor-pointer"
              style={{ background: '#F3F4F6', color: 'var(--li-text)' }}
              onClick={() => router.push('/')}
            >
              📍 {cityName ?? citySlug}
              <span style={{ color: 'var(--li-muted)', fontSize: 11 }}>▾</span>
            </div>
          )}
          <Link
            href={citySlug ? `/${citySlug}` : '/'}
            className="px-3 py-2 rounded-lg text-sm font-medium transition-colors hover:bg-gray-100"
            style={{ color: '#374151' }}
          >
            Browse
          </Link>
          <Link
            href="/auth/login"
            className="px-3 py-2 rounded-lg text-sm font-medium transition-colors hover:bg-gray-100"
            style={{ color: '#374151' }}
          >
            Login
          </Link>
          <Link
            href={citySlug ? `/${citySlug}/classifieds/post` : '/'}
            className="cta-btn px-4 py-2 text-sm rounded-xl"
          >
            + Post Free Ad
          </Link>
        </nav>
      </div>
    </header>
  );
}
