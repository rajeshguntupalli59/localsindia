'use client';

import { Suspense, useState } from 'react';
import { ArrowLeft, Phone, Lock, User, Eye, EyeOff, Zap, MessageCircle, Globe, ShieldCheck, type LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { api, ApiError } from '@/lib/api';
import Link from 'next/link';
import Script from 'next/script';
import { useRouter, useSearchParams } from 'next/navigation';
import SiteLogo from '@/components/site-logo/SiteLogo';
import { usePrefs } from '@/context/PrefsContext';
import { LANGUAGES } from '@/components/language-selector/LanguageSelector';
import { RECAPTCHA_SITE_KEY, getRecaptchaToken } from '@/lib/recaptcha';

// "English, Telugu, Tamil, Kannada & Malayalam" — built from the same
// LANGUAGES registry the picker uses, so this can't drift out of sync.
function joinWithAnd(items: string[]): string {
  if (items.length <= 1) return items.join('');
  return `${items.slice(0, -1).join(', ')} & ${items[items.length - 1]}`;
}
const LANGUAGE_LIST = joinWithAnd(LANGUAGES.map(l => l.english));

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000';
const GOOGLE_AUTH_ENABLED = process.env.NEXT_PUBLIC_GOOGLE_AUTH_ENABLED === 'true';
const OTP_DEBUG = process.env.NEXT_PUBLIC_OTP_DEBUG === 'true' && process.env.NODE_ENV !== 'production';

type Step = 'phone' | 'otp' | 'create-password' | 'name' | 'forgot-phone' | 'forgot-otp' | 'forgot-reset';

// Shared sizing so every step reads as one consistent, modern form — not a mix of eras.
const FIELD = 'h-12 rounded-xl text-[15px]';
const PRIMARY_BTN = 'w-full h-12 rounded-xl text-[15px] font-semibold text-white shadow-sm shadow-orange-950/10 transition-transform active:scale-[0.99]';
const LABEL_CLS = 'text-[13px] font-semibold text-slate-600';

// Brand panel content — desktop only (lg+), the login form itself is unchanged from mobile.
const VALUE_PROPS: { icon: LucideIcon; title: string; subtitle: string }[] = [
  { icon: Zap,           title: 'Free to post',              subtitle: 'List anything in under a minute — no fees.' },
  { icon: MessageCircle, title: 'Direct WhatsApp contact',   subtitle: 'Talk to sellers directly — no middlemen, no spam calls.' },
  { icon: Globe,         title: 'Your city, your language',  subtitle: `${LANGUAGE_LIST} — hyperlocal to South India.` },
  { icon: ShieldCheck,   title: 'Verified local sellers',    subtitle: 'Real people from your own neighborhood.' },
];

function getPostLoginRedirect(redirectParam: string | null): string {
  if (redirectParam && redirectParam.startsWith('/')) return redirectParam;
  const city = typeof window !== 'undefined' ? localStorage.getItem('li_city') : null;
  // The home page's header never reflects auth state (it always shows "Sign
  // In", unlike every other page's SiteHeader) — landing a freshly-logged-in
  // user there with no city set makes login look like it silently failed.
  // /cities sidesteps that (its own header has no conflicting "Sign In" CTA)
  // and moves the user straight to the actual next step: picking a city.
  return city ? `/${city}` : '/cities';
}

const GoogleIcon = () => (
  <svg viewBox="0 0 24 24" className="w-5 h-5" aria-hidden>
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
  </svg>
);

function PasswordInput({
  id,
  value,
  onChange,
  placeholder,
  autoFocus,
  minLength,
  withLockIcon,
}: {
  id: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  autoFocus?: boolean;
  minLength?: number;
  withLockIcon?: boolean;
}) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      {withLockIcon && <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />}
      <Input
        id={id}
        type={show ? 'text' : 'password'}
        className={`${FIELD} ${withLockIcon ? 'pl-11' : 'pl-4'} pr-11`}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        autoFocus={autoFocus}
        minLength={minLength}
        required
      />
      <button
        type="button"
        onClick={() => setShow(v => !v)}
        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-slate-700 transition-colors"
        aria-label={show ? 'Hide password' : 'Show password'}
        tabIndex={-1}
      >
        {show ? <EyeOff className="w-[18px] h-[18px]" /> : <Eye className="w-[18px] h-[18px]" />}
      </button>
    </div>
  );
}

function LoginInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { cities } = usePrefs();
  const cityCount = cities.length;
  const redirectParam = searchParams.get('redirect');
  const [step, setStep] = useState<Step>('phone');
  const [mode, setMode] = useState<'signin' | 'signup'>(
    searchParams.get('mode') === 'signup' ? 'signup' : 'signin'
  );
  const [digits, setDigits] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [tokens, setTokens] = useState<{ access: string; refresh: string; user: object } | null>(null);
  const [setupToken, setSetupToken] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const phone = `+91${digits}`;

  const oauthError = searchParams.get('error');

  const goHome = () => router.push(getPostLoginRedirect(redirectParam));

  const storeSession = (res: { access_token: string; refresh_token: string; user: object }) => {
    localStorage.setItem('access_token', res.access_token);
    localStorage.setItem('refresh_token', res.refresh_token);
    localStorage.setItem('user', JSON.stringify(res.user));
  };

  // ── Sign in: phone + password ──
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await api.auth.login(phone, password);
      storeSession(res);
      toast.success(`Welcome back, ${(res.user as { name?: string }).name ?? 'back'}!`);
      goHome();
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) {
        toast.error('No account found. Create a free account first!');
        setMode('signup');
      } else if (err instanceof ApiError && err.status === 409) {
        toast.error('This account has no password yet — use "Forgot password" to set one.');
      } else {
        toast.error(err instanceof ApiError ? err.message : 'Incorrect phone number or password.');
      }
    } finally {
      setLoading(false);
    }
  };

  // ── Sign up: phone → send OTP ──
  const handleSignupPhoneSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const recaptchaToken = await getRecaptchaToken('otp_send');
      const res = await api.auth.sendOtp(phone, recaptchaToken);
      setStep('otp');
      if (res?.otp) {
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
      const refCode = localStorage.getItem('li_ref_code') ?? undefined;
      const res = await api.auth.verifyOtp({ phone, otp, ref_code: refCode });
      if (res.has_password) {
        toast.error('This number already has an account. Please sign in with your password.');
        setMode('signin');
        setStep('phone');
        setOtp('');
        return;
      }
      setSetupToken(res.setup_token);
      setStep('create-password');
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Invalid OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!setupToken) return;
    if (newPassword !== confirmPassword) { toast.error('Passwords do not match'); return; }
    setLoading(true);
    try {
      const res = await api.auth.setPassword(setupToken, newPassword);
      storeSession(res);
      if (res.is_new_user) {
        setTokens({ access: res.access_token, refresh: res.refresh_token, user: res.user });
        setStep('name');
      } else {
        toast.success('Password set! You\'re all set.');
        goHome();
      }
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Could not set password');
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
      goHome();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Failed to save name');
    } finally {
      setLoading(false);
    }
  };

  // ── Forgot password ──
  const handleForgotPhoneSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const recaptchaToken = await getRecaptchaToken('otp_send');
      const res = await api.auth.sendOtp(phone, recaptchaToken);
      setStep('forgot-otp');
      if (res?.otp) toast.info(`OTP: ${res.otp}`, { duration: 60000 });
      else toast.success('OTP sent to your mobile!');
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotOtpVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await api.auth.verifyOtp({ phone, otp });
      setSetupToken(res.setup_token);
      setStep('forgot-reset');
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Invalid OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!setupToken) return;
    if (newPassword !== confirmPassword) { toast.error('Passwords do not match'); return; }
    setLoading(true);
    try {
      const res = await api.auth.setPassword(setupToken, newPassword);
      storeSession(res);
      toast.success('Password reset — you\'re logged in!');
      goHome();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Could not reset password');
    } finally {
      setLoading(false);
    }
  };

  const heading =
    step === 'name' ? 'Almost done!' :
    step === 'create-password' ? 'Create a password' :
    step === 'forgot-phone' ? 'Reset your password' :
    step === 'forgot-otp' ? 'Verify OTP' :
    step === 'forgot-reset' ? 'Set a new password' :
    mode === 'signup' ? 'Create account' : 'Welcome back';

  const subheading =
    step === 'name' ? 'Tell us your name to complete setup' :
    step === 'create-password' ? 'You\'ll use this to sign in next time' :
    step === 'forgot-phone' ? 'Enter your number to receive a reset code' :
    step === 'forgot-otp' ? `Code sent to ${phone}` :
    step === 'forgot-reset' ? 'Choose a new password' :
    mode === 'signup' ? 'Verify your number to get started' :
    'Enter your number and password to sign in';

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">

      {RECAPTCHA_SITE_KEY && (
        <>
          <Script
            src={`https://www.google.com/recaptcha/api.js?render=${RECAPTCHA_SITE_KEY}`}
            strategy="afterInteractive"
          />
          {/* Google's terms allow hiding the floating badge only if this attribution
              is shown instead — added to the footer notice below. */}
          <style>{`.grecaptcha-badge { visibility: hidden; }`}</style>
        </>
      )}

      {/* Brand panel — desktop only (lg+); mobile gets just the form, unchanged */}
      <div className="hidden lg:flex lg:w-[44%] xl:w-1/2 relative overflow-hidden flex-col justify-between px-12 xl:px-16 py-16" style={{ background: 'var(--li-nav-bg)' }}>
        <div className="absolute -top-24 -left-16 w-96 h-96 rounded-full opacity-20 blur-3xl pointer-events-none" style={{ background: 'var(--li-primary)' }} />
        <div className="absolute -bottom-32 -right-20 w-[28rem] h-[28rem] rounded-full opacity-[0.10] blur-3xl pointer-events-none" style={{ background: 'var(--li-featured)' }} />

        <div className="relative">
          <SiteLogo variant="light" size="lg" />
        </div>

        <div className="relative">
          <h2 className="text-[40px] xl:text-[44px] font-extrabold leading-[1.1] tracking-tight text-white text-balance">
            Your neighborhood,<br />online.
          </h2>
          <p className="text-white/60 text-[15px] mt-4 max-w-sm leading-relaxed">
            Buy, sell, and connect with people in your own city — in your own language.
          </p>

          <div className="mt-10 space-y-5">
            {VALUE_PROPS.map(({ icon: Icon, title, subtitle }) => (
              <div key={title} className="flex items-start gap-3.5">
                <div className="shrink-0 w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
                  <Icon className="w-[18px] h-[18px] text-white" />
                </div>
                <div>
                  <p className="text-white text-[15px] font-semibold leading-tight">{title}</p>
                  <p className="text-white/55 text-[13px] mt-0.5 leading-relaxed">{subtitle}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="relative flex gap-10">
          <div>
            <p className="text-white text-2xl font-extrabold tracking-tight">{cityCount > 0 ? `${cityCount}+` : '—'}</p>
            <p className="text-white/50 text-[13px] mt-0.5">Cities</p>
          </div>
          <div>
            <p className="text-white text-2xl font-extrabold tracking-tight">{LANGUAGES.length}</p>
            <p className="text-white/50 text-[13px] mt-0.5">Languages</p>
          </div>
        </div>
      </div>

      {/* Form side */}
      <div
        className="flex-1 flex flex-col items-center justify-center py-4 px-4 overflow-y-auto"
        style={{ background: 'radial-gradient(ellipse 900px 520px at 50% -12%, var(--li-primary-light) 0%, var(--li-page-bg) 62%)' }}
      >
      <div className="w-full max-w-sm my-auto">

        <Link href="/" className="flex items-center gap-2 text-slate-500 hover:text-slate-800 mb-3 w-fit text-sm font-medium transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to home
        </Link>

        <div className="rounded-[28px] overflow-hidden shadow-2xl shadow-slate-900/10 border border-slate-100 bg-white">

          {/* Header band */}
          <div className="relative overflow-hidden px-7 pt-6 pb-5" style={{ background: 'var(--li-nav-bg)' }}>
            <div className="absolute -top-12 -left-8 w-48 h-48 rounded-full opacity-25 blur-3xl pointer-events-none" style={{ background: 'var(--li-primary)' }} />
            <div className="absolute -bottom-16 -right-10 w-56 h-56 rounded-full opacity-[0.12] blur-3xl pointer-events-none" style={{ background: 'var(--li-featured)' }} />

            <div className="relative mb-4">
              <SiteLogo variant="light" size="md" tagline={true} />
            </div>
            <h1 className="relative text-2xl font-extrabold leading-[1.15] tracking-tight text-white text-balance">{heading}</h1>
            <p className="relative text-white/65 text-[14.5px] mt-1.5 leading-relaxed">{subheading}</p>

            {/* Sign In / Sign Up tabs — only on phone step */}
            {step === 'phone' && (
              <div className="relative flex gap-1 mt-4 bg-white/10 p-1 rounded-full">
                <button
                  type="button"
                  onClick={() => setMode('signin')}
                  className={`flex-1 py-2 rounded-full text-sm font-semibold transition-all duration-200 ${
                    mode === 'signin' ? 'bg-white text-slate-900 shadow-sm' : 'text-white/70 hover:text-white'
                  }`}
                >
                  Sign In
                </button>
                <button
                  type="button"
                  onClick={() => setMode('signup')}
                  className={`flex-1 py-2 rounded-full text-sm font-semibold transition-all duration-200 ${
                    mode === 'signup' ? 'bg-white text-slate-900 shadow-sm' : 'text-white/70 hover:text-white'
                  }`}
                >
                  Create Account
                </button>
              </div>
            )}
          </div>

          <div className="px-7 py-5">

            {/* Dev bypass */}
            {OTP_DEBUG && step === 'phone' && (
              <button
                type="button"
                className="w-full mb-5 py-2.5 rounded-xl bg-yellow-400 text-slate-900 text-sm font-bold hover:bg-yellow-300"
                onClick={async () => {
                  setLoading(true);
                  try {
                    const res = await api.auth.devLogin();
                    storeSession(res);
                    toast.success('Dev login — skipped OTP');
                    goHome();
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

            {/* ── Step: Phone (sign in = phone+password, sign up = phone only) ── */}
            {step === 'phone' && (
              <>
                {GOOGLE_AUTH_ENABLED && (
                  <>
                    <button
                      type="button"
                      onClick={() => { window.location.href = `${BACKEND_URL}/api/v1/auth/google`; }}
                      className="flex items-center justify-center gap-3 w-full h-12 px-4
                        bg-white rounded-xl border border-slate-200
                        text-[15px] font-semibold text-slate-700
                        hover:bg-slate-50 hover:border-slate-300
                        transition-all duration-200 shadow-sm"
                    >
                      <GoogleIcon />
                      Continue with Google
                    </button>
                    <div className="flex items-center gap-3 my-4">
                      <div className="flex-1 h-px bg-slate-200" />
                      <span className="text-xs font-medium text-slate-400">or use your phone</span>
                      <div className="flex-1 h-px bg-slate-200" />
                    </div>
                  </>
                )}
                <form onSubmit={mode === 'signin' ? handleLogin : handleSignupPhoneSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="phone" className={LABEL_CLS}>Mobile Number</Label>
                    <div className={`flex ${FIELD} border border-input overflow-hidden focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-0 bg-white`}>
                      <div className="flex items-center gap-1.5 px-3.5 bg-slate-50 border-r border-input shrink-0">
                        <Phone className="w-3.5 h-3.5 text-muted-foreground" />
                        <span className="text-[15px] font-semibold text-slate-700">+91</span>
                      </div>
                      <input
                        id="phone"
                        type="tel"
                        className="flex-1 px-3.5 text-[15px] bg-white outline-none"
                        placeholder="Enter 10-digit mobile number"
                        value={digits}
                        onChange={e => setDigits(e.target.value.replace(/\D/g, '').slice(0, 10))}
                        inputMode="numeric"
                        maxLength={10}
                        required
                      />
                    </div>
                  </div>

                  {mode === 'signin' && (
                    <div className="space-y-2">
                      <Label htmlFor="password" className={LABEL_CLS}>Password</Label>
                      <PasswordInput
                        id="password"
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        placeholder="Your password"
                        withLockIcon
                      />
                      <button
                        type="button"
                        className="text-[13px] font-medium underline underline-offset-2"
                        style={{ color: 'var(--li-primary)' }}
                        onClick={() => { setStep('forgot-phone'); setOtp(''); setNewPassword(''); setConfirmPassword(''); }}
                      >
                        Forgot password?
                      </button>
                    </div>
                  )}

                  <Button type="submit" className={PRIMARY_BTN} style={{ background: 'var(--li-primary)' }} disabled={loading}>
                    {loading
                      ? (mode === 'signin' ? 'Signing in...' : 'Sending OTP...')
                      : mode === 'signin' ? 'Sign In →' : 'Send OTP →'}
                  </Button>
                  {mode === 'signup' ? (
                    <p className="text-[13px] text-center text-muted-foreground">
                      Already have an account?{' '}
                      <button type="button" className="font-medium underline underline-offset-2" style={{ color: 'var(--li-primary)' }} onClick={() => setMode('signin')}>Sign in</button>
                    </p>
                  ) : (
                    <p className="text-[13px] text-center text-muted-foreground">
                      New to LocalsIndia?{' '}
                      <button type="button" className="font-medium underline underline-offset-2" style={{ color: 'var(--li-primary)' }} onClick={() => setMode('signup')}>Create free account</button>
                    </p>
                  )}
                </form>
              </>
            )}

            {/* ── Step: OTP (signup) ── */}
            {step === 'otp' && (
              <form onSubmit={verifyOtp} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="otp" className={LABEL_CLS}>6-digit OTP</Label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="otp"
                      className="h-14 rounded-xl pl-11 text-center tracking-[0.5em] text-xl"
                      placeholder="------"
                      value={otp}
                      onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      maxLength={6}
                      autoFocus
                      required
                    />
                  </div>
                </div>
                <Button type="submit" className={PRIMARY_BTN} style={{ background: 'var(--li-primary)' }} disabled={loading || otp.length < 6}>
                  {loading ? 'Verifying...' : 'Verify OTP'}
                </Button>
                <button type="button" className="text-sm font-medium underline underline-offset-2 w-full text-center" style={{ color: 'var(--li-primary)' }} onClick={() => { setStep('phone'); setOtp(''); }}>
                  Change number
                </button>
              </form>
            )}

            {/* ── Step: Create password (signup) ── */}
            {step === 'create-password' && (
              <form onSubmit={handleCreatePassword} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="new-password" className={LABEL_CLS}>Password</Label>
                  <PasswordInput
                    id="new-password"
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    placeholder="At least 8 characters"
                    autoFocus
                    minLength={8}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirm-password" className={LABEL_CLS}>Confirm password</Label>
                  <PasswordInput
                    id="confirm-password"
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter password"
                    minLength={8}
                  />
                </div>
                <Button type="submit" className={PRIMARY_BTN} style={{ background: 'var(--li-primary)' }} disabled={loading || newPassword.length < 8}>
                  {loading ? 'Saving...' : 'Continue →'}
                </Button>
              </form>
            )}

            {/* ── Step: Name (new users only) ── */}
            {step === 'name' && (
              <form onSubmit={saveName} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name" className={LABEL_CLS}>Your Name</Label>
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="name"
                      className={`${FIELD} pl-11`}
                      placeholder="e.g. Rajesh Kumar"
                      value={name}
                      onChange={e => setName(e.target.value)}
                      autoFocus
                      required
                      minLength={2}
                      maxLength={60}
                    />
                  </div>
                  <p className="text-[13px] text-muted-foreground">This is shown to other users on your listings</p>
                </div>
                <Button type="submit" className={PRIMARY_BTN} style={{ background: 'var(--li-primary)' }} disabled={loading || name.trim().length < 2}>
                  {loading ? 'Saving...' : 'Continue →'}
                </Button>
              </form>
            )}

            {/* ── Step: Forgot password — phone ── */}
            {step === 'forgot-phone' && (
              <form onSubmit={handleForgotPhoneSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="forgot-phone" className={LABEL_CLS}>Mobile Number</Label>
                  <div className={`flex ${FIELD} border border-input overflow-hidden focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-0 bg-white`}>
                    <div className="flex items-center gap-1.5 px-3.5 bg-slate-50 border-r border-input shrink-0">
                      <Phone className="w-3.5 h-3.5 text-muted-foreground" />
                      <span className="text-[15px] font-semibold text-slate-700">+91</span>
                    </div>
                    <input
                      id="forgot-phone"
                      type="tel"
                      className="flex-1 px-3.5 text-[15px] bg-white outline-none"
                      placeholder="Enter 10-digit mobile number"
                      value={digits}
                      onChange={e => setDigits(e.target.value.replace(/\D/g, '').slice(0, 10))}
                      inputMode="numeric"
                      maxLength={10}
                      autoFocus
                      required
                    />
                  </div>
                </div>
                <Button type="submit" className={PRIMARY_BTN} style={{ background: 'var(--li-primary)' }} disabled={loading}>
                  {loading ? 'Sending...' : 'Send reset code →'}
                </Button>
                <button type="button" className="text-sm font-medium underline underline-offset-2 w-full text-center" style={{ color: 'var(--li-primary)' }} onClick={() => { setStep('phone'); setMode('signin'); }}>
                  Back to sign in
                </button>
              </form>
            )}

            {/* ── Step: Forgot password — OTP ── */}
            {step === 'forgot-otp' && (
              <form onSubmit={handleForgotOtpVerify} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="forgot-otp" className={LABEL_CLS}>6-digit code</Label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="forgot-otp"
                      className="h-14 rounded-xl pl-11 text-center tracking-[0.5em] text-xl"
                      placeholder="------"
                      value={otp}
                      onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      maxLength={6}
                      autoFocus
                      required
                    />
                  </div>
                </div>
                <Button type="submit" className={PRIMARY_BTN} style={{ background: 'var(--li-primary)' }} disabled={loading || otp.length < 6}>
                  {loading ? 'Verifying...' : 'Verify code'}
                </Button>
                <button type="button" className="text-sm font-medium underline underline-offset-2 w-full text-center" style={{ color: 'var(--li-primary)' }} onClick={() => { setStep('forgot-phone'); setOtp(''); }}>
                  Change number
                </button>
              </form>
            )}

            {/* ── Step: Forgot password — reset ── */}
            {step === 'forgot-reset' && (
              <form onSubmit={handleResetPassword} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="reset-password" className={LABEL_CLS}>New password</Label>
                  <PasswordInput
                    id="reset-password"
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    placeholder="At least 8 characters"
                    autoFocus
                    minLength={8}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reset-confirm" className={LABEL_CLS}>Confirm new password</Label>
                  <PasswordInput
                    id="reset-confirm"
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter password"
                    minLength={8}
                  />
                </div>
                <Button type="submit" className={PRIMARY_BTN} style={{ background: 'var(--li-primary)' }} disabled={loading || newPassword.length < 8}>
                  {loading ? 'Saving...' : 'Reset password →'}
                </Button>
              </form>
            )}

          </div>

          {/* Privacy / Terms notice */}
          <p className="text-[11.5px] text-center text-muted-foreground px-6 pb-4 leading-relaxed">
            By continuing, you agree to our{' '}
            <a href="/terms" className="underline underline-offset-2 hover:text-slate-700">Terms of Service</a>
            {' '}and{' '}
            <a href="/privacy" className="underline underline-offset-2 hover:text-slate-700">Privacy Policy</a>.
            {RECAPTCHA_SITE_KEY && (
              <>
                {' '}This site is protected by reCAPTCHA and the Google{' '}
                <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 hover:text-slate-700">Privacy Policy</a>
                {' '}and{' '}
                <a href="https://policies.google.com/terms" target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 hover:text-slate-700">Terms of Service</a>
                {' '}apply.
              </>
            )}
          </p>
        </div>
      </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return <Suspense fallback={null}><LoginInner /></Suspense>;
}
