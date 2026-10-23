import { getSql } from "@/lib/db";

export async function getCached(key: string): Promise<string | null> {
  const sql = getSql();
  if (!sql) return null;
  try {
    const rows = (await sql`SELECT text FROM ai_cache WHERE cache_key = ${key} LIMIT 1`) as { text: string }[];
    return rows[0]?.text ?? null;
  } catch (err) {
    console.error("[aiCache] read failed", err);
    return null;
  }
}

export async function setCached(key: string, text: string): Promise<void> {
  const sql = getSql();
  if (!sql) return;
  try {
    await sql`INSERT INTO ai_cache (cache_key, text) VALUES (${key}, ${text}) ON CONFLICT (cache_key) DO NOTHING`;
  } catch (err) {
    console.error("[aiCache] write failed", err);
  }
}
