import type { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { requireUser } from "@/lib/permissions/guards";
import { handle, ok, Errors } from "@/lib/api";

const schema = z.object({
  paymentProofUrl: z.string().url().optional().or(z.literal("")),
  paymentNote: z.string().trim().max(500).optional().or(z.literal("")),
});

// Member attaches proof of payment / a note to their pending order.
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  return handle(async () => {
    const user = await requireUser();
    const { id } = await params;

    const membership = await prisma.membership.findUnique({
      where: { id },
      select: { id: true, userId: true, status: true },
    });
    if (!membership || membership.userId !== user.id) {
      throw Errors.notFound("Order not found.");
    }
    if (membership.status !== "PENDING") {
      throw Errors.badRequest("This order is no longer pending.");
    }

    const input = schema.parse(await req.json());
    await prisma.membership.update({
      where: { id },
      data: {
        paymentProofUrl: input.paymentProofUrl || null,
        paymentNote: input.paymentNote || null,
      },
    });

    return ok({ updated: true });
  });
}
