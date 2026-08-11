import type { NextRequest } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireUser } from "@/lib/permissions/guards";
import { profileUpdateSchema, emptyToNull } from "@/lib/validation/profile";
import { awardPoints, PointEvents } from "@/lib/points/engine";
import { handle, ok } from "@/lib/api";

const IMG_FIELDS = ["avatarUrl", "coverUrl", "coverVideoUrl"] as const;

// Considered "complete" once the essentials for a useful name card are present.
function isComplete(p: {
  fullName: string;
  bio: string | null;
  avatarUrl: string | null;
  phone: string | null;
  whatsapp: string | null;
  email: string | null;
}): boolean {
  const hasContact = Boolean(p.phone || p.whatsapp || p.email);
  return Boolean(p.fullName && p.bio && p.avatarUrl && hasContact);
}

export async function PATCH(req: NextRequest) {
  return handle(async () => {
    const user = await requireUser();
    const body = await req.json();
    const input = profileUpdateSchema.parse(body);

    // Optional image URLs come from the upload endpoint, validated separately.
    const images: Record<string, string | null> = {};
    for (const f of IMG_FIELDS) {
      if (typeof body[f] === "string") images[f] = body[f] || null;
    }

    const data = { ...emptyToNull(input), ...images };

    const updated = await prisma.profile.update({
      where: { userId: user.id },
      data,
    });

    // Award profile-completion points once.
    if (isComplete(updated)) {
      await awardPoints({
        userId: user.id,
        eventKey: PointEvents.COMPLETE_PROFILE,
        idempotencyKey: `complete_profile:${user.id}`,
        referenceType: "profile",
        referenceId: updated.id,
      }).catch(() => undefined);
    }

    return ok({ updated: true });
  });
}
