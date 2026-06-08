'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { ClipboardList, Flag, Users, LayoutDashboard, LogOut } from 'lucide-react';

const NAV = [
  { href: '/admin/listings', icon: <ClipboardList className="w-4 h-4" />, label: 'Pending Queue', badge: 'pending' },
  { href: '/admin/reports', icon: <Flag className="w-4 h-4" />, label: 'Flagged', badge: 'flagged' },
  { href: '/admin/users', icon: <Users className="w-4 h-4" />, label: 'Users', badge: null },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [role, setRole] = useState<string | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem('user');
    if (!stored) { router.replace('/auth/login'); return; }
    try {
      const u = JSON.parse(stored);
      if (u.role !== 'admin') { router.replace('/'); return; }
      setRole(u.role);
    } catch { router.replace('/'); }
  }, [router]);

  const handleLogout = () => {
    localStorage.clear();
    router.replace('/');
  };

  if (!role) return null;

  return (
    <div className="min-h-screen flex">
      {/* Sidebar */}
      <aside className="w-56 shrink-0 flex flex-col" style={{ background: 'var(--li-nav-bg)' }}>
        <div className="px-4 pt-6 pb-4 border-b border-white/10">
          <div className="flex items-center gap-2">
            <LayoutDashboard className="w-5 h-5 text-white/70" />
            <span className="text-white font-bold text-sm">Admin</span>
          </div>
          <p className="text-white/40 text-xs mt-1">localindia.in</p>
        </div>

        <nav className="flex-1 p-3 space-y-1">
          {NAV.map(item => {
            const active = pathname.startsWith(item.href);
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
