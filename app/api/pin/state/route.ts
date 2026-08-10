import { NextResponse } from "next/server";
import { hasPinSession, pinAuthConfigured, supabaseServerConfig } from "@/lib/pin-auth-server";

type CloudRow = { payload: Record<string, unknown>; updated_at: string };

function serverHeaders(prefer?: string) {
  const { key } = supabaseServerConfig();
  return {
    apikey: key,
    Authorization: `Bearer ${key}`,
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
  if (!response.ok) return NextResponse.json({ error: "Не удалось прочитать данные из Supabase" }, { status: 502 });
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
  if (!response.ok) return NextResponse.json({ error: "Не удалось сохранить данные в Supabase" }, { status: 502 });
  const rows = await response.json() as CloudRow[];
  return NextResponse.json({ row: rows[0] || { payload, updated_at: updatedAt } });
}
