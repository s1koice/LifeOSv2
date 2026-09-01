export type CloudRow = { payload: Record<string, unknown>; updated_at: string };

async function parse<T>(response: Response): Promise<T> {
  const body = await response.json().catch(() => ({})) as T & { error?: string };
  if (!response.ok) throw new Error(body.error || "Не удалось связаться с облаком");
  return body;
}

export async function loadCloudState() {
  const response = await fetch("/api/cloud/state", { cache: "no-store" });
  return parse<{ row: CloudRow | null }>(response);
}

export async function saveCloudState(payload: Record<string, unknown>) {
  const response = await fetch("/api/cloud/state", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return parse<{ row: CloudRow }>(response);
}
