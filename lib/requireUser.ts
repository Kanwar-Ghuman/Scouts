import { redirect } from "next/navigation";
import { getCurrentUser, type CurrentUser } from "@/lib/auth";

/** Every app page needs a signed-in, onboarded user. Without a database nobody can sign in. */
export async function requireUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login?mode=signup");
  if (!user.onboardedAt) redirect("/onboarding");
  return user;
}
