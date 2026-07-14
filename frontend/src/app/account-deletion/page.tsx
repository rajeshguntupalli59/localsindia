import Link from 'next/link';

export const metadata = { title: 'Delete Your Account — LocalsIndia' };

export default function AccountDeletionPage() {
  return (
    <div className="min-h-screen" style={{ background: 'var(--li-page-bg)' }}>
      <div className="max-w-3xl mx-auto px-4 py-12">

        <Link href="/" className="text-sm font-semibold mb-8 inline-block" style={{ color: 'var(--li-primary)' }}>
          ← Back to LocalsIndia
        </Link>

        <h1 className="text-3xl font-black mb-2" style={{ color: 'var(--li-text)' }}>Delete Your Account</h1>
        <p className="text-sm text-muted-foreground mb-8">This page works whether or not you still have the app installed.</p>

        <div className="prose prose-slate max-w-none space-y-6 text-sm leading-relaxed" style={{ color: 'var(--li-text)' }}>

          <section>
            <h2 className="text-lg font-bold mb-2">Option 1 — Delete it yourself (fastest)</h2>
            <p>If you can still sign in:</p>
            <ul className="list-disc pl-5 space-y-1 mt-2">
              <li><strong>App:</strong> Profile tab → Delete account → confirm twice</li>
              <li><strong>Website:</strong> <Link href="/profile" style={{ color: 'var(--li-primary)' }}>localsindia.com/profile</Link> → Delete account → confirm twice</li>
            </ul>
            <p className="mt-2">This takes effect immediately — no waiting period.</p>
          </section>

          <section>
            <h2 className="text-lg font-bold mb-2">Option 2 — Request it by email</h2>
            <p>If you no longer have the app or can&apos;t sign in, email us from the phone number or email address on your account:</p>
            <p className="mt-2"><strong>Email:</strong> <a href="mailto:support@localsindia.com?subject=Account%20deletion%20request" style={{ color: 'var(--li-primary)' }}>support@localsindia.com</a></p>
            <p className="mt-2">Include your registered phone number so we can find your account. We process these requests within 7 days.</p>
          </section>

          <section>
            <h2 className="text-lg font-bold mb-2">What gets deleted</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>Your name, phone number, email address, and password are permanently removed — not just hidden</li>
              <li>All of your listings are immediately taken down and no longer shown to other users</li>
              <li>Your saved listings, notification preferences, and reviews you&apos;ve written are disconnected from any identifying information</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold mb-2">What&apos;s retained, and why</h2>
            <p>We keep an anonymised record that an account existed and was deleted (no name, phone, or email attached) — this is standard fraud-prevention practice, e.g. to detect abuse patterns from repeat account creation. This anonymised record cannot be used to identify you or restore your account.</p>
          </section>

          <section>
            <h2 className="text-lg font-bold mb-2">Questions</h2>
            <p>See our full <Link href="/privacy" style={{ color: 'var(--li-primary)' }}>Privacy Policy</Link> or email <a href="mailto:support@localsindia.com" style={{ color: 'var(--li-primary)' }}>support@localsindia.com</a>.</p>
          </section>

        </div>
      </div>
    </div>
  );
}
