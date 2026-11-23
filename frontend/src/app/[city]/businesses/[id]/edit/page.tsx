import type { Metadata } from 'next';
import EditBusinessClient from './EditBusinessClient';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Edit business details', robots: { index: false, follow: false } };

export default function Page() {
  return <EditBusinessClient />;
}
