import type { NextRequest } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireBusiness } from "@/lib/permissions/guards";
import { businessMediaSchema } from "@/lib/validation/profile";
import { handle, created, Errors } from "@/lib/api";

// Add a product or introduction media item (image or video) to the business.
export async function POST(req: NextRequest) {
  return handle(async () => {
    const user = await requireBusiness();
    const business = await prisma.businessProfile.findUnique({
      where: { userId: user.id },
      select: { id: true },
    });
    if (!business) throw Errors.notFound("No business profile.");

    const input = businessMediaSchema.parse(await req.json());

    const count = await prisma.businessMedia.count({
      where: { businessProfileId: business.id, section: input.section },
    });

    const media = await prisma.businessMedia.create({
      data: {
        businessProfileId: business.id,
        section: input.section,
        kind: input.kind,
        url: input.url,
        thumbUrl: input.thumbUrl || null,
        caption: input.caption || null,
        sortOrder: count,
      },
    });

    return created({ media });
  });
}
