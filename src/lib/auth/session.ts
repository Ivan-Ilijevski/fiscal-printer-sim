import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createHmac, randomBytes, timingSafeEqual } from "crypto";

export const SESSION_COOKIE_NAME = "fps_session";
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7; // 7 days

export interface SessionUser {
  id: string;
  email: string;
  name?: string | null;
  picture?: string | null;
}

export interface SessionData {
  user: SessionUser;
  expiresAt: number;
}

function getSessionSecret(): string {
  const secret = process.env.AUTH_SESSION_SECRET;
  if (!secret) {
    throw new Error("AUTH_SESSION_SECRET is not set");
  }
  return secret;
}

function toBase64Url(value: string): string {
  return Buffer.from(value, "utf8").toString("base64url");
}

function fromBase64Url(value: string): string {
  return Buffer.from(value, "base64url").toString("utf8");
}

function signPayload(payload: string, secret: string): Buffer {
  return createHmac("sha256", secret).update(payload).digest();
}

export function createSessionToken(user: SessionUser): { token: string; payload: SessionData } {
  const expiresAt = Math.floor(Date.now() / 1000) + SESSION_MAX_AGE_SECONDS;
  const payload: SessionData = {
    user: {
      id: user.id,
      email: user.email,
      name: user.name ?? null,
      picture: user.picture ?? null,
    },
    expiresAt,
  };

  const payloadString = JSON.stringify(payload);
  const encodedPayload = toBase64Url(payloadString);
  const signature = signPayload(encodedPayload, getSessionSecret()).toString("base64url");
  return {
    token: `${encodedPayload}.${signature}`,
    payload,
  };
}

export function attachSessionCookie(response: NextResponse, user: SessionUser): SessionData {
  const { token, payload } = createSessionToken(user);
  response.cookies.set({
    name: SESSION_COOKIE_NAME,
    value: token,
    httpOnly: true,
    sameSite: "lax",
    secure: true,
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
  return payload;
}

export function clearSessionCookie(response: NextResponse): void {
  response.cookies.set({
    name: SESSION_COOKIE_NAME,
    value: "",
    httpOnly: true,
    sameSite: "lax",
    secure: true,
    path: "/",
    maxAge: 0,
  });
}

function validateSessionToken(token: string): SessionData | null {
  const [encodedPayload, encodedSignature] = token.split(".");
  if (!encodedPayload || !encodedSignature) {
    return null;
  }

  const secret = getSessionSecret();
  const expectedSignature = signPayload(encodedPayload, secret);
  let providedSignature: Buffer;
  try {
    providedSignature = Buffer.from(encodedSignature, "base64url");
  } catch {
    return null;
  }

  if (expectedSignature.length !== providedSignature.length) {
    return null;
  }

  if (!timingSafeEqual(expectedSignature, providedSignature)) {
    return null;
  }

  let payload: SessionData;
  try {
    payload = JSON.parse(fromBase64Url(encodedPayload)) as SessionData;
  } catch {
    return null;
  }

  if (!payload?.user?.id || !payload?.user?.email || typeof payload.expiresAt !== "number") {
    return null;
  }

  if (payload.expiresAt <= Math.floor(Date.now() / 1000)) {
    return null;
  }

  return {
    user: {
      id: payload.user.id,
      email: payload.user.email,
      name: payload.user.name ?? null,
      picture: payload.user.picture ?? null,
    },
    expiresAt: payload.expiresAt,
  };
}

export function getSessionFromCookies(): SessionData | null {
  const cookieStore = cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!token) {
    return null;
  }

  try {
    return validateSessionToken(token);
  } catch (error) {
    console.error("Failed to validate session token", error);
    return null;
  }
}

export function randomStateToken(size = 16): string {
  return randomBytes(size).toString("hex");
}
