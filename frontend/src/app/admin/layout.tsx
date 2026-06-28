'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { ClipboardList, CalendarDays, Flag, Users, LayoutDashboard, LogOut, Activity } from 'lucide-react';

const NAV = [
  { href: '/admin', exact: true, icon: <LayoutDashboard className="w-4 h-4" />, label: 'Dashboard', badge: null },
  { href: '/admin/listings', exact: false, icon: <ClipboardList className="w-4 h-4" />, label: 'Listings', badge: 'pending' },
  { href: '/admin/events', exact: false, icon: <CalendarDays className="w-4 h-4" />, label: 'Events', badge: null },
  { href: '/admin/reports', exact: false, icon: <Flag className="w-4 h-4" />, label: 'Flagged', badge: 'flagged' },
  { href: '/admin/users', exact: false, icon: <Users className="w-4 h-4" />, label: 'Users', badge: null },
  { href: '/admin/monitoring', exact: false, icon: <Activity className="w-4 h-4" />, label: 'Monitoring', badge: null },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();

  // Read synchronously so there's no blank-flash on first render
  const [role, setRole] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null;
    try {
      const u = JSON.parse(localStorage.getItem('user') ?? '{}');
      return u.role === 'admin' ? 'admin' : null;
    } catch { return null; }
  });

  useEffect(() => {
    const stored = localStorage.getItem('user');
    if (!stored) { router.replace('/admin/login'); return; }
    try {
      const u = JSON.parse(stored);
      if (u.role !== 'admin') { router.replace('/admin/login'); return; }
      setRole(u.role);
      // Warm up the backend immediately so the page's data fetch hits a live server
      const apiBase = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000';
      fetch(`${apiBase}/api/v1/health`).catch(() => {});
    } catch { router.replace('/admin/login'); }
  }, [router]);

  const handleLogout = () => {
    localStorage.clear();
    router.replace('/');
  };

  if (pathname === '/admin/login') return <>{children}</>;
  if (!role) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--li-page-bg)' }}>
      <div className="w-6 h-6 rounded-full border-2 border-amber-400 border-t-transparent animate-spin" />
    </div>
  );

  return (
    <div className="min-h-screen flex">
      {/* Sidebar */}
      <aside className="w-56 shrink-0 flex flex-col" style={{ background: 'var(--li-nav-bg)' }}>
        <div className="px-4 pt-6 pb-4 border-b border-white/10">
          <div className="flex items-center gap-2">
            <LayoutDashboard className="w-5 h-5 text-white/70" />
            <span className="text-white font-bold text-sm">Admin</span>
          </div>
          <p className="text-white/40 text-xs mt-1">localsindia.com</p>
        </div>

        <nav className="flex-1 p-3 space-y-1">
          {NAV.map(item => {
            const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                  active
                    ? 'bg-white/15 text-white font-semibold'
                    : 'text-white/60 hover:text-white hover:bg-white/10'
                }`}
              >
                {item.icon}
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="p-3 border-t border-white/10">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-white/60 hover:text-white hover:bg-white/10 transition-colors"
          >
            <LogOut className="w-4 h-4" /> Sign out
          </button>
        </div>
      </aside>

      {/* Content */}
      <main className="flex-1 min-h-screen overflow-y-auto" style={{ background: 'var(--li-page-bg)' }}>
        {children}
      </main>
    </div>
  );
}

