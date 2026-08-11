import type { NextRequest } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireAdmin } from "@/lib/permissions/guards";
import { awardWinnerSchema } from "@/lib/validation/admin";
import { handle, created, Errors, getClientIp } from "@/lib/api";

// Assign a winner to an award by handle — either a business slug or a member's
// username. Admin only; members/businesses cannot award themselves.
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  return handle(async () => {
    const admin = await requireAdmin();
    const { id: awardId } = await params;
    const input = awardWinnerSchema.parse(await req.json());
    const handleValue = input.businessSlug.trim().replace(/^@/, "").toLowerCase();

    const award = await prisma.award.findUnique({ where: { id: awardId } });
    if (!award) throw Errors.notFound("Award not found.");

    // Resolve the handle to a business (preferred) or an individual member.
    const business = await prisma.businessProfile.findUnique({
      where: { slug: handleValue },
      select: { id: true, userId: true },
    });

    let businessProfileId: string | null = null;
    let userId: string | null = null;

    if (business) {
      businessProfileId = business.id;
      userId = business.userId;
    } else {
      const profile = await prisma.profile.findUnique({
        where: { username: handleValue },
        select: { userId: true },
      });
      if (!profile) {
        throw Errors.notFound("No business or member found with that handle.");
      }
      userId = profile.userId;
    }

    // Prevent duplicates for the same award + recipient.
    const existing = await prisma.businessAward.findFirst({
      where: {
        awardId,
        OR: [
          businessProfileId ? { businessProfileId } : undefined,
          { userId },
        ].filter(Boolean) as object[],
      },
    });
    if (existing) throw Errors.conflict("That recipient already has this award.");

    const recipient = await prisma.businessAward.create({
      data: {
        awardId,
        businessProfileId,
        userId,
        rank: input.rank ?? null,
        grantedById: admin.id,
      },
      select: { id: true },
    });

    if (userId) {
      await prisma.notification.create({
        data: {
          userId,
          type: "AWARD_GRANTED",
          title: `You won: ${award.name}!`,
          body: "You've received a new award. It's now shown on your profile.",
          link: "/awards",
        },
      });
    }

    await prisma.adminLog.create({
      data: {
        adminId: admin.id,
        action: "award.assign",
        targetType: "award",
        targetId: awardId,
        newValue: { handle: handleValue },
        ip: getClientIp(req),
      },
    });

    return created({ id: recipient.id });
  });
}
