'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function PostRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    const citySlug = localStorage.getItem('li_city');
    if (citySlug) {
      router.replace(`/${citySlug}/classifieds/post`);
    } else {
      router.replace(`/?openPost=1`);
    }
  }, [router]);

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
      <div style={{ width: 32, height: 32, borderRadius: '50%', border: '3px solid #F7921E', borderTopColor: 'transparent', animation: 'spin 0.7s linear infinite' }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
