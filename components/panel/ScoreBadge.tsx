import { cn } from "@/lib/utils";
import { scoreTextColor, scoreToCss } from "@/lib/colors";

interface Props {
  score: number;
  size?: "sm" | "lg";
  className?: string;
}

export function ScoreBadge({ score, size = "sm", className }: Props) {
  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center font-semibold tabular-nums ring-1 ring-black/5 transition-colors duration-300",
        size === "lg" ? "size-14 rounded-xl text-xl" : "size-7 rounded-md text-xs",
        className
      )}
      style={{ background: scoreToCss(score), color: scoreTextColor(score) }}
      aria-label={`Score ${score}`}
    >
      {score}
    </div>
  );
}
