type RGB = [number, number, number];

const STOPS: [number, RGB][] = [
  [0, [255, 255, 204]],
  [50, [120, 198, 121]],
  [100, [0, 104, 55]],
];

export function scoreToRgb(score: number): RGB {
  const s = Math.max(0, Math.min(100, score));
  const i = s <= 50 ? 0 : 1;
  const [s0, c0] = STOPS[i];
  const [s1, c1] = STOPS[i + 1];
  const t = (s - s0) / (s1 - s0);
  return c0.map((v, k) => Math.round(v + (c1[k] - v) * t)) as RGB;
}

export const scoreToColor = (score: number, alpha = 255): [number, number, number, number] => [...scoreToRgb(score), alpha];
export const scoreToCss = (score: number) => `rgb(${scoreToRgb(score).join(" ")})`;
export const scoreTextColor = (score: number) => (score >= 55 ? "#ffffff" : "#18181b");

export const SPOT_COLORS = { A: [79, 70, 229] as RGB, B: [245, 158, 11] as RGB };

export const SCORE_GRADIENT_CSS = `linear-gradient(to right, ${scoreToCss(0)}, ${scoreToCss(50)}, ${scoreToCss(100)})`;

/** Contribution bar colors per driver group (emerald + zinc shades only). */
export const GROUP_COLORS = {
  students: "#047857",
  workers: "#10b981",
  residents: "#6ee7b7",
  shoppers: "#a1a1aa",
} as const;
