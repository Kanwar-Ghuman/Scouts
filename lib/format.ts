export function prettyCategory(category: string): string {
  const s = category.replace(/_/g, " ").trim();
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function formatDistance(meters: number): string {
  if (meters < 160) return "< 0.1 mi";
  return `${(meters / 1609.34).toFixed(1)} mi`;
}

export function plural(n: number, word: string): string {
  return `${n} ${word}${n === 1 ? "" : "s"}`;
}
