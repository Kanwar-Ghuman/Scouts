import Link from "next/link";
import { BrandMark } from "@/components/panel/BrandMark";
import { Wordmark } from "@/components/panel/Wordmark";

/** Split layout for the login and onboarding pages: brand panel on the left, content on the right. */
export function AuthShell({ children, aside }: { children: React.ReactNode; aside?: React.ReactNode }) {
  return (
    <div className="grid min-h-dvh md:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
      <aside className="relative hidden flex-col justify-between overflow-hidden bg-zinc-950 p-10 text-zinc-100 md:flex">
        <Link href="/" aria-label="Site Scout home">
          <Wordmark variant="dark" className="h-7 w-auto" />
        </Link>
        <div className="flex flex-col gap-4">
          {aside ?? (
            <>
              <p className="max-w-sm text-3xl leading-tight font-semibold text-white">
                Find where your business should open.
              </p>
              <p className="max-w-sm text-base text-zinc-400">
                Every area around Pomona, scored by a model you can see and change.
              </p>
            </>
          )}
        </div>
        <p className="text-sm text-zinc-500">The model decides. The LLM explains.</p>
        <BrandMark className="pointer-events-none absolute -right-16 -bottom-16 size-72 opacity-10" />
      </aside>
      <main className="flex flex-col items-center justify-center bg-white px-4 py-10 sm:px-8">
        <Link href="/" aria-label="Site Scout home" className="mb-8 md:hidden">
          <Wordmark variant="light" className="h-6 w-auto" />
        </Link>
        <div className="w-full max-w-md">{children}</div>
      </main>
    </div>
  );
}
