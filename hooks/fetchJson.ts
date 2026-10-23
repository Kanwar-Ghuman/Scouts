import { toast } from "sonner";

export class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new HttpError(res.status, (body as { error?: string }).error ?? `Request failed (${res.status})`);
  return body as T;
}

export const postJson = <T>(url: string, body: unknown, signal?: AbortSignal) =>
  fetchJson<T>(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body), signal });

export const isAbort = (err: unknown) => (err as Error)?.name === "AbortError";

/** Toasts for rate limits and network failures on LLM routes. */
export function toastLlmError(err: unknown): void {
  if (err instanceof HttpError && err.status === 429) toast.error("Slow down a little, try again in a minute");
  else if (!(err instanceof HttpError)) toast.error("Network error. Check your connection and try again.");
}
