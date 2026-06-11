'use client';

import { useState } from 'react';
import { Lock, User, ShieldCheck, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

const API = process.env.NEXT_PUBLIC_API_URL ?? '';

export default function AdminLoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/v1/auth/admin-login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.detail ?? 'Invalid credentials');
        return;
      }
      localStorage.setItem('access_token', data.access_token);
      localStorage.setItem('refresh_token', data.refresh_token);
      localStorage.setItem('user', JSON.stringify(data.user));
      toast.success('Welcome, Admin!');
      router.replace('/admin/listings');
    } catch {
      toast.error('Login failed — check connection');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: '#0f172a' }}>
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4" style={{ background: '#1e293b' }}>
            <ShieldCheck className="w-7 h-7 text-amber-400" />
          </div>
          <h1 className="text-xl font-bold text-white">Admin Console</h1>
          <p className="text-slate-400 text-sm mt-1">localsindia.com</p>
        </div>

        <div className="rounded-2xl border border-slate-700 bg-slate-800 p-7 shadow-2xl">
          <form onSubmit={handleLogin} className="space-y-5">

            {/* Username */}
            <div className="space-y-2">
              <label className="text-slate-300 text-sm font-medium">Username</label>
              <div className="flex rounded-lg border border-slate-600 overflow-hidden focus-within:ring-2 focus-within:ring-amber-400/50">
                <div className="flex items-center px-3 bg-slate-700 border-r border-slate-600 shrink-0">
                  <User className="w-4 h-4 text-slate-400" />
                </div>
                <input
                  className="flex-1 px-3 py-2.5 text-sm bg-slate-800 text-white outline-none placeholder:text-slate-500"
                  placeholder="localsindia_admin"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  autoComplete="username"
                  required
                />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-2">
              <label className="text-slate-300 text-sm font-medium">Password</label>
              <div className="flex rounded-lg border border-slate-600 overflow-hidden focus-within:ring-2 focus-within:ring-amber-400/50">
                <div className="flex items-center px-3 bg-slate-700 border-r border-slate-600 shrink-0">
                  <Lock className="w-4 h-4 text-slate-400" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  className="flex-1 px-3 py-2.5 text-sm bg-slate-800 text-white outline-none placeholder:text-slate-500"
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  autoComplete="current-password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  className="px-3 bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              className="w-full bg-amber-500 hover:bg-amber-400 text-slate-900 font-bold"
              disabled={loading || !username || !password}
            >
              {loading ? 'Signing in...' : 'Sign in →'}
            </Button>
          </form>
        </div>

        <p className="text-center text-slate-600 text-xs mt-6">
          Restricted access — authorised personnel only
        </p>
      </div>
    </div>
  );
}
