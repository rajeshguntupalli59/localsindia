import Link from 'next/link';

export const metadata = { title: 'Terms of Service — LocalsIndia' };

export default function TermsPage() {
  return (
    <div className="min-h-screen" style={{ background: 'var(--li-page-bg)' }}>
      <div className="max-w-3xl mx-auto px-4 py-12">

        <Link href="/" className="text-sm font-semibold mb-8 inline-block" style={{ color: 'var(--li-primary)' }}>
          ← Back to LocalsIndia
        </Link>

        <h1 className="text-3xl font-black mb-2" style={{ color: 'var(--li-text)' }}>Terms of Service</h1>
        <p className="text-sm text-muted-foreground mb-8">Last updated: June 9, 2026</p>

        <div className="prose prose-slate max-w-none space-y-6 text-sm leading-relaxed" style={{ color: 'var(--li-text)' }}>

          <section>
            <h2 className="text-lg font-bold mb-2">1. Acceptance of Terms</h2>
            <p>By accessing or using LocalsIndia (<strong>localsindia.com</strong>), you agree to be bound by these Terms of Service. If you do not agree, please do not use the platform.</p>
          </section>

          <section>
            <h2 className="text-lg font-bold mb-2">2. What LocalsIndia Is</h2>
            <p>LocalsIndia is a free classifieds and community platform for Indian cities. It allows users to post listings for goods, services, PG accommodation, jobs, and local events. LocalsIndia is a marketplace — we do not buy, sell, or take responsibility for any transaction between users.</p>
          </section>

          <section>
            <h2 className="text-lg font-bold mb-2">3. Eligibility</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>You must be at least 18 years old to use LocalsIndia</li>
              <li>You must be located in India or posting about goods/services in India</li>
              <li>You must provide accurate information when creating an account</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold mb-2">4. Posting Rules</h2>
            <p>You agree NOT to post:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Illegal goods or services</li>
              <li>Adult or sexually explicit content</li>
              <li>Counterfeit or stolen items</li>
              <li>Misleading, fraudulent, or spam listings</li>
              <li>Content that violates intellectual property rights</li>
              <li>Hate speech, harassment, or threatening content</li>
              <li>Personal information of others without their consent</li>
            </ul>
            <p className="mt-2">Listings violating these rules will be removed and accounts may be permanently banned.</p>
          </section>

          <section>
            <h2 className="text-lg font-bold mb-2">5. Listing Approval</h2>
            <p>All new listings are reviewed by our team before going live. We reserve the right to reject any listing without providing a reason. Approved listings remain active for 30 days and can be renewed by the poster.</p>
          </section>

          <section>
            <h2 className="text-lg font-bold mb-2">6. User Accounts</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>You are responsible for all activity under your account</li>
              <li>Maximum 10 active listings per city per account</li>
              <li>Do not share your account with others</li>
              <li>Report suspicious activity to us immediately</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold mb-2">7. Transactions Between Users</h2>
            <p>LocalsIndia facilitates connections between buyers and sellers but is not a party to any transaction. We are not responsible for:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>The quality, safety, or legality of listed items</li>
              <li>The accuracy of listing descriptions</li>
              <li>Payment disputes between users</li>
              <li>Any loss arising from a transaction made through the platform</li>
            </ul>
            <p className="mt-2">Always exercise caution when meeting strangers. Meet in public places for transactions.</p>
          </section>

          <section>
            <h2 className="text-lg font-bold mb-2">8. Content Ownership</h2>
            <p>You retain ownership of the content you post. By posting on LocalsIndia, you grant us a non-exclusive, royalty-free licence to display, store, and distribute your content as part of operating the platform. You may delete your content at any time.</p>
          </section>

          <section>
            <h2 className="text-lg font-bold mb-2">9. Reporting and Moderation</h2>
            <p>Users can report listings that violate these terms. Listings with 3 or more reports are automatically hidden pending review. We reserve the right to remove any content and ban any account that violates these terms.</p>
          </section>

          <section>
            <h2 className="text-lg font-bold mb-2">10. Disclaimers</h2>
            <p>LocalsIndia is provided "as is" without warranties of any kind. We do not guarantee continuous, uninterrupted access to the platform. We are not liable for any indirect, incidental, or consequential damages arising from your use of the platform.</p>
          </section>

          <section>
            <h2 className="text-lg font-bold mb-2">11. Governing Law</h2>
            <p>These terms are governed by the laws of India. Any disputes shall be subject to the jurisdiction of courts in Hyderabad, Telangana, India.</p>
          </section>

          <section>
            <h2 className="text-lg font-bold mb-2">12. Changes to Terms</h2>
            <p>We may update these terms at any time. Continued use of LocalsIndia after changes constitutes acceptance of the updated terms.</p>
          </section>

          <section>
            <h2 className="text-lg font-bold mb-2">13. Contact</h2>
            <p><strong>Email:</strong> <a href="mailto:rajeshguntupalli59@gmail.com" style={{ color: 'var(--li-primary)' }}>rajeshguntupalli59@gmail.com</a></p>
            <p><strong>Platform:</strong> <a href="https://www.localsindia.com" style={{ color: 'var(--li-primary)' }}>localsindia.com</a></p>
          </section>

        </div>
      </div>
    </div>
  );
}
