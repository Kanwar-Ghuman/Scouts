"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { useSearchParams } from "next/navigation";
import { cellToLatLng } from "h3-js";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import type { MapLabel, MapViewState } from "@/components/map/HexMap";
import { Legend } from "@/components/map/Legend";
import { ComparePanel } from "@/components/panel/ComparePanel";
import { ControlPanel } from "@/components/panel/ControlPanel";
import { HexPanel } from "@/components/panel/HexPanel";
import { RightPanel } from "@/components/panel/RightPanel";
import { PickingPill } from "@/components/PickingPill";
import { PlaceSearch } from "@/components/PlaceSearch";
import { StatusBadge } from "@/components/StatusBadge";
import { useHexDetail } from "@/hooks/useHexDetail";
import { useHexFeatures } from "@/hooks/useHexFeatures";
import { usePlan } from "@/hooks/usePlan";
import { customBusiness, fallbackPreset, presetBusiness } from "@/lib/business";
import type { BusinessTypeKey } from "@/lib/businessTypes";
import { DEFAULT_WEIGHTS, scoreAll } from "@/lib/model";
import { readUrlState, writeUrlState } from "@/lib/urlState";
import { DEFAULT_VIEW, fitPoints, flyHome, flyTo } from "@/lib/viewport";
import type { Account, Business, ModelWeights, PlaceResult, ScoredHex } from "@/types";

const HexMap = dynamic(() => import("./map/HexMap"), {
  ssr: false,
  loading: () => <div className="absolute inset-0 bg-zinc-100" />,
});

function initialView(hex: string | null, a: string | null, b: string | null): MapViewState {
  const focus = hex ?? a ?? b;
  if (!focus) return DEFAULT_VIEW;
  const [lat, lng] = cellToLatLng(focus);
  return { ...DEFAULT_VIEW, latitude: lat, longitude: lng, zoom: 13 };
}

