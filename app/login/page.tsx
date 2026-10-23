import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthForm } from "@/components/auth/AuthForm";
import { AuthShell } from "@/components/auth/AuthShell";
import { getCurrentUser } from "@/lib/auth";

export const metadata: Metadata = { title: "Log in · Site Scout" };

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const user = await getCurrentUser();
  if (user) redirect(user.onboardedAt ? "/" : "/onboarding");
  const { mode } = await searchParams;
  return (
    <AuthShell>
      <AuthForm initialMode={mode === "signup" ? "signup" : "login"} />
    </AuthShell>
  );
}
