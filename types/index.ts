import type { BusinessTypeKey } from "@/lib/businessTypes";
export type { BusinessTypeKey };

export type DriverGroup = "students" | "workers" | "residents" | "shoppers";

export interface HexFeatures {
  h3: string;
  competitors: number;
  students: number;
  workers: number;
  residents: number;
  shoppers: number;
  lat: number;
  lng: number;
}

export interface ModelWeights {
  students: number;
  workers: number;
  residents: number;
  shoppers: number;
  competition: number;
}

export interface ScoredHex extends HexFeatures {
  demand: number;
  raw: number;
  score: number;   // 0-100 percentile
  rank: number;    // 1 = best
}

export interface Competitor { name: string; category: string; lat: number; lng: number; distanceM: number; }
export interface DriverCount { category: string; group: DriverGroup; count: number; }

export interface HexDetailResponse {
  features: HexFeatures;
  nearestCompetitors: Competitor[];   // up to 5
  driverBreakdown: DriverCount[];     // up to 8
}

export type DataSource = "live" | "offline" | "mock";
export interface HexesResponse { type: BusinessTypeKey; hexes: HexFeatures[]; source: DataSource; }

export interface PlaceResult { name: string; category: string; lat: number; lng: number; h3: string; }
export interface SearchResponse { results: PlaceResult[]; }

export interface VerdictRequest { h3: string; type: BusinessTypeKey; weights: ModelWeights; }
export interface VerdictResponse { verdict: string; cached: boolean; }

export interface CompareRequest { a: string; b: string; type: BusinessTypeKey; weights: ModelWeights; }
export interface CompareResponse { winner: string; explanation: string; cached: boolean; }

export interface PlanRequest { text: string; }
export interface PlanResponse {
  type: BusinessTypeKey;
  weights: ModelWeights;
  summary: string;      // one sentence: what the LLM understood
  fromLLM: boolean;     // false when the keyword fallback was used
}
