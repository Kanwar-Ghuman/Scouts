import { getCached, setCached } from "@/lib/aiCache";
import { businessKey, businessLabel } from "@/lib/business";
import { CustomUnavailableError, getScoredPair, resolveBusiness } from "@/lib/hexData";
import { complete } from "@/lib/llm";
import { mockCompare } from "@/lib/mock";
import { modelKey, pickWinner, sanitizeWeights } from "@/lib/model";
import { buildComparePrompt, fallbackCompare } from "@/lib/prompts";
import { rateLimit, tooManyRequests } from "@/lib/rateLimit";
import { badRequest, isH3, readJson } from "@/lib/validate";
import type { Business, CompareResponse } from "@/types";

export const runtime = "nodejs";
export const maxDuration = 30;

const reply = (winner: string, explanation: string, cached: boolean) =>
  Response.json({ winner, explanation, cached } satisfies CompareResponse);

export async function POST(req: Request) {
  const body = await readJson(req);
  if (!body) return badRequest("Body must be JSON");
  const { a, b } = body;
  if (!isH3(a) || !isH3(b)) return badRequest("a and b must be valid hex ids");
  if (a === b) return badRequest("Pick two different spots");

  let business: Business | null;
  let pair: Awaited<ReturnType<typeof getScoredPair>>;
  try {
    business = await resolveBusiness(body.type, body.custom);
    if (!business) return badRequest(body.type === "custom" ? "Invalid custom business" : "Unknown type");
    pair = await getScoredPair(business, sanitizeWeights(body.weights, business.type), [a, b]);
  } catch (err) {
    if (err instanceof CustomUnavailableError) return badRequest(err.message, 503);
    throw err;
  }
  const w = sanitizeWeights(body.weights, business.type);
  const { scored, byH3, offline } = pair;
  const A = byH3.get(a);
  const B = byH3.get(b);
  if (!A || !B) return badRequest("Not found", 404);

  const winner = pickWinner(A, B);
  const loser = winner === A ? B : A;
  const winnerLabel = winner.h3 === a ? "A" : "B";

  if (process.env.MOCK_MODE === "true") {
    await new Promise((r) => setTimeout(r, 600));
    return reply(winner.h3, mockCompare(winner, loser, winnerLabel), false);
  }

  const key = `v1:compare:${businessKey(business)}:${a}:${b}:${modelKey(w)}`;
  const cached = await getCached(key);
  if (cached) return reply(winner.h3, cached, true);
  if (!rateLimit(req)) return tooManyRequests();
  if (offline) return reply(winner.h3, fallbackCompare(winner, loser, winnerLabel), false);

  try {
    const explanation = await complete(buildComparePrompt(businessLabel(business), A, B, winnerLabel, scored.length, w));
    await setCached(key, explanation);
    return reply(winner.h3, explanation, false);
  } catch (err) {
    console.error("[api/compare] LLM failed, using fallback", err);
    return reply(winner.h3, fallbackCompare(winner, loser, winnerLabel), false);
  }
}
