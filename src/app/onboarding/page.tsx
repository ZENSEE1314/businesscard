import { redirect } from "next/navigation";
import { PartyPopper } from "lucide-react";
import { getCurrentUser } from "@/lib/auth/current-user";
import { Card, ButtonLink } from "@/components/ui";
import { env } from "@/lib/env";

export const dynamic = "force-dynamic";

export default async function OnboardingPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return (
    <main className="flex min-h-dvh items-center justify-center px-4 aurora">
      <Card className="w-full max-w-md p-8 text-center">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-brand-50 text-brand-600">
          <PartyPopper className="h-7 w-7" />
        </div>
        <h1 className="mt-4 text-2xl font-bold">Welcome to {env.appName}!</h1>
        <p className="mt-2 text-muted">
          Your account is ready and your digital name card is live. Complete
          your profile to earn <strong>+100 points</strong> and make a great
          first impression.
        </p>
        <div className="mt-6 flex flex-col gap-2">
          <ButtonLink href="/me/edit" size="lg">
            Create my name card
          </ButtonLink>
          <ButtonLink href="/hub" variant="ghost" size="lg">
            Skip for now &mdash; go to home
          </ButtonLink>
        </div>
      </Card>
    </main>
  );
}
