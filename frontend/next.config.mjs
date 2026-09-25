import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

/** @type {import('next').NextConfig} */
const nextConfig = {
  cleanDistDir: true,
  images: {
    // Cloudinary resizes (see src/lib/imageLoader.ts) — SWA can't run Next's optimiser
    loader: 'custom',
    loaderFile: './src/lib/imageLoader.ts',
    remotePatterns: [
      { protocol: 'https', hostname: 'res.cloudinary.com' },
      { protocol: 'https', hostname: '*.azurewebsites.net' },
      { protocol: 'https', hostname: '**' },
      { protocol: 'http', hostname: '**' },
    ],
  },
  async redirects() {
    return [
      // 'tirupur' was a duplicate of 'tiruppur' (merged 2026-09-24) — keep old links working
      { source: '/tirupur', destination: '/tiruppur', permanent: true },
      { source: '/tirupur/:path*', destination: '/tiruppur/:path*', permanent: true },
      // Blog posts moved from the wrong 'bangalore' slug to the real city (2026-09-25)
      { source: '/blog/bangalore', destination: '/blog/bengaluru', permanent: true },
      { source: '/blog/bangalore/:path*', destination: '/blog/bengaluru/:path*', permanent: true },
      // Posts about cities LocalsIndia doesn't serve were unpublished (kept in
      // src/content/blog-archive/) — send old links to the blog home
      {
        source: '/blog/:city(ahmedabad|bhopal|delhi|indore|jaipur|kanpur|kolkata|lucknow|mumbai|nagpur|pune|surat)/:path*',
        destination: '/blog',
        permanent: true,
      },
    ];
  },
  webpack: (config) => {
    config.cache = false;
    return config;
  },
};

export default withNextIntl(nextConfig);
