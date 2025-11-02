"use client";

import { createContext, useContext } from "react";
import type { SessionData } from "@/lib/auth/session";

const SessionContext = createContext<SessionData | null>(null);

export function AuthSessionProvider({
  session,
  children,
}: {
  session: SessionData;
  children: React.ReactNode;
}) {
  return <SessionContext.Provider value={session}>{children}</SessionContext.Provider>;
}

export function useAuthSession(): SessionData {
  const session = useContext(SessionContext);
  if (!session) {
    throw new Error("useAuthSession must be used within an AuthSessionProvider");
  }
  return session;
}
