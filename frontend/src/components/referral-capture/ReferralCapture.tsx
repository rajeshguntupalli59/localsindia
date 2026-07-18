'use client';

import { useEffect } from 'react';

const REF_KEY = 'li_ref_code';

/** Captures ?ref=CODE from any page's URL on first load and persists it so it
 * survives client-side navigation to /auth/login, which the link rarely
 * points at directly (invite links point at a city page, not the login page). */
export default function ReferralCapture() {
  useEffect(() => {
    const ref = new URLSearchParams(window.location.search).get('ref');
    if (ref) {
      try { localStorage.setItem(REF_KEY, ref); } catch { /* ignore */ }
    }
  }, []);

  return null;
}
