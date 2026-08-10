import { NextRequest, NextResponse } from "next/server";
import { createPinSessionToken, hasPinSession, pinAuthConfigured, pinCookieName, pinSessionCookieOptions, verifyPin } from "@/lib/pin-auth-server";

const attempts = new Map<string, { count: number; resetAt: number }>();

function canAttempt(request: NextRequest) {
  const key = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  const now = Date.now();
  const current = attempts.get(key);
  if (!current || current.resetAt < now) {
    attempts.set(key, { count: 1, resetAt: now + 60_000 });
    return true;
  }
  current.count += 1;
  return current.count <= 8;
}

export async function GET() {
  return NextResponse.json({ authenticated: await hasPinSession(), configured: pinAuthConfigured() });
}

export async function POST(request: NextRequest) {
  if (!pinAuthConfigured()) {
    return NextResponse.json({ error: "PIN-вход ещё не настроен в Vercel" }, { status: 503 });
  }
  if (!canAttempt(request)) {
    return NextResponse.json({ error: "Слишком много попыток. Подождите минуту." }, { status: 429 });
  }
  const body = await request.json().catch(() => ({})) as { pin?: string };
  if (!verifyPin(String(body.pin || ""))) {
    return NextResponse.json({ error: "Неверный PIN-код" }, { status: 401 });
  }
  const response = NextResponse.json({ authenticated: true });
  response.cookies.set(pinCookieName, createPinSessionToken(), pinSessionCookieOptions());
  return response;
}

export async function DELETE() {
  const response = NextResponse.json({ authenticated: false });
  response.cookies.set(pinCookieName, "", { ...pinSessionCookieOptions(), maxAge: 0 });
  return response;
}
