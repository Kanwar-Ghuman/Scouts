import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { SectionLabel } from "@/components/panel/SectionLabel";

interface Props {
  label: string;
  text: string | null | undefined;
  loading: boolean;
  error: string | null;
  onRetry: () => void;
}

/** LLM output block with a fixed-height skeleton so text loads without layout shift. */
export function LlmText({ label, text, loading, error, onRetry }: Props) {
  return (
    <section className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <SectionLabel>{label}</SectionLabel>
        <Badge variant="secondary" className="text-[10px]">Llama 3.3 70B</Badge>
      </div>
      <div className="min-h-[4.5rem]">
        {loading && (
          <div className="flex flex-col gap-2 pt-1">
            <Skeleton className="h-3.5 w-full" />
            <Skeleton className="h-3.5 w-11/12" />
            <Skeleton className="h-3.5 w-3/4" />
          </div>
        )}
        {!loading && error && (
          <div className="flex items-center justify-between gap-3 text-sm text-zinc-600">
            <span>Couldn&apos;t get an explanation.</span>
            <Button size="sm" variant="outline" onClick={onRetry}>Retry</Button>
          </div>
        )}
        {!loading && !error && text && (
          <p className="animate-in fade-in text-sm leading-relaxed text-zinc-800 duration-200">{text}</p>
        )}
      </div>
    </section>
  );
}
