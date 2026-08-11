import type { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { requireUser } from "@/lib/permissions/guards";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { passwordSchema } from "@/lib/validation/auth";
import { handle, ok, Errors } from "@/lib/api";

const schema = z.object({
  currentPassword: z.string().min(1, "Enter your current password."),
  newPassword: passwordSchema,
});

// Change password for a signed-in user. Requires the current password.
export async function PATCH(req: NextRequest) {
  return handle(async () => {
    const user = await requireUser();
    const { currentPassword, newPassword } = schema.parse(await req.json());

    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { passwordHash: true },
    });
    if (!dbUser) throw Errors.notFound("Account not found.");

    const valid = await verifyPassword(currentPassword, dbUser.passwordHash);
    if (!valid) {
      throw Errors.badRequest("Your current password is incorrect.");
    }

    const passwordHash = await hashPassword(newPassword);
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash },
    });

    // Revoke all other sessions for safety; keep the current one active.
    await prisma.session.updateMany({
      where: { userId: user.id, id: { not: user.sessionId }, revokedAt: null },
      data: { revokedAt: new Date() },
    });

    return ok({ changed: true });
  });
}
