import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { randomStateToken } from "@/lib/auth/session";

const GOOGLE_AUTH_ENDPOINT = "https://accounts.google.com/o/oauth2/v2/auth";
const STATE_COOKIE_NAME = "fps_oauth_state";
const CALLBACK_COOKIE_NAME = "fps_oauth_callback";
const STATE_TTL_SECONDS = 10 * 60; // 10 minutes
const DEFAULT_REDIRECT = "/en";

function getClientId(): string {
  const value = process.env.GOOGLE_CLIENT_ID;
  if (!value) {
    throw new Error("GOOGLE_CLIENT_ID is not set");
  }
  return value;
}

function buildRedirectUri(request: NextRequest): string {
  return `${request.nextUrl.origin}/api/auth/google/callback`;
}

function sanitizeCallback(callbackUrl: string | null): string {
  if (!callbackUrl || !callbackUrl.startsWith("/")) {
    return DEFAULT_REDIRECT;
  }
  return callbackUrl;
}

export async function GET(request: NextRequest) {
  const clientId = getClientId();
  const redirectUri = buildRedirectUri(request);
  const callbackUrl = sanitizeCallback(request.nextUrl.searchParams.get("callbackUrl"));

  const state = randomStateToken();
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "openid email profile",
    state,
    prompt: "consent",
    access_type: "offline",
    include_granted_scopes: "true",
  });

  const response = NextResponse.redirect(`${GOOGLE_AUTH_ENDPOINT}?${params.toString()}`);
  response.cookies.set({
    name: STATE_COOKIE_NAME,
    value: state,
    httpOnly: true,
    sameSite: "lax",
    secure: true,
    maxAge: STATE_TTL_SECONDS,
    path: "/",
  });
  response.cookies.set({
    name: CALLBACK_COOKIE_NAME,
    value: encodeURIComponent(callbackUrl),
    httpOnly: true,
    sameSite: "lax",
    secure: true,
    maxAge: STATE_TTL_SECONDS,
    path: "/",
  });

  return response;
}
