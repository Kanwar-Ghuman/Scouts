import fs from "node:fs";
import path from "node:path";
import { cellToLatLng, gridDisk, latLngToCell } from "h3-js";
import { BUSINESS_TYPE_KEYS, BUSINESS_TYPES, type BusinessTypeKey } from "@/lib/businessTypes";
import { DRIVER_GROUPS, scoreLabel } from "@/lib/model";
import type { DriverCount, HexDetailResponse, HexFeatures, PlaceResult, ScoredHex } from "@/types";

export const DEMO_CENTER = { lat: 34.06, lng: -117.79 };

const offlineCache = new Map<BusinessTypeKey, HexFeatures[] | null>();

/** Reads the real Snowflake export in data/hexes-<type>.json, or null if it isn't there. */
export function loadOfflineFeatures(type: BusinessTypeKey): HexFeatures[] | null {
  if (offlineCache.has(type)) return offlineCache.get(type)!;
  let rows: HexFeatures[] | null = null;
  try {
    const file = path.join(process.cwd(), "data", `hexes-${type}.json`);
    const json = JSON.parse(fs.readFileSync(file, "utf8")) as Record<string, unknown>[];
    rows = json.map((r) => ({
      h3: String(r.H3),
      competitors: Number(r.COMPETITORS),
      students: Number(r.STUDENTS),
      workers: Number(r.WORKERS),
      residents: Number(r.RESIDENTS),
      shoppers: Number(r.SHOPPERS),
      lat: Number(r.LAT),
      lng: Number(r.LNG),
    }));
  } catch {
    rows = null;
  }
  offlineCache.set(type, rows);
  return rows;
}

export function mockHexFeatures(type: BusinessTypeKey): HexFeatures[] {
  const t = BUSINESS_TYPE_KEYS.indexOf(type);
  const cells = gridDisk(latLngToCell(DEMO_CENTER.lat, DEMO_CENTER.lng, 8), 7);
  return cells.map((h3, i) => {
    const s = (k: number) => Math.abs(Math.sin((i + 1) * (t + 3 + k)));
    const [lat, lng] = cellToLatLng(h3);
    return {
      h3,
      students: Math.round(s(1) * 6),
      workers: Math.round(s(2) * 5),
      residents: Math.round(s(3) * 8),
      shoppers: Math.round(s(4) * 4),
      competitors: Math.round(s(5) * 4),
      lat,
      lng,
    };
  });
}

/** Offline or generated features, whichever is available. */
export function fallbackFeatures(type: BusinessTypeKey): HexFeatures[] {
  return loadOfflineFeatures(type) ?? mockHexFeatures(type);
}

export function breakdownFromCounts(f: HexFeatures): DriverCount[] {
  return DRIVER_GROUPS
    .filter((g) => f[g.key] > 0)
    .map((g) => ({ category: g.key, group: g.key, count: f[g.key] }))
    .sort((a, b) => b.count - a.count);
}

const MOCK_COMPETITOR_NAMES: Record<BusinessTypeKey, string[]> = {
  boba: ["Tea Corner", "Bronco Boba", "Morning Grind Coffee"],
  barber: ["Fresh Fade Barbers", "Studio 9 Salon", "Classic Cuts"],
  laundromat: ["Spin City Laundry", "Clean Spot Laundromat", "Express Dry Clean"],
  gym: ["Iron Works Gym", "Valley Fitness", "Flow Yoga Studio"],
  taco: ["Taqueria El Sol", "Burrito Express", "Taco Shack"],
};

export function mockHexDetail(h3: string, type: BusinessTypeKey): HexDetailResponse | null {
  const features = fallbackFeatures(type).find((f) => f.h3 === h3);
  if (!features) return null;
  const nearestCompetitors = MOCK_COMPETITOR_NAMES[type].map((name, i) => ({
    name,
    category: type === "boba" ? "cafe" : type === "taco" ? "mexican_restaurant" : type,
    lat: features.lat + 0.002 * (i + 1),
    lng: features.lng - 0.0015 * (i + 1),
    distanceM: 250 * (i + 1),
  }));
  return { features, nearestCompetitors, driverBreakdown: breakdownFromCounts(features) };
}

function topGroup(h: ScoredHex): string {
  const best = [...DRIVER_GROUPS].sort((a, b) => h[b.key] - h[a.key])[0];
  return `${h[best.key]} ${best.label.toLowerCase()} sources`;
}

export function mockVerdict(type: BusinessTypeKey, h: ScoredHex, total: number): string {
  const label = BUSINESS_TYPES[type].label.toLowerCase();
  return `${scoreLabel(h.score)} spot. For a ${label}, this area ranks #${h.rank} of ${total} nearby areas, mostly thanks to ${topGroup(h)} against ${h.competitors} competitors. Check parking and walk-in traffic at lunch and in the evening before signing a lease.`;
}

export function mockCompare(winner: ScoredHex, loser: ScoredHex, winnerLabel: "A" | "B"): string {
  const other = winnerLabel === "A" ? "B" : "A";
  return `Spot ${winnerLabel}. It has a demand of ${winner.demand.toFixed(1)} against ${winner.competitors} competitors, while Spot ${other} has ${loser.demand.toFixed(1)} against ${loser.competitors}. Spot ${other} would be the better choice if you care more about the groups it has more of.`;
}

const MOCK_PLACES = [
  { name: "Cal Poly Pomona", category: "college_university", lat: 34.0577, lng: -117.8215 },
  { name: "Pomona College", category: "college_university", lat: 34.0977, lng: -117.7124 },
  { name: "Diamond Bar Center", category: "event_venue", lat: 34.0065, lng: -117.8098 },
  { name: "Claremont Village", category: "shopping_center", lat: 34.0967, lng: -117.7198 },
  { name: "Downtown Pomona", category: "neighborhood", lat: 34.0551, lng: -117.7500 },
];

export function mockSearch(q: string): PlaceResult[] {
  const needle = q.toLowerCase();
  return MOCK_PLACES
    .filter((p) => p.name.toLowerCase().includes(needle))
    .map((p) => ({ ...p, h3: latLngToCell(p.lat, p.lng, 8) }));
}
