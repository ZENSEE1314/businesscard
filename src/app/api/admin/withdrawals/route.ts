import { prisma } from "@/lib/db/prisma";
import { requireAdmin } from "@/lib/permissions/guards";
import { handle, ok } from "@/lib/api";

/** GET — withdrawal requests for admin payout. Pending/approved first. */
export async function GET() {
  return handle(async () => {
    await requireAdmin();
    const rows = await prisma.withdrawal.findMany({
      orderBy: [
        { status: "asc" }, // PENDING < APPROVED < PAID < REJECTED
        { createdAt: "desc" },
      ],
      take: 100,
      include: {
        user: { select: { email: true, profile: { select: { fullName: true } } } },
        processedBy: {
          select: { profile: { select: { fullName: true } } },
        },
      },
    });
    return ok({
      withdrawals: rows.map((w) => ({
        id: w.id,
        amountIdr: w.amountIdr,
        status: w.status,
        bankName: w.bankName,
        accountNumber: w.accountNumber,
        accountHolder: w.accountHolder,
        note: w.note,
        adminNote: w.adminNote,
        createdAt: w.createdAt.toISOString(),
        processedAt: w.processedAt?.toISOString() ?? null,
        user: w.user.profile?.fullName ?? w.user.email,
        processedByName: w.processedBy?.profile?.fullName ?? null,
      })),
    });
  });
}
