import { prisma } from "@/lib/db/prisma";
import { AwardsAdmin, type AdminAward } from "@/features/admin/awards-admin";

export const dynamic = "force-dynamic";

export default async function AdminAwardsPage() {
  const rows = await prisma.award.findMany({
    orderBy: [{ featured: "desc" }, { createdAt: "desc" }],
    include: {
      recipients: {
        include: {
          businessProfile: { select: { name: true } },
          user: { select: { profile: { select: { fullName: true } } } },
        },
      },
    },
  });
  const awards = JSON.parse(JSON.stringify(rows)) as AdminAward[];

  return (
    <div>
      <h1 className="mb-1 text-xl font-bold">Awards</h1>
      <p className="mb-4 text-sm text-muted">
        Create awards and assign winners by business slug or member username.
      </p>
      <AwardsAdmin awards={awards} />
    </div>
  );
}
