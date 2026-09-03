import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { clearSessionCookie } from "@/lib/auth/session";

export async function POST(request: NextRequest) {
  const response = NextResponse.json({ success: true });
  clearSessionCookie(request, response);
  return response;
}

export async function GET(request: NextRequest) {
  const response = NextResponse.json({ success: true });
  clearSessionCookie(request, response);
  return response;
}
