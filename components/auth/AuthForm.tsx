"use client";

import { useActionState, useState } from "react";
import { login, signup, type AuthState } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type Mode = "login" | "signup";

function Field({ id, label, ...props }: { id: string; label: string } & React.ComponentProps<typeof Input>) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium text-zinc-900">
        {label}
      </label>
      <Input id={id} name={id} className="h-10" {...props} />
    </div>
  );
}

function Form({ mode }: { mode: Mode }) {
  const [state, action, pending] = useActionState<AuthState, FormData>(mode === "signup" ? signup : login, undefined);
  return (
    <form action={action} className="flex flex-col gap-4" noValidate>
      {mode === "signup" && (
        <Field id="name" label="Your name" autoComplete="name" required defaultValue={state?.fields?.name} />
      )}
      <Field id="email" label="Email" type="email" autoComplete="email" required defaultValue={state?.fields?.email} />
      <Field
        id="password"
        label="Password"
        type="password"
        autoComplete={mode === "signup" ? "new-password" : "current-password"}
        minLength={mode === "signup" ? 8 : undefined}
        required
      />
      {mode === "signup" && <p className="-mt-2 text-xs text-zinc-500">At least 8 characters.</p>}
      {state?.error && (
        <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.error}
        </p>
      )}
      <Button type="submit" disabled={pending} className="h-10 w-full bg-emerald-700 text-white hover:bg-emerald-800">
        {pending ? (mode === "signup" ? "Creating account…" : "Logging in…") : mode === "signup" ? "Create account" : "Log in"}
      </Button>
    </form>
  );
}

export function AuthForm({ initialMode = "login" }: { initialMode?: Mode }) {
  const [mode, setMode] = useState<Mode>(initialMode);
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold text-zinc-900">
          {mode === "signup" ? "Create your account" : "Welcome back"}
        </h1>
        <p className="text-sm text-zinc-500">
          {mode === "signup"
            ? "Save your business and priorities so the map opens ready for you."
            : "Log in to pick up where you left off."}
        </p>
      </div>
      <div className="grid grid-cols-2 rounded-lg bg-zinc-100 p-1" role="tablist" aria-label="Log in or sign up">
        {(["login", "signup"] as const).map((m) => (
          <button
            key={m}
            type="button"
            role="tab"
            aria-selected={mode === m}
            onClick={() => setMode(m)}
            className={cn(
              "h-8 rounded-md text-sm font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-emerald-700/50",
              mode === m ? "bg-white text-zinc-900 shadow-sm" : "text-zinc-600 hover:text-zinc-900"
            )}
          >
            {m === "login" ? "Log in" : "Sign up"}
          </button>
        ))}
      </div>
      {/* key resets the form state when switching tabs */}
      <Form key={mode} mode={mode} />
    </div>
  );
}
