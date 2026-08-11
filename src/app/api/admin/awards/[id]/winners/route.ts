import type { NextRequest } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireAdmin } from "@/lib/permissions/guards";
import { awardWinnerSchema } from "@/lib/validation/admin";
import { handle, created, Errors, getClientIp } from "@/lib/api";

// Assign a business as a winner of an award (admin only — businesses cannot
// award themselves).
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  return handle(async () => {
    const admin = await requireAdmin();
    const { id: awardId } = await params;
    const input = awardWinnerSchema.parse(await req.json());

    const award = await prisma.award.findUnique({ where: { id: awardId } });
    if (!award) throw Errors.notFound("Award not found.");

    const business = await prisma.businessProfile.findUnique({
      where: { slug: input.businessSlug.toLowerCase() },
      select: { id: true },
    });
    if (!business) throw Errors.notFound("No business with that slug.");

    const existing = await prisma.businessAward.findUnique({
      where: {
        awardId_businessProfileId: {
          awardId,
          businessProfileId: business.id,
        },
      },
    });
    if (existing) throw Errors.conflict("That business already has this award.");

    const recipient = await prisma.businessAward.create({
      data: {
        awardId,
        businessProfileId: business.id,
        rank: input.rank ?? null,
        grantedById: admin.id,
      },
      select: { id: true },
    });

    await prisma.notification.create({
      data: {
        userId: (
          await prisma.businessProfile.findUniqueOrThrow({
            where: { id: business.id },
            select: { userId: true },
          })
        ).userId,
        type: "AWARD_GRANTED",
        title: `You won: ${award.name}!`,
        body: "Your business has received a new award. It's now shown on your profile.",
        link: "/awards",
      },
    });

    await prisma.adminLog.create({
      data: {
        adminId: admin.id,
        action: "award.assign",
        targetType: "award",
        targetId: awardId,
        newValue: { businessSlug: input.businessSlug },
        ip: getClientIp(req),
      },
    });

    return created({ id: recipient.id });
  });
}
