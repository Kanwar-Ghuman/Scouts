import { NextRequest } from "next/server";
import { isBusinessType } from "@/lib/businessTypes";
import { getHexDetail } from "@/lib/hexData";
import { breakdownFromCounts, loadOfflineFeatures, mockHexDetail } from "@/lib/mock";
import { isH3 } from "@/lib/validate";
import type { HexDetailResponse } from "@/types";

export const runtime = "nodejs";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const type = req.nextUrl.searchParams.get("type");
  if (!isBusinessType(type)) return Response.json({ error: "Unknown type" }, { status: 400 });
  if (!isH3(id)) return Response.json({ error: "Invalid hex id" }, { status: 400 });

  let detail: HexDetailResponse | null;
  if (process.env.MOCK_MODE === "true") {
    detail = mockHexDetail(id, type);
  } else {
    try {
      detail = await getHexDetail(id, type);
    } catch (err) {
      console.error("[api/hex] live failed, using offline data", err);
      const features = loadOfflineFeatures(type)?.find((f) => f.h3 === id);
      detail = features ? { features, nearestCompetitors: [], driverBreakdown: breakdownFromCounts(features) } : null;
    }
  }
  if (!detail) return Response.json({ error: "Not found" }, { status: 404 });
  return Response.json(detail);
}
