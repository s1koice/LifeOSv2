import { request as httpsRequest } from "node:https";
import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { supabaseServerConfig } from "@/lib/cloud-server";

type CloudRow = { payload: Record<string, unknown>; updated_at: string };
type InboxAttachment = { id: string; type: "image" | "audio"; name: string; mimeType: string; path?: string; dataUrl?: string; size: number };
type InboxItem = { id: number; title: string; kind: "note"; createdAt: string; status: "new"; attachments?: InboxAttachment[] };
type StoredInboxItem = Omit<InboxItem, "status"> & { status?: "new" | "organized" };
type SupabaseResult = { status: number; body: string };

export const runtime = "nodejs";

const attempts = new Map<string, { count: number; resetAt: number }>();
const bucketName = "nexus-inbox";
const allowedTypes = new Set(["image/jpeg", "image/png", "image/webp", "audio/webm", "audio/mp4", "audio/mpeg", "audio/ogg"]);
const maxFileSize = 1_600_000;
const maxTotalSize = 3_200_000;
const primaryCloudOrigin = "https://life-o-sv2.vercel.app";

async function forwardToPrimary(request: NextRequest) {
  if (request.nextUrl.hostname === new URL(primaryCloudOrigin).hostname) {
    return NextResponse.json({ error: "Облачные Входящие ещё не настроены" }, { status: 503 });
  }
  const target = new URL(`/api/capture${request.nextUrl.search}`, primaryCloudOrigin);
  const contentType = request.headers.get("content-type");
  const response = await fetch(target, {
    method: request.method,
    headers: contentType ? { "Content-Type": contentType } : undefined,
    body: request.method === "GET" ? undefined : await request.arrayBuffer(),
    cache: "no-store",
  });
  return new NextResponse(response.body, {
    status: response.status,
    headers: {
      "Content-Type": response.headers.get("content-type") || "application/json; charset=utf-8",
      "Cache-Control": response.headers.get("cache-control") || "no-store",
    },
  });
}

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

function storageRequest(path: string, options: { method?: "GET" | "POST"; body?: Buffer; contentType?: string; extraHeaders?: Record<string, string> } = {}) {
  const { url, key } = supabaseServerConfig();
  const endpoint = new URL(path, `${url}/`);
  return new Promise<{ status: number; body: Buffer; contentType: string }>((resolve, reject) => {
    const req = httpsRequest(endpoint, {
      method: options.method || "GET",
      headers: {
        apikey: key,
        ...(key.startsWith("sb_secret_") ? {} : { Authorization: `Bearer ${key}` }),
        ...(options.contentType ? { "Content-Type": options.contentType } : {}),
        ...(options.body ? { "Content-Length": String(options.body.length) } : {}),
        ...options.extraHeaders,
      },
    }, response => {
      const chunks: Buffer[] = [];
      response.on("data", chunk => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)));
      response.on("end", () => resolve({ status: response.statusCode || 500, body: Buffer.concat(chunks), contentType: String(response.headers["content-type"] || "application/octet-stream") }));
    });
    req.setTimeout(20_000, () => req.destroy(new Error("Supabase Storage timeout")));
    req.on("error", reject);
    if (options.body) req.write(options.body);
    req.end();
  });
}

async function ensureBucket() {
  const body = Buffer.from(JSON.stringify({ id: bucketName, name: bucketName, public: false, file_size_limit: maxFileSize, allowed_mime_types: [...allowedTypes] }));
  const response = await storageRequest("storage/v1/bucket", { method: "POST", body, contentType: "application/json" });
  if ((response.status < 200 || response.status >= 300) && response.status !== 409) throw new Error(`Storage bucket ${response.status}`);
}

async function uploadAttachment(file: File): Promise<InboxAttachment> {
  const mimeType = file.type.toLowerCase();
  const type = mimeType.startsWith("image/") ? "image" : "audio";
  const extension = mimeType.split("/")[1]?.split(";")[0]?.replace("mpeg", "mp3") || "bin";
  const path = `${new Date().toISOString().slice(0, 10)}/${randomUUID()}.${extension}`;
  const bytes = Buffer.from(await file.arrayBuffer());
  const response = await storageRequest(`storage/v1/object/${bucketName}/${path}`, { method: "POST", body: bytes, contentType: mimeType, extraHeaders: { "x-upsert": "false" } });
  if (response.status < 200 || response.status >= 300) throw new Error(`Storage upload ${response.status}`);
  return { id: randomUUID(), type, name: file.name.slice(0, 120), mimeType, path, size: file.size };
}

