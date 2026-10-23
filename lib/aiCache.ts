import { getDb } from "@/lib/db";

export async function getCached(key: string): Promise<string | null> {
  const db = getDb();
  if (!db) return null;
  try {
    const row = await db.aiCache.findUnique({ where: { cacheKey: key }, select: { text: true } });
    return row?.text ?? null;
  } catch (err) {
    console.error("[aiCache] read failed", err);
    return null;
  }
}

export async function setCached(key: string, text: string): Promise<void> {
  const db = getDb();
  if (!db) return;
  try {
    await db.aiCache.createMany({ data: [{ cacheKey: key, text }], skipDuplicates: true });
  } catch (err) {
    console.error("[aiCache] write failed", err);
  }
}
