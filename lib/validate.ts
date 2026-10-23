import { CUSTOM_CATEGORIES_MAX, CUSTOM_LABEL_MAX } from "@/lib/businessTypes";
import type { CustomSpec } from "@/types";

export async function readJson(req: Request): Promise<Record<string, unknown> | null> {
  try {
    const body = await req.json();
    return body && typeof body === "object" && !Array.isArray(body) ? (body as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

export function isH3(value: unknown): value is string {
  return typeof value === "string" && /^[0-9a-f]{15}$/.test(value);
}

export function badRequest(error: string, status = 400): Response {
  return Response.json({ error }, { status });
}

/** Shape check only (no category list needed): label 1-40 chars, 1-6 distinct category strings. */
export function readCustomSpec(input: unknown): CustomSpec | null {
  if (!input || typeof input !== "object") return null;
  const { label, categories } = input as Record<string, unknown>;
  if (typeof label !== "string" || !Array.isArray(categories)) return null;
  const cleanLabel = label.trim().replace(/\s+/g, " ");
  if (!cleanLabel || cleanLabel.length > CUSTOM_LABEL_MAX) return null;
  if (!categories.every((c) => typeof c === "string" && /^[a-z0-9_]{1,80}$/.test(c))) return null;
  const unique = [...new Set(categories as string[])];
  if (unique.length < 1 || unique.length > CUSTOM_CATEGORIES_MAX) return null;
  return { label: cleanLabel, categories: unique };
}

/** `label` and comma-separated `cats` from a query string. */
export function readCustomParams(params: URLSearchParams): CustomSpec | null {
  const cats = params.get("cats");
  return readCustomSpec({ label: params.get("label") ?? "", categories: cats ? cats.split(",") : [] });
}

/** A valid custom spec: right shape, and every category exists in the known category list. */
export function validateCustomSpec(input: unknown, known: ReadonlySet<string>): CustomSpec | null {
  const spec = readCustomSpec(input);
  if (!spec || !spec.categories.every((c) => known.has(c))) return null;
  return spec;
}
