'use client';

import { useState } from 'react';
import { ArrowLeft, Phone, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { api, ApiError } from '@/lib/api';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [requestId, setRequestId] = useState('');
  const [loading, setLoading] = useState(false);

  const sendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await api.auth.sendOtp(phone);
      setRequestId(res.otp_request_id);
      setStep('otp');
      toast.success('OTP sent! (check console in dev mode)');
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
      const res = await api.auth.verifyOtp({ otp_request_id: requestId, otp });
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
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--li-page-bg)' }}>
      <div className="px-4 pt-12 pb-8" style={{ background: 'var(--li-nav-bg)' }}>
        <Link
          href="/"
          className="flex items-center gap-2 text-white/70 hover:text-white mb-5 w-fit text-sm"
        >
          <ArrowLeft className="w-4 h-4" /> Back
        </Link>
        <h1 className="text-2xl font-bold text-white">Sign In</h1>
        <p className="text-white/60 text-sm mt-1">Use your mobile number to continue</p>
      </div>

      <div className="flex-1 px-4 py-8">
        {step === 'phone' ? (
          <form onSubmit={sendOtp} className="space-y-5 max-w-sm">
            <div className="space-y-2">
              <Label htmlFor="phone">Mobile Number</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="phone"
                  className="pl-10"
                  placeholder="+91XXXXXXXXXX"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  pattern="\+91[6-9]\d{9}"
                  required
                />
              </div>
              <p className="text-xs text-muted-foreground">Indian number: +91 followed by 10 digits</p>
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
        ) : (
          <form onSubmit={verifyOtp} className="space-y-5 max-w-sm">
            <div className="space-y-2">
              <Label htmlFor="otp">Enter OTP sent to {phone}</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="otp"
                  className="pl-10 text-center tracking-[0.5em] text-xl"
                  placeholder="------"
                  value={otp}
                  onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  maxLength={6}
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
  );
}
