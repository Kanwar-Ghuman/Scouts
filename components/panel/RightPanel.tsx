export function RightPanel({ children }: { children: React.ReactNode }) {
  return (
    <aside className="pointer-events-auto absolute inset-x-0 bottom-0 z-20 flex h-[60vh] flex-col overflow-y-auto rounded-t-2xl border border-zinc-200 bg-white/95 shadow-lg backdrop-blur-sm animate-in fade-in slide-in-from-bottom-4 duration-200 md:inset-x-auto md:top-4 md:right-4 md:bottom-4 md:h-auto md:w-[420px] md:rounded-2xl md:slide-in-from-right-4 md:slide-in-from-bottom-0">
      <div className="mx-auto mt-2 h-1 w-10 shrink-0 rounded-full bg-zinc-300 md:hidden" aria-hidden />
      {children}
    </aside>
  );
}
