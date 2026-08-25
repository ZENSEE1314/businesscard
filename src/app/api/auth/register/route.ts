import type { NextRequest } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { hashPassword } from "@/lib/auth/password";
import { createSession, setSessionCookie } from "@/lib/auth/session";
import { generateUniqueUsername } from "@/lib/auth/provisioning";
import { registerSchema } from "@/lib/validation/auth";
import { awardPoints, adjustPoints, PointEvents } from "@/lib/points/engine";
import { addContact } from "@/lib/contacts";
import type { SignupSource } from "@prisma/client";
import { handle, created, Errors, getClientIp } from "@/lib/api";
import { enforceRateLimit } from "@/lib/security/rate-limit";

const SIGNUP_SOURCES: SignupSource[] = [
  "DIRECT",
  "REFERRAL_LINK",
  "CARD_LINK",
  "QR_SCAN",
  "NFC_CARD",
  "EVENT_INVITE",
];

function parseSignupSource(raw: string | null): SignupSource {
  if (raw && SIGNUP_SOURCES.includes(raw.toUpperCase() as SignupSource)) {
    return raw.toUpperCase() as SignupSource;
  }
  return raw ? "REFERRAL_LINK" : "DIRECT";
}

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

    // How did they arrive? Card pages append &src=qr|nfc|link|event.
    const srcParam = req.nextUrl.searchParams.get("src") ?? null;
    const signupSource = parseSignupSource(srcParam);
    const signupCardHandle =
      req.nextUrl.searchParams.get("card")?.slice(0, 120) ?? null;

    const username = await generateUniqueUsername(
      input.fullName || input.email.split("@")[0]!,
    );
    const passwordHash = await hashPassword(input.password);

    const user = await prisma.user.create({
      data: {
        email: input.email,
        passwordHash,
        role: "USER",
        referredById,
        signupSource: referredById ? signupSource : "DIRECT",
        signupCardHandle,
        profile: {
          create: {
            username,
            fullName: input.fullName,
            email: input.email,
          },
        },
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

      // --------------------------------------------------------------
      // Card-signup connection flow:
      //  A) the new member gets the card owner in their contacts
      //     (source reflects how they arrived: QR / NFC / shared link)
      //  B) reverse save: the card owner also gets the new member, since
      //     registering through someone's card is explicit consent to
      //     connect (the register form states this when src is present).
      // Duplicates are impossible thanks to the unique pair constraint.
      // --------------------------------------------------------------
      const contactSource: "QR_SCAN" | "NFC_CARD" | "SHARED_LINK" | "REFERRAL" =
        signupSource === "QR_SCAN"
          ? "QR_SCAN"
          : signupSource === "NFC_CARD"
            ? "NFC_CARD"
            : signupSource === "CARD_LINK"
              ? "SHARED_LINK"
              : "REFERRAL";

      await addContact({
        ownerUserId: user.id,
        contactUserId: referredById,
        source: contactSource,
        sourceCardId: signupCardHandle,
      }).catch(() => undefined);

      await addContact({
        ownerUserId: referredById,
        contactUserId: user.id,
        source: contactSource === "REFERRAL" ? "REFERRAL" : "CARD_SIGNUP",
        sourceCardId: signupCardHandle,
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