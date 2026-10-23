import { BUSINESS_TYPES, type BusinessTypeKey } from "@/lib/businessTypes";
import { DRIVER_GROUPS, scoreLabel, weightWord } from "@/lib/model";
import type { HexDetailResponse, ModelWeights, ScoredHex } from "@/types";

function priorities(w: ModelWeights) {
  return {
    ...Object.fromEntries(DRIVER_GROUPS.map((g) => [g.label.toLowerCase(), weightWord(w[g.key])])),
    avoidingCompetition: weightWord(w.competition),
  };
}

function spotData(h: ScoredHex, total: number) {
  return {
    score: h.score,
    scoreMeaning: `better than ${h.score}% of ${total} nearby areas`,
    rank: h.rank,
    students: h.students, workers: h.workers, residents: h.residents, shoppers: h.shoppers,
    competitors: h.competitors,
  };
}

const RULES = [
  "- Use ONLY the data below. Do not invent rent, income, foot traffic, population or business names.",
  "- Plain text. No markdown, lists or quotes. Under 75 words.",
];

export function buildVerdictPrompt(
  type: BusinessTypeKey, h: ScoredHex, total: number, w: ModelWeights, detail: HexDetailResponse
): string {
  const label = BUSINESS_TYPES[type].label;
  const data = {
    business: label,
    ownerPriorities: priorities(w),
    spot: spotData(h, total),
    demandSources: detail.driverBreakdown,
    nearestCompetitors: detail.nearestCompetitors.map((c) => ({ name: c.name, meters: c.distanceM })),
  };
  return [
    "A decision model scored an area (about 0.7 sq km) for someone opening a small business.",
    `Explain the model's result for a ${label} to the owner.`,
    "",
    "Rules:",
    ...RULES,
    "- Exactly 3 sentences.",
    `- Sentence 1 starts with exactly "${scoreLabel(h.score)} spot."`,
    "- Sentence 2 explains the main reason, tied to the owner's priorities, citing at least one number.",
    "- Sentence 3 names one risk or one thing to check in person.",
    "",
    "Data:",
    JSON.stringify(data),
  ].join("\n");
}

export function buildComparePrompt(
  type: BusinessTypeKey, a: ScoredHex, b: ScoredHex, winnerLabel: "A" | "B", total: number, w: ModelWeights
): string {
  const label = BUSINESS_TYPES[type].label;
  const data = { business: label, ownerPriorities: priorities(w), spotA: spotData(a, total), spotB: spotData(b, total) };
  return [
    "A decision model compared two areas for someone opening a small business.",
    `The model chose Spot ${winnerLabel}. Do not change or question the choice. Explain it for a ${label}.`,
    "",
    "Rules:",
    ...RULES,
    "- Exactly 3 sentences.",
    `- Sentence 1 starts with exactly "Spot ${winnerLabel}."`,
    "- Sentence 2 states the key tradeoff between the two spots with numbers from both.",
    `- Sentence 3 says when Spot ${winnerLabel === "A" ? "B" : "A"} would be the better choice instead.`,
    "",
    "Data:",
    JSON.stringify(data),
  ].join("\n");
}

export function buildPlanPrompt(text: string): string {
  return [
    "You convert a small business owner's description into settings for a location decision model.",
    "Return ONLY one JSON object. No markdown, no other text.",
    "",
    'Schema: {"type": "boba" | "barber" | "laundromat" | "gym" | "taco", "weights": {"students": number|null, "workers": number|null, "residents": number|null, "shoppers": number|null, "competition": number|null}, "summary": string}',
    "",
    "Rules:",
    "- type: closest match. Coffee, tea and cafes are boba. Hair, nails and beauty are barber. Restaurants and food are taco. Fitness and yoga are gym.",
    "- Weights are 0 to 3 in steps of 0.5. 0 = ignore, 1 = low, 2 = medium, 3 = very important.",
    "- students = colleges and schools. workers = offices and hospitals. residents = people living nearby. shoppers = malls and retail.",
    "- competition = how strongly to avoid areas that already have similar businesses.",
    "- Use null for anything the owner does not mention.",
    '- summary: one short sentence starting with "Looking for" that restates what they want.',
    "",
    "Owner's description:",
    JSON.stringify(text),
  ].join("\n");
}

export function fallbackVerdict(h: ScoredHex, total: number): string {
  return `${scoreLabel(h.score)} spot. It ranks #${h.rank} of ${total} nearby areas with ${h.competitors} competitors. Visit at different times of day before deciding.`;
}

export function fallbackCompare(winner: ScoredHex, loser: ScoredHex, winnerLabel: "A" | "B"): string {
  return `Spot ${winnerLabel}. It scores ${winner.score} vs ${loser.score} under your priorities. Visit both before deciding.`;
}
