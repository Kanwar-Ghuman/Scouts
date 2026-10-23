import Image from "next/image";
import { cn } from "@/lib/utils";

/** The hex-pin icon from the Site Scout logo. */
export function BrandMark({ className = "size-6" }: { className?: string }) {
  return (
    <Image src="/sitescout_mark.svg" alt="" width={744} height={846} unoptimized className={cn("object-contain", className)} />
  );
}
