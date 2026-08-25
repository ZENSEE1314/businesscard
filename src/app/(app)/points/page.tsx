import { redirect } from "next/navigation";
import { ArrowDownCircle, ArrowUpCircle } from "lucide-react";
import { prisma } from "@/lib/db/prisma";
import { getCurrentUser } from "@/lib/auth/current-user";
import { Card } from "@/components/ui";

export const dynamic = "force-dynamic";

const TYPE_STYLES: Record<string, string> = {
  EARN: "bg-green-100 text-green-700",
  REDEEM: "bg-amber-100 text-amber-700",
  ADMIN_ADJUST: "bg-blue-100 text-blue-700",
  REFUND: "bg-brand-50 text-brand-700",
  REFERRAL: "bg-purple-100 text-purple-700",
};

/**
 * Point history — every row of the existing PointTransaction ledger.
 * Daily check-ins, login bonuses, referrals, redemptions and admin
 * adjustments all appear here.
 */
export default async function PointsHistoryPage() {
  const current = await getCurrentUser();
  if (!current) redirect("/login");

  const [user, transactions] = await Promise.all([
    prisma.user.findUnique({
      where: { id: current.id },
      select: {
        points: true,
        lifetimeEarned: true,
        lifetimeSpent: true,
      },
    }),
    prisma.pointTransaction.findMany({
      where: { userId: current.id },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
  ]);

  if (!user) redirect("/login");

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between px-1">
        <h1 className="text-xl font-bold">Point history</h1>
      </div>

      <div className="grid grid-cols-3 gap-3 text-center">
        <Card className="p-4">
          <div className="text-lg font-bold">{user.points}</div>
          <div className="text-xs text-muted">Current</div>
        </Card>
        <Card className="p-4">
          <div className="text-lg font-bold">{user.lifetimeEarned}</div>
          <div className="text-xs text-muted">Earned</div>
        </Card>
        <Card className="p-4">
          <div className="text-lg font-bold">{user.lifetimeSpent}</div>
          <div className="text-xs text-muted">Redeemed</div>
        </Card>
      </div>

      {transactions.length === 0 ? (
        <Card className="p-8 text-center">
          <p className="font-medium">No transactions yet</p>
          <p className="mt-1 text-sm text-muted">
            Check in daily on your dashboard to start earning points.
          </p>
        </Card>
      ) : (
        <ul className="space-y-2">
          {transactions.map((t) => {
            const positive = t.amount >= 0;
            return (
              <li key={t.id}>
                <Card className="flex items-center gap-3 p-3.5">
                  {positive ? (
                    <ArrowUpCircle className="h-8 w-8 shrink-0 text-green-600" />
                  ) : (
                    <ArrowDownCircle className="h-8 w-8 shrink-0 text-amber-500" />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{t.description}</p>
                    <p className="text-xs text-muted">
                      {new Intl.DateTimeFormat("en-GB", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      }).format(t.createdAt)}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p
                      className={`text-sm font-bold ${
                        positive ? "text-green-600" : "text-amber-600"
                      }`}
                    >
                      {positive ? "+" : ""}
                      {t.amount}
                    </p>
                    <span
                      className={`mt-0.5 inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                        TYPE_STYLES[t.type] ?? "bg-surface-2 text-muted"
                      }`}
                    >
                      {t.type.replace("_", " ")}
                    </span>
                  </div>
                </Card>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
