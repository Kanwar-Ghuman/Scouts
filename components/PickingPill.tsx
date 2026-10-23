import { Button } from "@/components/ui/button";

export function PickingPill({ onCancel }: { onCancel: () => void }) {
  return (
    <div className="pointer-events-auto absolute top-4 left-1/2 z-10 flex -translate-x-1/2 items-center gap-3 rounded-full border border-zinc-200 bg-white/95 py-1.5 pr-1.5 pl-4 text-sm shadow-lg backdrop-blur-sm animate-in fade-in slide-in-from-top-2 duration-200">
      <span className="text-zinc-700">
        Click a second spot to compare with <span className="font-semibold text-indigo-600">A</span>
      </span>
      <Button size="sm" variant="ghost" onClick={onCancel} className="rounded-full">Cancel</Button>
    </div>
  );
}
