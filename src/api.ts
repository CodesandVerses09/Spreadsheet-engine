const API_URL: string =
  import.meta.env.VITE_API_URL ?? "http://localhost:4000";

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) throw new Error(`Request failed: ${res.status}`);
  return res.json() as Promise<T>;
}

export function createSheet(name: string, cells: Record<string, unknown>) {
  return request<{ id: string }>("/sheets", {
    method: "POST",
    body: JSON.stringify({ name, cells }),
  });
}

export function loadSheet(id: string) {
  return request<{
    id: string;
    name: string;
    cells: Record<string, unknown>;
    updated_at: string;
  }>(`/sheets/${id}`);
}

export function saveSheet(id: string, cells: Record<string, unknown>) {
  return request<{ ok: boolean }>(`/sheets/${id}`, {
    method: "PUT",
    body: JSON.stringify({ cells }),
  });
}