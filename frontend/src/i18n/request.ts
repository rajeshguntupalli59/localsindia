import { getRequestConfig } from 'next-intl/server';

const LOCALES = ['en', 'hi', 'te', 'ta', 'kn', 'ml', 'mr', 'bn', 'gu', 'pa', 'or'] as const;
type Locale = (typeof LOCALES)[number];

export default getRequestConfig(async ({ requestLocale }) => {
  let locale: Locale = 'en';
  try {
    const requested = await requestLocale;
    if (requested && LOCALES.includes(requested as Locale)) {
      locale = requested as Locale;
    }
  } catch {
    // static export: no request context — default to English
  }

  let messages: Record<string, unknown>;
  try {
    messages = (await import(`../../messages/${locale}.json`)).default;
  } catch {
    messages = (await import('../../messages/en.json')).default;
  }

  return { locale, messages };
});
