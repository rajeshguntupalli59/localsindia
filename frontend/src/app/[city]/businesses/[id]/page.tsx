import BusinessDetailClient from './BusinessDetailClient';

// Must be dynamic: a generateStaticParams placeholder (left from the old static
// export) made every real business id 500 — next-intl reads request headers,
// which Next refuses on a route it built as static.
export const dynamic = 'force-dynamic';

export default function Page() {
  return <BusinessDetailClient />;
}
