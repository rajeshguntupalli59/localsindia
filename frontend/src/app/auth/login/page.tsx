'use client';

import { useState } from 'react';
import { ArrowLeft, Phone, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { api, ApiError } from '@/lib/api';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000';
const GOOGLE_AUTH_ENABLED = process.env.NEXT_PUBLIC_GOOGLE_AUTH_ENABLED === 'true';

const GoogleIcon = () => (
  <svg viewBox="0 0 24 24" className="w-5 h-5" aria-hidden>
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
  </svg>
);

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [digits, setDigits] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const phone = `+91${digits}`;

  // Show error from Google OAuth redirect if present
  const oauthError = searchParams.get('error');

  const sendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await api.auth.sendOtp(phone);
      setStep('otp');
      if (res?.otp) {
        // Debug mode: OTP returned in response (testing without SMS)
        toast.info(`OTP: ${res.otp}`, { duration: 60000 });
      } else {
        toast.success('OTP sent to your mobile!');
      }
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  };

  const verifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await api.auth.verifyOtp({ phone, otp });
      localStorage.setItem('access_token', res.access_token);
      localStorage.setItem('refresh_token', res.refresh_token);
      localStorage.setItem('user', JSON.stringify(res.user));
      toast.success(`Welcome${res.user.name ? `, ${res.user.name}` : ''}!`);
      router.back();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Invalid OTP');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center py-12 px-4" style={{ background: 'var(--li-page-bg)' }}>

      <div className="w-full max-w-sm">

        {/* Back link */}
        <Link
          href="/"
          className="flex items-center gap-2 text-slate-500 hover:text-slate-800 mb-6 w-fit text-sm"
        >
          <ArrowLeft className="w-4 h-4" /> Back to home
        </Link>

        {/* Card */}
        <div className="rounded-2xl overflow-hidden shadow-xl border border-slate-200 bg-white">

          {/* Dark header band */}
          <div className="px-6 pt-8 pb-7" style={{ background: 'var(--li-nav-bg)' }}>
            <h1 className="text-2xl font-bold text-white">Sign In</h1>
            <p className="text-white/60 text-sm mt-1">
              {step === 'otp' ? `Enter the OTP sent to +91 ${digits}` : 'Choose how you want to continue'}
            </p>
          </div>

          {/* Form area */}
          <div className="px-6 py-7">

        {/* Google OAuth error banner */}
        {oauthError && (
          <div className="mb-5 px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700">
            {oauthError === 'google_denied'
              ? 'Google sign-in was cancelled.'
              : 'Google sign-in failed. Please try again or use your phone number.'}
          </div>
        )}

        {step === 'phone' && (
          <>
            {/* ── Google button — shown only after domain verification ── */}
            {GOOGLE_AUTH_ENABLED && (
              <>
                <a
                  href={`${BACKEND_URL}/api/v1/auth/google`}
                  className="flex items-center justify-center gap-3 w-full h-12 px-4
                    bg-white rounded-xl border border-slate-200
                    text-sm font-semibold text-slate-700
                    hover:bg-slate-50 hover:border-slate-300
                    transition-all duration-200 shadow-sm"
                >
                  <GoogleIcon />
                  Continue with Google
                </a>
                <div className="flex items-center gap-3 my-5">
                  <div className="flex-1 h-px bg-slate-200" />
                  <span className="text-xs font-medium text-slate-400">or use your phone</span>
                  <div className="flex-1 h-px bg-slate-200" />
                </div>
              </>
            )}

            {/* ── OTP form ── */}
            <form onSubmit={sendOtp} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="phone">Mobile Number</Label>
                <div className="flex rounded-lg border border-input overflow-hidden focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-0">
                  <div className="flex items-center gap-1.5 px-3 bg-slate-50 border-r border-input shrink-0">
                    <Phone className="w-3.5 h-3.5 text-muted-foreground" />
                    <span className="text-sm font-semibold text-slate-700">+91</span>
                  </div>
                  <input
                    id="phone"
                    className="flex-1 px-3 py-2 text-sm bg-white outline-none"
                    placeholder="9876543210"
                    value={digits}
                    onChange={e => setDigits(e.target.value.replace(/\D/g, '').slice(0, 10))}
                    inputMode="numeric"
                    maxLength={10}
                    required
                  />
                </div>
                <p className="text-xs text-muted-foreground">Enter your 10-digit mobile number</p>
              </div>
              <Button
                type="submit"
                className="w-full text-white"
                style={{ background: 'var(--li-primary)' }}
                disabled={loading}
              >
                {loading ? 'Sending...' : 'Send OTP'}
              </Button>
            </form>
          </>
        )}

        {step === 'otp' && (
          <form onSubmit={verifyOtp} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="otp">6-digit OTP</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="otp"
                  className="pl-10 text-center tracking-[0.5em] text-xl"
                  placeholder="------"
                  value={otp}
                  onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  maxLength={6}
                  autoFocus
                  required
                />
              </div>
            </div>
            <Button
              type="submit"
              className="w-full text-white"
              style={{ background: 'var(--li-primary)' }}
              disabled={loading || otp.length < 6}
            >
              {loading ? 'Verifying...' : 'Verify OTP'}
            </Button>
            <button
              type="button"
              className="text-sm underline w-full text-center"
              style={{ color: 'var(--li-primary)' }}
              onClick={() => { setStep('phone'); setOtp(''); }}
            >
              Change number
            </button>
          </form>
        )}
          </div>
        </div>
      </div>
    </div>
  );
}
