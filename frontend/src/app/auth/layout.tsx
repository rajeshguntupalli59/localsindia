import type { Metadata } from 'next';

// Login/callback pages have no search value (Bing flagged duplicate titles).
export const metadata: Metadata = { robots: { index: false, follow: true } };

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return children;
}
