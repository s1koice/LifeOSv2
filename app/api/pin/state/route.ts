import { NextResponse } from "next/server";
import { hasPinSession, pinAuthConfigured, supabaseServerConfig } from "@/lib/pin-auth-server";

type CloudRow = { payload: Record<string, unknown>; updated_at: string };

async function supabaseFailure(response: Response, fallback: string) {
  const body = await response.json().catch(() => ({})) as { code?: string; message?: string; hint?: string };
  const detail = [body.code, body.message, body.hint].filter(Boolean).join(" · ");
  console.error("NEXUS Supabase request failed", response.status, detail || fallback);
  return NextResponse.json({ error: detail ? `Supabase: ${detail}` : fallback }, { status: 502 });
}

function serverHeaders(prefer?: string) {
  const { key } = supabaseServerConfig();
  return {
    apikey: key,
    // Modern sb_secret_* keys are opaque API keys, not JWTs. Sending one as a
    // Bearer token makes Supabase reject it as "Invalid JWT". Legacy
    // service_role JWT keys still need the Authorization header.
    ...(key.startsWith("sb_secret_") ? {} : { Authorization: `Bearer ${key}` }),
    "Content-Type": "application/json",
    ...(prefer ? { Prefer: prefer } : {}),
  };
}

async function authorize() {
  if (!pinAuthConfigured()) return NextResponse.json({ error: "Облачное сохранение не настроено" }, { status: 503 });
  if (!await hasPinSession()) return NextResponse.json({ error: "Требуется PIN-код" }, { status: 401 });
  return null;
}

export async function GET() {
  const denied = await authorize();
  if (denied) return denied;
  const { url } = supabaseServerConfig();
  const response = await fetch(`${url}/rest/v1/nexus_pin_state?owner=eq.primary&select=payload,updated_at&limit=1`, {
    headers: serverHeaders(), cache: "no-store",
  });
  if (!response.ok) return supabaseFailure(response, "Не удалось прочитать данные из Supabase");
  const rows = await response.json() as CloudRow[];
  return NextResponse.json({ row: rows[0] || null });
}

export async function PUT(request: Request) {
  const denied = await authorize();
  if (denied) return denied;
  const payload = await request.json().catch(() => null) as Record<string, unknown> | null;
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return NextResponse.json({ error: "Некорректные данные" }, { status: 400 });
  }
  const { url } = supabaseServerConfig();
  const updatedAt = new Date().toISOString();
  const response = await fetch(`${url}/rest/v1/nexus_pin_state?on_conflict=owner`, {
    method: "POST",
    headers: serverHeaders("resolution=merge-duplicates,return=representation"),
    body: JSON.stringify({ owner: "primary", payload, updated_at: updatedAt }),
  });
  if (!response.ok) return supabaseFailure(response, "Не удалось сохранить данные в Supabase");
  const rows = await response.json() as CloudRow[];
  return NextResponse.json({ row: rows[0] || { payload, updated_at: updatedAt } });
}
