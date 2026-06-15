'use client';

import { useEffect, useState, useCallback } from 'react';
import { Users, ShieldCheck, ShieldOff } from 'lucide-react';
import { toast } from 'sonner';
import EmptyState from '@/components/empty-state/EmptyState';

interface UserRow {
  id: string;
  phone: string | null;
  name: string | null;
  email: string | null;
  role: string;
  is_active: boolean;
  created_at: string;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000';

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState<string | null>(null);
  const [myId, setMyId] = useState<string | null>(null);

  useEffect(() => {
    try {
      const u = localStorage.getItem('user');
      if (u) setMyId(JSON.parse(u).id ?? null);
    } catch {}
  }, []);

  const fetchUsers = useCallback(async () => {
    const token = localStorage.getItem('access_token');
    if (!token) return;
    try {
      const res = await fetch(`${API_BASE}/api/v1/admin/users`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error();
      setUsers(await res.json());
    } catch {
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const changeRole = async (u: UserRow) => {
    const newRole = u.role === 'admin' ? 'user' : 'admin';
    const label = newRole === 'admin' ? 'Make Admin' : 'Remove Admin';
    const confirmed = window.confirm(
      newRole === 'admin'
        ? `Give admin access to ${u.name ?? u.phone ?? u.email}?`
        : `Remove admin access from ${u.name ?? u.phone ?? u.email}?`
    );
    if (!confirmed) return;

    setActionId(u.id);
    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch(`${API_BASE}/api/v1/admin/users/${u.id}/role`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ role: newRole }),
      });
      if (!res.ok) throw new Error();
      setUsers(us => us.map(x => x.id === u.id ? { ...x, role: newRole } : x));
      toast.success(`${u.name ?? 'User'} is now ${newRole === 'admin' ? 'an admin' : 'a regular user'}`);
    } catch {
      toast.error(`Failed to ${label.toLowerCase()}`);
    } finally {
      setActionId(null);
    }
  };

  const adminCount = users.filter(u => u.role === 'admin').length;

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold">Users</h1>
          <p className="text-sm text-muted-foreground">
            {users.length} registered · {adminCount} admin{adminCount !== 1 ? 's' : ''}
          </p>
        </div>
      </div>

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-14 bg-white rounded-xl animate-pulse" />
          ))}
        </div>
      ) : users.length === 0 ? (
        <EmptyState icon={Users} title="No users yet" description="Users will appear here once they register" />
      ) : (
        <div className="bg-white rounded-xl border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-slate-50">
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Name</th>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Contact</th>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Role</th>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Joined</th>
                <th className="text-right px-4 py-3 font-semibold text-muted-foreground">Action</th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => {
                const isMe = u.id === myId;
                const isAdmin = u.role === 'admin';
                const busy = actionId === u.id;
                return (
                  <tr key={u.id} className="border-b last:border-0 hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 font-medium">
                      {u.name ?? '—'}
                      {isMe && (
                        <span className="ml-2 text-xs text-slate-400 font-normal">(you)</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {u.phone ?? u.email ?? '—'}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${
                        isAdmin
                          ? 'bg-amber-100 text-amber-700'
                          : 'bg-slate-100 text-slate-600'
                      }`}>
                        {isAdmin && <ShieldCheck className="w-3 h-3" />}
                        {u.role}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {new Date(u.created_at).toLocaleDateString('en-IN', {
                        day: 'numeric', month: 'short', year: 'numeric',
                      })}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {!isMe && (
                        <button
                          onClick={() => changeRole(u)}
                          disabled={busy}
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors disabled:opacity-50 ${
                            isAdmin
                              ? 'bg-red-50 text-red-700 hover:bg-red-100'
                              : 'bg-green-50 text-green-700 hover:bg-green-100'
                          }`}
                        >
                          {isAdmin
                            ? <><ShieldOff className="w-3.5 h-3.5" /> Remove Admin</>
                            : <><ShieldCheck className="w-3.5 h-3.5" /> Make Admin</>
                          }
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
