export type NexusAuthUser = {
  id: string;
  email?: string;
  user_metadata?: Record<string, unknown>;
};

export type NexusAuthSession = {
  access_token: string;
  refresh_token: string;
  expires_at?: number;
  expires_in?: number;
  token_type?: string;
  user: NexusAuthUser;
};

const projectUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "") || "";
const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const sessionKey = "nexus-supabase-session";

export const isSupabaseConfigured = Boolean(projectUrl && publishableKey);

function headers(accessToken?: string, extra?: HeadersInit) {
  return {
    apikey: publishableKey,
    "Content-Type": "application/json",
    ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    ...extra,
  };
}

async function parseResponse<T>(response: Response): Promise<T> {
  const body = await response.json().catch(() => ({})) as T & { msg?: string; message?: string; error_description?: string };
  if (!response.ok) throw new Error(body.error_description || body.message || body.msg || "Supabase вернул ошибку");
  return body;
}

function normalizeSession(session: NexusAuthSession): NexusAuthSession {
  const expiresAt = session.expires_at || (session.expires_in ? Math.floor(Date.now() / 1000) + session.expires_in : undefined);
  return { ...session, expires_at: expiresAt };
}

export function saveSupabaseSession(session: NexusAuthSession | null) {
  if (typeof window === "undefined") return;
  if (!session) localStorage.removeItem(sessionKey);
  else localStorage.setItem(sessionKey, JSON.stringify(normalizeSession(session)));
}

export function readSupabaseSession(): NexusAuthSession | null {
  if (typeof window === "undefined") return null;
  try {
    const stored = JSON.parse(localStorage.getItem(sessionKey) || "null") as NexusAuthSession | null;
    return stored?.access_token && stored?.refresh_token && stored?.user?.id ? stored : null;
  } catch {
    return null;
  }
}

export async function signInWithPassword(email: string, password: string) {
  if (!isSupabaseConfigured) throw new Error("Сначала добавьте параметры Supabase в переменные окружения");
  const response = await fetch(`${projectUrl}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({ email, password }),
  });
  const session = normalizeSession(await parseResponse<NexusAuthSession>(response));
  saveSupabaseSession(session);
  return session;
}

export async function signUpWithPassword(email: string, password: string) {
  if (!isSupabaseConfigured) throw new Error("Сначала добавьте параметры Supabase в переменные окружения");
  const response = await fetch(`${projectUrl}/auth/v1/signup`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({ email, password, data: { product: "NEXUS OS" } }),
  });
  const result = await parseResponse<NexusAuthSession & { user: NexusAuthUser }>(response);
  if (result.access_token) {
    const session = normalizeSession(result);
    saveSupabaseSession(session);
    return session;
  }
  return null;
}

export async function refreshSupabaseSession(session: NexusAuthSession) {
  if (!isSupabaseConfigured) return null;
  const response = await fetch(`${projectUrl}/auth/v1/token?grant_type=refresh_token`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({ refresh_token: session.refresh_token }),
  });
  const refreshed = normalizeSession(await parseResponse<NexusAuthSession>(response));
  saveSupabaseSession(refreshed);
  return refreshed;
}

export async function ensureFreshSession(session: NexusAuthSession | null) {
  if (!session) return null;
  const expiresAtMs = (session.expires_at || 0) * 1000;
  if (!expiresAtMs || expiresAtMs - Date.now() > 60_000) return session;
  try {
    return await refreshSupabaseSession(session);
  } catch {
    saveSupabaseSession(null);
    return null;
  }
}

export async function signOutSupabase(session: NexusAuthSession | null) {
  if (session && isSupabaseConfigured) {
    await fetch(`${projectUrl}/auth/v1/logout`, { method: "POST", headers: headers(session.access_token) }).catch(() => undefined);
  }
  saveSupabaseSession(null);
}

export async function loadCloudState(session: NexusAuthSession) {
  const fresh = await ensureFreshSession(session);
  if (!fresh) throw new Error("Сессия истекла — войдите снова");
  const response = await fetch(`${projectUrl}/rest/v1/nexus_user_state?user_id=eq.${encodeURIComponent(fresh.user.id)}&select=payload,updated_at&limit=1`, {
    headers: headers(fresh.access_token),
    cache: "no-store",
  });
  const rows = await parseResponse<Array<{ payload: Record<string, unknown>; updated_at: string }>>(response);
  return { session: fresh, row: rows[0] || null };
}

export async function saveCloudState(session: NexusAuthSession, payload: Record<string, unknown>) {
  const fresh = await ensureFreshSession(session);
  if (!fresh) throw new Error("Сессия истекла — войдите снова");
  const response = await fetch(`${projectUrl}/rest/v1/nexus_user_state?on_conflict=user_id`, {
    method: "POST",
    headers: headers(fresh.access_token, { Prefer: "resolution=merge-duplicates,return=minimal" }),
    body: JSON.stringify({ user_id: fresh.user.id, payload, updated_at: new Date().toISOString() }),
  });
  if (!response.ok) await parseResponse(response);
  return fresh;
}
