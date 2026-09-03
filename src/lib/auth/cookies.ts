import type { NextRequest } from "next/server";

/**
 * Whether the request reached us over HTTPS. Vercel terminates TLS at the edge,
 * so the forwarded header is authoritative there; the URL protocol is the
 * fallback for direct connections (e.g. `next dev` on http://localhost).
 */
export function isSecureRequest(request: NextRequest): boolean {
  const forwardedProto = request.headers.get("x-forwarded-proto");
  if (forwardedProto) {
    return forwardedProto.split(",")[0].trim() === "https";
  }

  return request.nextUrl.protocol === "https:";
}

/**
 * Attributes shared by every auth cookie. Callers add name, value and maxAge.
 * `secure` must track the request protocol: browsers reject Secure cookies over
 * plain HTTP, which silently breaks the OAuth state check on localhost.
 */
export function authCookieOptions(request: NextRequest) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: isSecureRequest(request),
    path: "/",
  };
}
