import { prisma } from "@/lib/db/prisma";
import { requireAdmin } from "@/lib/permissions/guards";
import { handle, ok } from "@/lib/api";

/** GET /api/admin/logs — recent admin actions (latest first). */
export async function GET() {
  return handle(async () => {
    await requireAdmin();
    const rows = await prisma.adminLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 100,
      include: {
        admin: { select: { email: true, profile: { select: { fullName: true } } } },
      },
    });
    return ok({
      logs: rows.map((l) => ({
        id: l.id,
        action: l.action,
        targetType: l.targetType,
        targetId: l.targetId,
        targetUsername: l.targetUsername,
        oldValue: l.oldValue,
        newValue: l.newValue,
        ip: l.ip,
        createdAt: l.createdAt.toISOString(),
        adminName: l.admin.profile?.fullName ?? l.admin.email,
      })),
    });
  });
}
