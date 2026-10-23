import { neon } from "@neondatabase/serverless";

let client: ReturnType<typeof neon> | null = null;

/** Returns null when DATABASE_URL isn't set, so the app runs without Postgres. */
export function getSql() {
  if (!process.env.DATABASE_URL) return null;
  client ??= neon(process.env.DATABASE_URL);
  return client;
}
