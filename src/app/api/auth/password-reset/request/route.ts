import type { NextRequest } from "next/server";
import { createHash, randomBytes } from "crypto";
import { prisma } from "@/lib/db/prisma";
import { passwordResetRequestSchema } from "@/lib/validation/auth";
import { sendEmail } from "@/lib/email";
import { absoluteUrl } from "@/lib/utils";
import { env } from "@/lib/env";
import { handle, ok, getClientIp } from "@/lib/api";
import { enforceRateLimit } from "@/lib/security/rate-limit";

const TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour

export async function POST(req: NextRequest) {
  return handle(async () => {
    const ip = getClientIp(req);
    enforceRateLimit(`pwreset:${ip}`, 5, 60 * 60 * 1000);

    const { email } = passwordResetRequestSchema.parse(await req.json());
    enforceRateLimit(`pwreset:email:${email}`, 3, 60 * 60 * 1000);

    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });

    // Only act if the user exists, but always return the same response so the
    // endpoint never reveals whether an email is registered.
    if (user) {
      const raw = randomBytes(32).toString("base64url");
      const tokenHash = createHash("sha256").update(raw).digest("hex");
      await prisma.passwordResetToken.create({
        data: {
          userId: user.id,
          tokenHash,
          expiresAt: new Date(Date.now() + TOKEN_TTL_MS),
        },
      });

      const link = absoluteUrl(`/reset?token=${raw}`);
      await sendEmail({
        to: email,
        subject: `Reset your ${env.appName} password`,
        text: `Reset your password using this link (valid for 1 hour):\n\n${link}\n\nIf you didn't request this, ignore this email.`,
        html: `<p>Reset your password using this link (valid for 1 hour):</p><p><a href="${link}">${link}</a></p><p>If you didn't request this, you can ignore this email.</p>`,
      });
    }

    return ok({
      message:
        "If an account exists for that email, a password reset link has been sent.",
    });
  });
}
