import { request as httpsRequest } from "node:https";
import { NextResponse } from "next/server";
import { cloudStorageConfigured, supabaseServerConfig } from "@/lib/cloud-server";

type CloudRow = { payload: Record<string, unknown>; updated_at: string };
type SupabaseResult = { status: number; body: string };

export const runtime = "nodejs";

function safeErrorMessage(error: unknown, fallback: string) {
  if (error && typeof error === "object" && "message" in error && typeof error.message === "string") {
    return error.message;
  }
  return fallback;
}

function supabaseFailure(response: SupabaseResult, fallback: string) {
  const rawBody = response.body;
  let detail = rawBody;
  try {
    const body = JSON.parse(rawBody) as { code?: string; message?: string; hint?: string };
    detail = [body.code, body.message, body.hint].filter(Boolean).join(" · ");
  } catch {
    // Keep the plain response body when PostgREST did not return JSON.
  }
  detail = detail.trim().slice(0, 500);
  console.error("NEXUS Supabase request failed", response.status, detail || fallback);
  return NextResponse.json({ error: detail ? `Supabase ${response.status}: ${detail}` : fallback }, { status: 502 });
}

function supabaseRequest(path: string, options: { method?: "GET" | "POST"; body?: string; prefer?: string } = {}) {
  const { url } = supabaseServerConfig();
  const endpoint = new URL(path, `${url}/`);
  const body = options.body;

  return new Promise<SupabaseResult>((resolve, reject) => {
    const req = httpsRequest(endpoint, {
      method: options.method || "GET",
      headers: {
        ...serverHeaders(options.prefer),
        ...(body ? { "Content-Length": Buffer.byteLength(body).toString() } : {}),
      },
    }, response => {
      const chunks: Buffer[] = [];
      response.on("data", chunk => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)));
      response.on("end", () => resolve({
        status: response.statusCode || 500,
        body: Buffer.concat(chunks).toString("utf8"),
      }));
    });
    req.setTimeout(15_000, () => req.destroy(new Error("Превышено время ожидания ответа Supabase")));
    req.on("error", reject);
    if (body) req.write(body);
    req.end();
  });
}

function serverHeaders(prefer?: string) {
  const { key } = supabaseServerConfig();
  return {
    apikey: key,
    // New sb_secret_* keys are API keys and must not be sent as JWT Bearer tokens.
    ...(key.startsWith("sb_secret_") ? {} : { Authorization: `Bearer ${key}` }),
    "Content-Type": "application/json",
    ...(prefer ? { Prefer: prefer } : {}),
  };
}

async function authorize() {
  if (!cloudStorageConfigured()) return NextResponse.json({ error: "Облачное сохранение не настроено" }, { status: 503 });
  return null;
}

export async function GET() {
  try {
    const denied = await authorize();
    if (denied) return denied;
    const response = await supabaseRequest("rest/v1/nexus_pin_state?owner=eq.primary&select=payload,updated_at&limit=1");
    if (response.status < 200 || response.status >= 300) return supabaseFailure(response, "Не удалось прочитать данные из Supabase");
    const rows = JSON.parse(response.body) as CloudRow[];
    return NextResponse.json({ row: rows[0] || null });
  } catch (error) {
    const message = safeErrorMessage(error, "Не удалось связаться с Supabase");
    console.error("NEXUS Supabase GET failed", message, error);
    return NextResponse.json({ error: `Supabase: ${message}` }, { status: 502 });
  }
}

export async function PUT(request: Request) {
  try {
    const denied = await authorize();
    if (denied) return denied;
    const payload = await request.json().catch(() => null) as Record<string, unknown> | null;
    if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
      return NextResponse.json({ error: "Некорректные данные" }, { status: 400 });
    }
    const updatedAt = new Date().toISOString();
    const response = await supabaseRequest("rest/v1/nexus_pin_state?on_conflict=owner", {
      method: "POST",
      body: JSON.stringify({ owner: "primary", payload, updated_at: updatedAt }),
      prefer: "resolution=merge-duplicates,return=representation",
    });
    if (response.status < 200 || response.status >= 300) return supabaseFailure(response, "Не удалось сохранить данные в Supabase");
    const rows = JSON.parse(response.body) as CloudRow[];
    return NextResponse.json({ row: rows[0] || { payload, updated_at: updatedAt } });
  } catch (error) {
    const message = safeErrorMessage(error, "Не удалось связаться с Supabase");
    console.error("NEXUS Supabase PUT failed", message, error);
    return NextResponse.json({ error: `Supabase: ${message}` }, { status: 502 });
  }
}
