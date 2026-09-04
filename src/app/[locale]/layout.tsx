import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";
import { AuthSessionProvider } from "@/components/auth/SessionProvider";
import { getSessionFromCookies } from "@/lib/auth/session";
import { isLocale } from "@/i18n/config";
import { fontVariables } from "@/lib/fonts";
import "../globals.css";

export const metadata: Metadata = {
  title: "Fiscal Printer Simulator",
  description: "Generate thermal receipt images",
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover", // This enables safe-area-inset on iOS
};

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  // `[locale]` matches any single top-level segment, and the middleware only runs on `/` and
  // `/(en|mk)/...`, so nothing else rejects a request for `/sw.js` or `/robots.txt`. Without
  // this the segment is accepted as a locale and reaches NextIntlClientProvider, where the
  // first message needing a formatter dies with `Invalid language tag`. Checked before the
  // session redirect, so a signed-out probe 404s rather than bouncing through /login.
  if (!isLocale(locale)) {
    notFound();
  }

  const session = await getSessionFromCookies();

  if (!session) {
    redirect(`/login?callbackUrl=/${locale}`);
  }

  // Use next-intl's server helper to get messages for the current locale
  // by passing the locale explicitly. This avoids falling back to the
  // default locale messages.
  const messages = await getMessages({ locale });

  return (
    <html lang={locale}>
      <body className={`${fontVariables} grain antialiased`}>
        <NextIntlClientProvider locale={locale} messages={messages}>
          <AuthSessionProvider session={session}>{children}</AuthSessionProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
