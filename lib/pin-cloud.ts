export type PinSession = { authenticated: true };
export type PinCloudRow = { payload: Record<string, unknown>; updated_at: string };

async function parse<T>(response: Response): Promise<T> {
  const body = await response.json().catch(() => ({})) as T & { error?: string };
  if (!response.ok) throw new Error(body.error || "Не удалось связаться с облаком");
  return body;
}

export async function readPinSession() {
  const response = await fetch("/api/pin/session", { cache: "no-store" });
  return parse<{ authenticated: boolean; configured: boolean }>(response);
}

export async function signInWithPin(pin: string) {
  const response = await fetch("/api/pin/session", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ pin }),
  });
  await parse<{ authenticated: true }>(response);
  return { authenticated: true } as PinSession;
}

export async function signOutPin() {
  await fetch("/api/pin/session", { method: "DELETE" });
}

export async function loadPinCloudState() {
  const response = await fetch("/api/pin/state", { cache: "no-store" });
  return parse<{ row: PinCloudRow | null }>(response);
}

export async function savePinCloudState(payload: Record<string, unknown>) {
  const response = await fetch("/api/pin/state", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return parse<{ row: PinCloudRow }>(response);
}
