'use client';

import { Suspense, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'https://localsindia-backend-in.azurewebsites.net';

function AuthCallbackInner() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const token = searchParams.get('token');
    const refresh = searchParams.get('refresh');
    const name = searchParams.get('name');

    if (!token) {
      toast.error('Sign-in failed. Please try again.');
      router.replace('/auth/login?error=no_token');
      return;
    }

    localStorage.setItem('access_token', token);
    if (refresh) localStorage.setItem('refresh_token', refresh);

    // Fetch full user profile so Google users have the same complete object as phone users
    fetch(`${API_BASE}/api/v1/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.ok ? r.json() : null)
      .then(user => {
        if (user) {
          localStorage.setItem('user', JSON.stringify(user));
          toast.success(`Welcome, ${user.name ?? (name ? decodeURIComponent(name) : 'back')}!`);
        } else {
          // Fallback: store partial user from URL params
          if (name) localStorage.setItem('user', JSON.stringify({ name: decodeURIComponent(name) }));
          toast.success(`Welcome, ${name ? decodeURIComponent(name) : 'back'}!`);
        }
        const city = localStorage.getItem('li_city');
        router.replace(city ? `/${city}` : '/hyderabad');
      })
      .catch(() => {
        if (name) localStorage.setItem('user', JSON.stringify({ name: decodeURIComponent(name) }));
        toast.success('Signed in successfully!');
        const city = localStorage.getItem('li_city');
        router.replace(city ? `/${city}` : '/hyderabad');
      });
  }, [router, searchParams]);

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--li-page-bg)' }}>
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 rounded-full border-4 border-orange-500/20 border-t-orange-500 animate-spin" />
        <p className="text-sm font-medium text-slate-500">Signing you in…</p>
      </div>
    </div>
  );
}

const Spinner = () => (
  <div className="min-h-screen flex items-center justify-center">
    <div className="w-10 h-10 rounded-full border-4 border-orange-500/20 border-t-orange-500 animate-spin" />
  </div>
);

export default function AuthCallbackPage() {
  return <Suspense fallback={<Spinner />}><AuthCallbackInner /></Suspense>;
}
