import { Gift } from "lucide-react";
import { prisma } from "@/lib/db/prisma";
import { getCurrentUser } from "@/lib/auth/current-user";
import { Card } from "@/components/ui";
import { RedeemButton } from "@/features/rewards/redeem-button";

export const dynamic = "force-dynamic";

export default async function RewardsPage() {
  const user = await getCurrentUser();
  const rewards = await prisma.reward.findMany({
    where: { active: true },
    orderBy: { pointsCost: "asc" },
  });

  return (
    <div className="mx-auto max-w-2xl px-3 py-4 sm:px-4">
      <div className="flex items-center justify-between px-1 pb-3">
        <h1 className="text-xl font-bold">Rewards</h1>
        <span className="rounded-full bg-brand-50 px-3 py-1 text-sm font-medium text-brand-700">
          {user?.points ?? 0} points
        </span>
      </div>

      {rewards.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-10 text-center text-muted">
          No rewards available right now.
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {rewards.map((r) => {
            const affordable = (user?.points ?? 0) >= r.pointsCost;
            return (
              <Card key={r.id} className="flex flex-col p-4">
                <div className="grid h-11 w-11 place-items-center rounded-xl bg-brand-50 text-brand-600">
                  <Gift className="h-5 w-5" />
                </div>
                <h3 className="mt-3 font-semibold">{r.title}</h3>
                {r.description && (
                  <p className="mt-1 text-sm text-muted">{r.description}</p>
                )}
                <div className="mt-auto pt-4">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="font-bold text-brand-700">
                      {r.pointsCost.toLocaleString()} pts
                    </span>
                    {r.stock !== null && (
                      <span className="text-xs text-muted">{r.stock} left</span>
                    )}
                  </div>
                  <RedeemButton
                    rewardId={r.id}
                    pointsCost={r.pointsCost}
                    affordable={affordable && (r.stock === null || r.stock > 0)}
                  />
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
