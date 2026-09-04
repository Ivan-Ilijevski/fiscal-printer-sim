import {getRequestConfig} from 'next-intl/server';
import {defaultLocale, isLocale} from '@/i18n/config';

export default getRequestConfig(async ({locale}) => {
  // Belt and braces: the `[locale]` layout already 404s an unsupported locale, but this config
  // is also reached from contexts that don't go through that layout.
  const usedLocale = isLocale(locale) ? locale : defaultLocale;

  return {
    locale: usedLocale,
    messages: (await import(`../messages/${usedLocale}.json`)).default
  };
});
