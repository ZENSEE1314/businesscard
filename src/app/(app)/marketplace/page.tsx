import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Store, MessageCircle } from "lucide-react";
import { prisma } from "@/lib/db/prisma";
import { getCurrentUser } from "@/lib/auth/current-user";
import { isPaidMember } from "@/features/events/queries";
import { Card } from "@/components/ui";
import { MarketplaceForm } from "@/features/marketplace/marketplace-form";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Marketplace" };

export default async function MarketplacePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const [listings, paid] = await Promise.all([
    prisma.marketplaceListing.findMany({
      where: { active: true },
      orderBy: { createdAt: "desc" },
      take: 50,
      select: {
        id: true,
        title: true,
        description: true,
        category: true,
        priceNote: true,
        imageUrl: true,
        whatsapp: true,
        user: {
          select: {
            membershipTier: true,
            profile: { select: { username: true, fullName: true, avatarUrl: true } },
          },
        },
      },
    }),
    isPaidMember(user.id),
  ]);

  const tierLabel = (t: string | null) =>
    t === "BRIDGEMAKER" ? "BridgeMaker" : t === "BRIDGEMASTER" ? "BridgeMaster" : null;

  return (
    <div className="mx-auto w-full max-w-2xl space-y-4 px-3 py-4 sm:px-4">
      <div className="px-1">
        <h1 className="flex items-center gap-2 text-xl font-bold">
          <Store className="h-5 w-5 text-brand-600" /> Marketplace
        </h1>
        <p className="mt-1 text-sm text-muted">
          Products and services from our paid members. Browse, then message the
          seller directly.
        </p>
      </div>

      {paid && (
        <div>
          <h2 className="mb-2 px-1 font-semibold">Post a listing</h2>
          <MarketplaceForm />
        </div>
      )}

      <div className="space-y-3">
        {listings.length === 0 ? (
          <Card className="p-8 text-center text-sm text-muted">
            No listings yet.
            {paid
              ? " Post the first one!"
              : " Paid members (BridgeMaker / BridgeMaster) can post listings."}
          </Card>
        ) : (
          listings.map((l) => {
            const sellerName = l.user.profile?.fullName ?? "Seller";
            const sellerTier = tierLabel(l.user.membershipTier);
            return (
              <Card key={l.id} className="overflow-hidden">
                <div className="flex gap-4 p-4">
                  {l.imageUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={l.imageUrl}
                      alt=""
                      className="h-20 w-20 shrink-0 rounded-xl object-cover"
                    />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <h2 className="font-semibold">{l.title}</h2>
                      {l.priceNote && (
                        <span className="shrink-0 rounded-full bg-brand-50 px-2 py-0.5 text-[11px] font-semibold text-brand-700">
                          {l.priceNote}
                        </span>
                      )}
                    </div>
                    {l.category && (
                      <p className="mt-0.5 text-xs text-muted">{l.category}</p>
                    )}
                    {l.description && (
                      <p className="mt-1 line-clamp-3 whitespace-pre-line text-sm text-muted">
                        {l.description}
                      </p>
                    )}
                    <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted">
                      <span className="inline-flex items-center gap-1.5">
                        <span className="grid h-5 w-5 place-items-center overflow-hidden rounded-full bg-brand-50 text-[10px] font-bold text-brand-700">
                          {l.user.profile?.avatarUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={l.user.profile.avatarUrl} alt="" className="h-full w-full object-cover" />
                          ) : (
                            sellerName.charAt(0)
                          )}
                        </span>
                        {l.user.profile?.username ? (
                          <Link href={`/u/${l.user.profile.username}`} className="hover:underline">
                            {sellerName}
                          </Link>
                        ) : (
                          sellerName
                        )}
                      </span>
                      {sellerTier && (
                        <span className="rounded-full bg-surface-2 px-2 py-0.5 font-medium">
                          {sellerTier}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                {l.user.profile?.username && (
                  <Link
                    href={`/chat?with=${encodeURIComponent(l.user.profile.username)}`}
                    className="flex items-center justify-center gap-1.5 border-t border-border py-2.5 text-xs font-semibold text-primary hover:bg-surface-2"
                  >
                    <MessageCircle className="h-3.5 w-3.5" /> Message seller
                  </Link>
                )}
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
