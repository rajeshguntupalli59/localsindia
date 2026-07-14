import Link from 'next/link';

export const metadata = { title: 'Privacy Policy — LocalsIndia' };

export default function PrivacyPage() {
  return (
    <div className="min-h-screen" style={{ background: 'var(--li-page-bg)' }}>
      <div className="max-w-3xl mx-auto px-4 py-12">

        <Link href="/" className="text-sm font-semibold mb-8 inline-block" style={{ color: 'var(--li-primary)' }}>
          ← Back to LocalsIndia
        </Link>

        <h1 className="text-3xl font-black mb-2" style={{ color: 'var(--li-text)' }}>Privacy Policy</h1>
        <p className="text-sm text-muted-foreground mb-8">Last updated: June 9, 2026</p>

        <div className="prose prose-slate max-w-none space-y-6 text-sm leading-relaxed" style={{ color: 'var(--li-text)' }}>

          <section>
            <h2 className="text-lg font-bold mb-2">1. Who We Are</h2>
            <p>LocalsIndia (<strong>localsindia.com</strong>) is a hyperlocal community platform that helps people in Indian cities buy, sell, and discover local services. We are operated by Venkata Rajesh Guntupalli, based in India.</p>
            <p className="mt-2">Contact: <a href="mailto:support@localsindia.com" style={{ color: 'var(--li-primary)' }}>support@localsindia.com</a></p>
          </section>

          <section>
            <h2 className="text-lg font-bold mb-2">2. Information We Collect</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>Phone number</strong> — collected when you sign up via OTP. Used to identify your account.</li>
              <li><strong>Email address</strong> — collected if you sign in with Google. Used to identify your account.</li>
              <li><strong>Name</strong> — provided by you during registration or from your Google profile.</li>
              <li><strong>Listing content</strong> — titles, descriptions, photos, and contact details you post publicly.</li>
              <li><strong>Usage data</strong> — pages visited, searches made, actions taken. Used to improve the service.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold mb-2">3. How We Use Your Information</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>To create and manage your account</li>
              <li>To display your listings to other users</li>
              <li>To send OTP verification codes via SMS</li>
              <li>To respond to your support requests</li>
              <li>To prevent fraud, spam, and abuse</li>
              <li>To improve the platform based on usage patterns</li>
            </ul>
            <p className="mt-2">We do <strong>not</strong> sell your personal information to third parties.</p>
          </section>

          <section>
            <h2 className="text-lg font-bold mb-2">4. Google Sign-In</h2>
            <p>If you choose to sign in with Google, we receive your name, email address, and profile picture from Google. We use this only to create and identify your LocalsIndia account. We do not access your Google contacts, Drive, or any other Google services.</p>
          </section>

          <section>
            <h2 className="text-lg font-bold mb-2">5. Photos and Listing Content</h2>
            <p>Photos you upload are stored securely via Cloudinary and displayed publicly on your listings. You retain ownership of your content. By posting, you grant LocalsIndia a non-exclusive licence to display your content on the platform.</p>
          </section>

          <section>
            <h2 className="text-lg font-bold mb-2">6. Data Retention</h2>
            <p>Your account data is retained as long as your account is active. If you delete a listing, it is soft-deleted and not shown publicly, but may be retained for up to 90 days for fraud prevention purposes. You may delete your entire account at any time — see <Link href="/account-deletion" style={{ color: 'var(--li-primary)' }}>How to delete your account</Link> for both in-app and email options.</p>
          </section>

          <section>
            <h2 className="text-lg font-bold mb-2">7. Security</h2>
            <p>We use industry-standard security measures including HTTPS encryption, hashed passwords, and JWT-based authentication. OTP codes are hashed before storage and expire within 10 minutes.</p>
          </section>

          <section>
            <h2 className="text-lg font-bold mb-2">8. Your Rights</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>Access the personal data we hold about you</li>
              <li>Correct inaccurate information</li>
              <li>Request deletion of your account and data</li>
              <li>Withdraw consent for communications</li>
            </ul>
            <p className="mt-2">To exercise any of these rights, email us at <a href="mailto:support@localsindia.com" style={{ color: 'var(--li-primary)' }}>support@localsindia.com</a>.</p>
          </section>

          <section>
            <h2 className="text-lg font-bold mb-2">9. Cookies</h2>
            <p>We use minimal cookies and localStorage for session management (storing your login token). We do not use third-party advertising cookies.</p>
          </section>

          <section>
            <h2 className="text-lg font-bold mb-2">10. Changes to This Policy</h2>
            <p>We may update this policy from time to time. We will notify users of significant changes by posting a notice on the platform. Continued use of LocalsIndia after changes constitutes acceptance of the updated policy.</p>
          </section>

          <section>
            <h2 className="text-lg font-bold mb-2">11. Contact</h2>
            <p>For any privacy-related questions or requests:</p>
            <p className="mt-1"><strong>Email:</strong> <a href="mailto:support@localsindia.com" style={{ color: 'var(--li-primary)' }}>support@localsindia.com</a></p>
            <p><strong>Platform:</strong> <a href="https://www.localsindia.com" style={{ color: 'var(--li-primary)' }}>localsindia.com</a></p>
          </section>

        </div>
      </div>
    </div>
  );
}
