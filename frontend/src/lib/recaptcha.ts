// Google reCAPTCHA v3 — invisible, no challenge UI. Loaded on-demand via
// <Script> on the login page only (see app/auth/login/page.tsx), not globally.
export const RECAPTCHA_SITE_KEY = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY ?? '';

declare global {
  interface Window {
    grecaptcha?: {
      ready: (cb: () => void) => void;
      execute: (siteKey: string, opts: { action: string }) => Promise<string>;
    };
  }
}

// Returns undefined when no site key is configured or the widget hasn't
// loaded yet — the backend already skips verification when it has no
// RECAPTCHA_SECRET_KEY set, so this degrades to a no-op in dev/local.
export async function getRecaptchaToken(action: string): Promise<string | undefined> {
  if (!RECAPTCHA_SITE_KEY || typeof window === 'undefined' || !window.grecaptcha) return undefined;
  try {
    return await new Promise<string>((resolve, reject) => {
      window.grecaptcha!.ready(() => {
        window.grecaptcha!.execute(RECAPTCHA_SITE_KEY, { action }).then(resolve, reject);
      });
    });
  } catch {
    return undefined;
  }
}