async function inlineAudioAttachment(file: File): Promise<InboxAttachment> {
  const mimeType = file.type.toLowerCase().split(";")[0] || "audio/webm";
  const bytes = Buffer.from(await file.arrayBuffer());
  return {
    id: randomUUID(),
    type: "audio",
    name: file.name.slice(0, 120),
    mimeType,
    dataUrl: `data:${mimeType};base64,${bytes.toString("base64")}`,
    size: file.size,
  };
}

export async function POST(request: NextRequest) {
  if (!allowCapture(request)) return NextResponse.json({ error: "Слишком много записей. Подождите минуту." }, { status: 429 });
  const { url, key } = supabaseServerConfig();
  if (!url || !key) return forwardToPrimary(request);

  const form = await request.formData().catch(() => null);
  if (!form) return NextResponse.json({ error: "Не удалось прочитать запись" }, { status: 400 });
  if (form.get("website")) return NextResponse.json({ error: "Некорректная запись" }, { status: 400 });
  const text = String(form.get("text") || "").replace(/[\u0000-\u001F\u007F]/g, " ").replace(/\s+/g, " ").trim().slice(0, 1200);
  const files = form.getAll("attachments").filter((value): value is File => value instanceof File && value.size > 0).slice(0, 4);
  if (!text && !files.length) return NextResponse.json({ error: "Напишите мысль, запишите голос или добавьте фото" }, { status: 400 });
  if (files.some(file => !allowedTypes.has(file.type.toLowerCase()))) return NextResponse.json({ error: "Поддерживаются фотографии и аудиозаписи" }, { status: 415 });
  if (files.some(file => file.size > maxFileSize) || files.reduce((sum, file) => sum + file.size, 0) > maxTotalSize) return NextResponse.json({ error: "Файлы слишком большие. Добавьте меньше фото или более короткую запись." }, { status: 413 });
  const hasAudio = files.some(file => file.type.startsWith("audio/"));
  const imageCount = files.filter(file => file.type.startsWith("image/")).length;
  if (files.filter(file => file.type.startsWith("audio/")).length > 1 || imageCount > 3) return NextResponse.json({ error: "Можно добавить одну аудиозапись и до трёх фото" }, { status: 400 });
  const title = text || (hasAudio && imageCount ? "Голосовая заметка с фото" : hasAudio ? "Голосовая заметка" : imageCount > 1 ? `${imageCount} фото` : "Фото");

  try {
    const current = await requestSupabase("rest/v1/nexus_pin_state?owner=eq.primary&select=payload,updated_at&limit=1");
    if (current.status < 200 || current.status >= 300) throw new Error(`Supabase read ${current.status}`);
    const rows = JSON.parse(current.body) as CloudRow[];
    const payload = rows[0]?.payload && typeof rows[0].payload === "object" ? rows[0].payload : {};
    const inboxItems = Array.isArray(payload.inboxItems) ? payload.inboxItems as StoredInboxItem[] : [];
    const duplicate = !files.length && inboxItems.some(item => item.title.trim().toLowerCase() === title.toLowerCase() && Date.now() - new Date(item.createdAt).getTime() < 120_000);
    if (duplicate) return NextResponse.json({ saved: true, duplicate: true, count: inboxItems.filter(item => item.status !== "organized").length });

    const imageFiles = files.filter(file => file.type.startsWith("image/"));
    const audioFiles = files.filter(file => file.type.startsWith("audio/"));
    let attachments: InboxAttachment[] = [];
    if (imageFiles.length) {
      await ensureBucket();
      attachments = await Promise.all(imageFiles.map(uploadAttachment));
    }
    if (audioFiles.length) attachments.push(...await Promise.all(audioFiles.map(inlineAudioAttachment)));
    const item: InboxItem = { id: Date.now() * 100 + Math.floor(Math.random() * 100), title, kind: "note", createdAt: new Date().toISOString(), status: "new", ...(attachments.length ? { attachments } : {}) };
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

export async function GET(request: NextRequest) {
  const { url, key } = supabaseServerConfig();
  if (!url || !key) return forwardToPrimary(request);
  const path = request.nextUrl.searchParams.get("path") || "";
  if (!/^\d{4}-\d{2}-\d{2}\/[a-f0-9-]+\.[a-z0-9]+$/i.test(path)) return NextResponse.json({ error: "Некорректный файл" }, { status: 400 });
  try {
    const response = await storageRequest(`storage/v1/object/${bucketName}/${path}`);
    if (response.status < 200 || response.status >= 300) return NextResponse.json({ error: "Файл не найден" }, { status: 404 });
    return new NextResponse(new Uint8Array(response.body), { headers: { "Content-Type": response.contentType, "Cache-Control": "private, max-age=3600" } });
  } catch (error) {
    console.error("NEXUS attachment read failed", error);
    return NextResponse.json({ error: "Не удалось открыть файл" }, { status: 502 });
  }
}
