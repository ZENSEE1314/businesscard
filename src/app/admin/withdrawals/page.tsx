import { prisma } from "@/lib/db/prisma";
import { WithdrawalsAdmin } from "@/features/admin/withdrawals-admin";

export const dynamic = "force-dynamic";

export default async function AdminWithdrawalsPage() {
  const rows = await prisma.withdrawal.findMany({
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    take: 100,
    include: {
      user: { select: { email: true, profile: { select: { fullName: true } } } },
    },
  });

  const withdrawals = rows.map((w) => ({
    id: w.id,
    amountIdr: w.amountIdr,
    status: w.status,
    bankName: w.bankName,
    accountNumber: w.accountNumber,
    accountHolder: w.accountHolder,
    note: w.note,
    adminNote: w.adminNote,
    createdAt: w.createdAt.toISOString(),
    user: w.user.profile?.fullName ?? w.user.email,
    processedByName: null,
  }));

  return (
    <div>
      <h1 className="mb-1 text-xl font-bold">Withdrawals</h1>
      <p className="mb-4 text-sm text-muted">
        Referral commission payouts. Approve → transfer manually → mark paid. All
        decisions are logged.
      </p>
      <WithdrawalsAdmin withdrawals={withdrawals} />
    </div>
  );
}
