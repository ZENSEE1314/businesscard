import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { KeyRound, ChevronRight } from "lucide-react";
import { getCurrentUser } from "@/lib/auth/current-user";
import { Card } from "@/components/ui";
import { LanguagePicker } from "@/components/language-picker";
import { ThemeToggle } from "@/components/theme-toggle";
import { getLocale, tt } from "@/lib/i18n/server";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const locale = await getLocale();

  return (
    <div className="mx-auto max-w-2xl py-4">
      <h1 className="px-1 pb-3 text-xl font-bold">{tt(locale, "settings.title")}</h1>

      <div className="space-y-4">
        <Card className="p-5">
          <h2 className="text-sm font-semibold">{tt(locale, "settings.appLanguage")}</h2>
          <p className="mt-1 text-xs text-muted">{tt(locale, "settings.appLanguageHint")}</p>
          <div className="mt-3">
            <LanguagePicker />
          </div>
        </Card>

        <Card className="p-5">
          <h2 className="text-sm font-semibold">{tt(locale, "settings.theme")}</h2>
          <p className="mt-1 text-xs text-muted">{tt(locale, "settings.themeHint")}</p>
          <div className="mt-3">
            <ThemeToggle />
          </div>
        </Card>

        <Card className="p-0">
          <Link
            href="/me/password"
            className="flex items-center gap-3 p-5 hover:bg-surface-2"
          >
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-brand-50 text-brand-600">
              <KeyRound className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold">{tt(locale, "settings.changePassword")}</p>
              <p className="text-xs text-muted">{tt(locale, "settings.changePasswordHint")}</p>
            </div>
            <ChevronRight className="h-4 w-4 shrink-0 text-muted" />
          </Link>
        </Card>
      </div>
    </div>
  );
}
