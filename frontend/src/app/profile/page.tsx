'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { LogOut, ListOrdered, ChevronRight, User, Heart, Search, Trash2, Ticket } from 'lucide-react';
import Link from 'next/link';
import type { User as UserType } from '@/lib/types';
import { toast } from 'sonner';
import { api, ApiError } from '@/lib/api';

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<UserType | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem('user');
    if (!stored) { router.replace('/auth/login'); return; }
    try { setUser(JSON.parse(stored)); } catch { router.replace('/auth/login'); }
  }, [router]);

  const handleLogout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user');
    toast.success('Logged out');
    router.replace('/');
  };

  const handleDeleteAccount = async () => {
    const token = localStorage.getItem('access_token');
    if (!token) return;
    if (!confirm('This permanently deletes your account and hides all your listings. This cannot be undone. Are you sure?')) return;
    if (!confirm('Are you absolutely sure? Your name, phone number, and listings will be permanently removed.')) return;
    try {
      await api.auth.deleteAccount(token);
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      localStorage.removeItem('user');
      toast.success('Your account has been deleted');
      router.replace('/');
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Failed to delete account');
    }
  };

  if (!user) return null;

  const initials = user.name
    ? user.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
    : user.phone?.slice(-4) ?? '??';

  return (
    <div className="min-h-screen pb-20" style={{ background: 'var(--li-page-bg)' }}>
      {/* Header */}
      <div className="px-4 pt-10 pb-6" style={{ background: 'var(--li-nav-bg)' }}>
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold text-white"
            style={{ background: 'var(--li-primary)' }}>
            {user.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={user.avatar_url} alt="" className="w-full h-full rounded-full object-cover" />
            ) : initials}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white font-bold text-lg truncate">{user.name ?? 'User'}</p>
            {user.phone && <p className="text-white/60 text-sm">{user.phone}</p>}
            {user.role === 'admin' && (
              <span className="text-xs bg-[var(--li-featured)] text-black font-semibold px-2 py-0.5 rounded-full mt-1 inline-block">
                Admin
              </span>
            )}
          </div>
        </motion.div>
      </div>

      {/* Menu */}
      <div className="p-4 space-y-3">
        <MenuCard href="/profile/listings" icon={<ListOrdered className="w-5 h-5" />} label="My Listings" description="Manage your active and pending listings" />
        <MenuCard href="/saved" icon={<Heart className="w-5 h-5" />} label="Saved Listings" description="Listings you've hearted" />
        <MenuCard href="/profile/saved-searches" icon={<Search className="w-5 h-5" />} label="Saved Searches" description="Search alerts and quick re-runs" />
        <MenuCard href="/tickets" icon={<Ticket className="w-5 h-5" />} label="My Tickets" description="Event tickets you've purchased" />

        {user.role === 'admin' && (
          <MenuCard href="/admin/listings" icon={<User className="w-5 h-5" />} label="Admin Panel" description="Review pending listings and reports" />
        )}

        <div className="bg-white rounded-xl p-4 space-y-3 shadow-sm">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Account</p>
          <div className="space-y-1 text-sm">
            <p className="flex justify-between"><span className="text-muted-foreground">Phone</span><span className="font-medium">{user.phone ?? 'Not set'}</span></p>
            {user.email && <p className="flex justify-between"><span className="text-muted-foreground">Email</span><span className="font-medium truncate max-w-[60%]">{user.email}</span></p>}
          </div>
        </div>

        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl border border-destructive text-destructive font-semibold text-sm hover:bg-destructive/5 transition-colors"
        >
          <LogOut className="w-4 h-4" /> Sign out
        </button>

        <button
          onClick={handleDeleteAccount}
          className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl border border-destructive text-destructive font-semibold text-sm hover:bg-destructive/5 transition-colors"
        >
          <Trash2 className="w-4 h-4" /> Delete account
        </button>
      </div>
    </div>
  );
}

function MenuCard({ href, icon, label, description }: {
  href: string;
  icon: React.ReactNode;
  label: string;
  description: string;
}) {
  return (
    <Link href={href} className="flex items-center gap-3 bg-white rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow group">
      <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center shrink-0 group-hover:bg-orange-100 transition-colors" style={{ color: 'var(--li-primary)' }}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold">{label}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
    </Link>
  );
}
