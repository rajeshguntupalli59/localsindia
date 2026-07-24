import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import SiteHeader from '@/components/site-header/SiteHeader';
import SiteFooter from '@/components/site-footer/SiteFooter';
import { listCitySlugs, listPostSlugs, loadPost } from '@/lib/blog';

export async function generateStaticParams() {
  return listCitySlugs().map(city => ({ city }));
}

export async function generateMetadata(
  { params }: { params: { city: string } }
): Promise<Metadata> {
  const slugs = listPostSlugs(params.city);
  if (slugs.length === 0) return { title: 'LocalsIndia' };
  const cityName = params.city.charAt(0).toUpperCase() + params.city.slice(1);
  return {
    title: `${cityName} Guides — LocalsIndia Blog`,
    description: `City guides and how-tos for ${cityName} — tiffin, PG, jobs, and more, from LocalsIndia.`,
    alternates: { canonical: `https://www.localsindia.com/blog/${params.city}` },
    robots: { index: true, follow: true },
  };
}

export default function BlogCityPage({ params }: { params: { city: string } }) {
  const slugs = listPostSlugs(params.city);
  if (slugs.length === 0) notFound();

  const posts = slugs
    .map(slug => loadPost(params.city, slug))
    .filter((p): p is NonNullable<typeof p> => p !== null)
    .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));

  const cityName = posts[0]?.city ?? params.city;

  return (
    <div style={{ background: 'var(--li-page-bg)', minHeight: '100vh' }}>
      <SiteHeader citySlug={params.city} />

      <div className="bg-white border-b" style={{ borderColor: 'var(--li-border)' }}>
        <div className="page-wrap py-5">
          <nav className="flex items-center gap-2 text-xs mb-3" style={{ color: 'var(--li-muted)' }}>
            <Link href="/" className="hover:text-orange-500 transition-colors">Home</Link>
            <span>/</span>
            <Link href="/blog" className="hover:text-orange-500 transition-colors">Blog</Link>
            <span>/</span>
            <span style={{ color: 'var(--li-text)' }}>{cityName}</span>
          </nav>
          <h1 className="text-2xl sm:text-3xl font-black" style={{ color: 'var(--li-text)' }}>
            {cityName} Guides
          </h1>
        </div>
      </div>

      <div className="page-wrap py-8 pb-20 md:pb-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {posts.map(post => (
            <Link
              key={post.slug}
              href={`/blog/${post.citySlug}/${post.slug}`}
              className="group flex flex-col p-5 rounded-2xl border bg-white transition-all hover:-translate-y-0.5"
              style={{ borderColor: 'var(--li-border)' }}
            >
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
      </div>

      <SiteFooter />
    </div>
  );
}
