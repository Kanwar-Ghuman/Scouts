import { NextRequest } from "next/server";
import { isBusinessType } from "@/lib/businessTypes";
import { getHexFeatures } from "@/lib/hexData";
import { loadOfflineFeatures, mockHexFeatures } from "@/lib/mock";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const type = req.nextUrl.searchParams.get("type");
  if (!isBusinessType(type)) return Response.json({ error: "Unknown type" }, { status: 400 });

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
