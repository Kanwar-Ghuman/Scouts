import { getCached, setCached } from "@/lib/aiCache";
import { isBusinessType } from "@/lib/businessTypes";
import { getScoredPair } from "@/lib/hexData";
import { complete } from "@/lib/llm";
import { mockCompare } from "@/lib/mock";
import { modelKey, pickWinner, sanitizeWeights } from "@/lib/model";
import { buildComparePrompt, fallbackCompare } from "@/lib/prompts";
import { rateLimit, tooManyRequests } from "@/lib/rateLimit";
import { badRequest, isH3, readJson } from "@/lib/validate";
import type { CompareResponse } from "@/types";

export const runtime = "nodejs";
export const maxDuration = 30;

const reply = (winner: string, explanation: string, cached: boolean) =>
  Response.json({ winner, explanation, cached } satisfies CompareResponse);

export async function POST(req: Request) {
  const body = await readJson(req);
  if (!body) return badRequest("Body must be JSON");
  const { a, b, type } = body;
  if (!isH3(a) || !isH3(b)) return badRequest("a and b must be valid hex ids");
  if (a === b) return badRequest("Pick two different spots");
  if (!isBusinessType(type)) return badRequest("Unknown type");
  const w = sanitizeWeights(body.weights, type);

  const { scored, byH3, offline } = await getScoredPair(type, w, [a, b]);
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

  const key = `v1:compare:${type}:${a}:${b}:${modelKey(w)}`;
  const cached = await getCached(key);
  if (cached) return reply(winner.h3, cached, true);
  if (!rateLimit(req)) return tooManyRequests();
  if (offline) return reply(winner.h3, fallbackCompare(winner, loser, winnerLabel), false);

  try {
    const explanation = await complete(buildComparePrompt(type, A, B, winnerLabel, scored.length, w));
    await setCached(key, explanation);
    return reply(winner.h3, explanation, false);
  } catch (err) {
    console.error("[api/compare] LLM failed, using fallback", err);
    return reply(winner.h3, fallbackCompare(winner, loser, winnerLabel), false);
  }
}
