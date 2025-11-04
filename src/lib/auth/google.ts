import type { NextRequest } from "next/server";

export const GOOGLE_CALLBACK_PATH = "/api/auth/google/callback";

export function buildGoogleCallbackUrl(request: NextRequest): string {
  return new URL(GOOGLE_CALLBACK_PATH, request.nextUrl.origin).toString();
}
