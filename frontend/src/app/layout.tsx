import type { Metadata, Viewport } from 'next';
import localFont from 'next/font/local';
import { NextIntlClientProvider } from 'next-intl';
import { getLocale, getMessages } from 'next-intl/server';
import { Toaster } from '@/components/ui/sonner';
import ServiceWorker from '@/components/pwa/ServiceWorker';
import ChatWidget from '@/components/chat-widget/ChatWidget';
import OnboardingGate from '@/components/onboarding-quiz/OnboardingGate';
import ContextualPrompt from '@/components/contextual-prompt/ContextualPrompt';
import ReferralCapture from '@/components/referral-capture/ReferralCapture';
import GeoDetectBanner from '@/components/geo-detect-banner/GeoDetectBanner';
import { PrefsProvider } from '@/context/PrefsContext';
import { cn } from '@/lib/utils';
import Script from 'next/script';
import './globals.css';
import { serializeJsonLd } from '@/lib/jsonLd';

const ADSENSE_PUB_ID = process.env.NEXT_PUBLIC_ADSENSE_PUB_ID ?? '';

// Self-hosted variable fonts (from @fontsource-variable, in ./fonts) instead of
// next/font/google: that downloaded from Google at build time and a flaky
// response failed production deploys ("An error occurred in `next/font`").
const plusJakarta = localFont({
  src: './fonts/plus-jakarta-sans-latin-wght-normal.woff2',
  variable: '--font-jakarta',
  weight: '200 800',
  display: 'swap',
});

const notoSans = localFont({
  src: './fonts/noto-sans-latin-wght-normal.woff2',
  variable: '--font-sans',
  weight: '100 900',
  display: 'swap',
});

const notoDevanagari = localFont({
  src: './fonts/noto-sans-devanagari-devanagari-wght-normal.woff2',
  variable: '--font-devanagari',
  weight: '100 900',
  display: 'swap',
  preload: false,   // ~120 KB; loaded only on pages that show Hindi text
});

const notoTelugu = localFont({
  src: './fonts/noto-sans-telugu-telugu-wght-normal.woff2',
  variable: '--font-telugu',
  weight: '100 900',
  display: 'swap',
  preload: false,   // ~120 KB; loaded only on pages that show Telugu text
});

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#FF6B35',
};

export const metadata: Metadata = {
  metadataBase: new URL('https://www.localsindia.com'),
  title: 'LocalsIndia — Buy · Sell · Connect',
  description: "India's hyperlocal community platform. Post listings, find local services, connect with your neighbourhood.",
  manifest: '/manifest.json',
  verification: {
    google: 'GUgw72IJ4MpHA8grwFYxpNRTtEZA3sJyYGh0yXijL3A',
  },
  appleWebApp: { capable: true, statusBarStyle: 'default', title: 'LocalsIndia' },
  openGraph: {
    title: 'LocalsIndia — Buy · Sell · Connect',
    description: "India's hyperlocal community platform. Post listings, find local services, connect with your neighbourhood.",
    url: 'https://www.localsindia.com',
    siteName: 'LocalsIndia',
    images: [{ url: '/logo.png', width: 1200, height: 630, alt: 'LocalsIndia' }],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'LocalsIndia — Buy · Sell · Connect',
    description: "India's hyperlocal community platform.",
    images: ['/logo.png'],
  },
};

const SITE_JSON_LD = [
  {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'LocalsIndia',
    url: 'https://www.localsindia.com',
    logo: 'https://www.localsindia.com/logo-mark.png',
    sameAs: [
      'https://www.instagram.com/localsindia1/',
      'https://www.facebook.com/profile.php?id=61591815777647',
    ],
  },
  {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'LocalsIndia',
    url: 'https://www.localsindia.com',
  },
];

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  let locale = 'en';
  let messages: Record<string, unknown> = {};
  try {
    locale = await getLocale();
    messages = await getMessages() as Record<string, unknown>;
  } catch {
    // SSR fallback — use English defaults
  }

  return (
    <html
      lang={locale}
      className={cn(plusJakarta.variable, notoSans.variable, notoDevanagari.variable, notoTelugu.variable)}
    >
      <body className={cn("antialiased", plusJakarta.className)}>
        <script
          type="application/ld+json"
          // Who the site is (logo + social profiles) for Google's knowledge panel
          dangerouslySetInnerHTML={{ __html: serializeJsonLd(SITE_JSON_LD) }}
        />
        {ADSENSE_PUB_ID && (
          <Script
            async
            src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_PUB_ID}`}
            crossOrigin="anonymous"
            strategy="afterInteractive"
          />
        )}
        <NextIntlClientProvider messages={messages}>
          <PrefsProvider>
            <GeoDetectBanner />
            {children}
          </PrefsProvider>
          <Toaster richColors position="top-center" />
          <ServiceWorker />
          <ChatWidget />
          <OnboardingGate />
          <ContextualPrompt />
          <ReferralCapture />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
