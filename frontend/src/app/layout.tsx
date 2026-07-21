import type { Metadata, Viewport } from 'next';
import { Plus_Jakarta_Sans, Noto_Sans, Noto_Sans_Devanagari, Noto_Sans_Telugu } from 'next/font/google';
import { NextIntlClientProvider } from 'next-intl';
import { getLocale, getMessages } from 'next-intl/server';
import { Toaster } from '@/components/ui/sonner';
import ServiceWorker from '@/components/pwa/ServiceWorker';
import ChatWidget from '@/components/chat-widget/ChatWidget';
import OnboardingGate from '@/components/onboarding-quiz/OnboardingGate';
import ContextualPrompt from '@/components/contextual-prompt/ContextualPrompt';
import ReferralCapture from '@/components/referral-capture/ReferralCapture';
import { PrefsProvider } from '@/context/PrefsContext';
import { cn } from '@/lib/utils';
import Script from 'next/script';
import './globals.css';

const ADSENSE_PUB_ID = process.env.NEXT_PUBLIC_ADSENSE_PUB_ID ?? '';

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-jakarta',
  weight: ['400', '500', '600', '700', '800'],
  display: 'swap',
});

const notoSans = Noto_Sans({
  subsets: ['latin'],
  variable: '--font-sans',
  weight: ['400', '600', '700'],
  display: 'swap',
});

const notoDevanagari = Noto_Sans_Devanagari({
  subsets: ['devanagari'],
  variable: '--font-devanagari',
  weight: ['400', '600', '700'],
  display: 'swap',
});

const notoTelugu = Noto_Sans_Telugu({
  subsets: ['telugu'],
  variable: '--font-telugu',
  weight: ['400', '600', '700'],
  display: 'swap',
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
