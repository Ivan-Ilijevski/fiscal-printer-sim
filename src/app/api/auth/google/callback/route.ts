import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { attachSessionCookie, clearSessionCookie, SessionUser } from "@/lib/auth/session";
import { buildGoogleCallbackUrl } from "@/lib/auth/google";

const TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token";
const TOKEN_INFO_ENDPOINT = "https://oauth2.googleapis.com/tokeninfo";
const STATE_COOKIE_NAME = "fps_oauth_state";
const CALLBACK_COOKIE_NAME = "fps_oauth_callback";
const DEFAULT_REDIRECT = "/en";

function getClientId(): string {
  const value = process.env.GOOGLE_CLIENT_ID;
  if (!value) {
    throw new Error("GOOGLE_CLIENT_ID is not set");
  }
  return value;
}

function getClientSecret(): string {
  const value = process.env.GOOGLE_CLIENT_SECRET;
  if (!value) {
    throw new Error("GOOGLE_CLIENT_SECRET is not set");
  }
  return value;
}

function sanitizeCallback(callbackUrl: string | null): string {
  if (!callbackUrl) {
    return DEFAULT_REDIRECT;
  }
  try {
    const decoded = decodeURIComponent(callbackUrl);
    if (!decoded.startsWith("/")) {
      return DEFAULT_REDIRECT;
    }
    return decoded;
  } catch {
    return DEFAULT_REDIRECT;
  }
}

function buildLoginRedirect(request: NextRequest, reason: string): NextResponse {
  const loginUrl = new URL("/login", request.nextUrl.origin);
  loginUrl.searchParams.set("error", reason);
  const response = NextResponse.redirect(loginUrl);
  response.cookies.set({
    name: STATE_COOKIE_NAME,
    value: "",
    httpOnly: true,
    sameSite: "lax",
    secure: true,
    maxAge: 0,
    path: "/",
  });
  response.cookies.set({
    name: CALLBACK_COOKIE_NAME,
    value: "",
    httpOnly: true,
    sameSite: "lax",
    secure: true,
    maxAge: 0,
    path: "/",
  });
  clearSessionCookie(response);
  return response;
}

export async function GET(request: NextRequest) {
  const url = request.nextUrl;
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const error = url.searchParams.get("error");

  if (error) {
    return buildLoginRedirect(request, error);
  }

  if (!code || !state) {
    return buildLoginRedirect(request, "oauth");
  }

  const cookieStore = await cookies();
  const storedState = cookieStore.get(STATE_COOKIE_NAME)?.value;
  if (!storedState || storedState !== state) {
    return buildLoginRedirect(request, "state");
  }

  const callbackCookie = cookieStore.get(CALLBACK_COOKIE_NAME)?.value ?? null;
  const callbackPath = sanitizeCallback(callbackCookie);

  const redirectUri = buildGoogleCallbackUrl(request);

  const tokenResponse = await fetch(TOKEN_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      code,
      client_id: getClientId(),
      client_secret: getClientSecret(),
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  });

  if (!tokenResponse.ok) {
    return buildLoginRedirect(request, "oauth");
  }

  const tokenPayload = (await tokenResponse.json()) as { id_token?: string };
  if (!tokenPayload.id_token) {
    return buildLoginRedirect(request, "token");
  }

  const tokenInfoResponse = await fetch(`${TOKEN_INFO_ENDPOINT}?id_token=${tokenPayload.id_token}`);
  if (!tokenInfoResponse.ok) {
    return buildLoginRedirect(request, "token");
  }

  const tokenInfo = (await tokenInfoResponse.json()) as {
    aud?: string;
    sub?: string;
    email?: string;
    name?: string;
    picture?: string;
  };

  if (!tokenInfo.sub || !tokenInfo.email || tokenInfo.aud !== getClientId()) {
    return buildLoginRedirect(request, "token");
  }

  const user: SessionUser = {
    id: tokenInfo.sub,
    email: tokenInfo.email,
    name: tokenInfo.name ?? null,
    picture: tokenInfo.picture ?? null,
  };

  const redirectUrl = new URL(callbackPath, request.nextUrl.origin);
  const response = NextResponse.redirect(redirectUrl);
  attachSessionCookie(response, user);
  response.cookies.set({
    name: STATE_COOKIE_NAME,
    value: "",
    httpOnly: true,
    sameSite: "lax",
    secure: true,
    maxAge: 0,
    path: "/",
  });
  response.cookies.set({
    name: CALLBACK_COOKIE_NAME,
    value: "",
    httpOnly: true,
    sameSite: "lax",
    secure: true,
    maxAge: 0,
    path: "/",
  });

  return response;
}
