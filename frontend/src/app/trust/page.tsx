import Link from 'next/link';
import { SAFETY_TIPS, GENERAL_SAFETY_TIPS } from '@/lib/safety';

export const metadata = {
  title: 'Trust & Safety — LocalsIndia',
  description: 'What the badges on LocalsIndia mean, how listings are reviewed, and how to stay safe when buying, renting or hiring locally.',
};

const CATEGORY_LABELS: Record<string, string> = {
  jobs: 'Jobs',
  'pg-roommate': 'PG / Rooms',
  vehicles: 'Vehicles',
  electronics: 'Electronics',
  tiffin: 'Tiffin & Food',
  education: 'Education & Tutors',
  events: 'Events',
  businesses: 'Businesses & Services',
};

export default function TrustPage() {
  return (
    <div className="min-h-screen" style={{ background: 'var(--li-page-bg)' }}>
      <div className="max-w-3xl mx-auto px-4 py-12">

        <Link href="/" className="text-sm font-semibold mb-8 inline-block" style={{ color: 'var(--li-primary)' }}>
          ← Back to LocalsIndia
        </Link>

        <h1 className="text-3xl font-black mb-2" style={{ color: 'var(--li-text)' }}>Trust &amp; Safety</h1>
        <p className="text-sm mb-10" style={{ color: 'var(--li-muted)' }}>
          What our badges actually mean, and how to deal safely with people you meet here.
        </p>

        <div className="space-y-10 text-sm leading-relaxed" style={{ color: 'var(--li-text)' }}>

          <section id="review">
            <h2 className="text-lg font-bold mb-2">Every listing is reviewed</h2>
            <p>
              New listings go live after a quick check by our team for spam, scams and prohibited items —
              usually within a few hours. A review is not a guarantee: always check the item or service
              yourself before paying.
            </p>
          </section>

          <section id="active-on-whatsapp">
            <h2 className="text-lg font-bold mb-2">&ldquo;Active on WhatsApp&rdquo;</h2>
            <p>
              Shown when at least one buyer has contacted this seller on WhatsApp through LocalsIndia.
              It tells you the number is in use. It is <strong>not</strong> an identity check.
            </p>
          </section>

          <section id="verified-business">
            <h2 className="text-lg font-bold mb-2">&ldquo;Verified&rdquo; businesses</h2>
            <p>
              A business shows the Verified badge when its owner has signed in with an OTP-confirmed mobile
              number, claimed the business, and holds an active Verified subscription. We do not visit
              premises or inspect licences, so treat it as &ldquo;the owner is reachable and accountable&rdquo;,
              not as an endorsement.
            </p>
          </section>

          <section id="claimed-business">
            <h2 className="text-lg font-bold mb-2">Who manages a business listing</h2>
            <p>
              Some business listings are added by our team from public sources so you can find local shops.
              An owner can take over their listing in one of two ways: by entering a code we text to the
              business&apos;s listed mobile number, or by sending a business document and a shopfront photo (uploaded on the site or emailed
              to support@localsindia.com) that our team checks by hand (we may call them to confirm). Until then, the listing is unclaimed.
            </p>
          </section>

          <section id="reporting">
            <h2 className="text-lg font-bold mb-2">Reporting</h2>
            <p>
              Use the Report button on any listing. A listing reported by three different people is hidden
              automatically until our team reviews it.
            </p>
          </section>

          <section id="tips">
            <h2 className="text-lg font-bold mb-4">Safety tips by category</h2>
            <div className="grid sm:grid-cols-2 gap-4">
              <TipCard title="Everywhere" tips={GENERAL_SAFETY_TIPS} />
              {Object.entries(SAFETY_TIPS).map(([slug, tips]) => (
                <TipCard key={slug} title={CATEGORY_LABELS[slug] ?? slug} tips={tips} />
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

function TipCard({ title, tips }: { title: string; tips: string[] }) {
  return (
    <div className="bg-white rounded-2xl border p-5" style={{ borderColor: 'var(--li-border)' }}>
      <h3 className="font-bold mb-2">{title}</h3>
      <ul className="space-y-1.5 list-disc pl-4" style={{ color: 'var(--li-muted)' }}>
        {tips.map(tip => <li key={tip}>{tip}</li>)}
      </ul>
    </div>
  );
}
