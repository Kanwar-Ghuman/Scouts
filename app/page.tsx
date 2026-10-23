import { Suspense } from "react";
import SiteScout from "@/components/SiteScout";
import { requireUser } from "@/lib/requireUser";

export default async function Home() {
  const user = await requireUser();
  const account = { name: user.name, email: user.email, businessName: user.businessName, businessType: user.businessType };

  return (
    <Suspense fallback={<div className="h-dvh w-full bg-zinc-100" />}>
      <SiteScout account={account} />
    </Suspense>
  );
}
