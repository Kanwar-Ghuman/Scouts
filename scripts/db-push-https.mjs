// Applies Prisma migration SQL over Neon's HTTPS driver, for networks that block port 5432.
// Usage: node scripts/db-push-https.mjs
// Migrations are idempotent, so `npx prisma migrate deploy` still works later from an open network.
import fs from "node:fs";
import path from "node:path";
import { config } from "dotenv";
import { neon } from "@neondatabase/serverless";

config({ path: ".env.local", quiet: true });
if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is not set in .env.local");

const sql = neon(process.env.DATABASE_URL);
const dir = path.join(process.cwd(), "prisma", "migrations");

for (const name of fs.readdirSync(dir).filter((d) => fs.statSync(path.join(dir, d)).isDirectory()).sort()) {
  const text = fs.readFileSync(path.join(dir, name, "migration.sql"), "utf8");
  for (const stmt of text.split(/;\s*$/m).map((s) => s.trim()).filter((s) => s.replace(/--.*$/gm, "").trim())) {
    await sql.query(stmt);
  }
  console.log("applied", name);
}

const rows = await sql.query("SELECT count(*)::int AS n FROM ai_cache");
console.log("ai_cache rows:", rows[0].n);
