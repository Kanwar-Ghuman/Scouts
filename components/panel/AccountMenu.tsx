"use client";

import Link from "next/link";
import { LogOut, SlidersHorizontal } from "lucide-react";
import { logout } from "@/app/actions/auth";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import type { Account } from "@/types";

const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("");

const itemClass =
  "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100 hover:text-zinc-900";

export function AccountMenu({ account }: { account: Account }) {
  return (
    <Popover>
      <PopoverTrigger
        aria-label={`Account: ${account.name}`}
        className="inline-flex size-7 shrink-0 items-center justify-center rounded-full bg-zinc-900 text-[11px] font-semibold text-white transition-colors hover:bg-zinc-700 focus-visible:ring-2 focus-visible:ring-emerald-700/50 focus-visible:outline-none"
      >
        {initials(account.name) || "?"}
      </PopoverTrigger>
      <PopoverContent align="end" className="w-64 gap-1 p-1.5">
        <div className="px-2 pt-1.5 pb-2">
          <p className="truncate text-sm font-semibold text-zinc-900">{account.name}</p>
          <p className="truncate text-xs text-zinc-500">{account.email}</p>
          {account.businessName && <p className="mt-1 truncate text-xs text-zinc-600">{account.businessName}</p>}
        </div>
        <div className="h-px bg-zinc-100" />
        <Link href="/onboarding" className={itemClass}>
          <SlidersHorizontal className="size-4 text-zinc-500" aria-hidden />
          Edit business and priorities
        </Link>
        <form action={logout}>
          <button type="submit" className={itemClass}>
            <LogOut className="size-4 text-zinc-500" aria-hidden />
            Log out
          </button>
        </form>
      </PopoverContent>
    </Popover>
  );
}
