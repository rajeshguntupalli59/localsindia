'use client';

import { useState } from 'react';
import { Lock, Phone, ShieldCheck } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { api, ApiError } from '@/lib/api';
import { useRouter } from 'next/navigation';

const OTP_DEBUG = process.env.NEXT_PUBLIC_OTP_DEBUG === 'true';

export default function AdminLoginPage() {
  const router = useRouter();
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [digits, setDigits] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const phone = `+91${digits}`;

  const sendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await api.auth.sendOtp(phone);
      setStep('otp');
      if (res?.otp) {
        toast.info(`Admin OTP: ${res.otp}`, { duration: 60000 });
      } else {
        toast.success('OTP sent to your mobile');
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

      if (res.user?.role !== 'admin') {
        toast.error('Access denied. Admin privileges required.');
        setStep('phone');
        setDigits('');
        setOtp('');
        setLoading(false);
        return;
      }

      localStorage.setItem('access_token', res.access_token);
      localStorage.setItem('refresh_token', res.refresh_token);
      localStorage.setItem('user', JSON.stringify(res.user));
      toast.success('Welcome back, Admin!');
      router.replace('/admin/listings');
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Invalid OTP');
    } finally {
      setLoading(false);
    }
  };

  const devAdminLogin = async () => {
    setLoading(true);
    try {
      const res = await api.auth.devLogin();
      if (res.user?.role !== 'admin') {
        toast.error('Dev user is not admin. Run: UPDATE users SET role=\'admin\' WHERE phone=\'+919999999999\';');
        setLoading(false);
        return;
      }
      localStorage.setItem('access_token', res.access_token);
      localStorage.setItem('refresh_token', res.refresh_token);
      localStorage.setItem('user', JSON.stringify(res.user));
      toast.success('Dev admin login OK');
      router.replace('/admin/listings');
    } catch {
      toast.error('Dev login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4"
      style={{ background: '#0f172a' }}
    >
      <div className="w-full max-w-sm">
        {/* Logo / title */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4" style={{ background: '#1e293b' }}>
            <ShieldCheck className="w-7 h-7 text-amber-400" />
          </div>
          <h1 className="text-xl font-bold text-white">Admin Console</h1>
          <p className="text-slate-400 text-sm mt-1">localsindia.com</p>
        </div>

        <div className="rounded-2xl border border-slate-700 bg-slate-800 p-7 shadow-2xl">
          {step === 'phone' ? (
            <form onSubmit={sendOtp} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="phone" className="text-slate-300 text-sm">Admin Phone Number</Label>
                <div className="flex rounded-lg border border-slate-600 overflow-hidden focus-within:ring-2 focus-within:ring-amber-400/50">
                  <div className="flex items-center gap-1.5 px-3 bg-slate-700 border-r border-slate-600 shrink-0">
                    <Phone className="w-3.5 h-3.5 text-slate-400" />
                    <span className="text-sm font-semibold text-slate-300">+91</span>
                  </div>
                  <input
                    id="phone"
                    className="flex-1 px-3 py-2.5 text-sm bg-slate-800 text-white outline-none placeholder:text-slate-500"
                    placeholder="9876543210"
                    value={digits}
                    onChange={e => setDigits(e.target.value.replace(/\D/g, '').slice(0, 10))}
                    inputMode="numeric"
                    maxLength={10}
                    required
                  />
                </div>
              </div>

              <Button
                type="submit"
                className="w-full bg-amber-500 hover:bg-amber-400 text-slate-900 font-bold"
                disabled={loading || digits.length < 10}
              >
                {loading ? 'Sending...' : 'Send OTP →'}
              </Button>

              {OTP_DEBUG && (
                <button
                  type="button"
                  onClick={devAdminLogin}
                  disabled={loading}
                  className="w-full py-2.5 rounded-xl border border-slate-600 text-slate-400 text-xs hover:border-amber-400/50 hover:text-amber-300 transition-colors"
                >
                  ⚡ Dev bypass (debug only)
                </button>
              )}
            </form>
          ) : (
            <form onSubmit={verifyOtp} className="space-y-5">
              <p className="text-slate-400 text-xs text-center">
                OTP sent to <span className="text-white font-semibold">+91 {digits}</span>
              </p>
              <div className="space-y-2">
                <Label htmlFor="otp" className="text-slate-300 text-sm">6-digit OTP</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <Input
                    id="otp"
                    className="pl-10 text-center tracking-[0.5em] text-xl bg-slate-700 border-slate-600 text-white"
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
                className="w-full bg-amber-500 hover:bg-amber-400 text-slate-900 font-bold"
                disabled={loading || otp.length < 6}
              >
                {loading ? 'Verifying...' : 'Verify & Enter Admin'}
              </Button>

              <button
                type="button"
                className="text-xs text-slate-500 hover:text-slate-300 underline w-full text-center transition-colors"
                onClick={() => { setStep('phone'); setOtp(''); }}
              >
                Change number
              </button>
            </form>
          )}
        </div>

        <p className="text-center text-slate-600 text-xs mt-6">
          Restricted access — authorised personnel only
        </p>
      </div>
    </div>
  );
}
