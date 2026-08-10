import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

export const pinCookieName = "nexus_pin_session";
const sessionLifetimeSeconds = 60 * 60 * 24 * 30;

function sessionSecret() {
  return process.env.NEXUS_SESSION_SECRET || "";
}

function signature(value: string) {
  return createHmac("sha256", sessionSecret()).update(value).digest("base64url");
}

function safeEqual(left: string, right: string) {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  return a.length === b.length && timingSafeEqual(a, b);
}

export function pinAuthConfigured() {
  return Boolean(
    process.env.NEXUS_PIN &&
    process.env.NEXUS_SESSION_SECRET &&
    (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL) &&
    process.env.SUPABASE_SECRET_KEY,
  );
}

export function verifyPin(pin: string) {
  const expected = process.env.NEXUS_PIN || "";
  return expected.length >= 4 && safeEqual(pin, expected);
}

export function createPinSessionToken() {
  const payload = Buffer.from(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + sessionLifetimeSeconds })).toString("base64url");
  return `${payload}.${signature(payload)}`;
}

export function verifyPinSessionToken(token?: string) {
  if (!token || !sessionSecret()) return false;
  const [payload, receivedSignature] = token.split(".");
  if (!payload || !receivedSignature || !safeEqual(signature(payload), receivedSignature)) return false;
  try {
    const parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as { exp?: number };
    return Number(parsed.exp) > Math.floor(Date.now() / 1000);
  } catch {
    return false;
  }
}

export async function hasPinSession() {
  const store = await cookies();
  return verifyPinSessionToken(store.get(pinCookieName)?.value);
}

export function pinSessionCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: sessionLifetimeSeconds,
  };
}

export function supabaseServerConfig() {
  const url = (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "").replace(/\/$/, "");
  const key = process.env.SUPABASE_SECRET_KEY || "";
  return { url, key };
}
