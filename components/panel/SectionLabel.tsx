import { cn } from "@/lib/utils";

export function SectionLabel({ children, className }: { children: React.ReactNode; className?: string }) {
  return <h3 className={cn("text-xs font-medium tracking-wide text-zinc-500 uppercase", className)}>{children}</h3>;
}
