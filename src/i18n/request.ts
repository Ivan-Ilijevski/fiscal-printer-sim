import {getRequestConfig} from 'next-intl/server';

// Can be imported from a shared config
const locales = ['en', 'mk'] as const;
type Locale = typeof locales[number];

export default getRequestConfig(async ({locale}) => {
  // Ensure that a valid locale is used and that it's a string
  const usedLocale: string = (typeof locale === 'string' && locales.includes(locale as Locale)) ? locale : 'en';

  return {
    locale: usedLocale,
    messages: (await import(`../messages/${usedLocale}.json`)).default
  };
});