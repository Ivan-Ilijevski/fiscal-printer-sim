/**
 * The single source of truth for supported locales.
 *
 * Previously this list was duplicated in `middleware.ts` and `request.ts`, and the `[locale]`
 * layout trusted its route param without consulting either — so any unmatched top-level path
 * (`/sw.js`, `/robots.txt`, anything a browser or extension probes for) was accepted as a
 * locale and handed to next-intl, which throws `Invalid language tag` the first time a message
 * needs a formatter.
 */
export const locales = ['en', 'mk'] as const;

export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = 'en';

export function isLocale(value: unknown): value is Locale {
  return typeof value === 'string' && (locales as readonly string[]).includes(value);
}
