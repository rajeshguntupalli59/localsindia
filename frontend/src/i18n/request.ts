import { getRequestConfig } from 'next-intl/server';
import { cookies } from 'next/headers';

const LOCALES = ['en', 'hi', 'te', 'ta', 'kn', 'ml', 'mr', 'bn', 'gu', 'pa', 'or'] as const;
type Locale = (typeof LOCALES)[number];

export default getRequestConfig(async () => {
  const cookieStore = await cookies();
  const rawLang = cookieStore.get('lang')?.value ?? 'en';
  const locale: Locale = LOCALES.includes(rawLang as Locale) ? (rawLang as Locale) : 'en';

  // Gracefully fall back to English if the locale file doesn't exist yet
  let messages: Record<string, unknown>;
  try {
    messages = (await import(`../../messages/${locale}.json`)).default;
  } catch {
    messages = (await import(`../../messages/en.json`)).default;
  }

  return { locale, messages };
});
