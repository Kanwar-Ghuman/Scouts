import type { BusinessTypeKey } from "@/lib/businessTypes";
import { fallbackFeatures, loadOfflineFeatures } from "@/lib/mock";
import { scoreAll } from "@/lib/model";
import { COMPETITORS_SQL, DRIVERS_SQL, HEX_SQL, HEXES_SQL, SEARCH_SQL } from "@/lib/queries";
import { query } from "@/lib/snowflake";
import type {
  Competitor, DriverCount, DriverGroup, HexDetailResponse, HexFeatures, ModelWeights, PlaceResult, ScoredHex,
} from "@/types";

type Row = Record<string, unknown>;

const TTL_MS = 10 * 60 * 1000;
const featureCache = new Map<BusinessTypeKey, { at: number; rows: HexFeatures[] }>();

const isMock = () => process.env.MOCK_MODE === "true";

function toFeatures(r: Row): HexFeatures {
  return {
    h3: String(r.H3),
    competitors: Number(r.COMPETITORS),
    students: Number(r.STUDENTS),
    workers: Number(r.WORKERS),
    residents: Number(r.RESIDENTS),
    shoppers: Number(r.SHOPPERS),
    lat: Number(r.LAT),
    lng: Number(r.LNG),
  };
}

function toCompetitor(r: Row): Competitor {
  return {
    name: String(r.NAME),
    category: String(r.CATEGORY),
    lat: Number(r.LAT),
    lng: Number(r.LNG),
    distanceM: Number(r.DISTANCE_M),
  };
}

function toDriverCount(r: Row): DriverCount {
  return { category: String(r.CATEGORY), group: String(r.DRIVER_GROUP) as DriverGroup, count: Number(r.N) };
}

function toPlace(r: Row): PlaceResult {
  return {
    name: String(r.NAME),
    category: String(r.CATEGORY),
    lat: Number(r.LAT),
    lng: Number(r.LNG),
    h3: String(r.H3),
  };
}

export async function getHexFeatures(type: BusinessTypeKey): Promise<HexFeatures[]> {
  const hit = featureCache.get(type);
  if (hit && Date.now() - hit.at < TTL_MS) return hit.rows;
  const rows = (await query<Row>(HEXES_SQL, [type])).map(toFeatures);
  featureCache.set(type, { at: Date.now(), rows });
  return rows;
}

export async function getHexDetail(h3: string, type: BusinessTypeKey): Promise<HexDetailResponse | null> {
  const [hexRows, compRows, driverRows] = await Promise.all([
    query<Row>(HEX_SQL, [type, h3]),
    query<Row>(COMPETITORS_SQL, [h3, type]),
    query<Row>(DRIVERS_SQL, [h3]),
  ]);
  if (!hexRows.length) return null;
  return {
    features: toFeatures(hexRows[0]),
    nearestCompetitors: compRows.map(toCompetitor),
    driverBreakdown: driverRows.map(toDriverCount),
  };
}

export async function searchPlaces(q: string): Promise<PlaceResult[]> {
  return (await query<Row>(SEARCH_SQL, [`%${q}%`, `${q}%`])).map(toPlace);
}

/** Scores every hex server-side. Never trusts client scores. */
export async function getScoredPair(
  type: BusinessTypeKey,
  weights: ModelWeights,
  h3s: string[]
): Promise<{ scored: ScoredHex[]; byH3: Map<string, ScoredHex>; offline: boolean }> {
  let features: HexFeatures[];
  let offline = false;
  if (isMock()) {
    features = fallbackFeatures(type);
  } else {
    try {
      features = await getHexFeatures(type);
    } catch (err) {
      console.error("[hexData] live features failed, using offline data", err);
      features = loadOfflineFeatures(type) ?? [];
      offline = true;
    }
  }
  const scored = scoreAll(features, weights);
  const wanted = new Set(h3s);
  const byH3 = new Map(scored.filter((h) => wanted.has(h.h3)).map((h) => [h.h3, h]));
  return { scored, byH3, offline };
}
