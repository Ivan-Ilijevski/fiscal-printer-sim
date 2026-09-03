"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

interface LoginFormProps {
  callbackUrl: string;
  error?: string;
}

/** Maps the ?error= codes set by the OAuth callback route onto message keys. */
const ERROR_KEYS: Record<string, string> = {
  state: "state",
  access_denied: "accessDenied",
  oauth: "oauth",
  token: "token",
};

export default function LoginForm({ callbackUrl, error }: LoginFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const t = useTranslations("auth");

  const errorMessage = error ? t(`errors.${ERROR_KEYS[error] ?? "default"}`) : null;

  const handleSignIn = () => {
    if (isSubmitting) {
      return;
    }

    setIsSubmitting(true);
    const params = new URLSearchParams({ callbackUrl });
    window.location.href = `/api/auth/google?${params.toString()}`;
  };

  return (
    <div className="space-y-6">
      {errorMessage ? (
        <div className="border-l-2 border-stamp bg-stamp-wash px-4 py-3 font-mono text-[12px] leading-relaxed text-ink">
          {errorMessage}
        </div>
      ) : null}
      <button
        type="button"
        onClick={handleSignIn}
        disabled={isSubmitting}
        className="flex h-12 w-full items-center justify-center gap-3 bg-ink px-4 font-mono text-[11px] font-medium tracking-[0.09em] text-paper uppercase transition-colors hover:bg-stamp disabled:cursor-not-allowed disabled:opacity-60"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 48 48"
          className="h-5 w-5"
          aria-hidden="true"
        >
          <path fill="#EA4335" d="M24 9.5c3.54 0 6 1.54 7.38 2.83l5.38-5.38C33.46 3.5 28.97 1.5 24 1.5 14.93 1.5 7.19 7.36 4.46 15.44l6.92 5.37C12.56 14.46 17.74 9.5 24 9.5z" />
          <path fill="#4285F4" d="M46.5 24.5c0-1.82-.15-3.15-.47-4.53H24v8.19h12.75c-.26 2.1-1.67 5.26-4.8 7.38l7.39 5.72C43.84 37.83 46.5 31.78 46.5 24.5z" />
          <path fill="#FBBC05" d="M11.38 28.31c-.5-1.5-.79-3.11-.79-4.81s.29-3.31.79-4.81l-6.92-5.37C2.73 15.35 1.5 19.65 1.5 24s1.23 8.65 2.96 11.68l6.92-5.37z" />
          <path fill="#34A853" d="M24 46.5c6.57 0 12.07-2.17 16.09-5.9l-7.39-5.72c-2.04 1.37-4.79 2.32-8.7 2.32-6.26 0-11.44-4.96-13.11-11.42l-6.92 5.37C7.19 40.64 14.93 46.5 24 46.5z" />
        </svg>
        {isSubmitting ? t("redirectingToGoogle") : t("continueWithGoogle")}
      </button>
    </div>
  );
}
