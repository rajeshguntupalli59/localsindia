'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';

const OnboardingQuiz = dynamic(() => import('./OnboardingQuiz'), { ssr: false });

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'https://localsindia-backend-in.azurewebsites.net';
const KEY = 'li_onboarding_done';

export default function OnboardingGate() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    // Already dismissed locally
    if (localStorage.getItem(KEY)) return;
    // Only show if logged in
    const token = localStorage.getItem('access_token');
    if (!token) return;

    // Check backend whether onboarding was already completed
    fetch(`${API_BASE}/api/v1/preferences`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.ok ? r.json() : null)
      .then(prefs => {
        if (!prefs || !prefs.onboarding_done) {
          // Delay slightly so the page content loads first
          setTimeout(() => setShow(true), 1200);
        } else {
          localStorage.setItem(KEY, '1');
        }
      })
      .catch(() => {});
  }, []);

  if (!show) return null;

  return (
    <OnboardingQuiz
      onClose={() => {
        setShow(false);
        localStorage.setItem(KEY, '1');
      }}
    />
  );
}
