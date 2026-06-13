'use client';

import { Suspense, useState } from 'react';
import { ArrowLeft, Phone, Lock, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { api, ApiError } from '@/lib/api';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import SiteLogo from '@/components/site-logo/SiteLogo';

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000';
const GOOGLE_AUTH_ENABLED = process.env.NEXT_PUBLIC_GOOGLE_AUTH_ENABLED === 'true';
const OTP_DEBUG = process.env.NEXT_PUBLIC_OTP_DEBUG === 'true';

const GoogleIcon = () => (
  <svg viewBox="0 0 24 24" className="w-5 h-5" aria-hidden>
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
  </svg>
);

function LoginInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [step, setStep] = useState<'phone' | 'otp' | 'name'>('phone');
  const [mode, setMode] = useState<'signin' | 'signup'>(
    searchParams.get('mode') === 'signup' ? 'signup' : 'signin'
  );
  const [digits, setDigits] = useState('');
  const [otp, setOtp] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [tokens, setTokens] = useState<{ access: string; refresh: string; user: object } | null>(null);
  const phone = `+91${digits}`;

  const oauthError = searchParams.get('error');

  const handlePhoneSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === 'signin') {
        // Existing user — direct login, no OTP
        const res = await api.auth.signin(phone);
        localStorage.setItem('access_token', res.access_token);
        localStorage.setItem('refresh_token', res.refresh_token);
        localStorage.setItem('user', JSON.stringify(res.user));
        toast.success(`Welcome back, ${(res.user as { name?: string }).name ?? 'back'}!`);
        router.push('/profile');
      } else {
        // New user — send OTP for phone verification
        const res = await api.auth.sendOtp(phone);
        setStep('otp');
        if (res?.otp) {
          toast.info(`OTP: ${res.otp}`, { duration: 60000 });
        } else {
          toast.success('OTP sent to your mobile!');
        }
      }
    } catch (err) {
      if (err instanceof ApiError && err.status === 404 && mode === 'signin') {
        toast.error("No account found. Create a free account first!");
        setMode('signup');
      } else {
        toast.error(err instanceof ApiError ? err.message : mode === 'signin' ? 'Login failed' : 'Failed to send OTP');
      }
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

      if (res.is_new_user) {
        // New user — ask for their name before going home
        setTokens({ access: res.access_token, refresh: res.refresh_token, user: res.user });
        setStep('name');
      } else {
        toast.success(`Welcome back, ${res.user.name}!`);
        router.push('/profile');
      }
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Invalid OTP');
    } finally {
      setLoading(false);
    }
  };

  const saveName = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !tokens) return;
    setLoading(true);
    try {
      const updated = await api.auth.updateProfile({ name: name.trim() }, tokens.access);
      localStorage.setItem('user', JSON.stringify(updated));
      toast.success(`Welcome to LocalsIndia, ${updated.name}!`);
      router.push('/profile');
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Failed to save name');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center py-12 px-4" style={{ background: 'var(--li-page-bg)' }}>
      <div className="w-full max-w-sm">

        <Link href="/" className="flex items-center gap-2 text-slate-500 hover:text-slate-800 mb-6 w-fit text-sm">
          <ArrowLeft className="w-4 h-4" /> Back to home
        </Link>

        <div className="rounded-2xl overflow-hidden shadow-xl border border-slate-200 bg-white">

          {/* Header band */}
          <div className="px-6 pt-8 pb-6" style={{ background: 'var(--li-nav-bg)' }}>
            {/* Logo on dark header */}
            <div className="mb-5">
              <SiteLogo variant="light" size="md" tagline={true} />
            </div>
            <h1 className="text-2xl font-bold text-white">
              {step === 'name' ? 'Almost done!' : mode === 'signup' ? 'Create account' : 'Welcome back'}
            </h1>
            <p className="text-white/60 text-sm mt-1">
              {step === 'name'
                ? 'Tell us your name to complete setup'
                : mode === 'signup'
                ? 'Verify your number to get started'
                : 'Enter your number to sign in instantly'}
            </p>

            {/* Sign In / Sign Up tabs — only on phone step */}
            {step === 'phone' && (
              <div className="flex gap-1 mt-5 bg-white/10 p-1 rounded-xl">
                <button
                  type="button"
                  onClick={() => setMode('signin')}
                  className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-colors ${
                    mode === 'signin' ? 'bg-white text-slate-900' : 'text-white/70 hover:text-white'
                  }`}
                >
                  Sign In
                </button>
                <button
                  type="button"
                  onClick={() => setMode('signup')}
                  className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-colors ${
                    mode === 'signup' ? 'bg-white text-slate-900' : 'text-white/70 hover:text-white'
                  }`}
                >
                  Create Account
                </button>
              </div>
            )}
          </div>

          <div className="px-6 py-7">

            {/* Dev bypass */}
            {OTP_DEBUG && step === 'phone' && (
              <button
                type="button"
                className="w-full mb-5 py-2.5 rounded-xl bg-yellow-400 text-slate-900 text-sm font-bold hover:bg-yellow-300"
                onClick={async () => {
                  setLoading(true);
                  try {
                    const res = await api.auth.devLogin();
                    localStorage.setItem('access_token', res.access_token);
                    localStorage.setItem('refresh_token', res.refresh_token);
                    localStorage.setItem('user', JSON.stringify(res.user));
                    toast.success('Dev login — skipped OTP');
                    router.push('/profile');
                  } catch { toast.error('Dev login failed'); }
                  finally { setLoading(false); }
                }}
                disabled={loading}
              >
                ⚡ Dev Login (skip OTP)
              </button>
            )}

            {/* Google error */}
            {oauthError && (
              <div className="mb-5 px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700">
                {oauthError === 'google_denied'
                  ? 'Google sign-in was cancelled.'
                  : oauthError === 'account_deactivated'
                  ? 'Your account has been deactivated. Contact support.'
                  : 'Google sign-in failed. Please try again or use your phone number.'}
              </div>
            )}

            {/* ── Step 1: Phone ── */}
            {step === 'phone' && (
              <>
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
                <form onSubmit={handlePhoneSubmit} className="space-y-5">
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
                  <Button type="submit" className="w-full text-white" style={{ background: 'var(--li-primary)' }} disabled={loading}>
                    {loading
                      ? (mode === 'signin' ? 'Signing in...' : 'Sending OTP...')
                      : mode === 'signin' ? 'Sign In →' : 'Send OTP →'}
                  </Button>
                  {mode === 'signup' ? (
                    <p className="text-xs text-center text-muted-foreground">
                      Already have an account?{' '}
                      <button type="button" className="underline" style={{ color: 'var(--li-primary)' }} onClick={() => setMode('signin')}>Sign in</button>
                    </p>
                  ) : (
                    <p className="text-xs text-center text-muted-foreground">
                      New to LocalsIndia?{' '}
                      <button type="button" className="underline" style={{ color: 'var(--li-primary)' }} onClick={() => setMode('signup')}>Create free account</button>
                    </p>
                  )}
                </form>
              </>
            )}

            {/* ── Step 2: OTP ── */}
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
                <Button type="submit" className="w-full text-white" style={{ background: 'var(--li-primary)' }} disabled={loading || otp.length < 6}>
                  {loading ? 'Verifying...' : 'Verify OTP'}
                </Button>
                <button type="button" className="text-sm underline w-full text-center" style={{ color: 'var(--li-primary)' }} onClick={() => { setStep('phone'); setOtp(''); }}>
                  Change number
                </button>
              </form>
            )}

            {/* ── Step 3: Name (new users only) ── */}
            {step === 'name' && (
              <form onSubmit={saveName} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="name">Your Name</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="name"
                      className="pl-10"
                      placeholder="e.g. Rajesh Kumar"
                      value={name}
                      onChange={e => setName(e.target.value)}
                      autoFocus
                      required
                      minLength={2}
                      maxLength={60}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">This is shown to other users on your listings</p>
                </div>
                <Button type="submit" className="w-full text-white" style={{ background: 'var(--li-primary)' }} disabled={loading || name.trim().length < 2}>
                  {loading ? 'Saving...' : 'Continue →'}
                </Button>
              </form>
            )}

          </div>

          {/* Privacy / Terms notice */}
          <p className="text-[11px] text-center text-muted-foreground px-4 pb-2">
            By continuing, you agree to our{' '}
            <a href="/terms" className="underline hover:text-slate-700">Terms of Service</a>
            {' '}and{' '}
            <a href="/privacy" className="underline hover:text-slate-700">Privacy Policy</a>.
          </p>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return <Suspense fallback={null}><LoginInner /></Suspense>;
}
