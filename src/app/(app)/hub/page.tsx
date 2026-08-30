import Link from "next/link";
import { Trophy, IdCard, MessageCircle } from "lucide-react";
import { getCurrentUser } from "@/lib/auth/current-user";
import { getFeedPosts } from "@/features/feed/queries";
import { PostCard } from "@/components/post-card";
import { Composer } from "@/features/feed/composer";
import { getLocale, tt } from "@/lib/i18n/server";

export const dynamic = "force-dynamic";

export default async function HubPage() {
  const user = await getCurrentUser();
  const { items } = await getFeedPosts({ viewerId: user?.id });
  const canPost = user?.role === "BUSINESS" || user?.role === "ADMIN";
  const firstName = user?.fullName?.split(" ")[0] ?? "there";
  const locale = await getLocale();

  const h = new Date().getHours();
  const greeting =
    h < 12
      ? tt(locale, "dash.goodMorning")
      : h < 18
        ? tt(locale, "dash.goodAfternoon")
        : tt(locale, "dash.goodEvening");

  const QUICK = [
    { href: "/matches", label: tt(locale, "hub.findMatches"), icon: MessageCircle },
    { href: "/awards", label: tt(locale, "hub.awards"), icon: Trophy },
    { href: "/me", label: tt(locale, "hub.myCard"), icon: IdCard },
  ];

  return (
    <div className="mx-auto max-w-2xl py-4">
      <div className="px-1 pb-3">
        <h1 className="text-xl font-bold">
          {greeting}, {firstName}
        </h1>
        <p className="text-sm text-muted">{tt(locale, "hub.subtitle")}</p>
      </div>

      <div className="mb-4 grid grid-cols-3 gap-2">
        {QUICK.map((q) => (
          <Link
            key={q.href}
            href={q.href}
            className="flex flex-col items-center gap-1 rounded-xl border border-border bg-surface py-3 text-xs font-medium hover:bg-surface-2"
          >
            <q.icon className="h-5 w-5 text-brand-600" />
            {q.label}
          </Link>
        ))}
      </div>

      {canPost && <Composer />}

      {items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-10 text-center text-muted">
          {tt(locale, "hub.checkBack")}
        </div>
      ) : (
        <div className="space-y-4">
          {items.map((post) => (
            <PostCard key={post.id} post={post} />
          ))}
        </div>
      )}
    </div>
  );
}