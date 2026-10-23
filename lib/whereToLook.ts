import type { DriverGroup, DriverPoint, ModelWeights } from "@/types";

export interface LookSpot {
  lat: number;
  lng: number;
  /** false when there were no weighted demand places, so the spot is just the hex center */
  fromDemand: boolean;
  /** demand groups that pulled the pin, largest first */
  groups: DriverGroup[];
}

/**
 * Where to start looking inside a hex: the center of its demand places, weighted the same way
 * the model weights them. Because a hexagon is convex, this point always stays inside the hex.
 */
export function demandCenter(hex: { lat: number; lng: number }, points: DriverPoint[] | undefined, w: ModelWeights): LookSpot {
  let total = 0;
  let lat = 0;
  let lng = 0;
  const pull = new Map<DriverGroup, number>();
  for (const p of points ?? []) {
    const k = w[p.group];
    if (!(k > 0)) continue;
    total += k;
    lat += k * p.lat;
    lng += k * p.lng;
    pull.set(p.group, (pull.get(p.group) ?? 0) + k);
  }
  if (total === 0) return { lat: hex.lat, lng: hex.lng, fromDemand: false, groups: [] };
  const groups = [...pull.entries()].sort((a, b) => b[1] - a[1]).map(([g]) => g);
  return { lat: lat / total, lng: lng / total, fromDemand: true, groups };
}

const fmt = (n: number) => n.toFixed(5);

/** City centers in the 12 km study area, used only to pick which city's listings to open. */
const CITIES: { name: string; slug: string; lat: number; lng: number }[] = [
  { name: "Pomona", slug: "pomona-ca", lat: 34.0551, lng: -117.75 },
  { name: "Pomona", slug: "pomona-ca", lat: 34.0577, lng: -117.8214 }, // Cal Poly Pomona campus (in Pomona, nearer Diamond Bar's center)
  { name: "Claremont", slug: "claremont-ca", lat: 34.0967, lng: -117.7198 },
  { name: "La Verne", slug: "la-verne-ca", lat: 34.1008, lng: -117.7678 },
  { name: "San Dimas", slug: "san-dimas-ca", lat: 34.1067, lng: -117.8067 },
  { name: "Walnut", slug: "walnut-ca", lat: 34.0203, lng: -117.8654 },
  { name: "Diamond Bar", slug: "diamond-bar-ca", lat: 34.0286, lng: -117.8103 },
  { name: "Chino", slug: "chino-ca", lat: 34.0122, lng: -117.6889 },
  { name: "Chino Hills", slug: "chino-hills-ca", lat: 33.9898, lng: -117.7326 },
  { name: "Montclair", slug: "montclair-ca", lat: 34.0775, lng: -117.6898 },
  { name: "Upland", slug: "upland-ca", lat: 34.0975, lng: -117.6484 },
  { name: "Covina", slug: "covina-ca", lat: 34.09, lng: -117.8903 },
  { name: "West Covina", slug: "west-covina-ca", lat: 34.0686, lng: -117.939 },
  { name: "Glendora", slug: "glendora-ca", lat: 34.1361, lng: -117.8653 },
  { name: "Azusa", slug: "azusa-ca", lat: 34.1336, lng: -117.9076 },
];

/** The city whose center is closest to the spot (an approximation near city borders). */
export function nearestCity(lat: number, lng: number) {
  const kx = Math.cos((lat * Math.PI) / 180); // shrink longitude degrees at this latitude
  let best = CITIES[0];
  let bestD = Infinity;
  for (const c of CITIES) {
    const d = (c.lat - lat) ** 2 + ((c.lng - lng) * kx) ** 2;
    if (d < bestD) [best, bestD] = [c, d];
  }
  return best;
}

/** Real retail listings for lease on LoopNet in that city (every business type here needs retail space). LoopNet's search can't target an exact point. */
export const loopnetUrl = (citySlug: string) =>
  `https://www.loopnet.com/search/retail-space/${citySlug}/for-lease/`;

/** Google Maps search for commercial real estate brokers around the spot. */
export const brokersUrl = (lat: number, lng: number) =>
  `https://www.google.com/maps/search/commercial+real+estate/@${fmt(lat)},${fmt(lng)},16z`;

/** A plain Google Maps pin at the spot. */
export const pinUrl = (lat: number, lng: number) =>
  `https://www.google.com/maps/search/?api=1&query=${fmt(lat)},${fmt(lng)}`;
