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
