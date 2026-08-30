import { redirect } from "next/navigation";
import { PartyPopper } from "lucide-react";
import { getCurrentUser } from "@/lib/auth/current-user";
import { Card, ButtonLink } from "@/components/ui";
import { WhatsAppCommunityButton } from "@/components/whatsapp-community-button";
import { getLocale, tt } from "@/lib/i18n/server";
import { env } from "@/lib/env";

export const dynamic = "force-dynamic";

export default async function OnboardingPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const locale = await getLocale();

  return (
    <main className="flex min-h-dvh items-center justify-center px-4 aurora">
      <Card className="w-full max-w-md p-8 text-center">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-brand-50 text-brand-600">
          <PartyPopper className="h-7 w-7" />
        </div>
        <h1 className="mt-4 text-2xl font-bold">
          {tt(locale, "onboard.welcome", { app: env.appName })}
        </h1>
        <p className="mt-2 text-muted">{tt(locale, "onboard.subtitle")}</p>
        <div className="mt-6 flex flex-col gap-2">
          <ButtonLink href="/me/edit" size="lg">
            {tt(locale, "onboard.createCard")}
          </ButtonLink>
          <ButtonLink href="/hub" variant="ghost" size="lg">
            {tt(locale, "onboard.skip")}
          </ButtonLink>
        </div>
        <div className="mt-4 border-t border-border pt-4">
          <p className="mb-2 text-sm text-muted">
            {tt(locale, "onboard.communityHint")}
          </p>
          <WhatsAppCommunityButton label={tt(locale, "community.join")} />
        </div>
      </Card>
    </main>
  );
}
