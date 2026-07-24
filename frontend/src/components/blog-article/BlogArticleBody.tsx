import Link from 'next/link';
import type { BlogPost } from '@/lib/blog';

export default function BlogArticleBody({ post }: { post: BlogPost }) {
  return (
    <div className="max-w-2xl">
      <p className="text-base leading-relaxed mb-8" style={{ color: 'var(--li-text)' }}>
        {post.intro}
      </p>

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
