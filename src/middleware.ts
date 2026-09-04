import createMiddleware from 'next-intl/middleware';
import { defaultLocale, locales } from '@/i18n/config';

export default createMiddleware({
  locales: [...locales],
  defaultLocale,
});

export const config = {
  // Must stay a static literal — Next.js analyses it at build time, so it can't be derived from
  // `locales`. Keep the alternation in step with src/i18n/config.ts when adding a locale.
  matcher: ['/', '/(en|mk)/:path*'],
};
