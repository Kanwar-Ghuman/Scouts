import { NextRequest } from "next/server";
import { searchPlaces } from "@/lib/hexData";
import { mockSearch } from "@/lib/mock";
import type { SearchResponse } from "@/types";

export const runtime = "nodejs";

const HEADERS = { "Cache-Control": "public, s-maxage=600" };

export async function GET(req: NextRequest) {
  const q = (req.nextUrl.searchParams.get("q") ?? "").trim();
  if (q.length < 2 || q.length > 60) return Response.json({ results: [] } satisfies SearchResponse);

  if (process.env.MOCK_MODE === "true") {
    return Response.json({ results: mockSearch(q) } satisfies SearchResponse, { headers: HEADERS });
  }
  try {
    return Response.json({ results: await searchPlaces(q) } satisfies SearchResponse, { headers: HEADERS });
  } catch (err) {
    console.error("[api/search] live failed", err);
    return Response.json({ results: [] } satisfies SearchResponse);
  }
}
