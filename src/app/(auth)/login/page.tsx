import { redirect } from "next/navigation";
import Link from "next/link";
import { getSessionFromCookies } from "@/lib/auth/session";
import LoginForm from "@/components/auth/LoginForm";

const DEFAULT_REDIRECT = "/en";

function resolveCallbackUrl(callbackUrl: string | undefined): string {
  if (!callbackUrl || !callbackUrl.startsWith("/")) {
    return DEFAULT_REDIRECT;
  }
  return callbackUrl;
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

  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-md rounded-3xl bg-white p-10 shadow-xl ring-1 ring-slate-900/5">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-semibold text-slate-900">Welcome back</h1>
          <p className="mt-2 text-sm text-slate-500">
            Sign in with your Google account to continue to Fiscal Printer Simulator.
          </p>
        </div>

        <LoginForm callbackUrl={target} error={error} />

        <p className="mt-10 text-center text-xs text-slate-400">
          Protected access is required. Need help? Contact the site administrator.
        </p>
        <p className="mt-3 text-center text-xs text-slate-400">
          <Link href="https://myaccount.google.com/" className="underline decoration-dotted underline-offset-4">
            Manage your Google account
          </Link>
        </p>
      </div>
    </main>
  );
}
