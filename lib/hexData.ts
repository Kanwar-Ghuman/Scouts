import { customBusiness, presetBusiness, sortedCategories } from "@/lib/business";
import { isBusinessType, type BusinessTypeKey } from "@/lib/businessTypes";
import { fallbackFeatures, loadOfflineFeatures } from "@/lib/mock";
import { scoreAll } from "@/lib/model";
import {
  CATEGORIES_SQL, COMPETITORS_SQL, CUSTOM_COMPETITORS_SQL, CUSTOM_HEXES_SQL, DRIVER_POINTS_SQL, DRIVERS_SQL, HEX_SQL, HEXES_SQL, SEARCH_SQL,
} from "@/lib/queries";
import { query } from "@/lib/snowflake";
import { validateCustomSpec } from "@/lib/validate";
import type {
  Business, Competitor, CustomSpec, DriverCount, DriverGroup, DriverPoint, HexDetailResponse, HexFeatures, ModelWeights, PlaceResult,
  ScoredHex,
} from "@/types";

/** Custom businesses have no offline export, so they need Snowflake. Routes map this to 503. */
export class CustomUnavailableError extends Error {
  constructor(cause?: unknown) {
    super("Custom businesses need a live connection", { cause });
  }
}

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

function toDriverPoint(r: Row): DriverPoint {
  return { lat: Number(r.LAT), lng: Number(r.LNG), group: String(r.DRIVER_GROUP) as DriverGroup };
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
  const [hexRows, compRows, driverRows, pointRows] = await Promise.all([
    query<Row>(HEX_SQL, [type, h3]),
    query<Row>(COMPETITORS_SQL, [h3, type]),
    query<Row>(DRIVERS_SQL, [h3]),
    query<Row>(DRIVER_POINTS_SQL, [h3]),
  ]);
  if (!hexRows.length) return null;
  return {
    features: toFeatures(hexRows[0]),
    nearestCompetitors: compRows.map(toCompetitor),
    driverBreakdown: driverRows.map(toDriverCount),
    driverPoints: pointRows.map(toDriverPoint),
  };
}

export async function searchPlaces(q: string): Promise<PlaceResult[]> {
  return (await query<Row>(SEARCH_SQL, [`%${q}%`, `${q}%`])).map(toPlace);
}

const CATEGORY_TTL_MS = 60 * 60 * 1000;
let categoryCache: { at: number; list: string[]; set: Set<string> } | null = null;

/** The 300 most common PLACES categories, cached for an hour. */
export async function getCategoryList(): Promise<{ list: string[]; set: Set<string> }> {
  if (categoryCache && Date.now() - categoryCache.at < CATEGORY_TTL_MS) return categoryCache;
  const list = (await query<Row>(CATEGORIES_SQL)).map((r) => String(r.CATEGORY));
  categoryCache = { at: Date.now(), list, set: new Set(list) };
  return categoryCache;
}

const customCache = new Map<string, { at: number; rows: HexFeatures[] }>();

export async function getCustomFeatures(categories: string[]): Promise<HexFeatures[]> {
  const json = JSON.stringify([...categories].sort());
  const hit = customCache.get(json);
  if (hit && Date.now() - hit.at < TTL_MS) return hit.rows;
  const rows = (await query<Row>(CUSTOM_HEXES_SQL, [json])).map(toFeatures);
  customCache.set(json, { at: Date.now(), rows });
  return rows;
}

export async function getCustomHexDetail(h3: string, custom: CustomSpec): Promise<HexDetailResponse | null> {
  const json = JSON.stringify(sortedCategories(custom));
  const [features, compRows, driverRows, pointRows] = await Promise.all([
    getCustomFeatures(custom.categories),
    query<Row>(CUSTOM_COMPETITORS_SQL, [h3, json]),
    query<Row>(DRIVERS_SQL, [h3]),
    query<Row>(DRIVER_POINTS_SQL, [h3]),
  ]);
  const row = features.find((f) => f.h3 === h3);
  if (!row) return null;
  return {
    features: row,
    nearestCompetitors: compRows.map(toCompetitor),
    driverBreakdown: driverRows.map(toDriverCount),
    driverPoints: pointRows.map(toDriverPoint),
  };
}

/**
 * Validates `type` plus an optional custom spec from a request.
 * Presets resolve without I/O. Custom specs are checked against the live category list,
 * so they throw CustomUnavailableError in mock mode or when Snowflake is down.
 */
export async function resolveBusiness(type: unknown, rawCustom: unknown): Promise<Business | null> {
  if (isBusinessType(type)) return presetBusiness(type);
  if (type !== "custom") return null;
  if (isMock()) throw new CustomUnavailableError();
  let known: Set<string>;
  try {
    known = (await getCategoryList()).set;
  } catch (err) {
    throw new CustomUnavailableError(err);
  }
  const spec = validateCustomSpec(rawCustom, known);
  return spec ? customBusiness(spec) : null;
}

export function getBusinessDetail(h3: string, b: Business): Promise<HexDetailResponse | null> {
  return b.type === "custom" && b.custom ? getCustomHexDetail(h3, b.custom) : getHexDetail(h3, b.type as BusinessTypeKey);
}

/** Scores every hex server-side. Never trusts client scores. */
export async function getScoredPair(
  business: Business,
  weights: ModelWeights,
  h3s: string[]
): Promise<{ scored: ScoredHex[]; byH3: Map<string, ScoredHex>; offline: boolean }> {
  let features: HexFeatures[];
  let offline = false;
  if (business.type === "custom" && business.custom) {
    try {
      features = await getCustomFeatures(business.custom.categories);
    } catch (err) {
      throw new CustomUnavailableError(err);
    }
  } else {
    const type = business.type as BusinessTypeKey;
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
  }
  const scored = scoreAll(features, weights);
  const wanted = new Set(h3s);
  const byH3 = new Map(scored.filter((h) => wanted.has(h.h3)).map((h) => [h.h3, h]));
  return { scored, byH3, offline };
}
