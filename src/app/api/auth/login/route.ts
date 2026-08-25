import type { NextRequest } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { verifyPassword } from "@/lib/auth/password";
import { createSession, setSessionCookie } from "@/lib/auth/session";
import { loginSchema } from "@/lib/validation/auth";
import { awardPoints, PointEvents } from "@/lib/points/engine";
import { expireUserMembershipIfDue } from "@/features/membership/jobs";
import { recordSuccessfulLogin } from "@/lib/activity";
import { claimDailyCheckIn, getCheckInStatus } from "@/lib/checkin";
import { getCheckinSettings, getRateLimitSettings } from "@/lib/settings";
import { handle, ok, Errors, ApiError, getClientIp } from "@/lib/api";
import {
  recordFailure,
  resetRateLimit,
  normalizeIp,
} from "@/lib/security/rate-limit";

export async function POST(req: NextRequest) {
  return handle(async () => {
    const ip = getClientIp(req);
    const body = await req.json();
    const input = loginSchema.parse(body);

    // ------------------------------------------------------------------
    // Brute-force throttling that does NOT punish shared networks.
    //
    // Only FAILED attempts consume budget:
    //   - per-account (email): tight limit stops password spraying
    //   - per-IP: generous limit catches distributed attacks on one IP
    //     without blocking unrelated users behind carrier-grade NAT
    //     (XL Axiata, Telkomsel, ...). Successful logins clear the email
    //     counter so a few typos never lock a legitimate user out.
    // ------------------------------------------------------------------
    const rl = await getRateLimitSettings();
    const windowMs = Math.max(1, rl.windowMinutes) * 60 * 1000;
    const emailKey = `login:fail:email:${input.email.toLowerCase()}`;
    const ipKey = `login:fail:ip:${normalizeIp(ip)}`;

    const emailBucketFail = recordFailure(emailKey, rl.emailFailuresAllowed + 1, windowMs);
    if (!emailBucketFail.allowed) {
      throw Errors.tooMany(
        `Too many failed attempts for this account. Try again in about ${Math.ceil(
          emailBucketFail.retryAfterSec / 60,
        )} minute(s).`,
        emailBucketFail.retryAfterSec,
      );
    }
    const ipBucketFail = recordFailure(ipKey, rl.ipFailuresAllowed + 1, windowMs);
    if (!ipBucketFail.allowed) {
      throw Errors.tooMany(
        `Too many failed logins from your network. Try again in about ${Math.ceil(
          ipBucketFail.retryAfterSec / 60,
        )} minute(s).`,
        ipBucketFail.retryAfterSec,
      );
    }

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

    // SUCCESS — forgive past failures on this account immediately.
    resetRateLimit(emailKey);

    // Track successful login activity (distinct local days + streak).
    await recordSuccessfulLogin(user.id).catch(() => undefined);

    // Downgrade to free if the yearly membership has lapsed.
    await expireUserMembershipIfDue(user.id).catch(() => undefined);

    // Daily login bonus (rule enforces the cooldown so repeats are ignored).
    await awardPoints({
      userId: user.id,
      eventKey: PointEvents.DAILY_LOGIN,
    }).catch(() => undefined);

    // Optional automatic daily check-in on first login of the day.
    let autoCheckIn = null;
    try {
      const cs = await getCheckinSettings();
      if (cs.enabled && cs.autoCheckInOnLogin) {
        autoCheckIn = await claimDailyCheckIn(user.id);
      }
    } catch {
      /* non-fatal */
    }

    const token = await createSession({
      userId: user.id,
      role: user.role,
      userAgent: req.headers.get("user-agent"),
      ip,
    });
    await setSessionCookie(token, input.rememberMe !== false);

    return ok({
      id: user.id,
      role: user.role,
      ...(autoCheckIn?.awarded ? { checkIn: await getCheckInStatus(user.id) } : {}),
    });
  });
}