import { PrismaNeon } from "@prisma/adapter-neon";
import { PrismaClient } from "@/lib/generated/prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

/** Returns null when DATABASE_URL isn't set, so the app runs without Postgres. */
export function getDb(): PrismaClient | null {
  if (!process.env.DATABASE_URL) return null;
  globalForPrisma.prisma ??= new PrismaClient({
    adapter: new PrismaNeon({ connectionString: process.env.DATABASE_URL }),
  });
  return globalForPrisma.prisma;
}
