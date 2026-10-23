const hits = new Map<string, number[]>();

export function rateLimit(req: Request, limit = 20, windowMs = 60_000): boolean {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < windowMs);
  recent.push(now);
  hits.set(ip, recent);
  return recent.length <= limit;
}

export const tooManyRequests = () =>
  Response.json({ error: "Too many requests. Try again in a minute." }, { status: 429 });
