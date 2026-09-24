import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

/** @type {import('next').NextConfig} */
const nextConfig = {
  cleanDistDir: true,
  images: {
    unoptimized: true,
    remotePatterns: [
      { protocol: 'https', hostname: 'res.cloudinary.com' },
      { protocol: 'https', hostname: '*.azurewebsites.net' },
      { protocol: 'https', hostname: '**' },
      { protocol: 'http', hostname: '**' },
    ],
  },
  // 'tirupur' was a duplicate of 'tiruppur' (merged 2026-09-24) — keep old links working
  async redirects() {
    return [
      { source: '/tirupur', destination: '/tiruppur', permanent: true },
      { source: '/tirupur/:path*', destination: '/tiruppur/:path*', permanent: true },
    ];
  },
  webpack: (config) => {
    config.cache = false;
    return config;
  },
};

export default withNextIntl(nextConfig);
