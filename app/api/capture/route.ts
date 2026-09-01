import { request as httpsRequest } from "node:https";
import { NextRequest, NextResponse } from "next/server";
import { supabaseServerConfig } from "@/lib/cloud-server";

type CloudRow = { payload: Record<string, unknown>; updated_at: string };
type InboxItem = { id: number; title: string; kind: "note"; createdAt: string; status: "new" };
type StoredInboxItem = Omit<InboxItem, "status"> & { status?: "new" | "organized" };
type SupabaseResult = { status: number; body: string };

export const runtime = "nodejs";

const attempts = new Map<string, { count: number; resetAt: number }>();

function allowCapture(request: NextRequest) {
  const key = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  const now = Date.now();
  const current = attempts.get(key);
  if (!current || current.resetAt < now) {
    attempts.set(key, { count: 1, resetAt: now + 60_000 });
    return true;
  }
  current.count += 1;
  return current.count <= 12;
}

function requestSupabase(path: string, options: { method?: "GET" | "POST"; body?: string; prefer?: string } = {}) {
  const { url, key } = supabaseServerConfig();
  const endpoint = new URL(path, `${url}/`);
  return new Promise<SupabaseResult>((resolve, reject) => {
    const req = httpsRequest(endpoint, {
      method: options.method || "GET",
      headers: {
        apikey: key,
        ...(key.startsWith("sb_secret_") ? {} : { Authorization: `Bearer ${key}` }),
        "Content-Type": "application/json",
        ...(options.prefer ? { Prefer: options.prefer } : {}),
        ...(options.body ? { "Content-Length": Buffer.byteLength(options.body).toString() } : {}),
      },
    }, response => {
      const chunks: Buffer[] = [];
      response.on("data", chunk => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)));
      response.on("end", () => resolve({ status: response.statusCode || 500, body: Buffer.concat(chunks).toString("utf8") }));
    });
    req.setTimeout(15_000, () => req.destroy(new Error("Supabase timeout")));
    req.on("error", reject);
    if (options.body) req.write(options.body);
    req.end();
  });
}

export async function POST(request: NextRequest) {
  if (!allowCapture(request)) return NextResponse.json({ error: "Слишком много записей. Подождите минуту." }, { status: 429 });
  const { url, key } = supabaseServerConfig();
  if (!url || !key) return NextResponse.json({ error: "Облачные Входящие ещё не настроены" }, { status: 503 });

  const body = await request.json().catch(() => ({})) as { text?: string; website?: string };
  if (body.website) return NextResponse.json({ error: "Некорректная запись" }, { status: 400 });
  const title = String(body.text || "").replace(/[\u0000-\u001F\u007F]/g, " ").replace(/\s+/g, " ").trim().slice(0, 1200);
  if (!title) return NextResponse.json({ error: "Напишите или продиктуйте мысль" }, { status: 400 });

  try {
    const current = await requestSupabase("rest/v1/nexus_pin_state?owner=eq.primary&select=payload,updated_at&limit=1");
    if (current.status < 200 || current.status >= 300) throw new Error(`Supabase read ${current.status}`);
    const rows = JSON.parse(current.body) as CloudRow[];
    const payload = rows[0]?.payload && typeof rows[0].payload === "object" ? rows[0].payload : {};
    const inboxItems = Array.isArray(payload.inboxItems) ? payload.inboxItems as StoredInboxItem[] : [];
    const duplicate = inboxItems.some(item => item.title.trim().toLowerCase() === title.toLowerCase() && Date.now() - new Date(item.createdAt).getTime() < 120_000);
    if (duplicate) return NextResponse.json({ saved: true, duplicate: true, count: inboxItems.filter(item => item.status !== "organized").length });

    const item: InboxItem = { id: Date.now() * 100 + Math.floor(Math.random() * 100), title, kind: "note", createdAt: new Date().toISOString(), status: "new" };
    const nextPayload = { ...payload, inboxItems: [item, ...inboxItems] };
    const updatedAt = new Date().toISOString();
    const saved = await requestSupabase("rest/v1/nexus_pin_state?on_conflict=owner", {
      method: "POST",
      body: JSON.stringify({ owner: "primary", payload: nextPayload, updated_at: updatedAt }),
      prefer: "resolution=merge-duplicates,return=minimal",
    });
    if (saved.status < 200 || saved.status >= 300) throw new Error(`Supabase write ${saved.status}`);
    return NextResponse.json({ saved: true, item, count: inboxItems.filter(row => row.status !== "organized").length + 1 });
  } catch (error) {
    console.error("NEXUS public capture failed", error);
    return NextResponse.json({ error: "Не удалось сохранить мысль. Попробуйте ещё раз." }, { status: 502 });
  }
}
