import { NextRequest } from "next/server";
import { CustomUnavailableError, getCustomFeatures, getHexFeatures, resolveBusiness } from "@/lib/hexData";
import { loadOfflineFeatures, mockHexFeatures } from "@/lib/mock";
import { readCustomParams } from "@/lib/validate";
import type { BusinessTypeKey } from "@/lib/businessTypes";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams;
  const rawType = params.get("type");

  if (rawType === "custom") {
    try {
      const business = await resolveBusiness("custom", readCustomParams(params));
      if (!business?.custom) return Response.json({ error: "Invalid custom business" }, { status: 400 });
      const hexes = await getCustomFeatures(business.custom.categories);
      return Response.json(
        { type: "custom", hexes, source: "live" },
        { headers: { "Cache-Control": "public, s-maxage=3600" } }
      );
    } catch (err) {
      console.error("[api/hexes] custom failed", err);
      return Response.json({ error: new CustomUnavailableError().message }, { status: 503 });
    }
  }

  const business = await resolveBusiness(rawType, null);
  if (!business) return Response.json({ error: "Unknown type" }, { status: 400 });
  const type = business.type as BusinessTypeKey;

  if (process.env.MOCK_MODE === "true") {
    return Response.json({ type, hexes: loadOfflineFeatures(type) ?? mockHexFeatures(type), source: "mock" });
  }
  try {
    const hexes = await getHexFeatures(type);
    return Response.json({ type, hexes, source: "live" }, { headers: { "Cache-Control": "public, s-maxage=3600" } });
  } catch (err) {
    console.error("[api/hexes] live failed, using offline data", err);
    const offline = loadOfflineFeatures(type);
    if (offline) return Response.json({ type, hexes: offline, source: "offline" });
    return Response.json({ error: "Could not load hexes" }, { status: 500 });
  }
}
