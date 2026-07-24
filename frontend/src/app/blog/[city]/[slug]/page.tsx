import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import SiteHeader from '@/components/site-header/SiteHeader';
import SiteFooter from '@/components/site-footer/SiteFooter';
import BlogArticleBody from '@/components/blog-article/BlogArticleBody';
import { listCitySlugs, listPostSlugs, loadPost } from '@/lib/blog';

export async function generateStaticParams() {
  return listCitySlugs().flatMap(city =>
    listPostSlugs(city).map(slug => ({ city, slug }))
  );
}

export async function generateMetadata(
  { params }: { params: { city: string; slug: string } }
): Promise<Metadata> {
  const post = loadPost(params.city, params.slug);
  if (!post) return { title: 'LocalsIndia' };
  const url = `https://www.localsindia.com/blog/${params.city}/${params.slug}`;
  return {
    title: `${post.title} | LocalsIndia`,
    description: post.metaDescription,
    openGraph: {
      title: post.title,
      description: post.metaDescription,
      url,
      siteName: 'LocalsIndia',
      type: 'article',
    },
    alternates: { canonical: url },
    robots: { index: true, follow: true },
  };
}

export default function BlogArticlePage({
  params,
}: {
  params: { city: string; slug: string };
}) {
  const post = loadPost(params.city, params.slug);
  if (!post) notFound();

  const url = `https://www.localsindia.com/blog/${params.city}/${params.slug}`;

  const articleLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: post.title,
    description: post.metaDescription,
    datePublished: post.publishedAt,
    author: { '@type': 'Organization', name: 'LocalsIndia' },
    publisher: { '@type': 'Organization', name: 'LocalsIndia' },
    mainEntityOfPage: url,
  };

  const faqLd = post.faqs.length > 0 ? {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: post.faqs.map(f => ({
      '@type': 'Question',
      name: f.question,
      acceptedAnswer: { '@type': 'Answer', text: f.answer },
    })),
  } : null;

  const breadcrumbLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://www.localsindia.com' },
      { '@type': 'ListItem', position: 2, name: 'Blog', item: 'https://www.localsindia.com/blog' },
      { '@type': 'ListItem', position: 3, name: post.city, item: `https://www.localsindia.com/blog/${params.city}` },
      { '@type': 'ListItem', position: 4, name: post.title, item: url },
    ],
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(articleLd) }} />
      {faqLd && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }} />}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }} />

      <div style={{ background: 'var(--li-page-bg)', minHeight: '100vh' }}>
        <SiteHeader citySlug={params.city} />

        <div className="bg-white border-b" style={{ borderColor: 'var(--li-border)' }}>
          <div className="page-wrap py-5">
            <nav className="flex items-center gap-2 text-xs mb-3" style={{ color: 'var(--li-muted)' }}>
              <Link href="/" className="hover:text-orange-500 transition-colors">Home</Link>
              <span>/</span>
              <Link href="/blog" className="hover:text-orange-500 transition-colors">Blog</Link>
              <span>/</span>
              <Link href={`/blog/${params.city}`} className="hover:text-orange-500 transition-colors">
                {post.city}
              </Link>
            </nav>
            <h1 className="text-2xl sm:text-3xl font-black" style={{ color: 'var(--li-text)' }}>
              {post.title}
            </h1>
          </div>
        </div>

        <div className="page-wrap py-8 pb-20 md:pb-8">
          <BlogArticleBody post={post} />
        </div>

        <SiteFooter />
      </div>
    </>
  );
}
