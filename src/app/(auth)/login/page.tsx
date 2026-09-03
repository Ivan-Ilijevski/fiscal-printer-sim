import { redirect } from "next/navigation";
import Link from "next/link";
import { NextIntlClientProvider } from "next-intl";
import { getMessages, getTranslations } from "next-intl/server";
import { getSessionFromCookies } from "@/lib/auth/session";
import LoginForm from "@/components/auth/LoginForm";

const DEFAULT_REDIRECT = "/en";
const LOCALES = ["en", "mk"] as const;

function resolveCallbackUrl(callbackUrl: string | undefined): string {
  if (!callbackUrl || !callbackUrl.startsWith("/")) {
    return DEFAULT_REDIRECT;
  }
  return callbackUrl;
}

/*
 * /login sits outside the i18n middleware matcher (see src/middleware.ts), so there is no
 * locale segment in the path and no provider from a parent layout. The locale is taken from
 * the callbackUrl the app redirected with — "/mk" when a Macedonian page bounced the user
 * here. A direct visit with no callbackUrl falls back to English.
 */
function resolveLocale(target: string): string {
  const segment = target.split("/").filter(Boolean)[0];
  return LOCALES.includes(segment as (typeof LOCALES)[number]) ? segment : "en";
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string; error?: string }>;
}) {
  const session = await getSessionFromCookies();
  const { callbackUrl, error } = await searchParams;
  const target = resolveCallbackUrl(callbackUrl);

  if (session) {
    redirect(target);
  }

  const locale = resolveLocale(target);
  const messages = await getMessages({ locale });
  const t = await getTranslations({ locale, namespace: "auth" });
  const tRoot = await getTranslations({ locale });

  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      <main className="relative z-[2] flex min-h-screen flex-col items-center justify-center px-5 py-12">
        <div className="w-full max-w-[420px]">
          <div className="mb-8 border-b-2 border-ink pb-5">
            <h1 className="font-display text-3xl leading-tight font-bold tracking-[-0.02em] text-ink">
              {tRoot("title")}
            </h1>
            <p className="label-mono mt-2.5">{tRoot("specLine")}</p>
          </div>

          <div className="border border-rule bg-sheet p-8 shadow-[0_6px_24px_-14px_rgb(26_23_20/0.3)]">
            <div className="mb-7 flex items-baseline gap-3">
              <span className="tabular font-mono text-[11px] font-semibold tracking-[0.14em] text-stamp">01</span>
              <h2 className="font-display text-[15px] font-semibold tracking-tight text-ink">{t("welcomeBack")}</h2>
              <span aria-hidden="true" className="h-px flex-1 -translate-y-[3px] bg-rule" />
            </div>

            <p className="mb-7 font-mono text-[12px] leading-relaxed text-ink-2">{t("signInSubtitle")}</p>

            <LoginForm callbackUrl={target} error={error} />
          </div>

          <p className="mt-8 font-mono text-[11px] leading-relaxed text-ink-3">{t("protectedAccess")}</p>
          <p className="mt-2 font-mono text-[11px]">
            <Link
              href="https://myaccount.google.com/"
              className="text-ink-3 underline decoration-dotted underline-offset-4 transition-colors hover:text-stamp"
            >
              {t("manageGoogleAccount")}
            </Link>
          </p>
        </div>
      </main>
    </NextIntlClientProvider>
  );
}
