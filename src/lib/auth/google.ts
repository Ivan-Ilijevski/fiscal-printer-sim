import type { NextRequest } from "next/server";

export const GOOGLE_CALLBACK_PATH = "/api/auth/google/callback";

function resolveRequestOrigin(request: NextRequest): string {
  const forwardedProto = request.headers.get("x-forwarded-proto");
  const forwardedHost = request.headers.get("x-forwarded-host");
  const host = forwardedHost ?? request.headers.get("host");

  if (forwardedProto && host) {
    return `${forwardedProto}://${host}`;
  }

  const fallbackProto = request.nextUrl.protocol.replace(/:$/, "");
  const fallbackHost = request.nextUrl.host;

  if (fallbackProto && fallbackHost) {
    return `${fallbackProto}://${fallbackHost}`;
  }

  return request.nextUrl.origin;
}

export function buildGoogleCallbackUrl(request: NextRequest): string {
  const explicitRedirectUri = process.env.GOOGLE_REDIRECT_URI;
  if (explicitRedirectUri) {
    return explicitRedirectUri;
  }

  return new URL(GOOGLE_CALLBACK_PATH, resolveRequestOrigin(request)).toString();
}
