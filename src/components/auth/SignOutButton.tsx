"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useTranslations } from "next-intl";

export default function SignOutButton() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const t = useTranslations("auth");

  const handleSignOut = async () => {
    if (isLoading) {
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch("/api/auth/logout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error("Failed to sign out");
      }

      router.replace("/login");
      router.refresh();
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleSignOut}
      disabled={isLoading}
      className="h-9 border border-rule bg-paper-2 px-3 font-mono text-[11px] font-medium tracking-[0.09em] text-ink-3 uppercase transition-colors hover:border-stamp hover:text-stamp disabled:cursor-not-allowed disabled:opacity-50"
    >
      {isLoading ? t("signingOut") : t("signOut")}
    </button>
  );
}
