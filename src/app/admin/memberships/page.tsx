import { prisma } from "@/lib/db/prisma";
import {
  MembershipReview,
  type MembershipRow,
} from "@/features/admin/membership-review";

export const dynamic = "force-dynamic";

export default async function AdminMembershipsPage() {
  const rows = await prisma.membership.findMany({
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    take: 100,
    include: {
      user: {
        select: {
          email: true,
          profile: { select: { fullName: true, username: true } },
        },
      },
    },
  });

  const initial = JSON.parse(JSON.stringify(rows)) as MembershipRow[];

  return (
    <div>
      <h1 className="mb-1 text-xl font-bold">Membership orders</h1>
      <p className="mb-4 text-sm text-muted">
        Verify payment, then approve to activate the member’s business
        membership.
      </p>
      <MembershipReview initial={initial} />
    </div>
  );
}
