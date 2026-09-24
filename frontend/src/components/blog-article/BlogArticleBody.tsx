import Link from 'next/link';
import { MapPin, Phone } from 'lucide-react';
import type { BlogPost } from '@/lib/blog';
import OsmAttribution from '@/components/osm-attribution/OsmAttribution';

export default function BlogArticleBody({ post }: { post: BlogPost }) {
  return (
    <div className="max-w-2xl">
      <p className="text-base leading-relaxed mb-8" style={{ color: 'var(--li-text)' }}>
        {post.intro}
      </p>

      {post.businesses && post.businesses.length > 0 && (
        <div className="mb-10">
          <h2 className="text-xl font-bold mb-1" style={{ color: 'var(--li-text)' }}>
            {post.businesses.length} places in {post.city}
          </h2>
          <p className="text-xs mb-4" style={{ color: 'var(--li-muted)' }}>
            From the LocalsIndia business directory, in alphabetical order — not a ranking.
            Call ahead to confirm timings; details may have changed.
          </p>
          <ol className="space-y-2">
            {post.businesses.map((b, i) => (
              <li key={b.id} className="rounded-2xl border p-4" style={{ borderColor: 'var(--li-border)' }}>
                <Link href={`/${post.citySlug}/businesses/${b.id}`} className="font-bold text-sm hover:underline" style={{ color: 'var(--li-text)' }}>
                  {i + 1}. {b.name}
                </Link>
                {b.address && (
                  <p className="flex items-start gap-1.5 text-xs mt-1" style={{ color: 'var(--li-muted)' }}>
                    <MapPin className="w-3.5 h-3.5 shrink-0 mt-px" /> {b.address}
                  </p>
                )}
                {b.phone && (
                  <p className="flex items-center gap-1.5 text-xs mt-1" style={{ color: 'var(--li-muted)' }}>
                    <Phone className="w-3.5 h-3.5 shrink-0" /> <a href={`tel:${b.phone}`} className="hover:underline">{b.phone}</a>
                  </p>
                )}
              </li>
            ))}
          </ol>
          {post.businesses.some(b => b.source === 'osm') && <OsmAttribution className="mt-2" />}
        </div>
      )}

      {post.sections.map((section, i) => (
        <div key={i} className="mb-8">
          <h2 className="text-xl font-bold mb-3" style={{ color: 'var(--li-text)' }}>
            {section.heading}
          </h2>
          <p className="text-sm leading-relaxed" style={{ color: 'var(--li-muted)' }}>
            {section.body}
          </p>
        </div>
      ))}

      {post.faqs.length > 0 && (
        <div className="mt-10">
          <h2 className="text-xl font-bold mb-4" style={{ color: 'var(--li-text)' }}>
            Frequently Asked Questions
          </h2>
          <div className="space-y-2">
            {post.faqs.map((faq, i) => (
              <details
                key={i}
                className="rounded-2xl border p-4"
                style={{ borderColor: 'var(--li-border)' }}
              >
                <summary
                  className="text-sm font-semibold cursor-pointer"
                  style={{ color: 'var(--li-text)' }}
                >
                  {faq.question}
                </summary>
                <p className="text-sm mt-2 leading-relaxed" style={{ color: 'var(--li-muted)' }}>
                  {faq.answer}
                </p>
              </details>
            ))}
          </div>
        </div>
      )}

      <div
        className="mt-10 p-6 rounded-3xl border text-center"
        style={{ background: 'var(--li-card-bg)', borderColor: 'var(--li-border)' }}
      >
        <p className="text-sm font-semibold mb-3" style={{ color: 'var(--li-text)' }}>
          {post.cta.text}
        </p>
        <Link
          href={post.cta.href}
          className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl text-white font-bold text-sm transition-opacity hover:opacity-90"
          style={{ background: 'var(--li-primary)' }}
        >
          Get Started
        </Link>
      </div>
    </div>
  );
}
