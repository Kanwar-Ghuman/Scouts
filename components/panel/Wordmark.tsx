import Image from "next/image";
import { cn } from "@/lib/utils";

/** The SITESCOUT wordmark. `light` is for white surfaces, `dark` for black ones. */
export function Wordmark({ variant = "light", className = "h-6 w-auto" }: { variant?: "light" | "dark"; className?: string }) {
  return (
    <Image
      src={variant === "light" ? "/sitescout_wordmark_light.svg" : "/sitescout_wordmark_dark.svg"}
      alt="Site Scout"
      width={5510}
      height={795}
      unoptimized
      priority
      className={cn(className)}
    />
  );
}
