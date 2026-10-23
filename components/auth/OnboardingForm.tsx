"use client";

import { useActionState, useState } from "react";
import { completeOnboarding, type OnboardingState } from "@/app/actions/auth";
import { PriorityControls } from "@/components/panel/PriorityControls";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { BUSINESS_TYPE_KEYS, BUSINESS_TYPES, type BusinessTypeKey } from "@/lib/businessTypes";
import { DEFAULT_WEIGHTS } from "@/lib/model";
import { cn } from "@/lib/utils";
import type { ModelWeights } from "@/types";

interface Props {
  name: string;
  initialBusinessName: string;
  initialType: BusinessTypeKey;
  initialWeights: ModelWeights;
}

export function OnboardingForm({ name, initialBusinessName, initialType, initialWeights }: Props) {
  const [step, setStep] = useState<1 | 2>(1);
  const [businessName, setBusinessName] = useState(initialBusinessName);
  const [type, setType] = useState<BusinessTypeKey>(initialType);
  const [weights, setWeights] = useState<ModelWeights>(initialWeights);
  const [state, action, pending] = useActionState<OnboardingState, FormData>(completeOnboarding, undefined);

  const chooseType = (t: BusinessTypeKey) => {
    setType(t);
    setWeights(DEFAULT_WEIGHTS[t]); // each business type starts from its own sensible defaults
  };

  return (
    <form action={action} className="flex flex-col gap-6">
      <input type="hidden" name="businessName" value={businessName} />
      <input type="hidden" name="businessType" value={type} />
      <input type="hidden" name="weights" value={JSON.stringify(weights)} />

      <div className="flex flex-col gap-1">
        <p className="text-xs font-semibold tracking-wide text-emerald-700 uppercase">Step {step} of 2</p>
        <h1 className="text-2xl font-semibold text-zinc-900">
          {step === 1 ? `Hi ${name.split(" ")[0]}, what are you opening?` : "What matters most to you?"}
        </h1>
        <p className="text-sm text-zinc-500">
          {step === 1
            ? "We'll start the map with sensible defaults for your kind of business."
            : "These are the model's weights. You can change them any time on the map."}
        </p>
      </div>

      {step === 1 ? (
        <>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="businessNameInput" className="text-sm font-medium text-zinc-900">
              Business name <span className="font-normal text-zinc-500">(optional)</span>
            </label>
            <Input
              id="businessNameInput"
              className="h-10"
              maxLength={100}
              placeholder="e.g. Bronco Boba"
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
            />
          </div>
          <fieldset className="flex flex-col gap-2">
            <legend className="mb-1.5 text-sm font-medium text-zinc-900">Type of business</legend>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3" role="radiogroup" aria-label="Type of business">
              {BUSINESS_TYPE_KEYS.map((key) => {
                const { label, icon: Icon } = BUSINESS_TYPES[key];
                const active = key === type;
                return (
                  <button
                    key={key}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    onClick={() => chooseType(key)}
                    className={cn(
                      "flex flex-col items-start gap-2 rounded-xl border p-3 text-left text-sm font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-emerald-700/50",
                      active
                        ? "border-emerald-700 bg-emerald-50 text-emerald-900"
                        : "border-zinc-200 text-zinc-700 hover:border-zinc-300 hover:bg-zinc-50"
                    )}
                  >
                    <Icon className="size-5" aria-hidden />
                    {label}
                  </button>
                );
              })}
            </div>
          </fieldset>
          <Button
            type="button"
            onClick={() => setStep(2)}
            className="h-10 w-full bg-emerald-700 text-white hover:bg-emerald-800"
          >
            Next
          </Button>
        </>
      ) : (
        <>
          <PriorityControls
            type={type}
            weights={weights}
            onChange={setWeights}
            onReset={() => setWeights(DEFAULT_WEIGHTS[type])}
          />
          {state?.error && (
            <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
              {state.error}
            </p>
          )}
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={() => setStep(1)} className="h-10 flex-1">
              Back
            </Button>
            <Button type="submit" disabled={pending} className="h-10 flex-[2] bg-emerald-700 text-white hover:bg-emerald-800">
              {pending ? "Saving…" : "Show me the map"}
            </Button>
          </div>
        </>
      )}
    </form>
  );
}
