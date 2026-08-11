import type { NextRequest } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { verifyPassword } from "@/lib/auth/password";
import { createSession, setSessionCookie } from "@/lib/auth/session";
import { loginSchema } from "@/lib/validation/auth";
import { awardPoints, PointEvents } from "@/lib/points/engine";
import { handle, ok, Errors, ApiError, getClientIp } from "@/lib/api";
import { enforceRateLimit } from "@/lib/security/rate-limit";

export async function POST(req: NextRequest) {
  return handle(async () => {
    const ip = getClientIp(req);
    const body = await req.json();
    const input = loginSchema.parse(body);

    // Throttle by IP and by email to blunt brute-force attempts.
    enforceRateLimit(`login:ip:${ip}`, 20, 15 * 60 * 1000);
    enforceRateLimit(`login:email:${input.email}`, 10, 15 * 60 * 1000);

    const user = await prisma.user.findUnique({
      where: { email: input.email },
      select: { id: true, passwordHash: true, role: true, status: true },
    });

    // Constant-ish response: verify against a dummy hash when user is missing
    // so timing does not reveal whether the email exists.
    const hash =
      user?.passwordHash ??
      "$2a$12$0000000000000000000000000000000000000000000000000000";
    const valid = await verifyPassword(input.password, hash);

    if (!user || !valid) {
      throw new ApiError(401, "Invalid email or password.", "invalid_credentials");
    }

    if (user.status === "BANNED") {
      throw Errors.forbidden("This account has been banned.");
    }
    if (user.status === "SUSPENDED") {
      throw Errors.forbidden("This account is suspended.");
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    // Daily login bonus (rule enforces the cooldown so repeats are ignored).
    await awardPoints({
      userId: user.id,
      eventKey: PointEvents.DAILY_LOGIN,
    }).catch(() => undefined);

    const token = await createSession({
      userId: user.id,
      role: user.role,
      userAgent: req.headers.get("user-agent"),
      ip,
    });
    await setSessionCookie(token);

    return ok({ id: user.id, role: user.role });
  });
}
