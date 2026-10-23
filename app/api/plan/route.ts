import { BUSINESS_TYPES, CUSTOM_CATEGORIES_MAX, CUSTOM_LABEL_MAX, closestPreset, isBusinessType, type BusinessTypeKey } from "@/lib/businessTypes";
import { getCategoryList } from "@/lib/hexData";
import { cleanText, complete } from "@/lib/llm";
import { DEFAULT_WEIGHTS, sanitizeWeights } from "@/lib/model";
import { buildPlanPrompt } from "@/lib/prompts";
import { rateLimit, tooManyRequests } from "@/lib/rateLimit";
import { badRequest, readJson } from "@/lib/validate";
import type { PlanResponse } from "@/types";

export const runtime = "nodejs";
export const maxDuration = 30;

interface LlmPlan {
  type?: unknown;
  label?: unknown;
  competitorCategories?: unknown;
  weights?: Record<string, unknown>;
  summary?: unknown;
}

const defaultSummary = (label: string) => `Looking for a good spot for a ${label.toLowerCase()}.`;

function keywordPlan(text: string): PlanResponse {
  const type = closestPreset(text);
  return { type, weights: DEFAULT_WEIGHTS[type], summary: defaultSummary(BUSINESS_TYPES[type].label), fromLLM: false };
}

/** Drop null and undefined before sanitizing (Number(null) is 0), so missing groups keep the defaults. */
function givenWeights(json: LlmPlan) {
  return Object.fromEntries(Object.entries(json.weights ?? {}).filter(([, v]) => v !== null && v !== undefined));
}

/** Keeps only categories that exist on the map, deduped, at most 6. */
function validCategories(raw: unknown, known: Set<string>): string[] {
  if (!Array.isArray(raw)) return [];
  const cats = raw.filter((c): c is string => typeof c === "string").map((c) => c.trim().toLowerCase());
  return [...new Set(cats.filter((c) => known.has(c)))].slice(0, CUSTOM_CATEGORIES_MAX);
}

function presetPlan(type: BusinessTypeKey, json: LlmPlan): PlanResponse {
  const summary = cleanText(json.summary).slice(0, 160) || defaultSummary(BUSINESS_TYPES[type].label);
  return { type, weights: sanitizeWeights(givenWeights(json), type), summary, fromLLM: true };
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

  let known: Set<string> | null = null;
  let list: string[] | null = null;
  try {
    ({ list, set: known } = await getCategoryList());
  } catch (err) {
    console.error("[api/plan] category list unavailable, presets only", err);
  }

  try {
    const reply = await complete(buildPlanPrompt(text, list), 12000);
    const match = reply.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("No JSON in reply");
    const json = JSON.parse(match[0]) as LlmPlan;

    if (isBusinessType(json.type)) return Response.json(presetPlan(json.type, json));

    if (json.type === "custom" && known) {
      const categories = validCategories(json.competitorCategories, known);
      if (categories.length) {
        const label = cleanText(json.label).slice(0, CUSTOM_LABEL_MAX).trim() || text.slice(0, CUSTOM_LABEL_MAX).trim();
        const summary = cleanText(json.summary).slice(0, 160) || defaultSummary(label);
        return Response.json({
          type: "custom",
          custom: { label, categories },
          weights: sanitizeWeights(givenWeights(json), "custom"),
          summary,
          fromLLM: true,
        } satisfies PlanResponse);
      }
    }
    // No usable custom categories: use the closest preset, keeping the LLM's weights.
    return Response.json(presetPlan(closestPreset(`${text} ${cleanText(json.label)}`), json));
  } catch (err) {
    console.error("[api/plan] LLM failed, using keyword fallback", err);
    return Response.json(keywordPlan(text));
  }
}
