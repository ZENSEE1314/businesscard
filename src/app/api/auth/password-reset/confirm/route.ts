import type { NextRequest } from "next/server";
import { createHash } from "crypto";
import { prisma } from "@/lib/db/prisma";
import { passwordResetSchema } from "@/lib/validation/auth";
import { hashPassword } from "@/lib/auth/password";
import { handle, ok, Errors, getClientIp } from "@/lib/api";
import { enforceRateLimit } from "@/lib/security/rate-limit";

export async function POST(req: NextRequest) {
  return handle(async () => {
    enforceRateLimit(`pwconfirm:${getClientIp(req)}`, 10, 60 * 60 * 1000);

    const { token, password } = passwordResetSchema.parse(await req.json());
    const tokenHash = createHash("sha256").update(token).digest("hex");

    const record = await prisma.passwordResetToken.findUnique({
      where: { tokenHash },
      select: { id: true, userId: true, usedAt: true, expiresAt: true },
    });

    if (!record || record.usedAt || record.expiresAt.getTime() < Date.now()) {
      throw Errors.badRequest("This reset link is invalid or has expired.");
    }

    const passwordHash = await hashPassword(password);

    await prisma.$transaction([
      prisma.user.update({
        where: { id: record.userId },
        data: { passwordHash },
      }),
      prisma.passwordResetToken.update({
        where: { id: record.id },
        data: { usedAt: new Date() },
      }),
      // Revoke all sessions so any attacker session is invalidated.
      prisma.session.updateMany({
        where: { userId: record.userId, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
    ]);

    return ok({ reset: true });
  });
}
