'use client';

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';

export default function CategoryRedirectPage() {
  const { slug } = useParams<{ slug: string }>();
  const router = useRouter();

  useEffect(() => {
    const city = typeof window !== 'undefined' ? localStorage.getItem('li_city') : '';
    const cityParam = city ? `&city=${encodeURIComponent(city)}` : '';
    if (slug) {
      router.replace(`/search?category=${encodeURIComponent(slug)}${cityParam}`);
    } else {
      router.replace(`/search${city ? `?city=${encodeURIComponent(city)}` : ''}`);
    }
  }, [slug, router]);

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
      <div style={{ width: 32, height: 32, borderRadius: '50%', border: '3px solid #F7921E', borderTopColor: 'transparent', animation: 'spin 0.7s linear infinite' }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
