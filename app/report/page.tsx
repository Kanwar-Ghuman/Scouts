import { Suspense } from "react";
import type { Metadata } from "next";
import { OwnerReport } from "@/components/report/OwnerReport";

export const metadata: Metadata = { title: "Location report · Site Scout" };

export default function ReportPage() {
  return (
    <Suspense fallback={<div className="min-h-dvh bg-white" />}>
      <OwnerReport />
    </Suspense>
  );
}
