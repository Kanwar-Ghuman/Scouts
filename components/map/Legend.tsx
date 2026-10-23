import { SCORE_GRADIENT_CSS } from "@/lib/colors";

export function Legend() {
  return (
    <div className="pointer-events-none absolute bottom-6 left-[392px] hidden w-56 rounded-2xl border border-zinc-200 bg-white/95 p-3 shadow-lg backdrop-blur-sm md:block">
      <div className="h-2 w-full rounded-full" style={{ background: SCORE_GRADIENT_CSS }} />
      <div className="mt-1.5 flex justify-between text-[11px] font-medium text-zinc-700">
        <span>Weak</span>
        <span>Decent</span>
        <span>Strong</span>
      </div>
      <p className="mt-1 text-[11px] leading-snug text-zinc-500">Compared to nearby areas under your priorities.</p>
    </div>
  );
}