export default function SiteScout({ account }: { account: Account }) {
  const params = useSearchParams();
  const [init] = useState(() => readUrlState(new URLSearchParams(params.toString())));

  const [business, setBusiness] = useState<Business>(init.business);
  const [weights, setWeights] = useState<ModelWeights>(init.weights);
  const [selectedH3, setSelectedH3] = useState<string | null>(init.hex ?? init.a);
  const [compareA, setCompareA] = useState<string | null>(init.a && init.b ? init.a : null);
  const [compareB, setCompareB] = useState<string | null>(init.a && init.b ? init.b : null);
  const [pickingB, setPickingB] = useState(false);
  const [viewState, setViewState] = useState<MapViewState>(() => initialView(init.hex, init.a, init.b));

  const onCustomUnavailable = useCallback(() => {
    toast.error("Custom businesses need a live connection");
    setBusiness((b) => (b.type === "custom" ? presetBusiness(fallbackPreset(b)) : b));
  }, []);
  const features = useHexFeatures(business, onCustomUnavailable);
  const plan = usePlan();

  const scored = useMemo(() => scoreAll(features.data ?? [], weights), [features.data, weights]);
  const byH3 = useMemo(() => new Map(scored.map((h) => [h.h3, h])), [scored]);

  const A = compareA ? byH3.get(compareA) ?? null : null;
  const B = compareB ? byH3.get(compareB) ?? null : null;
  const comparing = !!(A && B);
  const showHexPanel = !comparing && !!selectedH3;

  const detail = useHexDetail(showHexPanel ? selectedH3 : null, business);

  useEffect(() => {
    writeUrlState({ business, weights, hex: selectedH3, a: compareA, b: compareB });
  }, [business, weights, selectedH3, compareA, compareB]);

  const clearAll = useCallback(() => {
    setSelectedH3(null);
    setCompareA(null);
    setCompareB(null);
    setPickingB(false);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (pickingB) setPickingB(false);
      else clearAll();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [pickingB, clearAll]);

  const fitBoth = (a: string, b: string) => {
    const pa = byH3.get(a);
    const pb = byH3.get(b);
    if (pa && pb) setViewState((v) => fitPoints(v, [pa.lat, pa.lng], [pb.lat, pb.lng]));
  };

  const startCompare = (h3: string) => {
    setCompareA(h3);
    setCompareB(null);
    setSelectedH3(h3);
    setPickingB(true);
  };

  const finishCompare = (h3: string) => {
    if (!compareA || h3 === compareA) return;
    setCompareB(h3);
    setPickingB(false);
    fitBoth(compareA, h3);
  };

  const onSelect = (h3: string | null) => {
    if (pickingB) {
      if (h3) finishCompare(h3);
      return;
    }
    setCompareA(null);
    setCompareB(null);
    setSelectedH3(h3);
  };

  const onTypeChange = (t: BusinessTypeKey) => {
    if (t === business.type) return;
    setBusiness(presetBusiness(t));
    setWeights(DEFAULT_WEIGHTS[t]);
    clearAll();
  };

  const onPlan = async (text: string) => {
    const res = await plan.run(text);
    if (!res) return;
    setBusiness(res.type === "custom" && res.custom ? customBusiness(res.custom) : presetBusiness(res.type === "custom" ? "boba" : res.type));
    setWeights(res.weights);
    clearAll();
    setViewState(flyHome);
  };

  const onSelectSpot = (h: ScoredHex) => {
    if (pickingB) {
      finishCompare(h.h3);
      return;
    }
    setCompareA(null);
    setCompareB(null);
    setSelectedH3(h.h3);
    setViewState((v) => flyTo(v, h.lat, h.lng));
  };

  const onCompareSpot = (h: ScoredHex) => {
    if (compareA && !compareB && h.h3 !== compareA) finishCompare(h.h3);
    else {
      startCompare(h.h3);
      setViewState((v) => flyTo(v, h.lat, h.lng));
    }
  };

  const onPickPlace = (p: PlaceResult) => {
    setViewState((v) => flyTo(v, p.lat, p.lng, 14));
    if (byH3.has(p.h3)) {
      setCompareA(null);
      setCompareB(null);
      setPickingB(false);
      setSelectedH3(p.h3);
    } else {
      toast("No data for that exact spot. Showing the area around it.");
    }
  };

  const labels: MapLabel[] = [
    ...(A ? [{ text: "A" as const, lat: A.lat, lng: A.lng }] : []),
    ...(B ? [{ text: "B" as const, lat: B.lat, lng: B.lng }] : []),
  ];

  const rightPanel = comparing ? (
    <ComparePanel
      a={A}
      b={B}
      business={business}
      weights={weights}
      onSwap={() => {
        setCompareA(compareB);
        setCompareB(compareA);
      }}
      onClose={clearAll}
    />
  ) : showHexPanel ? (
    features.loading ? (
      <div className="flex flex-col gap-4 p-5">
        <Skeleton className="h-14 w-full" />
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-28 w-full" />
      </div>
    ) : (
      <HexPanel
        key={selectedH3}
        hex={byH3.get(selectedH3!) ?? null}
        total={scored.length}
        business={business}
        weights={weights}
        detail={detail.data}
        detailLoading={detail.loading}
        detailError={detail.error}
        onRetry={detail.retry}
        onClose={clearAll}
        onCompare={() => startCompare(selectedH3!)}
      />
    )
  ) : null;

  return (
    <div className="relative h-dvh w-full overflow-hidden bg-zinc-100">
      <HexMap
        hexes={scored}
        selectedH3={selectedH3}
        compareA={compareA}
        compareB={compareB}
        labels={labels}
        competitors={showHexPanel ? detail.data?.nearestCompetitors ?? [] : []}
        onSelect={onSelect}
        viewState={viewState}
        onViewStateChange={setViewState}
      />

      <div className="pointer-events-none absolute inset-x-2 top-2 flex flex-col gap-2 md:contents">
        <ControlPanel
          account={account}
          business={business}
          weights={weights}
          scored={scored}
          selectedH3={selectedH3}
          loading={features.loading}
          error={features.error}
          onRetry={features.retry}
          plan={plan}
          onPlan={onPlan}
          onTypeChange={onTypeChange}
          onWeightsChange={setWeights}
          onResetWeights={() => setWeights(DEFAULT_WEIGHTS[business.type])}
          onSelectSpot={onSelectSpot}
          onCompareSpot={onCompareSpot}
        />
        {!pickingB && <PlaceSearch onPick={onPickPlace} />}
      </div>

      {pickingB && <PickingPill onCancel={() => setPickingB(false)} />}

      {features.loading && (
        <div className="pointer-events-none absolute top-20 left-1/2 -translate-x-1/2 rounded-full border border-zinc-200 bg-white/95 px-3 py-1 text-xs font-medium text-zinc-600 shadow-sm md:top-20">
          Loading areas…
        </div>
      )}

      <Legend />
      <StatusBadge source={features.source} />

      {rightPanel && <RightPanel>{rightPanel}</RightPanel>}
    </div>
  );
}
