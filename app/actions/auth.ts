"use server";

import { redirect } from "next/navigation";
import { burnPasswordCheck, createSession, destroySession, getCurrentUser, hashPassword, verifyPassword } from "@/lib/auth";
import { isBusinessType, type BusinessTypeKey } from "@/lib/businessTypes";
import { getDb } from "@/lib/db";
import { sanitizeWeights } from "@/lib/model";
import { toQuery } from "@/lib/urlState";
import type { ModelWeights } from "@/types";

export type AuthState = { error?: string; fields?: { name?: string; email?: string } } | undefined;
export type OnboardingState = { error?: string } | undefined;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const NO_DB = "Accounts aren't available right now (no database connected).";

const text = (formData: FormData, key: string) => String(formData.get(key) ?? "").trim();

/** Where to send a user after login: the map, opened on their saved business type and priorities. */
function mapUrl(type: string | null, weights: unknown): string {
  if (!isBusinessType(type)) return "/";
  return `/?${toQuery({ type, weights: sanitizeWeights(weights, type), hex: null, a: null, b: null })}`;
}

export async function signup(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const name = text(formData, "name");
  const email = text(formData, "email").toLowerCase();
  const password = String(formData.get("password") ?? "");
  const fields = { name, email };

  if (!name || name.length > 80) return { error: "Enter your name.", fields };
  if (!EMAIL_RE.test(email) || email.length > 254) return { error: "Enter a valid email.", fields };
  if (password.length < 8 || password.length > 200) return { error: "Use at least 8 characters for your password.", fields };

  const db = getDb();
  if (!db) return { error: NO_DB, fields };
  try {
    const existing = await db.user.findUnique({ where: { email }, select: { id: true } });
    if (existing) return { error: "There's already an account with that email. Log in instead.", fields };
    const user = await db.user.create({ data: { name, email, passwordHash: await hashPassword(password) } });
    await createSession(user.id);
  } catch (err) {
    console.error("[auth] signup failed", err);
    return { error: "Couldn't create your account. Try again.", fields };
  }
  redirect("/onboarding");
}

export async function login(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const email = text(formData, "email").toLowerCase();
  const password = String(formData.get("password") ?? "");
  const fields = { email };
  if (!email || !password) return { error: "Enter your email and password.", fields };

  const db = getDb();
  if (!db) return { error: NO_DB, fields };
  let destination: string;
  try {
    const user = await db.user.findUnique({ where: { email } });
    if (!user) {
      await burnPasswordCheck(password);
      return { error: "Wrong email or password.", fields };
    }
    if (!(await verifyPassword(password, user.passwordHash))) return { error: "Wrong email or password.", fields };
    await createSession(user.id);
    destination = user.onboardedAt ? mapUrl(user.businessType, user.weights) : "/onboarding";
  } catch (err) {
    console.error("[auth] login failed", err);
    return { error: "Couldn't log you in. Try again.", fields };
  }
  redirect(destination);
}

export async function completeOnboarding(_prev: OnboardingState, formData: FormData): Promise<OnboardingState> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const businessName = text(formData, "businessName").slice(0, 100) || null;
  const rawType = text(formData, "businessType");
  if (!isBusinessType(rawType)) return { error: "Pick a business type." };
  const type: BusinessTypeKey = rawType;

  let parsed: unknown = null;
  try {
    parsed = JSON.parse(String(formData.get("weights") ?? "null"));
  } catch {
    parsed = null;
  }
  const weights: ModelWeights = sanitizeWeights(parsed, type);

  const db = getDb();
  if (!db) return { error: NO_DB };
  try {
    await db.user.update({
      where: { id: user.id },
      data: { businessName, businessType: type, weights: { ...weights }, onboardedAt: new Date() },
    });
  } catch (err) {
    console.error("[auth] onboarding save failed", err);
    return { error: "Couldn't save your answers. Try again." };
  }
  redirect(mapUrl(type, weights));
}

export async function logout(): Promise<void> {
  await destroySession();
  redirect("/login");
}
