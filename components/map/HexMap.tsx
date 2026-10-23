"use client";

import DeckGL from "@deck.gl/react";
import type { PickingInfo } from "@deck.gl/core";
import { H3HexagonLayer } from "@deck.gl/geo-layers";
import { ScatterplotLayer, TextLayer } from "@deck.gl/layers";
import { setWorkerUrl } from "maplibre-gl";
import Map from "react-map-gl/maplibre";
import "maplibre-gl/dist/maplibre-gl.css";
import { SPOT_COLORS, scoreToColor } from "@/lib/colors";
import { scoreLabel } from "@/lib/model";
import type { Competitor, ScoredHex } from "@/types";

const MAP_STYLE = "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json";

setWorkerUrl("/maplibre-gl-worker.mjs");

export interface MapViewState {
  latitude: number;
  longitude: number;
  zoom: number;
  pitch: number;
  bearing: number;
  [key: string]: unknown;
}

export interface MapLabel {
  text: "A" | "B";
  lat: number;
  lng: number;
}

interface Props {
  hexes: ScoredHex[];
  selectedH3: string | null;
  compareA: string | null;
  compareB: string | null;
  labels: MapLabel[];
  competitors: Competitor[];
  /** "Where to look" pin for the selected hex */
  pin?: { lat: number; lng: number } | null;
  onSelect: (h3: string | null) => void;
  viewState: MapViewState;
  onViewStateChange: (v: MapViewState) => void;
}

const TOOLTIP_STYLE = {
  background: "white",
  color: "#18181b",
  border: "1px solid #e4e4e7",
  borderRadius: "8px",
  boxShadow: "0 4px 12px rgb(0 0 0 / 0.08)",
  padding: "6px 10px",
  fontSize: "12px",
  fontFamily: "var(--font-geist-sans), sans-serif",
  fontVariantNumeric: "tabular-nums",
};

export default function HexMap({
  hexes, selectedH3, compareA, compareB, labels, competitors, pin, onSelect, viewState, onViewStateChange,
}: Props) {
  const focus = [selectedH3, compareA, compareB].filter(Boolean) as string[];
  const focusKey = focus.join();
  const total = hexes.length;

  const outline = (h3: string): [number, number, number, number] =>
    h3 === compareA ? [...SPOT_COLORS.A, 255] :
    h3 === compareB ? [...SPOT_COLORS.B, 255] :
    h3 === selectedH3 ? [24, 24, 27, 255] : [255, 255, 255, 160];

  const hexLayer = new H3HexagonLayer<ScoredHex>({
    id: "hexes",
    data: hexes,
    pickable: true,
    autoHighlight: true,
    highlightColor: [255, 255, 255, 70],
    extruded: false,
    stroked: true,
    getHexagon: (d) => d.h3,
    getFillColor: (d) => scoreToColor(d.score, focus.length ? (focus.includes(d.h3) ? 235 : 90) : 160),
    getLineColor: (d) => outline(d.h3),
    getLineWidth: (d) => (focus.includes(d.h3) ? 3 : 1),
    lineWidthUnits: "pixels",
    transitions: { getFillColor: 300 },
    updateTriggers: { getFillColor: [focusKey], getLineColor: [focusKey], getLineWidth: [focusKey] },
    onClick: (info) => info.object && onSelect(info.object.h3),
  });

  const labelLayer = new TextLayer<MapLabel>({
    id: "compare-labels",
    data: labels,
    getPosition: (d) => [d.lng, d.lat],
    getText: (d) => d.text,
    getSize: 18,
    getColor: [255, 255, 255, 255],
    fontWeight: 700,
    outlineWidth: 3,
    outlineColor: [24, 24, 27, 255],
    fontSettings: { sdf: true },
  });

  const competitorLayer = new ScatterplotLayer<Competitor>({
    id: "competitors",
    data: competitors,
    pickable: true,
    getPosition: (d) => [d.lng, d.lat],
    getRadius: 6,
    radiusUnits: "pixels",
    getFillColor: [225, 29, 72, 255],
    stroked: true,
    getLineColor: [255, 255, 255, 255],
    lineWidthUnits: "pixels",
    getLineWidth: 2,
  });

  const pinLayer = new ScatterplotLayer<{ lat: number; lng: number }>({
    id: "look-pin",
    data: pin ? [pin] : [],
    pickable: true,
    getPosition: (d) => [d.lng, d.lat],
    getRadius: 9,
    radiusUnits: "pixels",
    getFillColor: [4, 120, 87, 255],
    stroked: true,
    getLineColor: [255, 255, 255, 255],
    lineWidthUnits: "pixels",
    getLineWidth: 3,
  });

  const getTooltip = ({ object, layer }: PickingInfo) => {
    if (!object) return null;
    if (layer?.id === "look-pin") return { text: "Start looking here", style: TOOLTIP_STYLE };
    if (layer?.id === "competitors") {
      return { text: (object as Competitor).name, style: TOOLTIP_STYLE };
    }
    const h = object as ScoredHex;
    return { text: `Score ${h.score} · ${scoreLabel(h.score)} · #${h.rank} of ${total}`, style: TOOLTIP_STYLE };
  };

  return (
    <DeckGL
      viewState={viewState}
      onViewStateChange={({ viewState: v }) => onViewStateChange(v as MapViewState)}
      controller={{ dragRotate: false }}
      layers={[hexLayer, competitorLayer, pinLayer, labelLayer]}
      getTooltip={getTooltip}
      getCursor={({ isHovering }) => (isHovering ? "pointer" : "grab")}
      onClick={(info) => {
        if (!info.object) onSelect(null);
      }}
    >
      <Map mapStyle={MAP_STYLE} attributionControl={{ compact: false }} />
    </DeckGL>
  );
}
