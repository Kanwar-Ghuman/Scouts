import { createHash, randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { cache } from "react";
import { getDb } from "@/lib/db";

export const SESSION_COOKIE = "sitescout_session";
const SESSION_DAYS = 30;
const KEY_LENGTH = 64;

function scryptAsync(password: string, salt: Buffer, keylen: number): Promise<Buffer> {
  return new Promise((resolve, reject) =>
    scrypt(password, salt, keylen, (err, key) => (err ? reject(err) : resolve(key)))
  );
}

/** Stored as "scrypt$<salt>$<hash>" (base64). Node's built-in scrypt, so no extra dependency. */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const key = await scryptAsync(password, salt, KEY_LENGTH);
  return `scrypt$${salt.toString("base64")}$${key.toString("base64")}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [alg, salt, hash] = stored.split("$");
  if (alg !== "scrypt" || !salt || !hash) return false;
  const expected = Buffer.from(hash, "base64");
  const key = await scryptAsync(password, Buffer.from(salt, "base64"), expected.length);
  return key.length === expected.length && timingSafeEqual(key, expected);
}

/** Used when no account matches, so a wrong email takes as long as a wrong password. */
const DUMMY_HASH = hashPassword("not-a-real-password");
export async function burnPasswordCheck(password: string): Promise<void> {
  await verifyPassword(password, await DUMMY_HASH);
}

const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");

/** Creates a DB session and sets the cookie. Call only from a Server Action or Route Handler. */
export async function createSession(userId: string): Promise<void> {
  const db = getDb();
  if (!db) throw new Error("DATABASE_URL is not set");
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);
  await db.session.create({ data: { id: hashToken(token), userId, expiresAt } });
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

/** The signed-in user (without the password hash), or null. Cached per request. */
export const getCurrentUser = cache(async () => {
  const db = getDb();
  if (!db) return null;
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  try {
    const session = await db.session.findUnique({ where: { id: hashToken(token) }, include: { user: true } });
    if (!session || session.expiresAt < new Date()) return null;
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { passwordHash, ...user } = session.user;
    return user;
  } catch (err) {
    console.error("[auth] session lookup failed", err);
    return null;
  }
});

export type CurrentUser = NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>;

/** Deletes the DB session and the cookie. Call only from a Server Action or Route Handler. */
export async function destroySession(): Promise<void> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  store.delete(SESSION_COOKIE);
  const db = getDb();
  if (!token || !db) return;
  try {
    await db.session.deleteMany({ where: { id: hashToken(token) } });
  } catch (err) {
    console.error("[auth] session delete failed", err);
  }
}
