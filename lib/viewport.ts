import { FlyToInterpolator, WebMercatorViewport } from "@deck.gl/core";
import type { MapViewState } from "@/components/map/HexMap";

export const DEFAULT_VIEW: MapViewState = { latitude: 34.06, longitude: -117.79, zoom: 11.6, pitch: 0, bearing: 0 };

const isMobile = () => typeof window !== "undefined" && window.innerWidth < 768;

export function flyTo(v: MapViewState, lat: number, lng: number, zoom = 13.5): MapViewState {
  return {
    ...v,
    latitude: lat,
    longitude: isMobile() ? lng : lng + 0.01,
    zoom,
    transitionDuration: 800,
    transitionInterpolator: new FlyToInterpolator(),
  };
}

export function flyHome(v: MapViewState): MapViewState {
  return { ...v, ...DEFAULT_VIEW, transitionDuration: 800, transitionInterpolator: new FlyToInterpolator() };
}

/** Fits two points in the space left between the side panels. */
export function fitPoints(v: MapViewState, a: [number, number], b: [number, number]): MapViewState {
  const width = window.innerWidth;
  const height = window.innerHeight;
  const mobile = isMobile();
  const padding = mobile
    ? { top: 160, bottom: height * 0.6 + 40, left: 40, right: 40 }
    : { top: 120, bottom: 120, left: 420, right: 480 };
  const bounds: [[number, number], [number, number]] = [
    [Math.min(a[1], b[1]), Math.min(a[0], b[0])],
    [Math.max(a[1], b[1]), Math.max(a[0], b[0])],
  ];
  try {
    const { latitude, longitude, zoom } = new WebMercatorViewport({ width, height }).fitBounds(bounds, { padding, maxZoom: 14 });
    return { ...v, latitude, longitude, zoom, transitionDuration: 800, transitionInterpolator: new FlyToInterpolator() };
  } catch {
    return flyTo(v, (a[0] + b[0]) / 2, (a[1] + b[1]) / 2, 12.5);
  }
}
