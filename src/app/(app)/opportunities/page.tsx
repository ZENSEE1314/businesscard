import { redirect } from "next/navigation";
import { prisma } from "@/lib/db/prisma";
import { getCurrentUser } from "@/lib/auth/current-user";
import { isPaidMember } from "@/features/events/queries";
import { OpportunityForm } from "@/features/marketplace/marketplace-form";
import { OpportunityBoard } from "@/features/opportunities/opportunity-board";
import { getLocale, tt } from "@/lib/i18n/server";
import { OPPORTUNITY_SECTIONS } from "@/lib/validation/marketplace";

export const dynamic = "force-dynamic";

// ---------------------------------------------------------------------------
// Business Opportunities (the rebranded marketplace). Six browsing sections:
// investors, customers, suppliers, distributors, partnerships and job/service
// requests. Listings are stored in the MarketplaceListing table with the
// `section` column introduced by the opportunities migration.
// ---------------------------------------------------------------------------

const SECTION_LABEL_KEYS: Record<string, string> = {
  INVESTORS: "opp.sectionInvestors",
  CUSTOMERS: "opp.sectionCustomers",
  SUPPLIERS: "opp.sectionSuppliers",
  DISTRIBUTORS: "opp.sectionDistributors",
  PARTNERSHIP: "opp.sectionPartnership",
  JOBS: "opp.sectionJobs",
};

export default async function OpportunitiesPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const locale = await getLocale();

  const [listings, paid] = await Promise.all([
    prisma.marketplaceListing.findMany({
      where: { active: true },
      orderBy: { createdAt: "desc" },
      take: 90,
      select: {
        id: true,
        title: true,
        description: true,
        section: true,
        priceNote: true,
        createdAt: true,
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

  const sections = OPPORTUNITY_SECTIONS.map((key) => ({
    key,
    label: tt(locale, SECTION_LABEL_KEYS[key]),
    items: listings
      .filter((l) => l.section === key)
      .map((l) => ({
        id: l.id,
        title: l.title,
        description: l.description,
        priceNote: l.priceNote,
        createdAt: l.createdAt.toISOString(),
        sellerName: l.user.profile?.fullName ?? "Member",
        sellerUsername: l.user.profile?.username ?? null,
        sellerAvatarUrl: l.user.profile?.avatarUrl ?? null,
        sellerTier: tierLabel(l.user.membershipTier),
      })),
  }));

  return (
    <div className="mx-auto w-full max-w-2xl space-y-4 py-4">
      <div className="px-1">
        <h1 className="text-xl font-bold">{tt(locale, "opp.title")}</h1>
        <p className="mt-1 text-sm text-muted">{tt(locale, "opp.subtitle")}</p>
      </div>

      {paid && (
        <div>
          <h2 className="mb-2 px-1 font-semibold">{tt(locale, "opp.postListing")}</h2>
          <OpportunityForm />
        </div>
      )}

      <OpportunityBoard
        sections={sections}
        messageLabel={tt(locale, "market.contactSeller")}
        emptyLabel={tt(locale, "opp.empty")}
      />
    </div>
  );
}