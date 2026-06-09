'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Search, MapPin, LogOut, List, User, ChevronDown } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';

interface Props {
  citySlug?: string;
  cityName?: string;
}

interface StoredUser {
  name?: string;
  phone?: string;
  email?: string;
}

export default function SiteHeader({ citySlug, cityName }: Props) {
  const router = useRouter();
  const [q, setQ] = useState('');
  const [user, setUser] = useState<StoredUser | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const stored = localStorage.getItem('user');
    if (stored) {
      try { setUser(JSON.parse(stored)); } catch { /* ignore */ }
    }
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!q.trim()) return;
    const target = citySlug
      ? `/${citySlug}/search?q=${encodeURIComponent(q.trim())}`
      : '/';
    router.push(target);
  };

  const logout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user');
    setUser(null);
    setMenuOpen(false);
    router.push('/');
  };

  // Get initials for avatar
  const initials = (name: string) =>
    name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();

  const displayName = user?.name && !user.name.startsWith('+91')
    ? user.name
    : user?.email?.split('@')[0] ?? 'Me';

  return (
    <header className="sticky top-0 z-50 bg-white border-b" style={{ borderColor: 'var(--li-border)' }}>
      <div className="page-wrap h-16 flex items-center gap-6">

        {/* Logo */}
        <Link href="/" className="shrink-0 flex flex-col leading-none">
          <span className="text-xl font-black tracking-tight" style={{ color: 'var(--li-text)' }}>
            Locals<span style={{ color: 'var(--li-primary)' }}>India</span>
          </span>
          <span className="text-[10px] font-semibold" style={{ color: 'var(--li-muted)' }}>
            localsindia.com
          </span>
        </Link>

        {/* Search bar — hidden on mobile */}
        <form onSubmit={handleSearch} className="hidden md:flex flex-1 max-w-xl">
          <div
            className="flex items-center gap-3 rounded-xl px-4 h-10 border transition-colors w-full"
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
          <button
            className="hidden md:flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold transition-colors hover:bg-gray-200"
            style={{ background: '#F3F4F6', color: 'var(--li-text)' }}
            onClick={() => router.push('/')}
            title="Change city"
          >
            <MapPin className="w-3.5 h-3.5 shrink-0" style={{ color: 'var(--li-primary)' }} />
            {cityName ?? (citySlug ? citySlug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) : 'All India')}
            <span style={{ color: 'var(--li-muted)', fontSize: 11 }}>▾</span>
          </button>

          <Link
            href={citySlug ? `/${citySlug}` : '/'}
            className="hidden md:flex px-3 py-2 rounded-lg text-sm font-medium transition-colors hover:bg-gray-100"
            style={{ color: '#374151' }}
          >
            Browse
          </Link>

          {/* Auth section */}
          {user ? (
            <div className="relative hidden md:block" ref={menuRef}>
              <button
                onClick={() => setMenuOpen(v => !v)}
                className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-gray-100 transition-colors"
              >
                {/* Avatar circle */}
                <span
                  className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
                  style={{ background: 'var(--li-primary)' }}
                >
                  {initials(displayName)}
                </span>
                <span className="text-sm font-medium max-w-[100px] truncate" style={{ color: 'var(--li-text)' }}>
                  {displayName}
                </span>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              </button>

              {/* Dropdown */}
              {menuOpen && (
                <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-xl shadow-lg border border-slate-200 py-1 z-50">
                  <Link
                    href="/profile"
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center gap-2.5 px-4 py-2.5 text-sm hover:bg-slate-50 transition-colors"
                    style={{ color: 'var(--li-text)' }}
                  >
                    <User className="w-4 h-4 text-slate-400" />
                    My Profile
                  </Link>
                  <Link
                    href="/profile/listings"
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center gap-2.5 px-4 py-2.5 text-sm hover:bg-slate-50 transition-colors"
                    style={{ color: 'var(--li-text)' }}
                  >
                    <List className="w-4 h-4 text-slate-400" />
                    My Listings
                  </Link>
                  <div className="border-t border-slate-100 my-1" />
                  <button
                    onClick={logout}
                    className="flex items-center gap-2.5 px-4 py-2.5 text-sm w-full text-left hover:bg-slate-50 transition-colors text-red-500"
                  >
                    <LogOut className="w-4 h-4" />
                    Sign Out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <Link
              href="/auth/login"
              className="hidden md:flex px-3 py-2 rounded-lg text-sm font-medium transition-colors hover:bg-gray-100"
              style={{ color: '#374151' }}
            >
              Login
            </Link>
          )}

          <Link
            href={citySlug ? `/${citySlug}/classifieds/post` : '/'}
            className="cta-btn px-4 py-2 text-sm rounded-xl"
          >
            <span className="hidden sm:inline">+ Post a Listing</span>
            <span className="sm:hidden">+ Post</span>
          </Link>
        </nav>
      </div>
    </header>
  );
}
