import { prisma } from "@/lib/db/prisma";
import {
  RewardsAdmin,
  type AdminReward,
  type AdminRedemption,
} from "@/features/admin/rewards-admin";

export const dynamic = "force-dynamic";

export default async function AdminRewardsPage() {
  const [rewardRows, redemptionRows] = await Promise.all([
    prisma.reward.findMany({ orderBy: { createdAt: "desc" } }),
    prisma.rewardRedemption.findMany({
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
      take: 100,
      include: {
        reward: { select: { title: true } },
        user: {
          select: { email: true, profile: { select: { fullName: true } } },
        },
      },
    }),
  ]);

  const rewards = JSON.parse(JSON.stringify(rewardRows)) as AdminReward[];
  const redemptions = JSON.parse(
    JSON.stringify(redemptionRows),
  ) as AdminRedemption[];

  return (
    <div>
      <h1 className="mb-1 text-xl font-bold">Rewards</h1>
      <p className="mb-4 text-sm text-muted">
        Create rewards and review member redemptions. Rejecting refunds points.
      </p>
      <RewardsAdmin rewards={rewards} redemptions={redemptions} />
    </div>
  );
}
