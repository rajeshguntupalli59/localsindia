'use client';

import { useEffect, useRef, useState } from 'react';
import { QrCode, CheckCircle2, XCircle, Camera } from 'lucide-react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000';

interface BarcodeDetectorResult {
  rawValue: string;
}
interface BarcodeDetectorInstance {
  detect(source: HTMLVideoElement): Promise<BarcodeDetectorResult[]>;
}
declare global {
  interface Window {
    BarcodeDetector?: new (options: { formats: string[] }) => BarcodeDetectorInstance;
  }
}

type ScanResult =
  | { kind: 'valid'; eventTitle: string; attendeeName: string | null }
  | { kind: 'error'; message: string };

export default function ScanTicketsPage() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [supported, setSupported] = useState<boolean | null>(null);
  const [manualToken, setManualToken] = useState('');
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState<ScanResult | null>(null);
  const busyRef = useRef(false);

  const submitToken = async (token: string) => {
    if (busyRef.current || !token) return;
    busyRef.current = true;
    const adminToken = localStorage.getItem('access_token');
    try {
      const res = await fetch(`${API_BASE}/api/v1/admin/tickets/scan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
        body: JSON.stringify({ qr_token: token }),
      });
      const data = await res.json();
      if (res.ok) {
        setResult({ kind: 'valid', eventTitle: data.event_title, attendeeName: data.attendee_name });
      } else {
        setResult({ kind: 'error', message: data.detail ?? 'Scan failed' });
      }
    } catch {
      setResult({ kind: 'error', message: 'Network error — could not reach the server' });
    } finally {
      setTimeout(() => { busyRef.current = false; }, 1500);
    }
  };

  useEffect(() => {
    setSupported(typeof window !== 'undefined' && !!window.BarcodeDetector);
  }, []);

  useEffect(() => {
    if (!supported || !scanning) return;
    let stream: MediaStream | null = null;
    let raf = 0;
    let stopped = false;

    (async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
        const detector = new window.BarcodeDetector!({ formats: ['qr_code'] });
        const tick = async () => {
          if (stopped || !videoRef.current) return;
          try {
            const codes = await detector.detect(videoRef.current);
            if (codes.length > 0) {
              await submitToken(codes[0].rawValue);
            }
          } catch {
            // ignore transient detection errors
          }
          raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);
      } catch {
        setResult({ kind: 'error', message: 'Camera access denied or unavailable' });
        setScanning(false);
      }
    })();

    return () => {
      stopped = true;
      cancelAnimationFrame(raf);
      stream?.getTracks().forEach(t => t.stop());
    };
  }, [supported, scanning]);

  return (
    <div className="p-6 max-w-lg">
      <h1 className="text-xl font-bold text-slate-900 mb-1">Scan Tickets</h1>
      <p className="text-sm text-slate-500 mb-6">Scan an attendee&apos;s QR code to check them in.</p>

      {supported && (
        <div className="mb-4">
          {!scanning ? (
            <button
              onClick={() => { setResult(null); setScanning(true); }}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-white font-semibold text-sm bg-slate-900"
            >
              <Camera className="w-4 h-4" /> Start Camera Scan
            </button>
          ) : (
            <div className="rounded-2xl overflow-hidden border border-slate-200 relative">
              <video ref={videoRef} className="w-full aspect-square object-cover" muted playsInline />
              <button
                onClick={() => setScanning(false)}
                className="absolute top-2 right-2 text-xs font-semibold px-3 py-1.5 rounded-lg bg-black/60 text-white"
              >
                Stop
              </button>
            </div>
          )}
        </div>
      )}

      {supported === false && (
        <p className="text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-xl p-3 mb-4">
          Camera scanning isn&apos;t supported in this browser. Use manual entry below (Chrome/Edge on Android or desktop support camera scanning).
        </p>
      )}

      <div className="flex gap-2 mb-4">
        <input
          value={manualToken}
          onChange={e => setManualToken(e.target.value)}
          placeholder="Paste or type ticket code"
          className="flex-1 rounded-lg border border-input px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
        />
        <button
          onClick={() => submitToken(manualToken.trim())}
          className="px-4 py-2 rounded-lg text-sm font-semibold text-white bg-slate-900"
        >
          Check In
        </button>
      </div>

      {result && (
        <div
          className={`rounded-2xl p-4 flex items-start gap-3 ${
            result.kind === 'valid' ? 'bg-green-50 border border-green-100' : 'bg-red-50 border border-red-100'
          }`}
        >
          {result.kind === 'valid' ? (
            <>
              <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-green-800">Checked in</p>
                <p className="text-xs text-green-700 mt-0.5">
                  {result.attendeeName ?? 'Attendee'} — {result.eventTitle}
                </p>
              </div>
            </>
          ) : (
            <>
              <XCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-red-800">Not valid</p>
                <p className="text-xs text-red-700 mt-0.5">{result.message}</p>
              </div>
            </>
          )}
        </div>
      )}

      {!result && (
        <div className="text-xs text-slate-400 flex items-center gap-1.5">
          <QrCode className="w-3.5 h-3.5" /> Waiting for a scan
        </div>
      )}
    </div>
  );
}
