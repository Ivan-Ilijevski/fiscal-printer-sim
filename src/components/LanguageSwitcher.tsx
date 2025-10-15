'use client';

import { useLocale } from 'next-intl';
import { useRouter, usePathname } from 'next/navigation';
import { useTransition } from 'react';

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
    <div className="backdrop-blur-lg bg-white/15 border border-white/25 shadow-lg rounded-2xl p-2 hover:scale-[1.005] transition-transform duration-300">
      <button
        onClick={() => switchLanguage('en')}
        className={`px-6 py-3 rounded-xl text-sm font-light transition-all duration-300 ${
          locale === 'en'
            ? 'backdrop-blur-md bg-white/20 border border-white/30 text-slate-700 shadow-lg scale-105'
            : 'text-slate-600 hover:text-slate-700 hover:bg-white/10'
        }`}
      >
        EN
      </button>
      <button
        onClick={() => switchLanguage('mk')}
        className={`px-6 py-3 rounded-xl text-sm font-light transition-all duration-300 ${
          locale === 'mk'
            ? 'backdrop-blur-md bg-white/20 border border-white/30 text-slate-700 shadow-lg scale-105'
            : 'text-slate-600 hover:text-slate-700 hover:bg-white/10'
        }`}
      >
        МК
      </button>
    </div>
  );
}