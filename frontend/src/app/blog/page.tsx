import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, MapPin } from 'lucide-react';
import SiteHeader from '@/components/site-header/SiteHeader';
import SiteFooter from '@/components/site-footer/SiteFooter';
import { listAllPosts } from '@/lib/blog';

export const metadata: Metadata = {
  title: 'City Guides & How-Tos — LocalsIndia Blog',
  description: 'Practical, city-specific guides for tiffin, PG hunting, jobs, and everyday life across LocalsIndia cities.',
  alternates: { canonical: 'https://www.localsindia.com/blog' },
};

export default function BlogIndexPage() {
  const posts = listAllPosts();

  return (
    <div style={{ background: 'var(--li-page-bg)', minHeight: '100vh' }}>
      <SiteHeader />

      <div className="bg-white border-b" style={{ borderColor: 'var(--li-border)' }}>
        <div className="page-wrap py-8">
          <h1 className="text-2xl sm:text-3xl font-black" style={{ color: 'var(--li-text)' }}>
            City Guides & How-Tos
          </h1>
          <p className="text-sm mt-1.5" style={{ color: 'var(--li-muted)' }}>
            Practical, honest guides for everyday life in your city.
          </p>
        </div>
      </div>

      <div className="page-wrap py-8 pb-20 md:pb-8">
        {posts.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-sm" style={{ color: 'var(--li-muted)' }}>
              New guides are on the way — check back soon.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {posts.map(post => (
              <Link
                key={`${post.citySlug}-${post.slug}`}
                href={`/blog/${post.citySlug}/${post.slug}`}
                className="group flex flex-col p-5 rounded-2xl border bg-white transition-all hover:-translate-y-0.5"
                style={{ borderColor: 'var(--li-border)' }}
              >
                <span className="flex items-center gap-1 text-xs font-semibold mb-2" style={{ color: 'var(--li-primary)' }}>
                  <MapPin className="w-3 h-3" />
                  {post.city}
                </span>
                <h2 className="text-base font-bold mb-2" style={{ color: 'var(--li-text)' }}>
                  {post.title}
                </h2>
                <p className="text-sm leading-relaxed mb-3 flex-1" style={{ color: 'var(--li-muted)' }}>
                  {post.metaDescription}
                </p>
                <span className="flex items-center gap-1 text-xs font-semibold" style={{ color: 'var(--li-primary)' }}>
                  Read guide
                  <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                </span>
              </Link>
            ))}
          </div>
        )}
      </div>

      <SiteFooter />
    </div>
  );
}
