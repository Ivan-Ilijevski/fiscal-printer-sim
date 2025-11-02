"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function SignOutButton() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

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
      className="rounded-full border border-white/60 bg-white/30 px-4 py-2 text-sm font-medium text-gray-700 backdrop-blur transition hover:bg-white/70 disabled:cursor-not-allowed disabled:opacity-70"
    >
      {isLoading ? "Signing out…" : "Sign out"}
    </button>
  );
}
