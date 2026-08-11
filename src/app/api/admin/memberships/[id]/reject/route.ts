import type { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { requireAdmin } from "@/lib/permissions/guards";
import { rejectMembership } from "@/features/membership/service";
import { getClientIp, handle, ok } from "@/lib/api";

const schema = z.object({ reason: z.string().trim().max(500).optional() });

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  return handle(async () => {
    const admin = await requireAdmin();
    const { id } = await params;
    const { reason } = schema.parse(await req.json().catch(() => ({})));

    const result = await rejectMembership(id, admin.id, reason ?? "");

    await prisma.adminLog.create({
      data: {
        adminId: admin.id,
        action: "membership.reject",
        targetType: "membership",
        targetId: id,
        newValue: { reason: reason ?? "" },
        ip: getClientIp(req),
      },
    });

    return ok({ status: result.status });
  });
}
