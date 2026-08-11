import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { getPersonalCard } from "@/features/cards/queries";
import { getCurrentUser } from "@/lib/auth/current-user";
import { recordProfileView } from "@/lib/analytics";
import { PublicCard } from "@/components/card/public-card";
import { env } from "@/lib/env";

export const dynamic = "force-dynamic";

async function clientIp(): Promise<string> {
  const h = await headers();
  return (h.get("x-forwarded-for")?.split(",")[0] ?? "0.0.0.0").trim();
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ username: string }>;
}): Promise<Metadata> {
  const { username } = await params;
  const card = await getPersonalCard(username);
  if (!card) return { title: "Not found" };
  const title = card.org ? `${card.name} · ${card.org}` : card.name;
  const description = card.bio ?? `${card.name} on ${env.appName}`;
  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: card.profileUrl,
      images: card.avatarUrl ? [{ url: card.avatarUrl }] : undefined,
    },
    alternates: { canonical: card.profileUrl },
  };
}

export default async function PersonalCardPage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  const card = await getPersonalCard(username);
  if (!card) notFound();

  const viewer = await getCurrentUser();
  await recordProfileView({
    viewedUserId: card.userId,
    viewerId: viewer?.id ?? null,
    ip: await clientIp(),
  });

  return (
    <main className="min-h-dvh px-4 py-8 aurora">
      <PublicCard
        card={card}
        isGuest={!viewer}
        isOwner={viewer?.id === card.userId}
      />
    </main>
  );
}
