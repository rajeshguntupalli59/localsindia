'use client';

export default function OfflinePage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 text-center" style={{ background: 'var(--li-page-bg)' }}>
      <div
        className="w-20 h-20 rounded-3xl flex items-center justify-center mb-6"
        style={{ background: 'var(--li-primary-light)' }}
      >
        <span className="text-4xl">📡</span>
      </div>
      <h1 className="text-2xl font-black mb-2" style={{ color: 'var(--li-text)' }}>
        You&apos;re offline
      </h1>
      <p className="text-sm max-w-xs" style={{ color: 'var(--li-muted)' }}>
        Check your connection and try again. Pages you visited recently are still available.
      </p>
      <button
        onClick={() => window.location.reload()}
        className="mt-6 px-6 py-3 rounded-2xl text-sm font-bold text-white"
        style={{ background: 'var(--li-primary)' }}
      >
        Try again
      </button>
    </div>
  );
}
