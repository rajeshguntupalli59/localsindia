import type { Metadata } from 'next';

// Signed-in account pages — nothing for search engines (Bing flagged duplicate titles).
export const metadata: Metadata = { robots: { index: false, follow: true } };

export default function ProfileLayout({ children }: { children: React.ReactNode }) {
  return children;
}
