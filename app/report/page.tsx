import { Suspense } from "react";
import type { Metadata } from "next";
import { OwnerReport } from "@/components/report/OwnerReport";
import { requireUser } from "@/lib/requireUser";

export const metadata: Metadata = { title: "Location report · Site Scout" };

export default async function ReportPage() {
  await requireUser();
  return (
    <Suspense fallback={<div className="min-h-dvh bg-white" />}>
      <OwnerReport />
    </Suspense>
  );
}
