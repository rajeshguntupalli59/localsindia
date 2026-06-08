import type { Metadata } from 'next';
import { Noto_Sans, Noto_Sans_Devanagari, Noto_Sans_Telugu } from 'next/font/google';
import { NextIntlClientProvider } from 'next-intl';
import { Toaster } from '@/components/ui/sonner';
import { cookies } from 'next/headers';
import { cn } from '@/lib/utils';
import './globals.css';

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

export const metadata: Metadata = {
  title: 'LocalIndia — Your City, Your Community',
  description: "India's hyperlocal classifieds and community platform",
};

const LOCALES = ['en', 'hi', 'te'] as const;
type Locale = (typeof LOCALES)[number];

async function getMessages(locale: Locale) {
  try {
    return (await import(`../../messages/${locale}.json`)).default as Record<string, unknown>;
  } catch {
    return (await import('../../messages/en.json')).default as Record<string, unknown>;
  }
}

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const cookieStore = cookies();
  const rawLang = (cookieStore as ReturnType<typeof cookies>).get('lang')?.value ?? 'en';
  const locale: Locale = LOCALES.includes(rawLang as Locale) ? (rawLang as Locale) : 'en';
  const messages = await getMessages(locale);

  return (
    <html
      lang={locale}
      className={cn(notoSans.variable, notoDevanagari.variable, notoTelugu.variable)}
    >
      <body className="antialiased">
        <NextIntlClientProvider locale={locale} messages={messages}>
          {children}
          <Toaster richColors position="top-center" />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
