import { BUSINESS_TYPES, isBusinessType, type BusinessTypeKey } from "@/lib/businessTypes";
import { cleanText, complete } from "@/lib/llm";
import { DEFAULT_WEIGHTS, sanitizeWeights } from "@/lib/model";
import { buildPlanPrompt } from "@/lib/prompts";
import { rateLimit, tooManyRequests } from "@/lib/rateLimit";
import { badRequest, readJson } from "@/lib/validate";
import type { PlanResponse } from "@/types";

export const runtime = "nodejs";
export const maxDuration = 30;

const KEYWORDS: [BusinessTypeKey, RegExp][] = [
  ["boba", /boba|tea|coffee|cafe|matcha/i],
  ["barber", /barber|hair|salon|beauty|nail/i],
  ["laundromat", /laundr|wash|dry ?clean/i],
  ["gym", /gym|fitness|yoga|workout|pilates/i],
  ["taco", /taco|food|restaurant|burrito|eat|grill/i],
];
const keywordType = (text: string): BusinessTypeKey =>
  KEYWORDS.find(([, re]) => re.test(text))?.[0] ?? "boba";

const defaultSummary = (type: BusinessTypeKey) => `Looking for a good spot for a ${BUSINESS_TYPES[type].label.toLowerCase()}.`;

function keywordPlan(text: string): PlanResponse {
  const type = keywordType(text);
  return { type, weights: DEFAULT_WEIGHTS[type], summary: defaultSummary(type), fromLLM: false };
}

export async function POST(req: Request) {
  const body = await readJson(req);
  const text = typeof body?.text === "string" ? body.text.trim() : "";
  if (text.length < 3 || text.length > 400) return badRequest("Describe your business in 3 to 400 characters");

  if (process.env.MOCK_MODE === "true") {
    await new Promise((r) => setTimeout(r, 500));
    return Response.json(keywordPlan(text));
  }
  if (!rateLimit(req)) return tooManyRequests();

  try {
    const reply = await complete(buildPlanPrompt(text), 12000);
    const match = reply.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("No JSON in reply");
    const json = JSON.parse(match[0]) as { type?: unknown; weights?: Record<string, unknown>; summary?: unknown };
    const type = isBusinessType(json.type) ? json.type : keywordType(text);
    const given = Object.fromEntries(
      Object.entries(json.weights ?? {}).filter(([, v]) => v !== null && v !== undefined)
    );
    const weights = sanitizeWeights(given, type);
    const summary = cleanText(json.summary).slice(0, 160) || defaultSummary(type);
    return Response.json({ type, weights, summary, fromLLM: true } satisfies PlanResponse);
  } catch (err) {
    console.error("[api/plan] LLM failed, using keyword fallback", err);
    return Response.json(keywordPlan(text));
  }
}
