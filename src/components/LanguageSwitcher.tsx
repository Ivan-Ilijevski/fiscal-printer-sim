'use client';

import { useLocale } from 'next-intl';
import { useRouter, usePathname } from 'next/navigation';
import { useTransition } from 'react';

const LOCALES = [
  { code: 'en', label: 'EN' },
  { code: 'mk', label: 'МК' },
];

export default function LanguageSwitcher() {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const [, startTransition] = useTransition();

  const switchLanguage = (newLocale: string) => {
    if (locale === newLocale) return;

    // Remove current locale from pathname and add new locale
    // pathname includes the locale, e.g., "/en" or "/mk"
    const segments = pathname.split('/').filter(Boolean);

    // If first segment is a locale, remove it
    if (segments[0] === locale) {
      segments.shift();
    }

    // Build new path with new locale
    const pathWithoutLocale = segments.length > 0 ? `/${segments.join('/')}` : '';
    const newPath = `/${newLocale}${pathWithoutLocale}`;

    startTransition(() => {
      router.replace(newPath);
      router.refresh();
    });
  };

  return (
    <div className="flex border border-rule bg-paper-2">
      {LOCALES.map(({ code, label }) => (
        <button
          key={code}
          onClick={() => switchLanguage(code)}
          aria-current={locale === code ? 'true' : undefined}
          className={`h-9 px-3 font-mono text-[11px] font-medium tracking-[0.09em] transition-colors ${
            locale === code ? 'bg-ink text-paper' : 'text-ink-3 hover:bg-sheet hover:text-ink'
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
