import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { logout } from "@/app/actions/auth";
import { AuthShell } from "@/components/auth/AuthShell";
import { OnboardingForm } from "@/components/auth/OnboardingForm";
import { getCurrentUser } from "@/lib/auth";
import { isBusinessType } from "@/lib/businessTypes";
import { sanitizeWeights } from "@/lib/model";

export const metadata: Metadata = { title: "Get started · Site Scout" };

export default async function OnboardingPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?mode=signup");

  const type = isBusinessType(user.businessType) ? user.businessType : "boba";
  return (
    <AuthShell
      aside={
        <>
          <p className="max-w-sm text-3xl leading-tight font-semibold text-white">Two quick questions.</p>
          <p className="max-w-sm text-base text-zinc-400">
            Your answers set the model&apos;s starting weights. We save them to your account so the map opens ready for
            you next time.
          </p>
        </>
      }
    >
      <OnboardingForm
        name={user.name}
        initialBusinessName={user.businessName ?? ""}
        initialType={type}
        initialWeights={sanitizeWeights(user.weights, type)}
      />
      <form action={logout} className="mt-6 text-center">
        <button type="submit" className="text-xs text-zinc-500 hover:text-zinc-900 hover:underline">
          Not {user.name.split(" ")[0]}? Log out
        </button>
      </form>
    </AuthShell>
  );
}
