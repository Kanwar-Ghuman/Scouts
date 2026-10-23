import { getCached, setCached } from "@/lib/aiCache";
import { isBusinessType } from "@/lib/businessTypes";
import { getHexDetail, getScoredPair } from "@/lib/hexData";
import { complete } from "@/lib/llm";
import { mockVerdict } from "@/lib/mock";
import { modelKey, sanitizeWeights } from "@/lib/model";
import { buildVerdictPrompt, fallbackVerdict } from "@/lib/prompts";
import { rateLimit, tooManyRequests } from "@/lib/rateLimit";
import { badRequest, isH3, readJson } from "@/lib/validate";
import type { VerdictResponse } from "@/types";

export const runtime = "nodejs";
export const maxDuration = 30;

const reply = (verdict: string, cached: boolean) => Response.json({ verdict, cached } satisfies VerdictResponse);

export async function POST(req: Request) {
  const body = await readJson(req);
  if (!body) return badRequest("Body must be JSON");
  const { h3, type } = body;
  if (!isH3(h3)) return badRequest("h3 must be a valid hex id");
  if (!isBusinessType(type)) return badRequest("Unknown type");
  const w = sanitizeWeights(body.weights, type);

  if (process.env.MOCK_MODE === "true") {
    const { scored, byH3 } = await getScoredPair(type, w, [h3]);
    const hex = byH3.get(h3);
    if (!hex) return badRequest("Not found", 404);
    await new Promise((r) => setTimeout(r, 600));
    return reply(mockVerdict(type, hex, scored.length), false);
  }

  const key = `v1:verdict:${type}:${h3}:${modelKey(w)}`;
  const cached = await getCached(key);
  if (cached) return reply(cached, true);
  if (!rateLimit(req)) return tooManyRequests();

  const { scored, byH3, offline } = await getScoredPair(type, w, [h3]);
  const hex = byH3.get(h3);
  if (!hex) return badRequest("Not found", 404);
  if (offline) return reply(fallbackVerdict(hex, scored.length), false);

  try {
    const detail = await getHexDetail(h3, type);
    if (!detail) return badRequest("Not found", 404);
    const verdict = await complete(buildVerdictPrompt(type, hex, scored.length, w, detail));
    await setCached(key, verdict);
    return reply(verdict, false);
  } catch (err) {
    console.error("[api/verdict] LLM failed, using fallback", err);
    return reply(fallbackVerdict(hex, scored.length), false);
  }
}
