'use client';

import { useEffect } from 'react';

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    if (
      error?.name === 'ChunkLoadError' ||
      error?.message?.includes('Loading chunk') ||
      error?.message?.includes('Cannot find module')
    ) {
      window.location.reload();
    }
  }, [error]);

  return (
    <html>
      <body>
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          justifyContent: 'center', minHeight: '100vh', fontFamily: 'sans-serif',
          background: '#f8f9fc', color: '#1a1a2e',
        }}>
          <p style={{ fontSize: 14, color: '#64748b', marginBottom: 16 }}>
            Something went wrong. Refreshing…
          </p>
          <button
            onClick={reset}
            style={{
              padding: '10px 24px', borderRadius: 12, border: 'none',
              background: '#F7921E', color: '#fff', fontWeight: 700,
              fontSize: 14, cursor: 'pointer',
            }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
