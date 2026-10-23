import { Suspense } from "react";
import { redirect } from "next/navigation";
import SiteScout from "@/components/SiteScout";
import { getCurrentUser } from "@/lib/auth";
import { getDb } from "@/lib/db";

export default async function Home() {
  // Accounts gate the map, unless the app is running without a database (MOCK_MODE or no DATABASE_URL),
  // so a database outage during a demo can never lock everyone out of the map.
  const accountsOn = process.env.MOCK_MODE !== "true" && getDb() !== null;
  if (accountsOn) {
    const user = await getCurrentUser();
    if (!user) redirect("/login?mode=signup");
    if (!user.onboardedAt) redirect("/onboarding");
  }

  return (
    <Suspense fallback={<div className="h-dvh w-full bg-zinc-100" />}>
      <SiteScout />
    </Suspense>
  );
}
