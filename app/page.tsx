import { Suspense } from "react";
import SiteScout from "@/components/SiteScout";

export default function Home() {
  return (
    <Suspense fallback={<div className="h-dvh w-full bg-zinc-100" />}>
      <SiteScout />
    </Suspense>
  );
}
