import type { NextRequest } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireBusiness } from "@/lib/permissions/guards";
import { businessUpdateSchema, emptyToNull } from "@/lib/validation/profile";
import { awardPoints, PointEvents } from "@/lib/points/engine";
import { handle, ok, Errors } from "@/lib/api";

const IMG_FIELDS = ["logoUrl", "coverUrl"] as const;

function isComplete(b: {
  name: string;
  description: string | null;
  logoUrl: string | null;
  categoryId: string | null;
  phone: string | null;
  whatsapp: string | null;
  email: string | null;
}): boolean {
  const hasContact = Boolean(b.phone || b.whatsapp || b.email);
  return Boolean(b.name && b.description && b.logoUrl && b.categoryId && hasContact);
}

export async function PATCH(req: NextRequest) {
  return handle(async () => {
    const user = await requireBusiness();

    const existing = await prisma.businessProfile.findUnique({
      where: { userId: user.id },
      select: { id: true },
    });
    if (!existing) throw Errors.notFound("No business profile to update.");

    const body = await req.json();
    const input = businessUpdateSchema.parse(body);

    const images: Record<string, string | null> = {};
    for (const f of IMG_FIELDS) {
      if (typeof body[f] === "string") images[f] = body[f] || null;
    }

    // categoryId "" -> null handled by emptyToNull.
    const data = { ...emptyToNull(input), ...images };

    const updated = await prisma.businessProfile.update({
      where: { userId: user.id },
      data,
    });

    if (isComplete(updated)) {
      await awardPoints({
        userId: user.id,
        eventKey: PointEvents.COMPLETE_BUSINESS_PROFILE,
        idempotencyKey: `complete_business_profile:${user.id}`,
        referenceType: "business",
        referenceId: updated.id,
      }).catch(() => undefined);
    }

    return ok({ updated: true });
  });
}
