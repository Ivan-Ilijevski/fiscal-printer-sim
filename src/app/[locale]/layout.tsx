import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";
import { AuthSessionProvider } from "@/components/auth/SessionProvider";
import { getSessionFromCookies } from "@/lib/auth/session";
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
