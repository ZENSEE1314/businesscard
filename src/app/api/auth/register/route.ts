import type { NextRequest } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { hashPassword } from "@/lib/auth/password";
import { createSession, setSessionCookie } from "@/lib/auth/session";
import {
  generateUniqueUsername,
  generateUniqueBusinessSlug,
} from "@/lib/auth/provisioning";
import { registerSchema } from "@/lib/validation/auth";
import { awardPoints, adjustPoints, PointEvents } from "@/lib/points/engine";
import { handle, created, Errors, getClientIp } from "@/lib/api";
import { enforceRateLimit } from "@/lib/security/rate-limit";

export async function POST(req: NextRequest) {
  return handle(async () => {
    const ip = getClientIp(req);
    enforceRateLimit(`register:${ip}`, 10, 60 * 60 * 1000);

    const body = await req.json();
    const input = registerSchema.parse(body);

    const existing = await prisma.user.findUnique({
      where: { email: input.email },
      select: { id: true },
    });
    if (existing) {
      throw Errors.conflict("An account with that email already exists.");
    }

    // Resolve referrer (optional). Self-referral impossible for a new account.
    let referredById: string | null = null;
    if (input.referralCode) {
      const referrer = await prisma.user.findUnique({
        where: { referralCode: input.referralCode },
        select: { id: true },
      });
      referredById = referrer?.id ?? null;
    }

    const username = await generateUniqueUsername(
      input.fullName || input.email.split("@")[0]!,
    );
    const passwordHash = await hashPassword(input.password);
    const isBusiness = input.accountType === "BUSINESS";

    const user = await prisma.user.create({
      data: {
        email: input.email,
        passwordHash,
        role: isBusiness ? "BUSINESS" : "USER",
        referredById,
        profile: {
          create: {
            username,
            fullName: input.fullName,
            email: input.email,
          },
        },
        ...(isBusiness && input.businessName
          ? {
              businessProfile: {
                create: {
                  slug: await generateUniqueBusinessSlug(input.businessName),
                  name: input.businessName,
                  ownerName: input.fullName,
                },
              },
            }
          : {}),
      },
      select: { id: true, role: true },
    });

    // Registration bonus.
    await awardPoints({
      userId: user.id,
      eventKey: PointEvents.REGISTER,
      idempotencyKey: `register:${user.id}`,
      referenceType: "user",
      referenceId: user.id,
    });

    // Referral reward to the referrer.
    if (referredById) {
      await adjustPoints({
        userId: referredById,
        amount: 100,
        type: "REFERRAL",
        description: "Referred a new member",
        referenceType: "user",
        referenceId: user.id,
      }).catch(() => undefined);
    }

    const token = await createSession({
      userId: user.id,
      role: user.role,
      userAgent: req.headers.get("user-agent"),
      ip,
    });
    await setSessionCookie(token);

    return created({
      id: user.id,
      role: user.role,
      username,
      needsOnboarding: true,
    });
  });
}
