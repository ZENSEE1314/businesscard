import type { NextRequest } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireAdmin } from "@/lib/permissions/guards";
import { handle, ok } from "@/lib/api";

// Admin: list membership orders, newest first, optionally filtered by status.
export async function GET(req: NextRequest) {
  return handle(async () => {
    await requireAdmin();
    const status = new URL(req.url).searchParams.get("status");

    const memberships = await prisma.membership.findMany({
      where: status
        ? { status: status as "PENDING" | "ACTIVE" | "REJECTED" | "EXPIRED" | "CANCELLED" }
        : undefined,
      orderBy: { createdAt: "desc" },
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

    return ok({ memberships });
  });
}
