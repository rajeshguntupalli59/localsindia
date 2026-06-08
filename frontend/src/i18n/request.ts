import { getRequestConfig } from 'next-intl/server';
import { cookies } from 'next/headers';

const LOCALES = ['en', 'hi', 'te'] as const;
type Locale = (typeof LOCALES)[number];

export default getRequestConfig(async () => {
  const cookieStore = await cookies();
  const rawLang = cookieStore.get('lang')?.value ?? 'en';
  const locale: Locale = LOCALES.includes(rawLang as Locale) ? (rawLang as Locale) : 'en';

  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default,
  };
});
