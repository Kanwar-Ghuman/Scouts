import { NextRequest } from "next/server";
import type { BusinessTypeKey } from "@/lib/businessTypes";
import { CustomUnavailableError, getCustomHexDetail, getHexDetail, resolveBusiness } from "@/lib/hexData";
import { breakdownFromCounts, loadOfflineFeatures, mockHexDetail } from "@/lib/mock";
import { isH3, readCustomParams } from "@/lib/validate";
import type { HexDetailResponse } from "@/types";

export const runtime = "nodejs";

const customUnavailable = () => Response.json({ error: new CustomUnavailableError().message }, { status: 503 });

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const search = req.nextUrl.searchParams;
  const rawType = search.get("type");
  if (!isH3(id)) return Response.json({ error: "Invalid hex id" }, { status: 400 });

  let detail: HexDetailResponse | null;
  if (rawType === "custom") {
    try {
      const business = await resolveBusiness("custom", readCustomParams(search));
      if (!business?.custom) return Response.json({ error: "Invalid custom business" }, { status: 400 });
      detail = await getCustomHexDetail(id, business.custom);
    } catch (err) {
      console.error("[api/hex] custom failed", err);
      return customUnavailable();
    }
  } else {
    const business = await resolveBusiness(rawType, null);
    if (!business) return Response.json({ error: "Unknown type" }, { status: 400 });
    const type = business.type as BusinessTypeKey;
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
  }
  if (!detail) return Response.json({ error: "Not found" }, { status: 404 });
  return Response.json(detail);
}
